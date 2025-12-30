import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createResponse, createErrorResponse, authenticateRequest } from '../middleware/auth';
import {
  getUserNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} from '../services/notificationService';

/**
 * Get notifications for the authenticated user
 */
export async function getNotificationsHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const authResult = await authenticateRequest(event);
    if (!authResult.authenticated || !authResult.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = authResult.event.userId!;
    const queryParams = event.queryStringParameters || {};

    const limit = parseInt(queryParams.limit || '50', 10);
    const unreadOnly = queryParams.unreadOnly === 'true';
    const type = queryParams.type as 'like' | 'comment' | 'follow' | 'trade' | 'mention' | undefined;
    const lastEvaluatedKey = queryParams.lastEvaluatedKey;

    const result = await getUserNotifications(userId, {
      limit,
      unreadOnly,
      type,
      lastEvaluatedKey,
    });

    return createResponse(200, {
      success: true,
      data: result.notifications,
      count: result.notifications.length,
      lastEvaluatedKey: result.lastEvaluatedKey,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error getting notifications:', errorMessage, errorDetails);
    return createErrorResponse(500, 'Internal server error');
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCountHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const authResult = await authenticateRequest(event);
    if (!authResult.authenticated || !authResult.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = authResult.event.userId!;
    const count = await getUnreadCount(userId);

    return createResponse(200, {
      success: true,
      count,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error getting unread count:', errorMessage, errorDetails);
    return createErrorResponse(500, 'Internal server error');
  }
}

/**
 * Mark notification as read
 */
export async function markAsReadHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const authResult = await authenticateRequest(event);
    if (!authResult.authenticated || !authResult.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = authResult.event.userId!;
    const notificationId = event.pathParameters?.notificationId;

    if (!notificationId) {
      return createErrorResponse(400, 'Missing notificationId');
    }

    await markNotificationAsRead(userId, notificationId);

    return createResponse(200, {
      success: true,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error marking notification as read:', errorMessage, errorDetails);
    return createErrorResponse(500, 'Internal server error');
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsReadHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const authResult = await authenticateRequest(event);
    if (!authResult.authenticated || !authResult.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = authResult.event.userId!;
    await markAllAsRead(userId);

    return createResponse(200, {
      success: true,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error marking all as read:', errorMessage, errorDetails);
    return createErrorResponse(500, 'Internal server error');
  }
}

/**
 * Delete a notification
 */
export async function deleteNotificationHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const authResult = await authenticateRequest(event);
    if (!authResult.authenticated || !authResult.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = authResult.event.userId!;
    const notificationId = event.pathParameters?.notificationId;

    if (!notificationId) {
      return createErrorResponse(400, 'Missing notificationId');
    }

    await deleteNotification(userId, notificationId);

    return createResponse(200, {
      success: true,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error deleting notification:', errorMessage, errorDetails);
    return createErrorResponse(500, 'Internal server error');
  }
}

/**
 * Delete all notifications
 */
export async function deleteAllNotificationsHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const authResult = await authenticateRequest(event);
    if (!authResult.authenticated || !authResult.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = authResult.event.userId!;
    await deleteAllNotifications(userId);

    return createResponse(200, {
      success: true,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error deleting all notifications:', errorMessage, errorDetails);
    return createErrorResponse(500, 'Internal server error');
  }
}

