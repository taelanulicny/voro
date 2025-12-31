import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { authenticateRequest, createResponse, createErrorResponse } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  getTrendingEntities,
  getMovers,
  getMostDiscussed,
  getDiscoverEntities,
  getForYouEntities,
} from '../services/categoryService';

export async function getTrendingHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const queryParams = event.queryStringParameters || {};
    const limit = parseInt(queryParams.limit || '20', 10);

    if (limit > 100) {
      return createErrorResponse(400, 'Limit cannot exceed 100');
    }

    const entities = await getTrendingEntities(limit);

    return createResponse(200, {
      entities,
      timeframe: '24h',
    });
  } catch (error: any) {
    logger.error('Error in getTrendingHandler', error);
    return createErrorResponse(500, error.message || 'Failed to get trending entities');
  }
}

export async function getMoversHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const queryParams = event.queryStringParameters || {};
    const limit = parseInt(queryParams.limit || '20', 10);

    if (limit > 100) {
      return createErrorResponse(400, 'Limit cannot exceed 100');
    }

    const { gainers, losers } = await getMovers(limit);

    return createResponse(200, {
      gainers,
      losers,
    });
  } catch (error: any) {
    logger.error('Error in getMoversHandler', error);
    return createErrorResponse(500, error.message || 'Failed to get movers');
  }
}

export async function getDiscussedHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const queryParams = event.queryStringParameters || {};
    const limit = parseInt(queryParams.limit || '20', 10);

    if (limit > 100) {
      return createErrorResponse(400, 'Limit cannot exceed 100');
    }

    const entities = await getMostDiscussed(limit);

    return createResponse(200, {
      entities,
    });
  } catch (error: any) {
    logger.error('Error in getDiscussedHandler', error);
    return createErrorResponse(500, error.message || 'Failed to get most discussed entities');
  }
}

export async function getDiscoverHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const queryParams = event.queryStringParameters || {};
    const category = queryParams.category;
    const limit = parseInt(queryParams.limit || '20', 10);
    const cursor = queryParams.cursor;

    if (limit > 100) {
      return createErrorResponse(400, 'Limit cannot exceed 100');
    }

    const result = await getDiscoverEntities(category, limit, cursor);

    return createResponse(200, {
      entities: result.entities,
      nextCursor: result.nextCursor,
    });
  } catch (error: any) {
    logger.error('Error in getDiscoverHandler', error);
    return createErrorResponse(500, error.message || 'Failed to get discover entities');
  }
}

export async function getForYouHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const queryParams = event.queryStringParameters || {};
    const limit = parseInt(queryParams.limit || '20', 10);

    if (limit > 100) {
      return createErrorResponse(400, 'Limit cannot exceed 100');
    }

    const result = await getForYouEntities(userId, limit);

    return createResponse(200, {
      entities: result.entities,
      reasons: result.reasons,
    });
  } catch (error: any) {
    logger.error('Error in getForYouHandler', error);
    return createErrorResponse(500, error.message || 'Failed to get for-you entities');
  }
}

