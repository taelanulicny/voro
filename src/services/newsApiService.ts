/**
 * NewsAPI Integration Service
 *
 * Integrates with NewsAPI.org for real news articles
 * Free tier: 100 requests/day
 * Documentation: https://newsapi.org/docs
 */

import { NewsArticle } from '../types';

// NewsAPI Key - get from https://newsapi.org/
// Store in environment variable: EXPO_PUBLIC_NEWS_API_KEY
const NEWS_API_KEY = process.env.EXPO_PUBLIC_NEWS_API_KEY || '';
const NEWS_API_BASE_URL = 'https://newsapi.org/v2';

// Check if NewsAPI is configured
export const isNewsApiConfigured = (): boolean => {
  return NEWS_API_KEY !== '' && NEWS_API_KEY !== undefined;
};

// NewsAPI response types
interface NewsApiSource {
  id: string | null;
  name: string;
}

interface NewsApiArticle {
  source: NewsApiSource;
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
}

/**
 * Fetch top headlines from NewsAPI
 */
export const fetchTopHeadlines = async (params?: {
  category?: string;
  country?: string;
  pageSize?: number;
}): Promise<NewsArticle[]> => {
  if (!isNewsApiConfigured()) {
    console.warn('[NewsAPI] API key not configured');
    return [];
  }

  try {
    const { category, country = 'us', pageSize = 20 } = params || {};

    const queryParams = new URLSearchParams({
      apiKey: NEWS_API_KEY,
      country,
      pageSize: pageSize.toString(),
    });

    if (category && category !== 'all') {
      queryParams.append('category', category.toLowerCase());
    }

    const url = `${NEWS_API_BASE_URL}/top-headlines?${queryParams}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status} ${response.statusText}`);
    }

    const data: NewsApiResponse = await response.json();

    if (data.status !== 'ok') {
      throw new Error('NewsAPI returned non-ok status');
    }

    return mapNewsApiArticlesToAppFormat(data.articles);
  } catch (error) {
    console.error('[NewsAPI] Error fetching top headlines:', error);
    return [];
  }
};

/**
 * Search news articles by query
 */
export const searchNews = async (params: {
  query: string;
  pageSize?: number;
  sortBy?: 'relevancy' | 'popularity' | 'publishedAt';
}): Promise<NewsArticle[]> => {
  if (!isNewsApiConfigured()) {
    console.warn('[NewsAPI] API key not configured');
    return [];
  }

  try {
    const { query, pageSize = 20, sortBy = 'publishedAt' } = params;

    const queryParams = new URLSearchParams({
      apiKey: NEWS_API_KEY,
      q: query,
      pageSize: pageSize.toString(),
      sortBy,
    });

    const url = `${NEWS_API_BASE_URL}/everything?${queryParams}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status} ${response.statusText}`);
    }

    const data: NewsApiResponse = await response.json();

    if (data.status !== 'ok') {
      throw new Error('NewsAPI returned non-ok status');
    }

    return mapNewsApiArticlesToAppFormat(data.articles);
  } catch (error) {
    console.error('[NewsAPI] Error searching news:', error);
    return [];
  }
};

/**
 * Fetch news for specific entity
 */
export const fetchEntityNews = async (entityName: string): Promise<NewsArticle[]> => {
  return searchNews({
    query: entityName,
    pageSize: 10,
    sortBy: 'publishedAt',
  });
};

/** Strip NewsAPI truncation text like "+1234 characters" or "[+1234 characters]" from content/summary */
function stripNewsApiTruncation(text: string): string {
  return text
    .replace(/\s*\[\s*\+\d+\s*characters?\s*\]\s*$/i, '')
    .replace(/\s*\+\d+\s*characters?\s*$/i, '')
    .replace(/\s*\+\d+\s*chars?\s*$/i, '')
    .trim();
}

/**
 * Map NewsAPI articles to app format
 */
const mapNewsApiArticlesToAppFormat = (articles: NewsApiArticle[]): NewsArticle[] => {
  return articles
    .filter((article) => {
      // Filter out removed articles
      if (article.title === '[Removed]') return false;
      if (!article.url) return false;
      return true;
    })
    .map((article, index) => {
      // Determine category based on source or content (simplified logic)
      const category = categorizeArticle(article);

      // Determine sentiment (simplified - would need ML for real sentiment analysis)
      const sentiment = determineSentiment(article);

      // Generate consistent ID based only on URL to prevent duplicates across category fetches
      const urlHash = article.url.replace(/[^a-zA-Z0-9]/g, '');

      const rawSummary = article.description || article.content?.substring(0, 200) || 'No summary available';
      const rawContent = article.content || article.description || '';

      return {
        id: `newsapi-${urlHash}`,
        title: article.title,
        summary: stripNewsApiTruncation(rawSummary),
        content: stripNewsApiTruncation(rawContent),
        imageUrl: article.urlToImage || undefined,
        source: article.source.name,
        sourceUrl: article.url,
        publishedAt: new Date(article.publishedAt).toISOString(),
        category,
        sentiment,
        impactLevel: 'medium' as const,
        isBreaking: false,
        entityId: undefined,
        entityName: undefined,
        tags: [],
        viewCount: 0,
        sentimentScore: 0,
      };
    });
};

/**
 * Simple categorization based on source name and content
 */
const categorizeArticle = (article: NewsApiArticle): string => {
  const titleLower = article.title.toLowerCase();
  const descLower = (article.description || '').toLowerCase();
  const content = titleLower + ' ' + descLower;

  // Tech
  if (
    content.includes('tech') ||
    content.includes('apple') ||
    content.includes('google') ||
    content.includes('microsoft') ||
    content.includes('ai') ||
    content.includes('software') ||
    content.includes('startup')
  ) {
    return 'Tech';
  }

  // Politics
  if (
    content.includes('president') ||
    content.includes('congress') ||
    content.includes('senate') ||
    content.includes('election') ||
    content.includes('government') ||
    content.includes('political')
  ) {
    return 'Politics';
  }

  // Sports/Entertainment
  if (
    content.includes('nfl') ||
    content.includes('nba') ||
    content.includes('sports') ||
    content.includes('game') ||
    content.includes('player')
  ) {
    return 'People';
  }

  // Business
  if (
    content.includes('stock') ||
    content.includes('market') ||
    content.includes('business') ||
    content.includes('economy') ||
    content.includes('earnings')
  ) {
    return 'Events';
  }

  return 'General';
};

/**
 * Simple sentiment analysis (placeholder - would need real NLP)
 */
const determineSentiment = (article: NewsApiArticle): 'positive' | 'negative' | 'neutral' => {
  const content = `${article.title} ${article.description || ''}`.toLowerCase();

  const positiveWords = [
    'success',
    'win',
    'gain',
    'growth',
    'breakthrough',
    'innovation',
    'soar',
    'surge',
    'record',
    'best',
  ];
  const negativeWords = [
    'crisis',
    'crash',
    'fail',
    'decline',
    'loss',
    'worst',
    'scandal',
    'controversy',
    'drop',
    'plunge',
  ];

  let positiveCount = 0;
  let negativeCount = 0;

  positiveWords.forEach((word) => {
    if (content.includes(word)) positiveCount++;
  });

  negativeWords.forEach((word) => {
    if (content.includes(word)) negativeCount++;
  });

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
};
