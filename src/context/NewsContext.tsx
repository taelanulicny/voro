import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { NewsArticle, NewsFilter } from '../types';
import { apiRequest, isBackendConfigured } from '../config/api';
import { NewsArticleSchema, safeValidate, validateArrayLoose } from '../validators';
import { isValidEntityId } from '../utils/idValidation';

interface NewsContextType {
  news: NewsArticle[];
  isLoadingNews: boolean;
  breakingNews: NewsArticle[];
  newsError: string | null;
  
  // Actions
  refreshNews: () => Promise<void>;
  getNewsByEntity: (entityId: number, entityName?: string) => Promise<NewsArticle[]>;
  getNewsByFilter: (filter: NewsFilter) => NewsArticle[];
  markAsRead: (articleId: string) => void;
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

export function NewsProvider({ children }: { children: ReactNode }) {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [entityNewsCache, setEntityNewsCache] = useState<Record<string, NewsArticle[]>>({});

  const breakingNews = news.filter(article => article.isBreaking);

  // Fetch news from backend - NO MOCK FALLBACK
  const refreshNews = useCallback(async (signal?: AbortSignal) => {
    if (!isBackendConfigured()) {
      console.warn('Backend not configured - news will be empty');
      setNewsError('Backend not configured');
      setNews([]);
      setIsLoadingNews(false);
      return;
    }

    setIsLoadingNews(true);
    setNewsError(null);
    try {
      const response = await apiRequest<{ success?: boolean; data?: unknown[]; error?: string }>('/api/news?limit=30', {
        signal,
      });
      
      // Check if response is successful and has data
      if (response && response.success && response.data !== undefined && response.data !== null) {
        // Ensure data is an array before processing
        let articlesArray: unknown[] = [];
        
        if (Array.isArray(response.data)) {
          articlesArray = response.data;
        } else if (typeof response.data === 'object') {
          // If data is an object, try to extract an array from it
          const dataObj = response.data as any;
          if (Array.isArray(dataObj.articles)) {
            articlesArray = dataObj.articles;
          } else if (Array.isArray(dataObj.data)) {
            articlesArray = dataObj.data;
          }
        }
        
        if (articlesArray.length > 0) {
          // Validate news articles array
          const validatedArticles = validateArrayLoose(NewsArticleSchema, articlesArray);
          if (Array.isArray(validatedArticles)) {
            setNews(validatedArticles);
          } else {
            setNews([]);
            setNewsError('Failed to validate news articles');
          }
        } else {
          // Empty array from API - this is valid, just no news available
          setNews([]);
        }
      } else {
        // API request failed or returned no data
        setNews([]);
        setNewsError(response?.error || 'Failed to fetch news');
      }
    } catch (error: any) {
      console.error('Error fetching news:', error);
      setNews([]);
      setNewsError(error?.message || 'Failed to fetch news');
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

  // Fetch news for a specific entity from backend - NO MOCK FALLBACK
  const getNewsByEntity = useCallback(async (entityId: number, entityName?: string): Promise<NewsArticle[]> => {
    // Validate entityId
    if (!isValidEntityId(entityId)) {
      console.debug('Invalid entityId for news:', entityId);
      return [];
    }

    // Check cache first
    const cacheKey = entityName || entityId.toString();
    if (entityNewsCache[cacheKey]) {
      return entityNewsCache[cacheKey];
    }

    // Filter from existing news (already fetched from backend)
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
      
      if (response && response.success && response.data !== undefined && response.data !== null) {
        // Ensure data is an array before processing
        let articlesArray: unknown[] = [];
        
        if (Array.isArray(response.data)) {
          articlesArray = response.data;
        } else if (typeof response.data === 'object') {
          const dataObj = response.data as any;
          if (Array.isArray(dataObj.articles)) {
            articlesArray = dataObj.articles;
          } else if (Array.isArray(dataObj.data)) {
            articlesArray = dataObj.data;
          }
        }
        
        if (articlesArray.length > 0) {
          const validatedArticles = validateArrayLoose(NewsArticleSchema, articlesArray);
          if (Array.isArray(validatedArticles) && validatedArticles.length > 0) {
            const mappedNews: NewsArticle[] = validatedArticles.map((article) => ({
              ...article,
              entityId: entityId || article.entityId || undefined,
              entityName: entityName || article.entityName || undefined,
            }));
            
            // Cache the results
            setEntityNewsCache(prev => ({ ...prev, [cacheKey]: mappedNews }));
            return mappedNews;
          }
        }
        
        // Empty response from API - return empty array
        setEntityNewsCache(prev => ({ ...prev, [cacheKey]: [] }));
        return [];
      }
    } catch (error) {
      console.error('Error fetching entity news:', error);
    }

    // Return whatever we have locally (from initial backend fetch)
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
    // Read status tracking can be implemented when needed
  }, []);

  const value: NewsContextType = {
    news,
    isLoadingNews,
    breakingNews,
    newsError,
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

