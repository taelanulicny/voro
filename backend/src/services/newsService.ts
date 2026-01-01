import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import { PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { NewsArticle } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

// Basic sentiment analysis using keyword matching
const POSITIVE_WORDS = ['good', 'great', 'excellent', 'amazing', 'success', 'growth', 'profit', 'up', 'rise', 'gain', 'positive', 'strong', 'win', 'victory'];
const NEGATIVE_WORDS = ['bad', 'terrible', 'fail', 'loss', 'down', 'drop', 'decline', 'negative', 'weak', 'crisis', 'problem', 'concern', 'worry'];

function analyzeSentiment(text: string): { sentiment: 'positive' | 'negative' | 'neutral'; score: number } {
  const lowerText = text.toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;

  POSITIVE_WORDS.forEach(word => {
    if (lowerText.includes(word)) positiveCount++;
  });

  NEGATIVE_WORDS.forEach(word => {
    if (lowerText.includes(word)) negativeCount++;
  });

  const score = (positiveCount - negativeCount) * 20; // Scale to -100 to 100 range
  const sentiment = score > 20 ? 'positive' : score < -20 ? 'negative' : 'neutral';

  return { sentiment, score: Math.max(-100, Math.min(100, score)) };
}

export async function createNewsArticle(article: {
  title: string;
  summary: string;
  content: string;
  source: string;
  sourceUrl?: string;
  imageUrl?: string;
  author?: string;
  publishedAt: string;
  category: 'Tech' | 'Politics' | 'Events' | 'People' | 'General';
  entityId?: number;
  entityTicker?: string;
  entityName?: string;
  tags?: string[];
  isBreaking?: boolean;
}): Promise<NewsArticle> {
  const sentiment = analyzeSentiment(`${article.title} ${article.summary} ${article.content}`);
  const impactLevel = sentiment.score > 50 ? 'high' : sentiment.score < -50 ? 'high' : 'medium';

  const newsArticle: NewsArticle = {
    articleId: uuidv4(),
    ...article,
    sentiment: sentiment.sentiment,
    sentimentScore: sentiment.score,
    impactLevel,
    tags: article.tags || [],
    viewCount: 0,
    isBreaking: article.isBreaking || false,
    createdAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAMES.NEWS_ARTICLES,
      Item: newsArticle,
    })
  );

  return newsArticle;
}

export async function getNewsArticles(filters?: {
  category?: string;
  entityId?: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
  limit?: number;
}): Promise<NewsArticle[]> {
  try {
    if (filters?.entityId) {
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAMES.NEWS_ARTICLES,
          IndexName: 'entityId-publishedAt-index',
          KeyConditionExpression: 'entityId = :entityId',
          ExpressionAttributeValues: {
            ':entityId': filters.entityId,
          },
          ScanIndexForward: false,
          Limit: filters.limit || 50,
        })
      );

      return (result.Items || []) as NewsArticle[];
    }

    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.NEWS_ARTICLES,
        Limit: filters?.limit || 50,
      })
    );

    let articles = (result.Items || []) as NewsArticle[];

    // Apply filters
    if (filters?.category) {
      articles = articles.filter(a => a.category === filters.category);
    }
    if (filters?.sentiment) {
      articles = articles.filter(a => a.sentiment === filters.sentiment);
    }

    // Sort by publishedAt
    articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return articles;
  } catch (error) {
    console.error('Error getting news articles:', error);
    return [];
  }
}

/**
 * Search news articles by query string
 */
export async function searchNewsArticles(query: string, limit: number = 50): Promise<NewsArticle[]> {
  try {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerm = query.trim().toLowerCase();

    // Scan all articles and filter by content (case-insensitive)
    // Note: In production, consider using DynamoDB Streams + Elasticsearch/OpenSearch for better search
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.NEWS_ARTICLES,
        FilterExpression: 'contains(title, :searchTerm) OR contains(summary, :searchTerm) OR contains(content, :searchTerm) OR contains(entityName, :searchTerm)',
        ExpressionAttributeValues: {
          ':searchTerm': searchTerm,
        },
        Limit: limit * 2, // Get more to account for filtering
      })
    );

    if (!scanResult.Items) {
      return [];
    }

    // Filter and sort by publishedAt (newest first)
    const articles = (scanResult.Items as NewsArticle[])
      .filter(article => {
        const title = (article.title || '').toLowerCase();
        const summary = (article.summary || '').toLowerCase();
        const content = (article.content || '').toLowerCase();
        const entityName = (article.entityName || '').toLowerCase();
        
        return title.includes(searchTerm) ||
               summary.includes(searchTerm) ||
               content.includes(searchTerm) ||
               entityName.includes(searchTerm);
      })
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, limit);

    return articles;
  } catch (error) {
    console.error('Error searching news articles:', error);
    return [];
  }
}

