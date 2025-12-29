import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { NewsArticle, NewsFilter } from '../types';
import { apiRequest, isBackendConfigured } from '../config/api';
import { NewsArticleArraySchema, safeValidate, validateArrayLoose } from '../validators';

interface NewsContextType {
  news: NewsArticle[];
  isLoadingNews: boolean;
  breakingNews: NewsArticle[];
  
  // Actions
  refreshNews: () => Promise<void>;
  getNewsByEntity: (entityId: number, entityName?: string) => Promise<NewsArticle[]>;
  getNewsByFilter: (filter: NewsFilter) => NewsArticle[];
  markAsRead: (articleId: string) => void;
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

// Generate comprehensive mock news
const generateMockNews = (): NewsArticle[] => {
  const newsTemplates = [
    // OpenAI (ID: 1)
    {
      title: 'OpenAI Announces GPT-5: Major Breakthrough in AI Capabilities',
      summary: 'OpenAI unveils GPT-5 with unprecedented reasoning abilities, marking a significant step toward AGI.',
      source: 'TechCrunch',
      category: 'Tech' as const,
      entityId: 1,
      entityTicker: 'OPENAI',
      entityName: 'OpenAI',
      sentiment: 'positive' as const,
      sentimentScore: 85,
      impactLevel: 'critical' as const,
      tags: ['AI', 'GPT-5', 'Breakthrough'],
      isBreaking: true,
    },
    {
      title: 'OpenAI Partners with Fortune 500 Companies for Enterprise AI',
      summary: 'Major corporations adopt OpenAI technology, signaling widespread enterprise acceptance.',
      source: 'Bloomberg',
      category: 'Tech' as const,
      entityId: 1,
      entityTicker: 'OPENAI',
      entityName: 'OpenAI',
      sentiment: 'positive' as const,
      sentimentScore: 70,
      impactLevel: 'high' as const,
      tags: ['Enterprise', 'Partnerships', 'Growth'],
      isBreaking: false,
    },
    // Elon Musk (ID: 5)
    {
      title: 'Elon Musk Unveils Revolutionary Tesla Battery Technology',
      summary: 'Tesla announces breakthrough in battery efficiency, potentially transforming the EV industry.',
      source: 'Reuters',
      category: 'Tech' as const,
      entityId: 5,
      entityTicker: 'MUSK',
      entityName: 'Elon Musk',
      sentiment: 'positive' as const,
      sentimentScore: 80,
      impactLevel: 'critical' as const,
      tags: ['Tesla', 'EV', 'Innovation'],
      isBreaking: true,
    },
    {
      title: 'Musk Faces Regulatory Scrutiny Over Latest Acquisition',
      summary: 'Federal regulators launch investigation into recent business moves, raising questions about compliance.',
      source: 'Wall Street Journal',
      category: 'People' as const,
      entityId: 5,
      entityTicker: 'MUSK',
      entityName: 'Elon Musk',
      sentiment: 'negative' as const,
      sentimentScore: -45,
      impactLevel: 'medium' as const,
      tags: ['Regulation', 'Legal', 'Controversy'],
      isBreaking: false,
    },
    // Starship (ID: 7)
    {
      title: 'SpaceX Starship Achieves First Successful Orbital Flight',
      summary: 'Historic milestone as Starship completes full orbital mission, paving way for Mars colonization.',
      source: 'Space.com',
      category: 'Events' as const,
      entityId: 7,
      entityTicker: 'STARSH',
      entityName: 'Starship Success',
      sentiment: 'positive' as const,
      sentimentScore: 95,
      impactLevel: 'critical' as const,
      tags: ['SpaceX', 'Mars', 'Historic'],
      isBreaking: true,
    },
    // Neuralink (ID: 8)
    {
      title: 'Neuralink Receives FDA Approval for Human Trials',
      summary: 'Brain-computer interface company cleared for expanded human testing, accelerating path to market.',
      source: 'The Verge',
      category: 'Tech' as const,
      entityId: 8,
      entityTicker: 'NEURL',
      entityName: 'Neuralink IPO',
      sentiment: 'positive' as const,
      sentimentScore: 88,
      impactLevel: 'high' as const,
      tags: ['FDA', 'Medical', 'Approval'],
      isBreaking: true,
    },
    {
      title: 'Neuralink IPO Speculation Heats Up as Company Hits Milestones',
      summary: 'Investment community buzzes with anticipation of potential public offering following recent achievements.',
      source: 'CNBC',
      category: 'Tech' as const,
      entityId: 8,
      entityTicker: 'NEURL',
      entityName: 'Neuralink IPO',
      sentiment: 'positive' as const,
      sentimentScore: 65,
      impactLevel: 'medium' as const,
      tags: ['IPO', 'Investment', 'Markets'],
      isBreaking: false,
    },
    // AGI (ID: 6)
    {
      title: 'Leading AI Researchers Warn: AGI Timeline Accelerating',
      summary: 'Consensus emerges that artificial general intelligence may arrive sooner than previously predicted.',
      source: 'MIT Technology Review',
      category: 'Tech' as const,
      entityId: 6,
      entityTicker: 'AGI',
      entityName: 'Artificial General Intelligence',
      sentiment: 'neutral' as const,
      sentimentScore: 15,
      impactLevel: 'critical' as const,
      tags: ['AGI', 'AI Safety', 'Research'],
      isBreaking: true,
    },
    // General market news
    {
      title: 'Tech Sector Volatility Raises Concerns Among Investors',
      summary: 'Market analysts point to regulatory uncertainty and valuation concerns in technology stocks.',
      source: 'MarketWatch',
      category: 'Tech' as const,
      sentiment: 'negative' as const,
      sentimentScore: -55,
      impactLevel: 'medium' as const,
      tags: ['Markets', 'Volatility', 'Tech'],
      isBreaking: false,
    },
  ];

  return newsTemplates.map((template, index) => ({
    id: `news-${index + 1}`,
    ...template,
    content: `${template.summary} This is the full article content with more details about the story. Stay tuned for updates as this situation develops.`,
    sourceUrl: 'https://example.com',
    author: `Reporter ${index + 1}`,
    publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    viewCount: Math.floor(Math.random() * 50000) + 1000,
  }));
};

const MOCK_NEWS = generateMockNews();

export function NewsProvider({ children }: { children: ReactNode }) {
  const [news, setNews] = useState<NewsArticle[]>(MOCK_NEWS);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [entityNewsCache, setEntityNewsCache] = useState<Record<string, NewsArticle[]>>({});

  const breakingNews = news.filter(article => article.isBreaking);

  // Fetch news from backend
  const refreshNews = useCallback(async (signal?: AbortSignal) => {
    console.log('=== NEWS DEBUG ===');
    console.log('Backend configured:', isBackendConfigured());
    console.log('API URL:', process.env.EXPO_PUBLIC_API_URL);
    
    if (!isBackendConfigured()) {
      // Use mock news if backend not configured
      console.log('Using mock news - backend not configured');
      setNews(MOCK_NEWS);
      return;
    }

    setIsLoadingNews(true);
    try {
      console.log('Fetching news from API...');
      const response = await apiRequest<{ success?: boolean; data?: unknown[] }>('/api/news?limit=30', {
        signal,
      });
      console.log('News API response:', response.success, 'articles:', response.data?.length);
      
      if (response.success && response.data && Array.isArray(response.data)) {
        // Validate news articles array
        const validatedArticles = validateArrayLoose(NewsArticleArraySchema, response.data);
        if (validatedArticles.length > 0) {
          // Map validated articles to frontend format
          const mappedNews: NewsArticle[] = validatedArticles.map((article) => ({
            id: article.id,
            title: article.title,
            summary: article.summary,
            content: article.content,
            source: article.source,
            sourceUrl: article.sourceUrl || undefined,
            imageUrl: article.imageUrl || undefined,
            author: article.author || undefined,
            publishedAt: article.publishedAt,
            category: article.category,
            entityId: article.entityId || undefined,
            entityTicker: article.entityTicker || undefined,
            entityName: article.entityName || undefined,
            sentiment: article.sentiment,
            sentimentScore: article.sentimentScore,
            impactLevel: article.impactLevel,
            tags: article.tags,
            viewCount: article.viewCount,
            isBreaking: article.isBreaking,
          }));
          setNews(mappedNews);
        } else {
          // Fallback to mock news if validation failed
          setNews(MOCK_NEWS);
        }
      } else {
        // Fallback to mock news
        setNews(MOCK_NEWS);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      setNews(MOCK_NEWS);
    } finally {
      setIsLoadingNews(false);
    }
  }, []);

  // Load news on mount
  useEffect(() => {
    const abortController = new AbortController();
    refreshNews(abortController.signal).catch(err => {
      if (err.name !== 'AbortError' && err.error !== 'Request cancelled') {
        console.error('Error fetching news:', err);
      }
    });
    return () => {
      abortController.abort();
    };
  }, [refreshNews]);

  // Fetch news for a specific entity from backend
  const getNewsByEntity = useCallback(async (entityId: number, entityName?: string): Promise<NewsArticle[]> => {
    // Check cache first
    const cacheKey = entityName || entityId.toString();
    if (entityNewsCache[cacheKey]) {
      return entityNewsCache[cacheKey];
    }

    // Filter from existing news first
    const localNews = news.filter(article => article.entityId === entityId);
    
    if (!isBackendConfigured()) {
      return localNews;
    }

    try {
      const params = new URLSearchParams({ limit: '15' });
      if (entityName) {
        params.set('entityName', entityName);
      }
      if (entityId) {
        params.set('entityId', entityId.toString());
      }

      const response = await apiRequest<{ success?: boolean; data?: unknown[] }>(`/api/news?${params}`);
      
      if (response.success && response.data && Array.isArray(response.data)) {
        // Validate news articles array
        const validatedArticles = validateArrayLoose(NewsArticleArraySchema, response.data);
        if (validatedArticles.length > 0) {
          // Map validated articles to frontend format
          const mappedNews: NewsArticle[] = validatedArticles.map((article) => ({
            id: article.id,
            title: article.title,
            summary: article.summary,
            content: article.content,
            source: article.source,
            sourceUrl: article.sourceUrl || undefined,
            imageUrl: article.imageUrl || undefined,
            author: article.author || undefined,
            publishedAt: article.publishedAt,
            category: article.category,
            entityId: entityId || article.entityId || undefined,
            entityTicker: article.entityTicker || undefined,
            entityName: entityName || article.entityName || undefined,
            sentiment: article.sentiment,
            sentimentScore: article.sentimentScore,
            impactLevel: article.impactLevel,
            tags: article.tags,
            viewCount: article.viewCount,
            isBreaking: article.isBreaking,
          }));
          
          // Cache the results
          setEntityNewsCache(prev => ({ ...prev, [cacheKey]: mappedNews }));
          return mappedNews;
        }
      }
    } catch (error) {
      console.error('Error fetching entity news:', error);
    }

    return localNews;
  }, [news, entityNewsCache]);

  const getNewsByFilter = useCallback((filter: NewsFilter): NewsArticle[] => {
    return news.filter(article => {
      if (filter.category && article.category !== filter.category) return false;
      if (filter.sentiment && article.sentiment !== filter.sentiment) return false;
      if (filter.entityId && article.entityId !== filter.entityId) return false;
      if (filter.impactLevel && article.impactLevel !== filter.impactLevel) return false;
      if (filter.isBreaking !== undefined && article.isBreaking !== filter.isBreaking) return false;
      return true;
    });
  }, [news]);

  const markAsRead = useCallback((articleId: string) => {
    // In a real app, this would update read status
    console.log('Marked as read:', articleId);
  }, []);

  const value: NewsContextType = {
    news,
    isLoadingNews,
    breakingNews,
    refreshNews,
    getNewsByEntity,
    getNewsByFilter,
    markAsRead,
  };

  return <NewsContext.Provider value={value}>{children}</NewsContext.Provider>;
}

export function useNews() {
  const context = useContext(NewsContext);
  if (context === undefined) {
    throw new Error('useNews must be used within a NewsProvider');
  }
  return context;
}

