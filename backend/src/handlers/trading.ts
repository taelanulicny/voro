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
import { BASE_PRICE } from '../services/priceCalculationService';
import type { PriceHistory } from '../models/types';

// Zod schema for trade execution validation
// Updated to support sentiment-based trading:
// - type: 'open' = open new position, 'close' = close existing position
// - direction: 'positive' | 'negative' (only for 'open' type)
// - tokensCommitted: number of tokens to stake (only for 'open' type)
const ExecuteTradeSchema = z.object({
  entityId: z.number().int().positive('Entity ID must be a positive integer'),
  type: z.enum(['open', 'close']),
  direction: z.enum(['positive', 'negative']).optional(), // Required for 'open', not used for 'close'
  tokensCommitted: z.number().positive('Tokens committed must be greater than 0').max(1000000, 'Tokens cannot exceed 1,000,000').optional(), // Required for 'open'
  // Legacy fields (for backwards compatibility during migration)
  quantity: z.number().optional(),
  pricePerToken: z.number().optional(),
  idempotencyKey: z.string().optional(),
}).refine((data) => {
  // For 'open' type, direction and tokensCommitted are required
  if (data.type === 'open') {
    return data.direction !== undefined && data.tokensCommitted !== undefined && data.tokensCommitted > 0;
  }
  return true;
}, {
  message: "For 'open' type, both 'direction' and 'tokensCommitted' are required",
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

    const { entityId, type, direction, tokensCommitted, quantity, pricePerToken, idempotencyKey } = parseResult.data;

    // Price slippage protection: Fetch current market price
    const currentMarketPrice = await getEntityPrice(entityId);

    if (currentMarketPrice === null) {
      return createErrorResponse(400, 'Unable to fetch current market price for this entity');
    }

    // Calculate price difference percentage (only if pricePerToken is provided)
    let priceDifferencePercent = 0;
    if (pricePerToken !== undefined) {
      priceDifferencePercent = Math.abs((pricePerToken - currentMarketPrice) / currentMarketPrice) * 100;
      const SLIPPAGE_THRESHOLD_PERCENT = 2.0; // 2% slippage tolerance

      // If price difference exceeds threshold, reject the trade
      if (priceDifferencePercent > SLIPPAGE_THRESHOLD_PERCENT) {
        return createErrorResponse(400,
          `Price slippage too high: Requested ${pricePerToken.toFixed(2)}, Current ${currentMarketPrice.toFixed(2)} (${priceDifferencePercent.toFixed(2)}% difference). Please refresh and try again.`
        );
      }
    }

    // Use current market price to prevent any slippage
    const executionPrice = currentMarketPrice;

    // For both 'open' and 'close' types with tokensCommitted: frontend sends tokensCommitted as DOLLAR AMOUNT,
    // not as share quantity. So we derive share quantity = tokensCommitted / price.
    // Legacy: when quantity is provided (no tokensCommitted), treat as share count.
    let tradeQuantity: number;
    if (tokensCommitted !== undefined && tokensCommitted > 0) {
      const dollarAmount = Math.round(tokensCommitted * 100) / 100;
      if (executionPrice <= 0) {
        return createErrorResponse(400, 'Invalid market price for this entity');
      }
      tradeQuantity = Math.round((dollarAmount / executionPrice) * 10000) / 10000;
      if (tradeQuantity <= 0) {
        return createErrorResponse(400, 'Token amount too small for current price. Increase amount or try another entity.');
      }
    } else {
      tradeQuantity = quantity ?? 0;
    }

    // Map 'open'/'close' to legacy 'buy'/'sell' for backwards compatibility
    const legacyType: 'buy' | 'sell' = type === 'open' ? 'buy' : 'sell';
    const result = await executeTradeService(userId, entityId, legacyType, tradeQuantity, executionPrice, idempotencyKey);

    if (!result.success) {
      return createErrorResponse(400, result.error || 'Trade execution failed');
    }

    // Include execution details in response
    const executionDetails = {
      requestedPrice: pricePerToken,
      executionPrice: executionPrice,
      priceAdjusted: pricePerToken !== undefined ? Math.abs(executionPrice - pricePerToken) > 0.01 : false,
      slippagePercent: priceDifferencePercent,
    };

    return createResponse(200, {
      success: true,
      data: result.portfolio,
      executionDetails,
    });
  } catch (error: unknown) {
    // Log the full error for debugging
    logger.error('Error executing trade', {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorStack: error instanceof Error ? error.stack : undefined,
    });

    // Provide more specific error messages based on error type
    if (error instanceof Error) {
      if (error.name === 'TransactionCanceledException') {
        return createErrorResponse(400, 'Trade failed: Insufficient funds or position not found');
      }
      if (error.name === 'ConditionalCheckFailedException') {
        return createErrorResponse(400, 'Trade failed: Insufficient funds or position not found');
      }
      if (error.name === 'ValidationException') {
        return createErrorResponse(400, 'Trade failed: Invalid data provided');
      }
      if (error.name === 'ResourceNotFoundException') {
        return createErrorResponse(400, 'Trade failed: User account not properly initialized');
      }
      if (error.message?.includes('cashBalance') || error.message?.includes('removeUndefinedValues')) {
        return createErrorResponse(400, 'Trade failed: Account balance not initialized. Please try logging out and back in.');
      }
    }

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
    logger.error('Error getting portfolio', error);
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
    logger.error('Error getting transactions', error);
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
          currentPrice: price || BASE_PRICE,
          changeSession: 0, // Would calculate from price history
          changePercentSession: 0,
          volumeSession: 0,
          marketCap: 0,
        };
      })
    );

    return createResponse(200, {
      success: true,
      data: entitiesWithPrices,
    });
  } catch (error: unknown) {
    logger.error('Error getting entities', error);
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
    logger.error('Error getting entity price', error);
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

    let priceHistory: PriceHistory[];
    try {
      priceHistory = await getPriceHistory(entityId, timeRange, limit);
    } catch (err) {
      // Table may not exist or DynamoDB error; return empty so entity screen still loads
      logger.warn('Price history unavailable, returning empty', { entityId, error: err });
      priceHistory = [];
    }

    return createResponse(200, {
      success: true,
      data: priceHistory.map(item => ({
        timestamp: item.timestamp,
        price: item.price,
      })),
    });
  } catch (error: unknown) {
    logger.error('Error getting price history', error);
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
    logger.error('Error getting all prices', error);
    return createErrorResponse(500, 'Internal server error');
  }
}

