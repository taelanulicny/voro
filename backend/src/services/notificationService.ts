import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import { PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { Notification } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a notification
 */
export async function createNotification(notification: Omit<Notification, 'notificationId' | 'createdAt' | 'isRead'>): Promise<Notification> {
  const notificationId = uuidv4();
  const now = new Date().toISOString();

  const newNotification: Notification = {
    ...notification,
    notificationId,
    isRead: false,
    createdAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAMES.NOTIFICATIONS,
      Item: newNotification,
    })
  );

  return newNotification;
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  options: {
    limit?: number;
    unreadOnly?: boolean;
    type?: Notification['type'];
    lastEvaluatedKey?: string;
  } = {}
): Promise<{ notifications: Notification[]; lastEvaluatedKey?: string }> {
  const { limit = 50, unreadOnly = false, type, lastEvaluatedKey } = options;

  // Use GSI for sorting by createdAt
  const queryParams: any = {
    TableName: TABLE_NAMES.NOTIFICATIONS,
    IndexName: 'userId-createdAt-index',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
    ScanIndexForward: false, // Sort descending (newest first)
    Limit: limit,
  };

  // Filter by read status
  if (unreadOnly) {
    queryParams.FilterExpression = 'isRead = :isRead';
    queryParams.ExpressionAttributeValues[':isRead'] = false;
  }

  // Filter by type
  if (type) {
    if (queryParams.FilterExpression) {
      queryParams.FilterExpression += ' AND #type = :type';
    } else {
      queryParams.FilterExpression = '#type = :type';
    }
    queryParams.ExpressionAttributeNames = { '#type': 'type' };
    queryParams.ExpressionAttributeValues[':type'] = type;
  }

  if (lastEvaluatedKey) {
    queryParams.ExclusiveStartKey = JSON.parse(lastEvaluatedKey);
  }

  const result = await docClient.send(new QueryCommand(queryParams));

  return {
    notifications: (result.Items || []) as Notification[],
    lastEvaluatedKey: result.LastEvaluatedKey ? JSON.stringify(result.LastEvaluatedKey) : undefined,
  };
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const result = await getUserNotifications(userId, {
    limit: 1000, // Get all to count
    unreadOnly: true,
  });

  return result.notifications.length;
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAMES.NOTIFICATIONS,
      Key: {
        userId,
        notificationId,
      },
      UpdateExpression: 'SET isRead = :isRead',
      ExpressionAttributeValues: {
        ':isRead': true,
      },
    })
  );
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<void> {
  // Get all unread notifications
  const { notifications } = await getUserNotifications(userId, {
    limit: 1000,
    unreadOnly: true,
  });

  // Update each one
  for (const notification of notifications) {
    await markNotificationAsRead(userId, notification.notificationId);
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(userId: string, notificationId: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAMES.NOTIFICATIONS,
      Key: {
        userId,
        notificationId,
      },
    })
  );
}

/**
 * Delete all notifications for a user
 */
export async function deleteAllNotifications(userId: string): Promise<void> {
  const { notifications } = await getUserNotifications(userId, {
    limit: 1000,
  });

  for (const notification of notifications) {
    await deleteNotification(userId, notification.notificationId);
  }
}

/**
 * Helper functions to create specific notification types
 */
export async function createLikeNotification(
  recipientUserId: string,
  actorUserId: string,
  actorUsername: string,
  actorDisplayName: string,
  actorAvatarUrl: string | undefined,
  postId: string
): Promise<Notification> {
  return createNotification({
    userId: recipientUserId,
    type: 'like',
    title: 'New Like',
    message: `${actorDisplayName} liked your post`,
    actorUserId,
    actorUsername,
    actorDisplayName,
    actorAvatarUrl,
    postId,
  });
}

export async function createCommentNotification(
  recipientUserId: string,
  actorUserId: string,
  actorUsername: string,
  actorDisplayName: string,
  actorAvatarUrl: string | undefined,
  postId: string,
  commentId: string
): Promise<Notification> {
  return createNotification({
    userId: recipientUserId,
    type: 'comment',
    title: 'New Comment',
    message: `${actorDisplayName} commented on your post`,
    actorUserId,
    actorUsername,
    actorDisplayName,
    actorAvatarUrl,
    postId,
    commentId,
  });
}

export async function createReplyNotification(
  recipientUserId: string,
  actorUserId: string,
  actorUsername: string,
  actorDisplayName: string,
  actorAvatarUrl: string | undefined,
  postId: string,
  commentId: string
): Promise<Notification> {
  return createNotification({
    userId: recipientUserId,
    type: 'reply',
    title: 'New Reply',
    message: `${actorDisplayName} replied to your comment`,
    actorUserId,
    actorUsername,
    actorDisplayName,
    actorAvatarUrl,
    postId,
    commentId,
  });
}

export async function createFollowNotification(
  recipientUserId: string,
  actorUserId: string,
  actorUsername: string,
  actorDisplayName: string,
  actorAvatarUrl: string | undefined
): Promise<Notification> {
  return createNotification({
    userId: recipientUserId,
    type: 'follow',
    title: 'New Follower',
    message: `${actorDisplayName} started following you`,
    actorUserId,
    actorUsername,
    actorDisplayName,
    actorAvatarUrl,
  });
}

export async function createMentionNotification(
  recipientUserId: string,
  actorUserId: string,
  actorUsername: string,
  actorDisplayName: string,
  actorAvatarUrl: string | undefined,
  postId: string
): Promise<Notification> {
  return createNotification({
    userId: recipientUserId,
    type: 'mention',
    title: 'You were mentioned',
    message: `${actorDisplayName} mentioned you in a post`,
    actorUserId,
    actorUsername,
    actorDisplayName,
    actorAvatarUrl,
    postId,
  });
}

export async function createPriceAlertNotification(
  userId: string,
  entityId: number,
  entityTicker: string,
  entityName: string,
  targetPrice: number,
  currentPrice: number,
  alertType: 'above' | 'below'
): Promise<Notification> {
  return createNotification({
    userId,
    type: 'price_alert',
    title: 'Price Alert',
    message: `${entityTicker} ${alertType === 'above' ? 'rose above' : 'fell below'} ${targetPrice.toFixed(2)}`,
    entityId,
    entityTicker,
    entityName,
    targetPrice,
    currentPrice,
  });
}

export async function createGroupInviteNotification(
  recipientUserId: string,
  actorUserId: string,
  actorUsername: string,
  actorDisplayName: string,
  actorAvatarUrl: string | undefined,
  groupId: string,
  groupName: string
): Promise<Notification> {
  return createNotification({
    userId: recipientUserId,
    type: 'group_invite',
    title: 'Group Invitation',
    message: `${actorDisplayName} invited you to join ${groupName}`,
    actorUserId,
    actorUsername,
    actorDisplayName,
    actorAvatarUrl,
    groupId,
    groupName,
  });
}

export async function createGroupPostNotification(
  recipientUserId: string,
  actorUserId: string,
  actorUsername: string,
  actorDisplayName: string,
  actorAvatarUrl: string | undefined,
  groupId: string,
  groupName: string,
  postId: string
): Promise<Notification> {
  return createNotification({
    userId: recipientUserId,
    type: 'group_post',
    title: 'New Group Post',
    message: `${actorDisplayName} posted in ${groupName}`,
    actorUserId,
    actorUsername,
    actorDisplayName,
    actorAvatarUrl,
    groupId,
    groupName,
    postId,
  });
}

export async function createSystemNotification(
  userId: string,
  title: string,
  message: string,
  actionUrl?: string,
  metadata?: Record<string, any>
): Promise<Notification> {
  return createNotification({
    userId,
    type: 'system',
    title,
    message,
    actionUrl,
    metadata,
  });
}

