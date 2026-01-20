import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { authenticateRequest, createResponse, createErrorResponse } from '../middleware/auth';
import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import { PutCommand, DeleteCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { Watchlist } from '../models/types';
import { logger } from '../utils/logger';

export async function addToWatchlist(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const body = JSON.parse(event.body || '{}');
    const { entityId } = body;

    if (!entityId) {
      return createErrorResponse(400, 'Missing entityId');
    }

    const watchlistItem: Watchlist = {
      userId,
      entityId,
      addedAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.WATCHLISTS,
        Item: watchlistItem,
      })
    );

    return createResponse(201, {
      success: true,
      data: watchlistItem,
    });
  } catch (error: any) {
    logger.error('Error adding to watchlist', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function removeFromWatchlist(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const entityId = parseInt(event.pathParameters?.entityId || '0', 10);

    if (!entityId) {
      return createErrorResponse(400, 'Invalid entityId');
    }

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAMES.WATCHLISTS,
        Key: {
          userId,
          entityId,
        },
      })
    );

    return createResponse(200, {
      success: true,
    });
  } catch (error: any) {
    logger.error('Error removing from watchlist', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function getWatchlist(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.WATCHLISTS,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      })
    );

    // Get entity details for each watchlist item
    const watchlistItems = await Promise.all(
      ((result.Items || []) as Watchlist[]).map(async (item) => {
        const entityResult = await docClient.send(
          new GetCommand({
            TableName: TABLE_NAMES.ENTITIES,
            Key: { entityId: item.entityId },
          })
        );

        const entity = entityResult.Item;
        return {
          entityId: item.entityId,
          entityName: entity?.name,
          category: entity?.category,
          addedAt: item.addedAt,
        };
      })
    );

    return createResponse(200, {
      success: true,
      data: watchlistItems,
    });
  } catch (error: any) {
    logger.error('Error getting watchlist', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

