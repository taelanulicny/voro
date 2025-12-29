import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import { GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { Group, GroupMember } from '../models/types';

export async function createGroup(
  userId: string,
  name: string,
  description: string,
  category: string,
  isPrivate: boolean
): Promise<{ success: boolean; group?: Group; error?: string }> {
  try {
    const now = new Date().toISOString();
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const group: Group = {
      groupId,
      name,
      description,
      category,
      ownerId: userId,
      isPrivate,
      memberCount: 1,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.GROUPS,
        Item: group,
      })
    );

    // Add creator as owner member
    const member: GroupMember = {
      groupId,
      userId,
      role: 'owner',
      joinedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.GROUP_MEMBERS,
        Item: member,
      })
    );

    return { success: true, group };
  } catch (error: any) {
    console.error('Error creating group:', error);
    return { success: false, error: error.message || 'Failed to create group' };
  }
}

export async function getGroups(
  limit: number = 50,
  lastKey?: string,
  category?: string
): Promise<{ groups: Group[]; lastEvaluatedKey?: string }> {
  try {
    const params: any = {
      TableName: TABLE_NAMES.GROUPS,
      Limit: limit,
    };

    if (category) {
      params.FilterExpression = 'category = :category';
      params.ExpressionAttributeValues = { ':category': category };
    }

    if (lastKey) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(lastKey, 'base64').toString());
    }

    const result = await docClient.send(new ScanCommand(params));

    return {
      groups: (result.Items || []) as Group[],
      lastEvaluatedKey: result.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : undefined,
    };
  } catch (error: any) {
    console.error('Error getting groups:', error);
    throw error;
  }
}

export async function getGroup(groupId: string): Promise<Group | null> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.GROUPS,
        Key: { groupId },
      })
    );

    return (result.Item as Group) || null;
  } catch (error: any) {
    console.error('Error getting group:', error);
    return null;
  }
}

export async function getUserGroups(userId: string): Promise<Group[]> {
  try {
    // Query group members to find all groups user belongs to
    const membersResult = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.GROUP_MEMBERS,
        IndexName: 'userId-groupId-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      })
    );

    const members = (membersResult.Items || []) as GroupMember[];
    const groupIds = members.map((m) => m.groupId);

    // Get all groups
    const groups: Group[] = [];
    for (const groupId of groupIds) {
      const group = await getGroup(groupId);
      if (group) {
        groups.push(group);
      }
    }

    return groups;
  } catch (error: any) {
    console.error('Error getting user groups:', error);
    return [];
  }
}

export async function joinGroup(userId: string, groupId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const group = await getGroup(groupId);
    if (!group) {
      return { success: false, error: 'Group not found' };
    }

    // Check if already a member
    const memberResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.GROUP_MEMBERS,
        Key: { groupId, userId },
      })
    );

    if (memberResult.Item) {
      return { success: false, error: 'Already a member' };
    }

    // Add member
    const now = new Date().toISOString();
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.GROUP_MEMBERS,
        Item: {
          groupId,
          userId,
          role: 'member',
          joinedAt: now,
        },
      })
    );

    // Update member count
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAMES.GROUPS,
        Key: { groupId },
        UpdateExpression: 'SET memberCount = memberCount + :inc, updatedAt = :ua',
        ExpressionAttributeValues: {
          ':inc': 1,
          ':ua': now,
        },
      })
    );

    return { success: true };
  } catch (error: any) {
    console.error('Error joining group:', error);
    return { success: false, error: error.message || 'Failed to join group' };
  }
}

export async function leaveGroup(userId: string, groupId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const group = await getGroup(groupId);
    if (!group) {
      return { success: false, error: 'Group not found' };
    }

    // Check if owner (owners can't leave, must delete group)
    const memberResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.GROUP_MEMBERS,
        Key: { groupId, userId },
      })
    );

    if (!memberResult.Item) {
      return { success: false, error: 'Not a member' };
    }

    const member = memberResult.Item as GroupMember;
    if (member.role === 'owner') {
      return { success: false, error: 'Group owner cannot leave. Delete the group instead.' };
    }

    // Remove member
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAMES.GROUP_MEMBERS,
        Key: { groupId, userId },
      })
    );

    // Update member count
    const now = new Date().toISOString();
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAMES.GROUPS,
        Key: { groupId },
        UpdateExpression: 'SET memberCount = memberCount - :dec, updatedAt = :ua',
        ExpressionAttributeValues: {
          ':dec': 1,
          ':ua': now,
        },
      })
    );

    return { success: true };
  } catch (error: any) {
    console.error('Error leaving group:', error);
    return { success: false, error: error.message || 'Failed to leave group' };
  }
}

export async function deleteGroup(userId: string, groupId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const group = await getGroup(groupId);
    if (!group) {
      return { success: false, error: 'Group not found' };
    }

    if (group.ownerId !== userId) {
      return { success: false, error: 'Only group owner can delete the group' };
    }

    // Delete all members first
    const membersResult = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.GROUP_MEMBERS,
        KeyConditionExpression: 'groupId = :groupId',
        ExpressionAttributeValues: {
          ':groupId': groupId,
        },
      })
    );

    const members = membersResult.Items || [];
    for (const member of members) {
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAMES.GROUP_MEMBERS,
          Key: { groupId, userId: member.userId },
        })
      );
    }

    // Delete group
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAMES.GROUPS,
        Key: { groupId },
      })
    );

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting group:', error);
    return { success: false, error: error.message || 'Failed to delete group' };
  }
}

export async function isGroupMember(userId: string, groupId: string): Promise<boolean> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.GROUP_MEMBERS,
        Key: { groupId, userId },
      })
    );

    return !!result.Item;
  } catch (error) {
    return false;
  }
}

