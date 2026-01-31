import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { authenticateRequest, createResponse, createErrorResponse } from '../middleware/auth';
import {
  storePushToken as storePushTokenService,
  deletePushToken as deletePushTokenService,
  getUserPushTokens,
  sendNotificationToUser,
} from '../services/pushNotificationService';
import { logger } from '../utils/logger';

/**
 * Store or update a push notification token
 * POST /api/notifications/token
 */
export async function storePushToken(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const body = JSON.parse(event.body || '{}');
    const { token, deviceId, platform } = body;

    if (!token || !deviceId || !platform) {
      return createErrorResponse(
        400,
        'Missing required fields: token, deviceId, platform'
      );
    }

    if (!['ios', 'android', 'web'].includes(platform)) {
      return createErrorResponse(400, 'Invalid platform. Must be: ios, android, or web');
    }

    const result = await storePushTokenService(userId, token, deviceId, platform);

    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to store push token');
    }

    return createResponse(200, {
      success: true,
      message: 'Push token stored successfully',
    });
  } catch (error: any) {
    logger.error('Error in storePushToken handler', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

/**
 * Delete a push notification token
 * DELETE /api/notifications/token/:deviceId
 */
export async function deletePushToken(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const deviceId = event.pathParameters?.deviceId;

    if (!deviceId) {
      return createErrorResponse(400, 'Missing deviceId');
    }

    const result = await deletePushTokenService(userId, deviceId);

    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to delete push token');
    }

    return createResponse(200, {
      success: true,
      message: 'Push token deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error in deletePushToken handler', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

/**
 * Get all push tokens for the authenticated user
 * GET /api/notifications/tokens
 */
export async function getPushTokens(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const tokens = await getUserPushTokens(userId);

    return createResponse(200, {
      success: true,
      tokens,
    });
  } catch (error: any) {
    logger.error('Error in getPushTokens handler', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

/**
 * Send a test notification to the authenticated user
 * POST /api/notifications/test
 */
export async function sendTestNotification(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;

    const result = await sendNotificationToUser(
      userId,
      'Test Notification',
      'This is a test notification from Moro!',
      {
        type: 'test',
        timestamp: new Date().toISOString(),
      }
    );

    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to send test notification');
    }

    return createResponse(200, {
      success: true,
      message: 'Test notification sent successfully',
    });
  } catch (error: any) {
    logger.error('Error in sendTestNotification handler', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}
