import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createResponse, createErrorResponse } from '../middleware/auth';
import { getNewsArticles } from '../services/newsService';
import { fetchFromNewsAPI, fetchTopHeadlines, fetchNewsForEntity } from '../services/newsApiService';

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

    console.log(`[getNews] Request params: category=${category}, entityId=${entityId}, entityName=${entityName}, limit=${limit}, source=${source}`);
    console.log(`[getNews] NEWS_API_KEY configured: ${!!process.env.NEWS_API_KEY}`);

    let articles;

    // First try to fetch from NewsAPI if configured
    if (source === 'newsapi') {
      console.log('[getNews] Attempting to fetch from NewsAPI...');
      
      if (entityName) {
        // Fetch news for specific entity
        console.log(`[getNews] Fetching news for entity: ${entityName}`);
        articles = await fetchNewsForEntity(entityName, limit);
      } else if (category) {
        // Fetch by category
        console.log(`[getNews] Fetching news by category: ${category}`);
        articles = await fetchFromNewsAPI({ category, pageSize: limit });
      } else {
        // Fetch general news with entity-focused query (better than headlines for matching)
        console.log('[getNews] Fetching general news with entity-focused query');
        articles = await fetchFromNewsAPI({ pageSize: limit });
      }

      console.log(`[getNews] NewsAPI returned ${articles?.length || 0} articles`);

      // If NewsAPI returned results, return them
      if (articles && articles.length > 0) {
        // Filter by sentiment if specified
        if (sentiment) {
          articles = articles.filter(a => a.sentiment === sentiment);
          console.log(`[getNews] After sentiment filter: ${articles.length} articles`);
        }

        return createResponse(200, {
          success: true,
          data: articles,
          source: 'newsapi',
        });
      } else {
        console.log('[getNews] NewsAPI returned 0 articles, falling back to cache');
      }
    }

    // Fallback to cached articles in DynamoDB
    articles = await getNewsArticles({
      category,
      entityId,
      sentiment,
      limit,
    });

    return createResponse(200, {
      success: true,
      data: articles,
      source: 'cache',
    });
  } catch (error: any) {
    console.error('Error getting news:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

