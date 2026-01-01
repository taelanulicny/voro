import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createResponse, createErrorResponse } from '../middleware/auth';
import { getNewsArticles, searchNewsArticles } from '../services/newsService';
import { fetchFromNewsAPI, fetchTopHeadlines, fetchNewsForEntity } from '../services/newsApiService';
import { logger } from '../utils/logger';

export async function getNews(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const category = event.queryStringParameters?.category;
    const entityId = event.queryStringParameters?.entityId
      ? parseInt(event.queryStringParameters.entityId, 10)
      : undefined;
    const entityName = event.queryStringParameters?.entityName;
    const sentiment = event.queryStringParameters?.sentiment as 'positive' | 'negative' | 'neutral' | undefined;
    const limit = parseInt(event.queryStringParameters?.limit || '20', 10);
    const source = event.queryStringParameters?.source || 'newsapi'; // 'newsapi' or 'cache'

    logger.debug(`[getNews] Request params:`, { category, entityId, entityName, limit, source });
    logger.debug(`[getNews] NEWS_API_KEY configured: ${!!process.env.NEWS_API_KEY}`);

    let articles: any[] = [];
    let errorMessage: string | undefined;

    // First try to fetch from NewsAPI if configured
    if (source === 'newsapi' && process.env.NEWS_API_KEY) {
      logger.debug('[getNews] Attempting to fetch from NewsAPI...');
      
      try {
        if (entityName) {
          // Fetch news for specific entity
          logger.debug(`[getNews] Fetching news for entity: ${entityName}`);
          articles = await fetchNewsForEntity(entityName, limit);
        } else if (category) {
          // Fetch by category
          logger.debug(`[getNews] Fetching news by category: ${category}`);
          articles = await fetchFromNewsAPI({ category, pageSize: limit });
        } else {
          // Fetch general news with entity-focused query (better than headlines for matching)
          logger.debug('[getNews] Fetching general news with entity-focused query');
          articles = await fetchFromNewsAPI({ pageSize: limit });
        }

        logger.debug(`[getNews] NewsAPI returned ${articles?.length || 0} articles`);

        // If NewsAPI returned results, return them
        if (articles && articles.length > 0) {
          // Filter by sentiment if specified
          if (sentiment) {
            articles = articles.filter(a => a.sentiment === sentiment);
            logger.debug(`[getNews] After sentiment filter: ${articles.length} articles`);
          }

          return createResponse(200, {
            success: true,
            data: articles,
            source: 'newsapi',
          });
        } else {
          logger.debug('[getNews] NewsAPI returned 0 articles, falling back to cache');
          errorMessage = 'NewsAPI returned no articles';
        }
      } catch (newsApiError: any) {
        logger.error('[getNews] NewsAPI error:', newsApiError);
        errorMessage = `NewsAPI error: ${newsApiError.message || 'Unknown error'}`;
        // Continue to fallback
      }
    } else if (source === 'newsapi' && !process.env.NEWS_API_KEY) {
      logger.warn('[getNews] NEWS_API_KEY not configured, skipping NewsAPI fetch');
      errorMessage = 'NewsAPI key not configured';
    }

    // Fallback to cached articles in DynamoDB
    logger.debug('[getNews] Fetching from cache...');
    try {
      articles = await getNewsArticles({
        category,
        entityId,
        sentiment,
        limit,
      });
      logger.debug(`[getNews] Cache returned ${articles?.length || 0} articles`);
    } catch (cacheError: any) {
      logger.error('[getNews] Cache error:', cacheError);
      errorMessage = errorMessage 
        ? `${errorMessage}; Cache error: ${cacheError.message || 'Unknown error'}`
        : `Cache error: ${cacheError.message || 'Unknown error'}`;
    }

    // Always return a response, even if empty
    return createResponse(200, {
      success: true,
      data: articles || [],
      source: 'cache',
      ...(errorMessage && { warning: errorMessage }),
    });
  } catch (error: any) {
    logger.error('Error getting news', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function searchNews(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const query = event.queryStringParameters?.q || '';
    const limit = parseInt(event.queryStringParameters?.limit || '50', 10);

    if (!query || query.trim().length === 0) {
      return createResponse(200, {
        success: true,
        data: [],
      });
    }

    // First try to search in NewsAPI if configured
    let articles: any[] = [];
    if (process.env.NEWS_API_KEY) {
      try {
        logger.debug(`[searchNews] Searching NewsAPI for: ${query}`);
        articles = await fetchFromNewsAPI({ 
          query: query.trim(), 
          pageSize: limit 
        });
        logger.debug(`[searchNews] NewsAPI returned ${articles?.length || 0} articles`);
      } catch (newsApiError: any) {
        logger.error('[searchNews] NewsAPI error:', newsApiError);
        // Continue to fallback
      }
    }

    // If NewsAPI didn't return results, search in cache
    if (articles.length === 0) {
      logger.debug('[searchNews] Searching cache...');
      articles = await searchNewsArticles(query.trim(), limit);
      logger.debug(`[searchNews] Cache returned ${articles?.length || 0} articles`);
    }

    return createResponse(200, {
      success: true,
      data: articles,
    });
  } catch (error: any) {
    logger.error('Error searching news', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

