import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import { PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { GroupMessage } from '../models/types';

function generateMessageId(): string {
  const now = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 11);
  return `${now}-${random}`;
}

export async function sendGroupMessage(
  groupId: string,
  userId: string,
  content: string
): Promise<{ success: boolean; message?: GroupMessage & { username?: string; displayName?: string }; error?: string }> {
  try {
    const messageId = generateMessageId();
    const createdAt = new Date().toISOString();

    const message: GroupMessage = {
      groupId,
      messageId,
      userId,
      content: (content || '').trim().substring(0, 4000),
      createdAt,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.GROUP_MESSAGES,
        Item: message,
      })
    );

    return { success: true, message: { ...message } as GroupMessage & { username?: string; displayName?: string } };
  } catch (error: any) {
    console.error('Error sending group message:', error);
    return { success: false, error: error.message || 'Failed to send message' };
  }
}

export async function getGroupMessages(
  groupId: string,
  limit: number = 50,
  beforeMessageId?: string
): Promise<{ messages: (GroupMessage & { username?: string; displayName?: string; avatarUrl?: string })[]; lastEvaluatedKey?: string }> {
  try {
    const params: any = {
      TableName: TABLE_NAMES.GROUP_MESSAGES,
      KeyConditionExpression: 'groupId = :groupId',
      ExpressionAttributeValues: { ':groupId': groupId },
      Limit: Math.min(limit, 100),
      ScanIndexForward: false, // newest first
    };

    if (beforeMessageId) {
      params.ExclusiveStartKey = { groupId, messageId: beforeMessageId };
    }

    const result = await docClient.send(new QueryCommand(params));
    const items = (result.Items || []) as GroupMessage[];

    return {
      messages: items,
      lastEvaluatedKey: result.LastEvaluatedKey
        ? JSON.stringify(result.LastEvaluatedKey)
        : undefined,
    };
  } catch (error: any) {
    console.error('Error getting group messages:', error);
    return { messages: [] };
  }
}

export async function deleteGroupMessages(groupId: string): Promise<void> {
  try {
    let lastKey: Record<string, any> | undefined;
    do {
      const params: any = {
        TableName: TABLE_NAMES.GROUP_MESSAGES,
        KeyConditionExpression: 'groupId = :groupId',
        ExpressionAttributeValues: { ':groupId': groupId },
        Limit: 25,
      };
      if (lastKey) params.ExclusiveStartKey = lastKey;
      const result = await docClient.send(new QueryCommand(params));
      const items = result.Items || [];
      for (const item of items) {
        await docClient.send(
          new DeleteCommand({
            TableName: TABLE_NAMES.GROUP_MESSAGES,
            Key: { groupId, messageId: item.messageId },
          })
        );
      }
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);
  } catch (error: any) {
    console.error('Error deleting group messages:', error);
  }
}
