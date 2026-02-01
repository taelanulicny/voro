import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import { PutCommand, GetCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '../utils/logger';

/**
 * Push Notification Service
 * Manages push notification tokens and sends notifications via Expo Push Notifications
 */

export interface PushToken {
  userId: string;
  token: string; // Expo Push Token
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  createdAt: string;
  updatedAt: string;
}

export interface PushNotification {
  to: string | string[]; // Expo push token(s)
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
}

/**
 * Store or update a push token for a user
 */
export async function storePushToken(
  userId: string,
  token: string,
  deviceId: string,
  platform: 'ios' | 'android' | 'web'
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();

    // Check if token already exists
    const existingToken = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.PUSH_TOKENS,
        Key: {
          userId,
          deviceId,
        },
      })
    );

    const pushToken: PushToken = {
      userId,
      token,
      deviceId,
      platform,
      createdAt: existingToken.Item?.createdAt || now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.PUSH_TOKENS,
        Item: pushToken,
      })
    );

    logger.info('Push token stored successfully', { userId, deviceId, platform });
    return { success: true };
  } catch (error: any) {
    logger.error('Error storing push token', { error, userId });
    return { success: false, error: error.message || 'Failed to store push token' };
  }
}

/**
 * Get all push tokens for a user
 */
export async function getUserPushTokens(userId: string): Promise<PushToken[]> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.PUSH_TOKENS,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      })
    );

    return (result.Items as PushToken[]) || [];
  } catch (error: any) {
    logger.error('Error getting user push tokens', { error, userId });
    return [];
  }
}

/**
 * Delete a push token
 */
export async function deletePushToken(
  userId: string,
  deviceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAMES.PUSH_TOKENS,
        Key: {
          userId,
          deviceId,
        },
      })
    );

    logger.info('Push token deleted successfully', { userId, deviceId });
    return { success: true };
  } catch (error: any) {
    logger.error('Error deleting push token', { error, userId, deviceId });
    return { success: false, error: error.message || 'Failed to delete push token' };
  }
}

/**
 * Send push notification using Expo Push Notification service
 * Requires EXPO_ACCESS_TOKEN environment variable
 */
export async function sendPushNotification(
  notification: PushNotification
): Promise<{ success: boolean; error?: string; tickets?: any[] }> {
  try {
    const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

    // Prepare notification payload
    const messages = Array.isArray(notification.to)
      ? notification.to.map(token => ({
          to: token,
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: notification.sound || 'default',
          badge: notification.badge,
          channelId: notification.channelId || 'default',
          priority: notification.priority || 'high',
        }))
      : [
          {
            to: notification.to,
            title: notification.title,
            body: notification.body,
            data: notification.data || {},
            sound: notification.sound || 'default',
            badge: notification.badge,
            channelId: notification.channelId || 'default',
            priority: notification.priority || 'high',
          },
        ];

    // Send to Expo Push Notification service
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Expo API error: ${response.status} ${errorText}`);
    }

    const result = await response.json() as { data: any[] };

    logger.info('Push notification sent successfully', {
      tickets: result.data,
      recipientCount: messages.length,
    });

    return {
      success: true,
      tickets: result.data,
    };
  } catch (error: any) {
    logger.error('Error sending push notification', { error, notification });
    return {
      success: false,
      error: error.message || 'Failed to send push notification',
    };
  }
}

/**
 * Send notification to a specific user (all their devices)
 */
export async function sendNotificationToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get all push tokens for the user
    const tokens = await getUserPushTokens(userId);

    if (tokens.length === 0) {
      logger.warn('No push tokens found for user', { userId });
      return { success: false, error: 'No push tokens found for user' };
    }

    // Send notification to all tokens
    const result = await sendPushNotification({
      to: tokens.map(t => t.token),
      title,
      body,
      data,
    });

    return result;
  } catch (error: any) {
    logger.error('Error sending notification to user', { error, userId });
    return {
      success: false,
      error: error.message || 'Failed to send notification to user',
    };
  }
}

/**
 * Send notification to multiple users
 */
export async function sendNotificationToUsers(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ success: boolean; sentCount: number; error?: string }> {
  try {
    let sentCount = 0;

    // Send to each user
    for (const userId of userIds) {
      const result = await sendNotificationToUser(userId, title, body, data);
      if (result.success) {
        sentCount++;
      }
    }

    logger.info('Bulk notification sent', { totalUsers: userIds.length, sentCount });

    return {
      success: true,
      sentCount,
    };
  } catch (error: any) {
    logger.error('Error sending bulk notifications', { error });
    return {
      success: false,
      sentCount: 0,
      error: error.message || 'Failed to send bulk notifications',
    };
  }
}
