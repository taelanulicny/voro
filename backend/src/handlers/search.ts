import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createResponse, createErrorResponse } from '../middleware/auth';
import { searchEntities, getSearchSuggestions } from '../services/searchService';
import { getAllEntityPrices } from '../services/tradingService';
import { logger } from '../utils/logger';

export async function searchHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    logger.debug('[Search Handler] Path:', { path: event.path, method: event.httpMethod });
    logger.debug('[Search Handler] Query Params:', event.queryStringParameters);
    
    const queryParams = event.queryStringParameters || {};
    const query = queryParams.q || queryParams.query || '';
    const category = queryParams.category;
    const limit = parseInt(queryParams.limit || '50', 10);
    const sortBy = (queryParams.sortBy || 'relevance') as 'relevance' | 'name' | 'price_high' | 'price_low' | 'change_high' | 'change_low';
    const suggestions = queryParams.suggestions === 'true';

    if (!query || query.trim().length === 0) {
      return createResponse(200, {
        success: true,
        data: [],
        count: 0,
      });
    }

    // Get search results
    const results = await searchEntities({
      query: query.trim(),
      category,
      limit,
      sortBy,
    });

    // Get current prices for all entities
    const prices = await getAllEntityPrices();

    // Enhance results with current prices and calculate changes
    const enhancedResults = results.map(result => {
      const currentPrice = prices[result.entity.entityId] || result.entity.basePrice;
      const change24h = currentPrice - result.entity.basePrice;
      const changePercent24h = result.entity.basePrice > 0 
        ? (change24h / result.entity.basePrice) * 100 
        : 0;

      return {
        ...result.entity,
        currentPrice,
        change24h,
        changePercent24h,
        searchScore: result.score,
        matchType: result.matchType,
        matchedFields: result.matchedFields,
      };
    });

    // Apply additional sorting if needed (for price/change sorts)
    let finalResults = enhancedResults;
    if (sortBy === 'price_high') {
      finalResults = enhancedResults.sort((a, b) => b.currentPrice - a.currentPrice);
    } else if (sortBy === 'price_low') {
      finalResults = enhancedResults.sort((a, b) => a.currentPrice - b.currentPrice);
    } else if (sortBy === 'change_high') {
      finalResults = enhancedResults.sort((a, b) => b.changePercent24h - a.changePercent24h);
    } else if (sortBy === 'change_low') {
      finalResults = enhancedResults.sort((a, b) => a.changePercent24h - b.changePercent24h);
    }

    return createResponse(200, {
      success: true,
      data: finalResults,
      count: finalResults.length,
      query: query.trim(),
    });
  } catch (error: any) {
    logger.error('Error in search handler', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function searchSuggestionsHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const queryParams = event.queryStringParameters || {};
    const query = queryParams.q || queryParams.query || '';
    const limit = parseInt(queryParams.limit || '10', 10);

    if (!query || query.trim().length < 2) {
      return createResponse(200, {
        success: true,
        data: [],
      });
    }

    const suggestions = await getSearchSuggestions(query.trim(), limit);

    return createResponse(200, {
      success: true,
      data: suggestions,
    });
  } catch (error: any) {
    logger.error('Error in search suggestions handler', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

