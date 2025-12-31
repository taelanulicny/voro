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
} from '../services/groupService';
import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import { GetCommand } from '@aws-sdk/lib-dynamodb';

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

    // Check if user is a member of the group
    const userId = auth.event.userId!;
    const member = await isGroupMember(userId, groupId);
    if (!member) {
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

