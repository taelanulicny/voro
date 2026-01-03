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
  try {
    // Get user's cash balance
    let cashBalance = INITIAL_CASH_BALANCE;
    try {
      const userResult = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAMES.USERS,
          Key: { userId },
        })
      );
      cashBalance = userResult.Item?.cashBalance ?? INITIAL_CASH_BALANCE;
    } catch (userError: any) {
      // Handle DynamoDB errors gracefully (table doesn't exist, no permissions, etc.)
      if (userError.name === 'ResourceNotFoundException' || userError.name === 'TableNotFoundException') {
        logger.warn('Users table not found, using default cash balance');
      } else {
        logger.warn('Error fetching user cash balance:', userError);
      }
      // Continue with default cash balance
    }

    // Get all holdings for user
    let holdings: any[] = [];
    try {
      const holdingsResult = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAMES.PORTFOLIOS,
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: {
            ':userId': userId,
          },
        })
      );
      holdings = holdingsResult.Items || [];
    } catch (holdingsError: any) {
      // Handle DynamoDB errors gracefully (table doesn't exist, no permissions, etc.)
      if (holdingsError.name === 'ResourceNotFoundException' || holdingsError.name === 'TableNotFoundException') {
        logger.warn('Portfolios table not found, using empty holdings');
      } else {
        logger.warn('Error fetching holdings:', holdingsError);
      }
      // Continue with empty holdings
    }

    // Get current prices for all entities
    const entityIds = holdings.map((h: any) => h?.entityId).filter((id): id is number => typeof id === 'number' && id > 0);
    const prices: Record<number, number> = {};

    for (const entityId of entityIds) {
      try {
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
          const priceItem = priceResult.Items[0] as PriceHistory;
          if (priceItem && typeof priceItem.price === 'number') {
            prices[entityId] = priceItem.price;
          }
        }
      } catch (priceError: any) {
        // Handle DynamoDB errors gracefully (table doesn't exist, no permissions, etc.)
        if (priceError.name === 'ResourceNotFoundException' || priceError.name === 'TableNotFoundException') {
          logger.debug(`PriceHistory table not found for entity ${entityId}`);
        } else {
          logger.warn(`Error fetching price for entity ${entityId}:`, priceError);
        }
        // Continue without price for this entity
      }
    }

    // Get entity details
    const entities: Record<number, Entity> = {};
    for (const entityId of entityIds) {
      try {
        const entityResult = await docClient.send(
          new GetCommand({
            TableName: TABLE_NAMES.ENTITIES,
            Key: { entityId },
          })
        );
        if (entityResult.Item) {
          entities[entityId] = entityResult.Item as Entity;
        }
      } catch (entityError: any) {
        // Handle DynamoDB errors gracefully (table doesn't exist, no permissions, etc.)
        if (entityError.name === 'ResourceNotFoundException' || entityError.name === 'TableNotFoundException') {
          logger.debug(`Entities table not found for entity ${entityId}`);
        } else {
          logger.warn(`Error fetching entity ${entityId}:`, entityError);
        }
        // Continue without entity details
      }
    }

    // Calculate holdings with current prices
    const holdingsWithPrices = holdings
      .filter((holding: any) => holding && holding.entityId && typeof holding.quantity === 'number')
      .map((holding: any) => {
        const currentPrice = prices[holding.entityId] || holding.averageCost || 0;
        const quantity = holding.quantity || 0;
        const totalCost = holding.totalCost || 0;
        const totalValue = quantity * currentPrice;
        const profitLoss = totalValue - totalCost;
        const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

        return {
          entityId: holding.entityId,
          entityName: entities[holding.entityId]?.name || 'Unknown',
          entityTicker: entities[holding.entityId]?.ticker || 'UNK',
          quantity,
          averageCost: holding.averageCost || 0,
          currentPrice,
          totalValue,
          totalCost,
          profitLoss,
          profitLossPercent,
          category: entities[holding.entityId]?.category || 'Unknown',
        };
      });

    const holdingsValue = holdingsWithPrices.reduce((sum, h) => sum + (h.totalValue || 0), 0);
    const totalValue = cashBalance + holdingsValue;
    
    // Calculate todayChange from actual price deltas (current price vs opening price)
    // Opening price is the first price after market open (8am EST/EDT)
    // Use proper timezone handling (accounts for DST automatically)
    let todayChange = 0;
    
    const now = new Date();
    // Use Intl API to get proper EST/EDT time (handles DST automatically)
    const estTimeString = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      hour12: false,
    }).formatToParts(now);
    
    const estHours = parseInt(estTimeString.find(part => part.type === 'hour')?.value || '0', 10);
    const estYear = parseInt(estTimeString.find(part => part.type === 'year')?.value || '0', 10);
    const estMonth = parseInt(estTimeString.find(part => part.type === 'month')?.value || '0', 10) - 1; // 0-indexed
    const estDay = parseInt(estTimeString.find(part => part.type === 'day')?.value || '0', 10);
    
    // Create market open time (8am EST/EDT) in UTC
    const marketOpenTime = new Date(Date.UTC(estYear, estMonth, estDay, 8, 0, 0));
    
    // If it's before 8am, use yesterday's opening price
    if (estHours < 8) {
      marketOpenTime.setUTCDate(marketOpenTime.getUTCDate() - 1);
    }
    
    const marketOpenTimestamp = marketOpenTime.toISOString();
    
    // Get opening prices for all entities in holdings
    const openingPrices: Record<number, number> = {};
    
    for (const entityId of entityIds) {
      try {
        // Query for the first price after market open
        const openingPriceResult = await docClient.send(
          new QueryCommand({
            TableName: TABLE_NAMES.PRICE_HISTORY,
            KeyConditionExpression: 'entityId = :entityId',
            FilterExpression: 'timestamp >= :marketOpen',
            ExpressionAttributeValues: {
              ':entityId': entityId,
              ':marketOpen': marketOpenTimestamp,
            },
            ScanIndexForward: true, // Oldest first
            Limit: 1,
          })
        );
        
        if (openingPriceResult.Items && openingPriceResult.Items.length > 0) {
          const priceItem = openingPriceResult.Items[0] as PriceHistory;
          if (priceItem && typeof priceItem.price === 'number') {
            openingPrices[entityId] = priceItem.price;
          } else {
            // Fallback: use current price if opening price is invalid
            openingPrices[entityId] = prices[entityId] || entities[entityId]?.basePrice || 0;
          }
        } else {
          // Fallback: use current price if no opening price found
          openingPrices[entityId] = prices[entityId] || entities[entityId]?.basePrice || 0;
        }
      } catch (openingPriceError: any) {
        // Handle DynamoDB errors gracefully (table doesn't exist, no permissions, etc.)
        if (openingPriceError.name === 'ResourceNotFoundException' || openingPriceError.name === 'TableNotFoundException') {
          logger.debug(`PriceHistory table not found for opening price of entity ${entityId}`);
        } else {
          logger.warn(`Error fetching opening price for entity ${entityId}:`, openingPriceError);
        }
        // Fallback: use current price if opening price query fails
        openingPrices[entityId] = prices[entityId] || entities[entityId]?.basePrice || 0;
      }
    }
  
    // Calculate todayChange: sum of (current value - opening value) for each holding
    for (const holding of holdingsWithPrices) {
      const openingPrice = openingPrices[holding.entityId] || holding.currentPrice || 0;
      const openingValue = (holding.quantity || 0) * openingPrice;
      const currentValue = holding.totalValue || 0;
      todayChange += (currentValue - openingValue);
    }
    
    const todayChangePercent = totalValue > 0 ? (todayChange / totalValue) * 100 : 0;

    return {
      cashBalance,
      holdings: holdingsWithPrices,
      totalValue,
      todayChange,
      todayChangePercent,
    };
  } catch (error: any) {
    logger.error('Error getting user portfolio:', error);
    if (error.stack) {
      logger.error('Stack trace:', error.stack);
    }
    // Return default portfolio instead of throwing
    return {
      cashBalance: INITIAL_CASH_BALANCE,
      holdings: [],
      totalValue: INITIAL_CASH_BALANCE,
      todayChange: 0,
      todayChangePercent: 0,
    };
  }
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
  try {
    // Validate userId
    if (!userId || typeof userId !== 'string') {
      logger.warn('Invalid userId for getTransactions:', userId);
      return { transactions: [] };
    }

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
      try {
        params.ExclusiveStartKey = JSON.parse(Buffer.from(lastKey, 'base64').toString());
      } catch (parseError) {
        logger.warn('Error parsing lastKey:', parseError);
        // Continue without lastKey
      }
    }

    let result;
    try {
      result = await docClient.send(new QueryCommand(params));
    } catch (queryError: any) {
      // Handle DynamoDB errors gracefully (table doesn't exist, no permissions, etc.)
      if (queryError.name === 'ResourceNotFoundException' || queryError.name === 'TableNotFoundException') {
        logger.debug('Transactions table not found, returning empty array');
      } else {
        logger.warn('Error querying transactions table:', queryError);
      }
      return { transactions: [] };
    }

    const items = (result.Items || []) as Transaction[];
    
    // Validate and filter transactions
    const validTransactions = items.filter((tx) => {
      // Ensure transaction has required fields
      if (!tx || !tx.transactionId || !tx.userId || !tx.entityId || !tx.timestamp) {
        return false;
      }
      // Validate numeric fields
      if (typeof tx.quantity !== 'number' || typeof tx.pricePerToken !== 'number' || typeof tx.totalAmount !== 'number') {
        return false;
      }
      return true;
    });

    return {
      transactions: validTransactions,
      lastEvaluatedKey: result.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : undefined,
    };
  } catch (error: any) {
    logger.error('Error getting transactions:', error);
    if (error.stack) {
      logger.error('Stack trace:', error.stack);
    }
    // Return empty array instead of throwing
    return { transactions: [] };
  }
}

export async function getAllEntities(category?: string): Promise<Entity[]> {
  try {
    let result;
    try {
      if (category) {
        result = await docClient.send(
          new ScanCommand({
            TableName: TABLE_NAMES.ENTITIES,
            FilterExpression: 'category = :category',
            ExpressionAttributeValues: {
              ':category': category,
            },
          })
        );
      } else {
        result = await docClient.send(
          new ScanCommand({
            TableName: TABLE_NAMES.ENTITIES,
          })
        );
      }
    } catch (scanError: any) {
      // Handle DynamoDB errors gracefully (table doesn't exist, no permissions, etc.)
      if (scanError.name === 'ResourceNotFoundException' || scanError.name === 'TableNotFoundException') {
        logger.debug('Entities table not found, returning empty array');
      } else {
        logger.warn('Error scanning entities table:', scanError);
      }
      return [];
    }

    const items = (result.Items || []) as Entity[];
    
    // Validate and filter entities
    return items.filter((entity) => {
      // Ensure entity has required fields
      if (!entity || typeof entity.entityId !== 'number' || !entity.ticker || !entity.name) {
        return false;
      }
      return true;
    });
  } catch (error: any) {
    logger.error('Error getting all entities:', error);
    if (error.stack) {
      logger.error('Stack trace:', error.stack);
    }
    // Return empty array instead of throwing
    return [];
  }
}

export async function getEntityPrice(entityId: number): Promise<number | null> {
  try {
    // Validate entityId
    if (!entityId || isNaN(entityId) || entityId <= 0) {
      return null;
    }

    let result;
    try {
      result = await docClient.send(
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
    } catch (queryError: any) {
      // Handle DynamoDB errors gracefully (table doesn't exist, no permissions, etc.)
      if (queryError.name === 'ResourceNotFoundException' || queryError.name === 'TableNotFoundException') {
        logger.debug(`PriceHistory table not found for entity ${entityId}`);
      } else {
        logger.warn(`Error querying price for entity ${entityId}:`, queryError);
      }
      return null;
    }

    if (result.Items && result.Items.length > 0) {
      const priceItem = result.Items[0] as PriceHistory;
      if (priceItem && typeof priceItem.price === 'number') {
        return priceItem.price;
      }
    }

    return null;
  } catch (error: any) {
    logger.warn(`Error getting entity price for ${entityId}:`, error);
    return null;
  }
}

/**
 * Get all entity prices efficiently
 * Returns a map of entityId -> currentPrice
 */
export async function getAllEntityPrices(): Promise<Record<number, number>> {
  try {
    // Get all entities first
    const entities = await getAllEntities();
    
    if (entities.length === 0) {
      return {};
    }
    
    // Get prices for all entities in parallel
    const pricePromises = entities.map(async (entity) => {
      try {
        const price = await getEntityPrice(entity.entityId);
        return {
          entityId: entity.entityId,
          price: price || entity.basePrice || 0,
        };
      } catch (priceError: any) {
        logger.warn(`Error getting price for entity ${entity.entityId}:`, priceError);
        return {
          entityId: entity.entityId,
          price: entity.basePrice || 0,
        };
      }
    });
    
    const prices = await Promise.all(pricePromises);
    
    // Convert to record
    const priceMap: Record<number, number> = {};
    prices.forEach(({ entityId, price }) => {
      if (entityId && typeof price === 'number' && price > 0) {
        priceMap[entityId] = price;
      }
    });
    
    return priceMap;
  } catch (error: any) {
    logger.error('Error getting all entity prices:', error);
    if (error.stack) {
      logger.error('Stack trace:', error.stack);
    }
    return {};
  }
}

export async function getPriceHistory(
  entityId: number,
  timeRange: '1D' | '1W' | '1M' | 'ALL' = 'ALL',
  limit: number = 100
): Promise<PriceHistory[]> {
  try {
    // Validate entityId
    if (!entityId || isNaN(entityId) || entityId <= 0) {
      logger.warn('Invalid entityId for price history:', entityId);
      return [];
    }

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

    let result;
    try {
      // Use KeyConditionExpression with timestamp range for better performance
      // Since timestamp is the sort key, we can use it directly in KeyConditionExpression
      const queryParams: any = {
        TableName: TABLE_NAMES.PRICE_HISTORY,
        KeyConditionExpression: 'entityId = :entityId',
        ExpressionAttributeValues: {
          ':entityId': entityId,
        },
        ScanIndexForward: true, // Oldest first for chart display
        Limit: limit,
      };

      // Only add timestamp filter if not querying ALL (to use sort key efficiently)
      if (timeRange !== 'ALL') {
        queryParams.KeyConditionExpression += ' AND timestamp >= :cutoff';
        queryParams.ExpressionAttributeValues[':cutoff'] = cutoffTime.toISOString();
      }

      result = await docClient.send(new QueryCommand(queryParams));
    } catch (queryError: any) {
      // Handle DynamoDB errors gracefully (table doesn't exist, no permissions, etc.)
      if (queryError.name === 'ResourceNotFoundException' || queryError.name === 'TableNotFoundException') {
        logger.debug(`PriceHistory table not found for entity ${entityId}`);
      } else {
        logger.error(`Error querying price history table for entity ${entityId}:`, {
          error: queryError.message || String(queryError),
          errorName: queryError.name,
          errorCode: queryError.code,
          stack: queryError.stack,
          entityId,
          timeRange,
          limit,
        });
      }
      return [];
    }

    const items = (result.Items || []) as PriceHistory[];
    
    // Validate and filter items
    return items.filter((item) => {
      // Ensure item has required fields
      if (!item || typeof item.entityId !== 'number' || !item.timestamp || typeof item.price !== 'number') {
        return false;
      }
      // Validate timestamp is a valid ISO string
      try {
        const date = new Date(item.timestamp);
        if (isNaN(date.getTime())) {
          return false;
        }
      } catch {
        return false;
      }
      return true;
    });
  } catch (error: any) {
    // Log error with full context for debugging
    logger.error('Error getting price history:', {
      error: error.message || String(error),
      errorName: error.name,
      errorCode: error.code,
      stack: error.stack,
      entityId,
      timeRange,
      limit,
    });
    // Return empty array instead of throwing - allows frontend to show empty state
    // This prevents 500 errors from breaking the app
    return [];
  }
}

