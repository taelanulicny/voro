import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import { GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { Portfolio, Transaction, Entity, PriceHistory } from '../models/types';
import { logger } from '../utils/logger';

const INITIAL_CASH_BALANCE = 10000;

// DynamoDB client for TransactWriteItems (requires regular client, not document client)
const dynamoDbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

export async function getUserPortfolio(userId: string): Promise<{
  cashBalance: number;
  holdings: any[];
  totalValue: number;
  todayChange: number;
  todayChangePercent: number;
}> {
  // Get user's cash balance
  const userResult = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAMES.USERS,
      Key: { userId },
    })
  );

  const cashBalance = userResult.Item?.cashBalance ?? INITIAL_CASH_BALANCE;

  // Get all holdings for user
  const holdingsResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAMES.PORTFOLIOS,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    })
  );

  const holdings = holdingsResult.Items || [];

  // Get current prices for all entities
  const entityIds = holdings.map((h: any) => h.entityId);
  const prices: Record<number, number> = {};

  for (const entityId of entityIds) {
    const priceResult = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.PRICE_HISTORY,
        KeyConditionExpression: 'entityId = :entityId',
        ExpressionAttributeValues: {
          ':entityId': entityId,
        },
        ScanIndexForward: false,
        Limit: 1,
      })
    );

    if (priceResult.Items && priceResult.Items.length > 0) {
      prices[entityId] = (priceResult.Items[0] as PriceHistory).price;
    }
  }

  // Get entity details
  const entities: Record<number, Entity> = {};
  for (const entityId of entityIds) {
    const entityResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.ENTITIES,
        Key: { entityId },
      })
    );
    if (entityResult.Item) {
      entities[entityId] = entityResult.Item as Entity;
    }
  }

  // Calculate holdings with current prices
  const holdingsWithPrices = holdings.map((holding: any) => {
    const currentPrice = prices[holding.entityId] || holding.averageCost;
    const totalValue = holding.quantity * currentPrice;
    const profitLoss = totalValue - holding.totalCost;
    const profitLossPercent = (profitLoss / holding.totalCost) * 100;

    return {
      entityId: holding.entityId,
      entityName: entities[holding.entityId]?.name || 'Unknown',
      entityTicker: entities[holding.entityId]?.ticker || 'UNK',
      quantity: holding.quantity,
      averageCost: holding.averageCost,
      currentPrice,
      totalValue,
      totalCost: holding.totalCost,
      profitLoss,
      profitLossPercent,
      category: entities[holding.entityId]?.category || 'Unknown',
    };
  });

  const holdingsValue = holdingsWithPrices.reduce((sum, h) => sum + h.totalValue, 0);
  const totalValue = cashBalance + holdingsValue;
  const totalProfitLoss = holdingsWithPrices.reduce((sum, h) => sum + h.profitLoss, 0);
  const todayChange = totalProfitLoss * 0.1; // Mock: 10% of P&L as today's change
  const todayChangePercent = totalValue > 0 ? (todayChange / totalValue) * 100 : 0;

  return {
    cashBalance,
    holdings: holdingsWithPrices,
    totalValue,
    todayChange,
    todayChangePercent,
  };
}

export async function executeTrade(
  userId: string,
  entityId: number,
  type: 'buy' | 'sell',
  quantity: number,
  pricePerToken: number,
  idempotencyKey?: string
): Promise<{ success: boolean; error?: string; portfolio?: any; transactionId?: string }> {
  // SECURITY: Idempotency check is now atomic - handled in transaction with ConditionExpression
  // Removed separate Query check to prevent race conditions

  // Get entity details
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
  const totalAmount = quantity * pricePerToken;
  // Generate deterministic transactionId if idempotencyKey provided, otherwise random
  // This allows us to use attribute_not_exists check atomically
  const transactionId = idempotencyKey 
    ? `idempotent-${userId}-${idempotencyKey}`
    : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  const now = new Date().toISOString();

  try {
    if (type === 'buy') {
      // Get existing holding to calculate new values (need this for the transaction)
      const holdingResult = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAMES.PORTFOLIOS,
          Key: {
            userId,
            entityId,
          },
        })
      );

      const existingHolding = holdingResult.Item;
      let portfolioUpdate: any;

      if (existingHolding) {
        // Update existing holding
        const newQuantity = existingHolding.quantity + quantity;
        const newTotalCost = existingHolding.totalCost + totalAmount;
        const newAverageCost = newTotalCost / newQuantity;

        portfolioUpdate = {
          Update: {
            TableName: TABLE_NAMES.PORTFOLIOS,
            Key: marshall({ userId, entityId }),
            UpdateExpression: 'SET quantity = :q, averageCost = :ac, totalCost = :tc, updatedAt = :ua',
            ExpressionAttributeValues: marshall({
              ':q': newQuantity,
              ':ac': newAverageCost,
              ':tc': newTotalCost,
              ':ua': now,
            }),
          },
        };
      } else {
        // Create new holding
        portfolioUpdate = {
          Put: {
            TableName: TABLE_NAMES.PORTFOLIOS,
            Item: marshall({
              userId,
              entityId,
              quantity,
              averageCost: pricePerToken,
              totalCost: totalAmount,
              createdAt: now,
              updatedAt: now,
            }),
          },
        };
      }

      // Atomic transaction: Update cash balance (with condition check), update/create portfolio, record transaction
      const transactItems = [
        {
          // Update user cash balance with atomic condition check
          Update: {
            TableName: TABLE_NAMES.USERS,
            Key: marshall({ userId }),
            UpdateExpression: 'SET cashBalance = cashBalance - :amount, updatedAt = :ua',
            ConditionExpression: 'cashBalance >= :amount', // Atomic check: balance must be sufficient
            ExpressionAttributeValues: marshall({
              ':amount': totalAmount,
              ':ua': now,
            }),
          },
        },
        portfolioUpdate, // Update or create portfolio holding
        {
          // Record transaction with atomic idempotency check
          Put: {
            TableName: TABLE_NAMES.TRANSACTIONS,
            Item: marshall({
              transactionId,
              userId,
              timestamp,
              entityId,
              entityName: entity.name,
              entityTicker: entity.ticker,
              type,
              quantity,
              pricePerToken,
              totalAmount,
              category: entity.category,
              idempotencyKey: idempotencyKey || undefined,
            }),
            // SECURITY: Atomic idempotency check - prevents duplicate transactions with same key
            // When idempotencyKey is provided, transactionId is deterministic, so this check prevents duplicates
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
    } else {
      // SELL
      // Get existing holding to check quantity (we need current values for the transaction)
      const holdingResult = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAMES.PORTFOLIOS,
          Key: {
            userId,
            entityId,
          },
        })
      );

      if (!holdingResult.Item) {
        return { success: false, error: 'No holding found for this entity' };
      }

      const holding = holdingResult.Item;
      if (holding.quantity < quantity) {
        return { success: false, error: 'Insufficient holdings' };
      }

      const newQuantity = holding.quantity - quantity;
      let portfolioUpdate: any;

      if (newQuantity === 0) {
        // Remove holding (set quantity to 0)
        portfolioUpdate = {
          Put: {
            TableName: TABLE_NAMES.PORTFOLIOS,
            Item: marshall({
              userId,
              entityId,
              quantity: 0,
              updatedAt: now,
            }),
          },
        };
      } else {
        // Update holding
        const newTotalCost = holding.totalCost * (newQuantity / holding.quantity);
        portfolioUpdate = {
          Update: {
            TableName: TABLE_NAMES.PORTFOLIOS,
            Key: marshall({ userId, entityId }),
            UpdateExpression: 'SET quantity = :q, totalCost = :tc, updatedAt = :ua',
            ConditionExpression: 'quantity >= :sellQuantity', // Atomic check: must have enough to sell
            ExpressionAttributeValues: marshall({
              ':q': newQuantity,
              ':tc': newTotalCost,
              ':ua': now,
              ':sellQuantity': quantity,
            }),
          },
        };
      }

      // Atomic transaction: Update portfolio (with condition check), update cash balance, record transaction
      const transactItems = [
        portfolioUpdate, // Update portfolio with atomic quantity check
        {
          // Update user cash balance
          Update: {
            TableName: TABLE_NAMES.USERS,
            Key: marshall({ userId }),
            UpdateExpression: 'SET cashBalance = cashBalance + :amount, updatedAt = :ua',
            ExpressionAttributeValues: marshall({
              ':amount': totalAmount,
              ':ua': now,
            }),
          },
        },
        {
          // Record transaction with atomic idempotency check
          Put: {
            TableName: TABLE_NAMES.TRANSACTIONS,
            Item: marshall({
              transactionId,
              userId,
              timestamp,
              entityId,
              entityName: entity.name,
              entityTicker: entity.ticker,
              type,
              quantity,
              pricePerToken,
              totalAmount,
              category: entity.category,
              idempotencyKey: idempotencyKey || undefined,
            }),
            // SECURITY: Atomic idempotency check - prevents duplicate transactions with same key
            // When idempotencyKey is provided, transactionId is deterministic, so this check prevents duplicates
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
    }

    // Return updated portfolio
    const updatedPortfolio = await getUserPortfolio(userId);

    return {
      success: true,
      portfolio: updatedPortfolio,
      transactionId,
    };
  } catch (error: any) {
    // Handle transaction cancellation (condition check failed or concurrent conflict)
    if (error.name === 'TransactionCanceledException') {
      // Check which condition failed by examining the cancellation reasons
      const reasons = error.CancellationReasons || [];
      
      // Check if this was an idempotency conflict (transaction already exists)
      if (idempotencyKey) {
        for (const reason of reasons) {
          // If the transaction Put failed with ConditionalCheckFailed, it means transaction already exists
          // The transactionId is deterministic when idempotencyKey is provided, so we can query for it
          if (reason.Code === 'ConditionalCheckFailed') {
            // Try to find the existing transaction by querying with idempotencyKey
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
                // Return existing transaction - idempotent response
                const existingTransaction = existingTransactions.Items[0] as Transaction;
                const updatedPortfolio = await getUserPortfolio(userId);
                return {
                  success: true,
                  portfolio: updatedPortfolio,
                  transactionId: existingTransaction.transactionId,
                };
              }
            } catch (queryError) {
              // Fall through to generic error
            }
          }
        }
      }
      
      // Check for other condition failures (insufficient funds/holdings)
      for (const reason of reasons) {
        if (reason.Code === 'ConditionalCheckFailed') {
          if (type === 'buy') {
            return { success: false, error: 'Insufficient funds' };
          } else {
            return { success: false, error: 'Insufficient holdings or concurrent trade conflict' };
          }
        }
      }
      
      return { success: false, error: 'Trade failed due to concurrent modification or insufficient resources' };
    }
    
    // Re-throw other errors
    logger.error('Error executing trade', error);
    throw error;
  }
}

export async function getTransactions(
  userId: string,
  limit: number = 50,
  lastKey?: string
): Promise<{ transactions: Transaction[]; lastEvaluatedKey?: string }> {
  const params: any = {
    TableName: TABLE_NAMES.TRANSACTIONS,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
    ScanIndexForward: false,
    Limit: limit,
  };

  if (lastKey) {
    params.ExclusiveStartKey = JSON.parse(Buffer.from(lastKey, 'base64').toString());
  }

  const result = await docClient.send(new QueryCommand(params));

  return {
    transactions: (result.Items || []) as Transaction[],
    lastEvaluatedKey: result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : undefined,
  };
}

export async function getAllEntities(category?: string): Promise<Entity[]> {
  if (category) {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.ENTITIES,
        FilterExpression: 'category = :category',
        ExpressionAttributeValues: {
          ':category': category,
        },
      })
    );
    return (result.Items || []) as Entity[];
  }

  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAMES.ENTITIES,
    })
  );
  return (result.Items || []) as Entity[];
}

export async function getEntityPrice(entityId: number): Promise<number | null> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAMES.PRICE_HISTORY,
      KeyConditionExpression: 'entityId = :entityId',
      ExpressionAttributeValues: {
        ':entityId': entityId,
      },
      ScanIndexForward: false,
      Limit: 1,
    })
  );

  if (result.Items && result.Items.length > 0) {
    return (result.Items[0] as PriceHistory).price;
  }

  return null;
}

/**
 * Get all entity prices efficiently
 * Returns a map of entityId -> currentPrice
 */
export async function getAllEntityPrices(): Promise<Record<number, number>> {
  try {
    // Get all entities first
    const entities = await getAllEntities();
    
    // Get prices for all entities in parallel
    const pricePromises = entities.map(async (entity) => {
      const price = await getEntityPrice(entity.entityId);
      return {
        entityId: entity.entityId,
        price: price || entity.basePrice,
      };
    });
    
    const prices = await Promise.all(pricePromises);
    
    // Convert to record
    const priceMap: Record<number, number> = {};
    prices.forEach(({ entityId, price }) => {
      priceMap[entityId] = price;
    });
    
    return priceMap;
  } catch (error) {
    console.error('Error getting all entity prices:', error);
    return {};
  }
}

export async function getPriceHistory(
  entityId: number,
  timeRange: '1D' | '1W' | '1M' | 'ALL' = 'ALL',
  limit: number = 100
): Promise<PriceHistory[]> {
  // Calculate cutoff time based on timeRange
  const now = new Date();
  let cutoffTime: Date;

  switch (timeRange) {
    case '1D':
      cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '1W':
      cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '1M':
      cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'ALL':
    default:
      cutoffTime = new Date(0); // Beginning of time
      break;
  }

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAMES.PRICE_HISTORY,
      KeyConditionExpression: 'entityId = :entityId',
      FilterExpression: 'timestamp >= :cutoff',
      ExpressionAttributeValues: {
        ':entityId': entityId,
        ':cutoff': cutoffTime.toISOString(),
      },
      ScanIndexForward: true, // Oldest first for chart display
      Limit: limit,
    })
  );

  return (result.Items || []) as PriceHistory[];
}

