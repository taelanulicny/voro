import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import { GetCommand, PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '../utils/logger';

export interface PurchaseTransaction {
  transactionId: string; // RevenueCat transaction ID or Apple transaction ID
  userId: string;
  productId: string; // e.g., "tokens_100", "tokens_500"
  amount: number; // Cash amount to credit
  platform: 'ios' | 'android';
  purchaseDate: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

/**
 * Record a purchase transaction for idempotency
 */
export async function recordPurchaseTransaction(
  transactionId: string,
  userId: string,
  productId: string,
  amount: number,
  platform: 'ios' | 'android'
): Promise<{ success: boolean; error?: string; alreadyProcessed?: boolean }> {
  try {
    // Check if transaction already exists
    const existing = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.PURCHASE_TRANSACTIONS,
        Key: { transactionId },
      })
    );

    if (existing.Item) {
      logger.info('Purchase transaction already processed', { transactionId, userId });
      return { success: true, alreadyProcessed: true };
    }

    // Record new transaction
    const now = new Date().toISOString();
    const transaction: PurchaseTransaction = {
      transactionId,
      userId,
      productId,
      amount,
      platform,
      purchaseDate: now,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.PURCHASE_TRANSACTIONS,
        Item: transaction,
      })
    );

    logger.info('Purchase transaction recorded', { transactionId, userId, productId, amount });
    return { success: true };
  } catch (error: any) {
    logger.error('Error recording purchase transaction', { error: error.message, transactionId, userId });
    return { success: false, error: error.message };
  }
}

/**
 * Credit cash to user's account after purchase verification
 */
export async function creditPurchaseToAccount(
  transactionId: string,
  userId: string
): Promise<{ success: boolean; error?: string; amount?: number }> {
  try {
    // Get transaction record
    const transactionResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.PURCHASE_TRANSACTIONS,
        Key: { transactionId },
      })
    );

    if (!transactionResult.Item) {
      return { success: false, error: 'Transaction not found' };
    }

    const transaction = transactionResult.Item as PurchaseTransaction;

    // Check if already processed
    if (transaction.status === 'completed') {
      logger.info('Transaction already credited', { transactionId, userId });
      return { success: true, amount: transaction.amount };
    }

    // Get current user balance
    const userResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.USERS,
        Key: { userId },
      })
    );

    if (!userResult.Item) {
      return { success: false, error: 'User not found' };
    }

    const currentBalance = userResult.Item.cashBalance || 0;
    const newBalance = currentBalance + transaction.amount;

    // Atomically update user balance and mark transaction as completed
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAMES.USERS,
        Key: { userId },
        UpdateExpression: 'SET cashBalance = :balance, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':balance': newBalance,
          ':updatedAt': new Date().toISOString(),
        },
      })
    );

    // Mark transaction as completed
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAMES.PURCHASE_TRANSACTIONS,
        Key: { transactionId },
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': 'completed',
          ':updatedAt': new Date().toISOString(),
        },
      })
    );

    logger.info('Purchase credited to account', { transactionId, userId, amount: transaction.amount, newBalance });
    return { success: true, amount: transaction.amount };
  } catch (error: any) {
    logger.error('Error crediting purchase to account', { error: error.message, transactionId, userId });
    return { success: false, error: error.message };
  }
}

/**
 * Get user's purchase history
 */
export async function getUserPurchaseHistory(
  userId: string,
  limit: number = 50
): Promise<{ success: boolean; purchases?: PurchaseTransaction[]; error?: string }> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.PURCHASE_TRANSACTIONS,
        IndexName: 'userId-createdAt-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
        ScanIndexForward: false, // Most recent first
        Limit: limit,
      })
    );

    return { success: true, purchases: (result.Items || []) as PurchaseTransaction[] };
  } catch (error: any) {
    logger.error('Error getting purchase history', { error: error.message, userId });
    return { success: false, error: error.message };
  }
}

