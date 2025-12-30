import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { authenticateRequest, createResponse, createErrorResponse } from '../middleware/auth';
import {
  executeTrade as executeTradeService,
  getUserPortfolio,
  getTransactions,
  getAllEntities,
  getEntityPrice,
  getPriceHistory,
  getAllEntityPrices,
} from '../services/tradingService';

export async function executeTrade(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    // Market Hours Logic (Server-Side Enforcement)
    // Use Intl API to get proper EST/EDT time (handles DST automatically)
    const now = new Date();
    const estTimeString = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      hour12: false,
      timeZoneName: 'short',
    }).formatToParts(now);
    
    const hours = parseInt(estTimeString.find(part => part.type === 'hour')?.value || '0', 10);

    // Market Closed: 2:00 AM - 8:00 AM EST/EDT
    if (hours >= 2 && hours < 8) {
      return createErrorResponse(400, 'Market is closed (2am-8am EST/EDT)');
    }

    const userId = auth.event.userId!;
    const body = JSON.parse(event.body || '{}');

    const { entityId, type, quantity, pricePerToken, idempotencyKey } = body;

    if (!entityId || !type || !quantity || !pricePerToken) {
      return createErrorResponse(400, 'Missing required fields: entityId, type, quantity, pricePerToken');
    }

    if (type !== 'buy' && type !== 'sell') {
      return createErrorResponse(400, 'Type must be "buy" or "sell"');
    }

    if (quantity <= 0) {
      return createErrorResponse(400, 'Quantity must be greater than 0');
    }

    // Price slippage protection: Fetch current market price
    const currentMarketPrice = await getEntityPrice(entityId);
    
    if (currentMarketPrice === null) {
      return createErrorResponse(400, 'Unable to fetch current market price for this entity');
    }

    // Calculate price difference percentage
    const priceDifferencePercent = Math.abs((pricePerToken - currentMarketPrice) / currentMarketPrice) * 100;
    const SLIPPAGE_THRESHOLD_PERCENT = 2.0; // 2% slippage tolerance

    // If price difference exceeds threshold, reject the trade
    if (priceDifferencePercent > SLIPPAGE_THRESHOLD_PERCENT) {
      return createErrorResponse(400, 
        `Price slippage too high: Requested ${pricePerToken.toFixed(2)}, Current ${currentMarketPrice.toFixed(2)} (${priceDifferencePercent.toFixed(2)}% difference). Please refresh and try again.`
      );
    }

    // Use current market price to prevent any slippage
    const executionPrice = currentMarketPrice;

    const result = await executeTradeService(userId, entityId, type, quantity, executionPrice, idempotencyKey);

    if (!result.success) {
      return createErrorResponse(400, result.error || 'Trade execution failed');
    }

    // Include execution details in response
    const executionDetails = {
      requestedPrice: pricePerToken,
      executionPrice: executionPrice,
      priceAdjusted: Math.abs(executionPrice - pricePerToken) > 0.01, // If adjusted by more than 1 cent
      slippagePercent: priceDifferencePercent,
    };

    return createResponse(200, {
      success: true,
      data: result.portfolio,
      executionDetails,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error executing trade:', errorMessage, errorDetails);
    return createErrorResponse(500, 'Internal server error');
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error getting portfolio:', errorMessage, errorDetails);
    return createErrorResponse(500, 'Internal server error');
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error getting transactions:', errorMessage, errorDetails);
    return createErrorResponse(500, 'Internal server error');
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error getting entities:', errorMessage, errorDetails);
    return createErrorResponse(500, 'Internal server error');
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error getting entity price:', errorMessage, errorDetails);
    return createErrorResponse(500, 'Internal server error');
  }
}

export async function getPriceHistoryHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Extract entityId from path: /api/entities/:entityId/price-history
    const path = event.path || '';
    const match = path.match(/\/api\/entities\/(\d+)\/price-history/);
    const entityId = match ? parseInt(match[1], 10) : parseInt(event.pathParameters?.entityId || '0', 10);

    if (!entityId || isNaN(entityId)) {
      return createErrorResponse(400, 'Invalid entityId');
    }

    const timeRange = (event.queryStringParameters?.timeRange || 'ALL') as '1D' | '1W' | '1M' | 'ALL';
    const limit = parseInt(event.queryStringParameters?.limit || '100', 10);

    if (limit > 1000) {
      return createErrorResponse(400, 'Limit cannot exceed 1000');
    }

    if (!['1D', '1W', '1M', 'ALL'].includes(timeRange)) {
      return createErrorResponse(400, 'Invalid timeRange. Must be one of: 1D, 1W, 1M, ALL');
    }

    const priceHistory = await getPriceHistory(entityId, timeRange, limit);

    return createResponse(200, {
      success: true,
      data: priceHistory.map(item => ({
        timestamp: item.timestamp,
        price: item.price,
      })),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error getting price history:', errorMessage, errorDetails);
    return createErrorResponse(500, 'Internal server error');
  }
}

/**
 * Get all entity prices (public endpoint, no auth required)
 * More efficient than fetching all entities when you only need prices
 */
export async function getAllPricesHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const prices = await getAllEntityPrices();

    return createResponse(200, {
      success: true,
      data: prices,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error getting all prices:', errorMessage, errorDetails);
    return createErrorResponse(500, 'Internal server error');
  }
}

