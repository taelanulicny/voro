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
    const type = queryParams.type as any;
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
  } catch (error: any) {
    console.error('Error getting notifications:', error);
    return createErrorResponse(500, 'Internal server error', error);
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
  } catch (error: any) {
    console.error('Error getting unread count:', error);
    return createErrorResponse(500, 'Internal server error', error);
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
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return createErrorResponse(500, 'Internal server error', error);
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
  } catch (error: any) {
    console.error('Error marking all as read:', error);
    return createErrorResponse(500, 'Internal server error', error);
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
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    return createErrorResponse(500, 'Internal server error', error);
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
  } catch (error: any) {
    console.error('Error deleting all notifications:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

