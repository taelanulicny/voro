import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { authenticateRequest, createResponse, createErrorResponse } from '../middleware/auth';
import {
  executeTrade as executeTradeService,
  getUserPortfolio,
  getTransactions,
  getAllEntities,
  getEntityPrice,
} from '../services/tradingService';

export async function executeTrade(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const body = JSON.parse(event.body || '{}');

    const { entityId, type, quantity, pricePerToken } = body;

    if (!entityId || !type || !quantity || !pricePerToken) {
      return createErrorResponse(400, 'Missing required fields: entityId, type, quantity, pricePerToken');
    }

    if (type !== 'buy' && type !== 'sell') {
      return createErrorResponse(400, 'Type must be "buy" or "sell"');
    }

    if (quantity <= 0) {
      return createErrorResponse(400, 'Quantity must be greater than 0');
    }

    const result = await executeTradeService(userId, entityId, type, quantity, pricePerToken);

    if (!result.success) {
      return createErrorResponse(400, result.error || 'Trade execution failed');
    }

    return createResponse(200, {
      success: true,
      data: result.portfolio,
    });
  } catch (error: any) {
    console.error('Error executing trade:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function getPortfolio(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const portfolio = await getUserPortfolio(userId);

    return createResponse(200, {
      success: true,
      data: portfolio,
    });
  } catch (error: any) {
    console.error('Error getting portfolio:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function getTransactionsHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const limit = parseInt(event.queryStringParameters?.limit || '50', 10);
    const lastKey = event.queryStringParameters?.lastKey;

    const result = await getTransactions(userId, limit, lastKey);

    return createResponse(200, {
      success: true,
      data: {
        transactions: result.transactions,
        lastEvaluatedKey: result.lastEvaluatedKey,
      },
    });
  } catch (error: any) {
    console.error('Error getting transactions:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function getAllEntitiesHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const category = event.queryStringParameters?.category;
    const entities = await getAllEntities(category);

    // Get current prices for each entity
    const entitiesWithPrices = await Promise.all(
      entities.map(async (entity) => {
        const price = await getEntityPrice(entity.entityId);
        return {
          ...entity,
          currentPrice: price || entity.basePrice,
          change24h: 0, // Would calculate from price history
          changePercent24h: 0,
          volume24h: 0,
          marketCap: 0,
        };
      })
    );

    return createResponse(200, {
      success: true,
      data: entitiesWithPrices,
    });
  } catch (error: any) {
    console.error('Error getting entities:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function getEntityPriceHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const entityId = parseInt(event.pathParameters?.entityId || '0', 10);

    if (!entityId) {
      return createErrorResponse(400, 'Invalid entityId');
    }

    const price = await getEntityPrice(entityId);

    if (price === null) {
      return createErrorResponse(404, 'Entity not found');
    }

    return createResponse(200, {
      success: true,
      data: { entityId, price },
    });
  } catch (error: any) {
    console.error('Error getting entity price:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

