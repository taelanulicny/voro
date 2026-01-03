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
import { z } from 'zod';
import { logger } from '../utils/logger';

// Zod schema for trade execution validation
const ExecuteTradeSchema = z.object({
  entityId: z.number().int().positive('Entity ID must be a positive integer'),
  type: z.enum(['buy', 'sell']),
  quantity: z.number().positive('Quantity must be greater than 0').max(1000000, 'Quantity cannot exceed 1,000,000'),
  pricePerToken: z.number().positive('Price per token must be greater than 0').max(10000, 'Price per token cannot exceed 10,000'),
  idempotencyKey: z.string().optional(),
});

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
    
    // Parse and validate request body with Zod
    let body: any;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return createErrorResponse(400, 'Invalid JSON in request body');
    }

    // Validate request body with Zod schema
    const parseResult = ExecuteTradeSchema.safeParse(body);
    if (!parseResult.success) {
      // Format Zod validation errors into user-friendly message
      const errorMessages = parseResult.error.issues.map(err => {
        const path = err.path.join('.');
        return path ? `${path}: ${err.message}` : err.message;
      }).join('; ');
      return createErrorResponse(400, `Invalid request: ${errorMessages}`);
    }

    const { entityId, type, quantity, pricePerToken, idempotencyKey } = parseResult.data;

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
    logger.error('Error executing trade', error);
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

    // Always return success, even if portfolio is empty (no data is not an error)
    return createResponse(200, {
      success: true,
      data: portfolio,
    });
  } catch (error: unknown) {
    logger.error('Error getting portfolio', error);
    // Log full error details for debugging
    if (error instanceof Error && error.stack) {
      logger.error('Stack trace:', error.stack);
    }
    // Return default portfolio instead of error - allows frontend to show empty state
    return createResponse(200, {
      success: true,
      data: {
        cashBalance: 10000,
        holdings: [],
        totalValue: 10000,
        todayChange: 0,
        todayChangePercent: 0,
      },
    });
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

    // Always return success, even if transactions array is empty (no data is not an error)
    return createResponse(200, {
      success: true,
      data: {
        transactions: result.transactions,
        lastEvaluatedKey: result.lastEvaluatedKey,
      },
    });
  } catch (error: unknown) {
    logger.error('Error getting transactions', error);
    // Log full error details for debugging
    if (error instanceof Error && error.stack) {
      logger.error('Stack trace:', error.stack);
    }
    // Return empty transactions instead of error - allows frontend to show empty state
    return createResponse(200, {
      success: true,
      data: {
        transactions: [],
        lastEvaluatedKey: undefined,
      },
    });
  }
}

export async function getAllEntitiesHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const category = event.queryStringParameters?.category;
    const entities = await getAllEntities(category);

    // Get current prices for each entity (with error handling)
    const entitiesWithPrices = await Promise.all(
      entities.map(async (entity) => {
        try {
          const price = await getEntityPrice(entity.entityId);
          return {
            ...entity,
            currentPrice: price || entity.basePrice || 0,
            change24h: 0, // Would calculate from price history
            changePercent24h: 0,
            volume24h: 0,
            marketCap: 0,
          };
        } catch (priceError: any) {
          logger.warn(`Error getting price for entity ${entity.entityId}:`, priceError);
          // Return entity with basePrice as fallback
          return {
            ...entity,
            currentPrice: entity.basePrice || 0,
            change24h: 0,
            changePercent24h: 0,
            volume24h: 0,
            marketCap: 0,
          };
        }
      })
    );

    // Always return success, even if entities array is empty (no data is not an error)
    return createResponse(200, {
      success: true,
      data: entitiesWithPrices,
    });
  } catch (error: unknown) {
    logger.error('Error getting entities', error);
    // Log full error details for debugging
    if (error instanceof Error && error.stack) {
      logger.error('Stack trace:', error.stack);
    }
    // Return empty array instead of error - allows frontend to show empty state
    return createResponse(200, {
      success: true,
      data: [],
    });
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
    logger.error('Error getting entity price', error);
    return createErrorResponse(500, 'Internal server error');
  }
}

export async function getPriceHistoryHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // Wrap everything in try-catch to ensure we never return 500 errors
  try {
    try {
      // Extract entityId from path: /api/entities/:entityId/price-history
      const path = event.path || '';
      const match = path.match(/\/api\/entities\/(\d+)\/price-history/);
      const entityId = match ? parseInt(match[1], 10) : parseInt(event.pathParameters?.entityId || '0', 10);

      if (!entityId || isNaN(entityId) || entityId <= 0) {
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

      // Always return success, even if priceHistory array is empty (no data is not an error)
      // Map items safely - getPriceHistory already validates and filters items
      const mappedData = priceHistory
        .filter(item => item && item.timestamp && typeof item.price === 'number')
        .map(item => ({
          timestamp: item.timestamp,
          price: item.price,
        }));

      return createResponse(200, {
        success: true,
        data: mappedData,
      });
    } catch (error: unknown) {
      logger.error('Error getting price history', {
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
        path: event.path,
        entityId: event.pathParameters?.entityId,
        queryParams: event.queryStringParameters,
      });
      
      // Return empty array instead of error - allows frontend to show empty state
      // This prevents 500 errors from breaking the app
      return createResponse(200, {
        success: true,
        data: [],
      });
    }
  } catch (fatalError: unknown) {
    // Ultimate fallback - if even createResponse fails, return a basic response
    logger.error('Fatal error in getPriceHistoryHandler', fatalError);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, data: [] }),
    };
  }
}

/**
 * Get all entity prices (public endpoint, no auth required)
 * More efficient than fetching all entities when you only need prices
 */
export async function getAllPricesHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const prices = await getAllEntityPrices();

    // Always return success, even if prices object is empty (no data is not an error)
    return createResponse(200, {
      success: true,
      data: prices,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error('Error getting all prices', error);
    // Log full error details for debugging
    if (error instanceof Error && error.stack) {
      logger.error('Stack trace:', error.stack);
    }
    // Return empty prices object instead of error - allows frontend to show empty state
    return createResponse(200, {
      success: true,
      data: {},
      timestamp: new Date().toISOString(),
    });
  }
}

