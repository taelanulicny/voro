import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { authenticateRequest, createResponse, createErrorResponse } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  getTrendingEntities,
  getMovers,
  getMostDiscussed,
  getDiscoverEntities,
  getForYouEntities,
  getCategoryVolumes,
} from '../services/categoryService';
import { getCategoryPosts } from '../services/socialService';

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
      timeframe: 'session',
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

export async function getCategoryVolumesHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const volumes = await getCategoryVolumes();

    return createResponse(200, {
      success: true,
      volumes,
      timeframe: 'session',
    });
  } catch (error: any) {
    logger.error('Error in getCategoryVolumesHandler', error);
    return createErrorResponse(500, error.message || 'Failed to get category volumes');
  }
}

export async function getCategoryPostsHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Extract categoryId from path (handles both /api/categories/:categoryId/posts and /api/social/categories/:categoryId/posts)
    const path = event.path || '';
    let categoryId = event.pathParameters?.categoryId;
    
    // If pathParameters doesn't have it, extract from path manually
    if (!categoryId) {
      const match = path.match(/\/(?:api\/categories|api\/social\/categories)\/([^/]+)\/posts/);
      if (match && match[1]) {
        categoryId = decodeURIComponent(match[1]); // Decode URL-encoded category names like "Music%20Artists"
      }
    } else {
      categoryId = decodeURIComponent(categoryId);
    }
    
    if (!categoryId) {
      logger.error('[getCategoryPostsHandler] Missing categoryId', { path, pathParameters: event.pathParameters });
      return createErrorResponse(400, 'Missing categoryId parameter');
    }

    logger.debug('[getCategoryPostsHandler] Processing request', { categoryId, path });

    const limit = parseInt(event.queryStringParameters?.limit || '50', 10);
    const lastKey = event.queryStringParameters?.lastKey;

    if (limit > 100) {
      return createErrorResponse(400, 'Limit cannot exceed 100');
    }

    const result = await getCategoryPosts(categoryId, limit, lastKey);

    return createResponse(200, {
      success: true,
      posts: result.posts,
      lastEvaluatedKey: result.lastEvaluatedKey,
    });
  } catch (error: any) {
    logger.error('Error in getCategoryPostsHandler', error);
    return createErrorResponse(500, error.message || 'Failed to get category posts');
  }
}

export async function getCategoryEntitiesHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Extract categoryId from path
    const path = event.path || '';
    let categoryId = event.pathParameters?.categoryId;
    
    // If pathParameters doesn't have it, extract from path manually
    if (!categoryId) {
      const match = path.match(/\/api\/categories\/([^/]+)(?:\/entities)?$/);
      if (match && match[1]) {
        categoryId = decodeURIComponent(match[1]);
      }
    } else {
      categoryId = decodeURIComponent(categoryId);
    }
    
    if (!categoryId) {
      logger.error('[getCategoryEntitiesHandler] Missing categoryId', { path, pathParameters: event.pathParameters });
      return createErrorResponse(400, 'Missing categoryId parameter');
    }

    logger.debug('[getCategoryEntitiesHandler] Processing request', { categoryId, path });

    // Map categoryId to entity category
    const categoryMap: Record<string, string> = {
      'Influencers': 'People',
      'Music Artists': 'People',
      'Sports': 'Events',
      'Political Figures': 'Politics',
      'Startups': 'Tech',
    };

    const entityCategory = categoryMap[categoryId] || categoryId;
    const limit = parseInt(event.queryStringParameters?.limit || '100', 10);
    const cursor = event.queryStringParameters?.cursor;

    if (limit > 100) {
      return createErrorResponse(400, 'Limit cannot exceed 100');
    }

    const result = await getDiscoverEntities(entityCategory, limit, cursor);

    // Filter entities based on categoryId for People category
    let filteredEntities = result.entities;
    if (categoryId === 'Influencers') {
      filteredEntities = filteredEntities.filter(e => e.entityId >= 11 && e.entityId <= 20);
    } else if (categoryId === 'Music Artists') {
      filteredEntities = filteredEntities.filter(e => e.entityId >= 21 && e.entityId <= 30);
    }

    return createResponse(200, {
      success: true,
      entities: filteredEntities,
      nextCursor: result.nextCursor,
    });
  } catch (error: any) {
    logger.error('Error in getCategoryEntitiesHandler', error);
    return createErrorResponse(500, error.message || 'Failed to get category entities');
  }
}

