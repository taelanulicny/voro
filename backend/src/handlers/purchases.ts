import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { authenticateRequest } from '../middleware/auth';
import {
  recordPurchaseTransaction,
  creditPurchaseToAccount,
  getUserPurchaseHistory,
} from '../services/purchaseService';
import { logger } from '../utils/logger';
import { createSuccessResponse, createErrorResponse } from '../utils/response';

/**
 * Process a purchase from RevenueCat/Apple
 * POST /api/purchases/process
 * Body: { transactionId, productId, amount, platform }
 */
export async function processPurchaseHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // Authenticate request
    const authResult = await authenticateRequest(event);
    if (!authResult.success || !authResult.userId) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = authResult.userId;

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const body = JSON.parse(event.body);
    const { transactionId, productId, amount, platform } = body;

    if (!transactionId || !productId || !amount || !platform) {
      return createErrorResponse(400, 'Missing required fields: transactionId, productId, amount, platform');
    }

    if (!['ios', 'android'].includes(platform)) {
      return createErrorResponse(400, 'Platform must be "ios" or "android"');
    }

    // Record transaction (idempotent)
    const recordResult = await recordPurchaseTransaction(
      transactionId,
      userId,
      productId,
      amount,
      platform as 'ios' | 'android'
    );

    if (!recordResult.success) {
      return createErrorResponse(500, `Failed to record transaction: ${recordResult.error}`);
    }

    // If already processed, return success
    if (recordResult.alreadyProcessed) {
      return createSuccessResponse({ message: 'Transaction already processed', transactionId });
    }

    // Credit the purchase to user's account
    const creditResult = await creditPurchaseToAccount(transactionId, userId);

    if (!creditResult.success) {
      return createErrorResponse(500, `Failed to credit purchase: ${creditResult.error}`);
    }

    logger.info('Purchase processed successfully', { transactionId, userId, amount: creditResult.amount });

    return createSuccessResponse({
      message: 'Purchase processed successfully',
      transactionId,
      amount: creditResult.amount,
    });
  } catch (error: any) {
    logger.error('Error processing purchase', { error: error.message, event });
    return createErrorResponse(500, 'Internal server error');
  }
}

/**
 * Get user's purchase history
 * GET /api/purchases/history
 */
export async function getPurchaseHistoryHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // Authenticate request
    const authResult = await authenticateRequest(event);
    if (!authResult.success || !authResult.userId) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = authResult.userId;

    const limit = event.queryStringParameters?.limit
      ? parseInt(event.queryStringParameters.limit, 10)
      : 50;

    const result = await getUserPurchaseHistory(userId, limit);

    if (!result.success) {
      return createErrorResponse(500, `Failed to get purchase history: ${result.error}`);
    }

    return createSuccessResponse({ purchases: result.purchases || [] });
  } catch (error: any) {
    logger.error('Error getting purchase history', { error: error.message, event });
    return createErrorResponse(500, 'Internal server error');
  }
}

