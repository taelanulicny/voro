import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createResponse, createErrorResponse } from '../middleware/auth';
import { getNewsArticles } from '../services/newsService';

export async function getNews(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const category = event.queryStringParameters?.category;
    const entityId = event.queryStringParameters?.entityId
      ? parseInt(event.queryStringParameters.entityId, 10)
      : undefined;
    const sentiment = event.queryStringParameters?.sentiment as 'positive' | 'negative' | 'neutral' | undefined;
    const limit = parseInt(event.queryStringParameters?.limit || '50', 10);

    const articles = await getNewsArticles({
      category,
      entityId,
      sentiment,
      limit,
    });

    return createResponse(200, {
      success: true,
      data: articles,
    });
  } catch (error: any) {
    console.error('Error getting news:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

