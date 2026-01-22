/**
 * NEW Trading Service - Sentiment-Based Algorithm
 * 
 * Implements the sentiment-based trading algorithm:
 * - Price = BASE_PRICE * (P + EPSILON) / (N + EPSILON)
 * - Positions track EntryRatio and ExitRatio
 * - PnL = TokensCommitted * (ExitRatio - EntryRatio)
 */

import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import { GetCommand, PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { Portfolio, Transaction, Entity } from '../models/types';
import { logger } from '../utils/logger';
import {
  calculateSentimentRatio,
  calculatePrice,
  calculatePriceFromEntity,
  getInitialEntityValues,
  DEFAULT_EPSILON,
  BASE_PRICE,
} from './priceCalculationService';

const INITIAL_CASH_BALANCE = 1000;
const dynamoDbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Open a new position
 */
export async function openPosition(
  userId: string,
  entityId: number,
  direction: 'positive' | 'negative',
  tokensCommitted: number,
  idempotencyKey?: string
): Promise<{ success: boolean; error?: string; portfolio?: any; transactionId?: string }> {
  const timestamp = new Date().toISOString();
  const now = new Date().toISOString();
  const transactionId = idempotencyKey
    ? `idempotent-${userId}-${idempotencyKey}`
    : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Get entity to check P/N pools
    const entityResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.ENTITIES,
        Key: { entityId },
      })
    );

    if (!entityResult.Item) {
      return { success: false, error: 'Entity not found' };
    }

    const entity = entityResult.Item as Entity;
    const p = entity.positiveTokens ?? 0;
    const n = entity.negativeTokens ?? 0;
    const epsilon = entity.epsilon ?? DEFAULT_EPSILON;

    // Check if user already has an open position for this entity (max one per entity)
    // Note: We check before transaction, but also use condition in transaction for atomicity
    const existingPositionResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.PORTFOLIOS,
        Key: { userId, entityId },
      })
    );

    const existingPosition = existingPositionResult.Item as Portfolio | undefined;
    const hasExistingOpenPosition = existingPosition && existingPosition.status === 'open';
    
    if (hasExistingOpenPosition) {
      return { success: false, error: 'You already have an open position for this entity. Close it before opening a new one.' };
    }

    // Get user cash balance
    const userResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.USERS,
        Key: { userId },
      })
    );

    const cashBalance = userResult.Item?.cashBalance ?? INITIAL_CASH_BALANCE;

    // Check sufficient funds
    if (cashBalance < tokensCommitted) {
      return { success: false, error: 'Insufficient funds' };
    }

    // Calculate EntryRatio BEFORE adding tokens
    const entryRatio = calculateSentimentRatio(p, n, epsilon);
    const currentPrice = calculatePrice(p, n, epsilon);

    // Calculate new pool values AFTER adding tokens
    const newP = direction === 'positive' ? p + tokensCommitted : p;
    const newN = direction === 'negative' ? n + tokensCommitted : n;

    // Ensure P and N never go below 0
    if (newP < 0 || newN < 0) {
      return { success: false, error: 'Invalid pool state (pools cannot be negative)' };
    }

    // Atomic transaction: Update entity pools, create position, update cash balance, record transaction
    const transactItems = [
      {
        // Update entity P/N pools
        Update: {
          TableName: TABLE_NAMES.ENTITIES,
          Key: marshall({ entityId }),
          UpdateExpression: 'SET positiveTokens = :p, negativeTokens = :n, updatedAt = :ua',
          ExpressionAttributeValues: marshall({
            ':p': newP,
            ':n': newN,
            ':ua': now,
          }),
        },
      },
      {
        // Create or update position (only if no open position exists)
        // Use Put with condition to ensure atomicity: only allow if no open position exists
        Put: {
          TableName: TABLE_NAMES.PORTFOLIOS,
          Item: marshall({
            userId,
            entityId,
            tokensCommitted,
            entryRatio,
            direction,
            status: 'open',
            createdAt: existingPosition ? existingPosition.createdAt : now,
            updatedAt: now,
          }),
          // Only allow if position doesn't exist OR if existing position is closed
          ConditionExpression: 'attribute_not_exists(userId) OR attribute_not_exists(entityId) OR status <> :openStatus',
          ExpressionAttributeValues: marshall({
            ':openStatus': 'open',
          }),
        },
      },
      {
        // Update user cash balance
        Update: {
          TableName: TABLE_NAMES.USERS,
          Key: marshall({ userId }),
          UpdateExpression: 'SET cashBalance = cashBalance - :amount, updatedAt = :ua',
          ConditionExpression: 'cashBalance >= :amount',
          ExpressionAttributeValues: marshall({
            ':amount': tokensCommitted,
            ':ua': now,
          }),
        },
      },
      {
        // Record transaction
        Put: {
          TableName: TABLE_NAMES.TRANSACTIONS,
          Item: marshall({
            transactionId,
            userId,
            timestamp,
            entityId,
            entityName: entity.name,
            type: 'open',
            direction,
            tokensCommitted,
            entryRatio,
            currentPrice,
            category: entity.category,
            idempotencyKey: idempotencyKey || undefined,
          }),
          ConditionExpression: idempotencyKey
            ? 'attribute_not_exists(transactionId)'
            : undefined,
        },
      },
    ];

    await dynamoDbClient.send(
      new TransactWriteItemsCommand({
        TransactItems: transactItems,
      })
    );

    // Return updated portfolio
    const updatedPortfolio = await getUserPortfolio(userId);
    return {
      success: true,
      portfolio: updatedPortfolio,
      transactionId,
    };
  } catch (error: any) {
    if (error.name === 'TransactionCanceledException') {
      const reasons = error.CancellationReasons || [];
      
      // Check for idempotency conflict
      if (idempotencyKey) {
        for (const reason of reasons) {
          if (reason.Code === 'ConditionalCheckFailed') {
            try {
              const existingTransactions = await docClient.send(
                new QueryCommand({
                  TableName: TABLE_NAMES.TRANSACTIONS,
                  KeyConditionExpression: 'userId = :userId',
                  FilterExpression: 'idempotencyKey = :key',
                  ExpressionAttributeValues: {
                    ':userId': userId,
                    ':key': idempotencyKey,
                  },
                  Limit: 1,
                })
              );
              
              if (existingTransactions.Items && existingTransactions.Items.length > 0) {
                const updatedPortfolio = await getUserPortfolio(userId);
                return {
                  success: true,
                  portfolio: updatedPortfolio,
                  transactionId: (existingTransactions.Items[0] as Transaction).transactionId,
                };
              }
            } catch (queryError) {
              // Fall through
            }
          }
        }
      }
      
      // Check for other condition failures
      for (const reason of reasons) {
        if (reason.Code === 'ConditionalCheckFailed') {
          return { success: false, error: 'Insufficient funds or existing open position' };
        }
      }
      
      return { success: false, error: 'Trade failed due to concurrent modification' };
    }
    
    logger.error('Error opening position', error);
    throw error;
  }
}

/**
 * Close an existing position
 */
export async function closePosition(
  userId: string,
  entityId: number,
  idempotencyKey?: string
): Promise<{ success: boolean; error?: string; portfolio?: any; transactionId?: string }> {
  const timestamp = new Date().toISOString();
  const now = new Date().toISOString();
  const transactionId = idempotencyKey
    ? `idempotent-${userId}-${idempotencyKey}`
    : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Get existing open position
    const positionResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.PORTFOLIOS,
        Key: { userId, entityId },
      })
    );

    if (!positionResult.Item) {
      return { success: false, error: 'No position found for this entity' };
    }

    const position = positionResult.Item as Portfolio;

    if (position.status !== 'open') {
      return { success: false, error: 'Position is already closed' };
    }

    const tokensCommitted = position.tokensCommitted;
    const entryRatio = position.entryRatio;
    const direction = position.direction;

    // Get entity to get current P/N pools
    const entityResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.ENTITIES,
        Key: { entityId },
      })
    );

    if (!entityResult.Item) {
      return { success: false, error: 'Entity not found' };
    }

    const entity = entityResult.Item as Entity;
    const p = entity.positiveTokens ?? 0;
    const n = entity.negativeTokens ?? 0;
    const epsilon = entity.epsilon ?? DEFAULT_EPSILON;

    // Calculate current price before removing tokens
    const currentPrice = calculatePrice(p, n, epsilon);

    // Remove tokens from pool FIRST
    const newP = direction === 'positive' ? Math.max(0, p - tokensCommitted) : p;
    const newN = direction === 'negative' ? Math.max(0, n - tokensCommitted) : n;

    // Calculate ExitRatio AFTER removing tokens
    const exitRatio = calculateSentimentRatio(newP, newN, epsilon);

    // Calculate PnL
    const deltaR = exitRatio - entryRatio;
    let profitLoss = tokensCommitted * deltaR;

    // Direction adjustment: if negative position, flip PnL
    if (direction === 'negative') {
      profitLoss = -profitLoss;
    }

    // Calculate tokens returned
    const tokensReturned = tokensCommitted + profitLoss;

    // Ensure user gets at least 0 tokens back (can't go negative)
    const finalTokensReturned = Math.max(0, tokensReturned);

    // Get user to update cash balance
    const userResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.USERS,
        Key: { userId },
      })
    );

    // Atomic transaction: Update entity pools, close position, update cash balance, record transaction
    const transactItems = [
      {
        // Update entity P/N pools
        Update: {
          TableName: TABLE_NAMES.ENTITIES,
          Key: marshall({ entityId }),
          UpdateExpression: 'SET positiveTokens = :p, negativeTokens = :n, updatedAt = :ua',
          ExpressionAttributeValues: marshall({
            ':p': newP,
            ':n': newN,
            ':ua': now,
          }),
        },
      },
      {
        // Close position (update with exit data)
        Update: {
          TableName: TABLE_NAMES.PORTFOLIOS,
          Key: marshall({ userId, entityId }),
          UpdateExpression: 'SET status = :closed, exitRatio = :er, deltaR = :dr, profitLoss = :pl, tokensReturned = :tr, closedAt = :ca, updatedAt = :ua',
          ConditionExpression: 'status = :openStatus', // Ensure position is still open
          ExpressionAttributeValues: marshall({
            ':closed': 'closed',
            ':er': exitRatio,
            ':dr': deltaR,
            ':pl': profitLoss,
            ':tr': finalTokensReturned,
            ':ca': now,
            ':ua': now,
            ':openStatus': 'open',
          }),
        },
      },
      {
        // Update user cash balance (add tokens returned)
        Update: {
          TableName: TABLE_NAMES.USERS,
          Key: marshall({ userId }),
          UpdateExpression: 'SET cashBalance = cashBalance + :amount, updatedAt = :ua',
          ExpressionAttributeValues: marshall({
            ':amount': finalTokensReturned,
            ':ua': now,
          }),
        },
      },
      {
        // Record transaction
        Put: {
          TableName: TABLE_NAMES.TRANSACTIONS,
          Item: marshall({
            transactionId,
            userId,
            timestamp,
            entityId,
            entityName: entity.name,
            type: 'close',
            direction,
            tokensCommitted,
            entryRatio,
            exitRatio,
            deltaR,
            profitLoss,
            tokensReturned: finalTokensReturned,
            currentPrice,
            category: entity.category,
            idempotencyKey: idempotencyKey || undefined,
          }),
          ConditionExpression: idempotencyKey
            ? 'attribute_not_exists(transactionId)'
            : undefined,
        },
      },
    ];

    await dynamoDbClient.send(
      new TransactWriteItemsCommand({
        TransactItems: transactItems,
      })
    );

    // Return updated portfolio
    const updatedPortfolio = await getUserPortfolio(userId);
    return {
      success: true,
      portfolio: updatedPortfolio,
      transactionId,
    };
  } catch (error: any) {
    if (error.name === 'TransactionCanceledException') {
      // Handle similar to openPosition
      if (idempotencyKey) {
        // Try to find existing transaction
        // ... similar logic
      }
      return { success: false, error: 'Trade failed due to concurrent modification or position already closed' };
    }
    
    logger.error('Error closing position', error);
    throw error;
  }
}

/**
 * Wrapper function that routes to openPosition or closePosition
 * This maintains compatibility with existing API that uses type: 'open' | 'close'
 */
export async function executeTradeNew(
  userId: string,
  entityId: number,
  type: 'open' | 'close',
  direction?: 'positive' | 'negative',
  tokensCommitted?: number,
  idempotencyKey?: string
): Promise<{ success: boolean; error?: string; portfolio?: any; transactionId?: string }> {
  if (type === 'open') {
    if (!direction || tokensCommitted === undefined) {
      return { success: false, error: 'Direction and tokensCommitted are required for opening a position' };
    }
    return openPosition(userId, entityId, direction, tokensCommitted, idempotencyKey);
  } else {
    return closePosition(userId, entityId, idempotencyKey);
  }
}

// Export getUserPortfolio for use by other functions
// (This needs to be updated too, but keeping the signature for now)
export async function getUserPortfolio(userId: string): Promise<{
  cashBalance: number;
  holdings: any[];
  totalValue: number;
  todayChange: number;
  todayChangePercent: number;
}> {
  // TODO: Update this to work with new position-based system
  // For now, return basic structure
  const userResult = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAMES.USERS,
      Key: { userId },
    })
  );

  const cashBalance = userResult.Item?.cashBalance ?? INITIAL_CASH_BALANCE;

  // Get all open positions
  const positionsResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAMES.PORTFOLIOS,
      KeyConditionExpression: 'userId = :userId',
      FilterExpression: 'status = :open',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':open': 'open',
      },
    })
  );

  const positions = positionsResult.Items || [];
  
  // TODO: Calculate holdings with current prices using new algorithm
  // For now, return basic structure
  return {
    cashBalance,
    holdings: positions,
    totalValue: cashBalance, // TODO: Calculate properly
    todayChange: 0,
    todayChangePercent: 0,
  };
}
