import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { authenticateRequest, createResponse, createErrorResponse } from '../middleware/auth';
import { CognitoIdentityProviderClient, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import { DeleteCommand, QueryCommand, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '../utils/logger';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

export async function deleteAccount(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;

    // Delete from Cognito
    await cognitoClient.send(
      new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: userId,
      })
    );

    // Delete user data from DynamoDB
    // Note: In production, you might want to anonymize instead of delete for GDPR compliance
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAMES.USERS,
        Key: { userId },
      })
    );

    // Delete user's posts, comments, etc. (or anonymize)
    // This is a simplified version - in production, handle all user data

    return createResponse(200, {
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting account', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function blockUser(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const blockedUserId = event.pathParameters?.userId;

    if (!blockedUserId) {
      return createErrorResponse(400, 'Missing userId');
    }

    if (userId === blockedUserId) {
      return createErrorResponse(400, 'Cannot block yourself');
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.BLOCKS,
        Item: {
          userId,
          blockedUserId,
          createdAt: new Date().toISOString(),
        },
      })
    );

    return createResponse(200, {
      success: true,
    });
  } catch (error: any) {
    logger.error('Error blocking user', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function getBlockedUsers(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;

    // Query all blocked users
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.BLOCKS,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      })
    );

    const blocks = result.Items || [];

    // Get user details for each blocked user
    const blockedUsers = await Promise.all(
      blocks.map(async (block: any) => {
        try {
          const userResult = await docClient.send(
            new GetCommand({
              TableName: TABLE_NAMES.USERS,
              Key: { userId: block.blockedUserId },
            })
          );

          if (userResult.Item) {
            return {
              userId: block.blockedUserId,
              username: userResult.Item.username,
              displayName: userResult.Item.displayName,
              avatarUrl: userResult.Item.avatarUrl,
              blockedAt: block.createdAt,
            };
          }
          return null;
        } catch (error) {
          logger.warn('Error fetching blocked user details', { userId: block.blockedUserId, error });
          return null;
        }
      })
    );

    // Filter out nulls (users that might have been deleted)
    const validBlockedUsers = blockedUsers.filter((user) => user !== null);

    return createResponse(200, {
      success: true,
      blockedUsers: validBlockedUsers,
    });
  } catch (error: any) {
    logger.error('Error getting blocked users', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function unblockUser(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const blockedUserId = event.pathParameters?.userId;

    if (!blockedUserId) {
      return createErrorResponse(400, 'Missing userId');
    }

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAMES.BLOCKS,
        Key: {
          userId,
          blockedUserId,
        },
      })
    );

    return createResponse(200, {
      success: true,
    });
  } catch (error: any) {
    logger.error('Error unblocking user', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function reportUser(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const body = JSON.parse(event.body || '{}');
    const { reportedUserId, reason, details } = body;

    if (!reportedUserId || !reason) {
      return createErrorResponse(400, 'Missing required fields: reportedUserId, reason');
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.REPORTS,
        Item: {
          reportId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          reporterUserId: userId,
          reportedUserId,
          reason,
          details,
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
      })
    );

    return createResponse(201, {
      success: true,
      message: 'Report submitted successfully',
    });
  } catch (error: any) {
    logger.error('Error reporting user', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

