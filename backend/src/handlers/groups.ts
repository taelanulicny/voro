import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { authenticateRequest, createResponse, createErrorResponse } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  createGroup,
  getGroups,
  getGroup,
  getUserGroups,
  joinGroup,
  leaveGroup,
  deleteGroup,
  isGroupMember,
  getGroupMembers,
  updateMemberRole,
  removeMember,
} from '../services/groupService';
import { sendGroupMessage, getGroupMessages } from '../services/groupMessageService';
import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { GroupMessage } from '../models/types';

export async function createGroupHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const body = JSON.parse(event.body || '{}');
    const { name, description, category, isPrivate } = body;

    if (!name || !description || !category) {
      return createErrorResponse(400, 'Missing required fields: name, description, category');
    }

    const result = await createGroup(userId, name, description, category, isPrivate || false);

    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to create group');
    }

    return createResponse(201, { group: result.group });
  } catch (error: any) {
    logger.error('Error in createGroupHandler', error);
    return createErrorResponse(500, error.message || 'Failed to create group');
  }
}

export async function getGroupsHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const queryParams = event.queryStringParameters || {};
    const limit = parseInt(queryParams.limit || '50', 10);
    const lastKey = queryParams.lastKey;
    const category = queryParams.category;

    const result = await getGroups(limit, lastKey, category);

    // Mark membership status if authenticated
    const auth = await authenticateRequest(event);
    if (auth.authenticated && auth.event?.userId) {
      const userId = auth.event.userId;
      const groupsWithMembership = await Promise.all(
        result.groups.map(async (group) => ({
          ...group,
          isMember: await isGroupMember(userId, group.groupId),
        }))
      );
      return createResponse(200, { groups: groupsWithMembership, lastEvaluatedKey: result.lastEvaluatedKey });
    }

    return createResponse(200, { groups: result.groups, lastEvaluatedKey: result.lastEvaluatedKey });
  } catch (error: any) {
    logger.error('Error in getGroupsHandler', error);
    return createErrorResponse(500, error.message || 'Failed to get groups');
  }
}

export async function getGroupHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const groupId = event.pathParameters?.groupId;
    if (!groupId) {
      return createErrorResponse(400, 'Group ID is required');
    }

    const group = await getGroup(groupId);
    if (!group) {
      return createErrorResponse(404, 'Group not found');
    }

    // Check membership if authenticated
    const auth = await authenticateRequest(event);
    let isMember = false;
    if (auth.authenticated && auth.event?.userId) {
      isMember = await isGroupMember(auth.event.userId, groupId);
    }

    return createResponse(200, { group: { ...group, isMember } });
  } catch (error: any) {
    logger.error('Error in getGroupHandler', error);
    return createErrorResponse(500, error.message || 'Failed to get group');
  }
}

export async function getUserGroupsHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const groups = await getUserGroups(userId);

    return createResponse(200, { groups });
  } catch (error: any) {
    logger.error('Error in getUserGroupsHandler', error);
    return createErrorResponse(500, error.message || 'Failed to get user groups');
  }
}

export async function joinGroupHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const groupId = event.pathParameters?.groupId;
    if (!groupId) {
      return createErrorResponse(400, 'Group ID is required');
    }

    const result = await joinGroup(userId, groupId);
    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to join group');
    }

    return createResponse(200, { success: true });
  } catch (error: any) {
    logger.error('Error in joinGroupHandler', error);
    return createErrorResponse(500, error.message || 'Failed to join group');
  }
}

export async function leaveGroupHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const groupId = event.pathParameters?.groupId;
    if (!groupId) {
      return createErrorResponse(400, 'Group ID is required');
    }

    const result = await leaveGroup(userId, groupId);
    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to leave group');
    }

    return createResponse(200, { success: true });
  } catch (error: any) {
    logger.error('Error in leaveGroupHandler', error);
    return createErrorResponse(500, error.message || 'Failed to leave group');
  }
}

export async function deleteGroupHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const groupId = event.pathParameters?.groupId;
    if (!groupId) {
      return createErrorResponse(400, 'Group ID is required');
    }

    const result = await deleteGroup(userId, groupId);
    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to delete group');
    }

    return createResponse(200, { success: true });
  } catch (error: any) {
    logger.error('Error in deleteGroupHandler', error);
    return createErrorResponse(500, error.message || 'Failed to delete group');
  }
}

export async function getGroupMembersHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const groupId = event.pathParameters?.groupId;
    if (!groupId) {
      return createErrorResponse(400, 'Group ID is required');
    }

    const userId = auth.event.userId!;

    // Check if user is the owner or a member of the group
    const group = await getGroup(groupId);
    if (!group) {
      return createErrorResponse(404, 'Group not found');
    }

    const isOwner = group.ownerId === userId;
    const isMember = isOwner || await isGroupMember(userId, groupId);

    if (!isMember) {
      return createErrorResponse(403, 'You must be a member to view group members');
    }

    const members = await getGroupMembers(groupId);
    
    // Get user details for each member
    const membersWithDetails = await Promise.all(
      members.map(async (member) => {
        try {
          const userResult = await docClient.send(
            new GetCommand({
              TableName: TABLE_NAMES.USERS,
              Key: { userId: member.userId },
            })
          );
          
          if (userResult.Item) {
            return {
              ...member,
              username: userResult.Item.username,
              displayName: userResult.Item.displayName,
              avatarUrl: userResult.Item.avatarUrl,
            };
          }
          return member;
        } catch (error) {
          logger.warn('Error fetching user details for member', { userId: member.userId, error });
          return member;
        }
      })
    );

    return createResponse(200, { members: membersWithDetails });
  } catch (error: any) {
    logger.error('Error in getGroupMembersHandler', error);
    return createErrorResponse(500, error.message || 'Failed to get group members');
  }
}

type MessageWithUser = GroupMessage & { username?: string; displayName?: string; avatarUrl?: string; timestamp?: string; id?: string };

async function enrichMessageWithUser(msg: GroupMessage & { username?: string; displayName?: string; avatarUrl?: string }): Promise<MessageWithUser> {
  try {
    const userResult = await docClient.send(
      new GetCommand({ TableName: TABLE_NAMES.USERS, Key: { userId: msg.userId } })
    );
    if (userResult.Item) {
      return {
        ...msg,
        username: userResult.Item.username,
        displayName: userResult.Item.displayName,
        avatarUrl: userResult.Item.avatarUrl,
        timestamp: msg.createdAt,
        id: msg.messageId,
      } as MessageWithUser;
    }
  } catch (e) {
    logger.warn('Error fetching user for message', { userId: msg.userId });
  }
  return { ...msg, timestamp: msg.createdAt, id: msg.messageId } as MessageWithUser;
}

export async function getGroupMessagesHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const groupId = event.pathParameters?.groupId;
    if (!groupId) {
      return createErrorResponse(400, 'Group ID is required');
    }

    const group = await getGroup(groupId);
    if (!group) return createErrorResponse(404, 'Group not found');

    const isMember = group.ownerId === auth.event.userId || await isGroupMember(auth.event.userId!, groupId);
    if (!isMember) {
      return createErrorResponse(403, 'You must be a member to view group chat');
    }

    const query = event.queryStringParameters || {};
    const limit = Math.min(parseInt(query.limit || '50', 10), 100);
    const beforeMessageId = query.before;

    const result = await getGroupMessages(groupId, limit, beforeMessageId);
    const enriched = await Promise.all(result.messages.map(enrichMessageWithUser));

    return createResponse(200, {
      messages: enriched,
      lastEvaluatedKey: result.lastEvaluatedKey,
    });
  } catch (error: any) {
    logger.error('Error in getGroupMessagesHandler', error);
    return createErrorResponse(500, error.message || 'Failed to get messages');
  }
}

export async function sendGroupMessageHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const groupId = event.pathParameters?.groupId;
    if (!groupId) {
      return createErrorResponse(400, 'Group ID is required');
    }

    const body = JSON.parse(event.body || '{}');
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!content) {
      return createErrorResponse(400, 'Message content is required');
    }

    const group = await getGroup(groupId);
    if (!group) return createErrorResponse(404, 'Group not found');

    const isMember = group.ownerId === auth.event.userId || await isGroupMember(auth.event.userId!, groupId);
    if (!isMember) {
      return createErrorResponse(403, 'You must be a member to send messages');
    }

    const result = await sendGroupMessage(groupId, auth.event.userId!, content);
    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to send message');
    }

    const enriched = await enrichMessageWithUser(result.message as GroupMessage);
    return createResponse(201, { message: enriched });
  } catch (error: any) {
    logger.error('Error in sendGroupMessageHandler', error);
    return createErrorResponse(500, error.message || 'Failed to send message');
  }
}

export async function updateMemberRoleHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const groupId = event.pathParameters?.groupId;
    const targetUserId = event.pathParameters?.userId;
    if (!groupId || !targetUserId) {
      return createErrorResponse(400, 'Group ID and user ID are required');
    }

    const body = JSON.parse(event.body || '{}');
    const role = body.role === 'admin' || body.role === 'member' ? body.role : undefined;
    if (!role) {
      return createErrorResponse(400, 'Valid role (admin or member) is required');
    }

    const result = await updateMemberRole(auth.event.userId!, groupId, targetUserId, role);
    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to update role');
    }

    return createResponse(200, { success: true });
  } catch (error: any) {
    logger.error('Error in updateMemberRoleHandler', error);
    return createErrorResponse(500, error.message || 'Failed to update role');
  }
}

export async function removeMemberHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const groupId = event.pathParameters?.groupId;
    const targetUserId = event.pathParameters?.userId;
    if (!groupId || !targetUserId) {
      return createErrorResponse(400, 'Group ID and user ID are required');
    }

    const result = await removeMember(auth.event.userId!, groupId, targetUserId);
    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to remove member');
    }

    return createResponse(200, { success: true });
  } catch (error: any) {
    logger.error('Error in removeMemberHandler', error);
    return createErrorResponse(500, error.message || 'Failed to remove member');
  }
}