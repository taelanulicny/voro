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

    let articles;

    // First try to fetch from NewsAPI if configured
    if (source === 'newsapi') {
      if (entityName) {
        // Fetch news for specific entity
        articles = await fetchNewsForEntity(entityName, limit);
      } else if (category) {
        // Fetch by category
        articles = await fetchFromNewsAPI({ category, pageSize: limit });
      } else {
        // Fetch general news with entity-focused query (better than headlines for matching)
        articles = await fetchFromNewsAPI({ pageSize: limit });
      }

      // If NewsAPI returned results, return them
      if (articles && articles.length > 0) {
        // Filter by sentiment if specified
        if (sentiment) {
          articles = articles.filter(a => a.sentiment === sentiment);
        }

        return createResponse(200, {
          success: true,
          data: articles,
          source: 'newsapi',
        });
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

