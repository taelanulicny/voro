import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  searchNews: (query: string) => Promise<NewsArticle[]>;
  markAsRead: (articleId: string) => void;
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

export function NewsProvider({ children }: { children: ReactNode }) {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [entityNewsCache, setEntityNewsCache] = useState<Record<string, NewsArticle[]>>({});

  const breakingNews = news.filter(article => article.isBreaking);

  // Storage keys
  const NEWS_CACHE_KEY = '@moro_news_cache';
  const NEWS_CACHE_TIMESTAMP_KEY = '@moro_news_cache_timestamp';
  const NEWS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  // Load news from cache
  const loadNewsFromCache = useCallback(async (): Promise<NewsArticle[] | null> => {
    try {
      const [cachedNews, timestamp] = await Promise.all([
        AsyncStorage.getItem(NEWS_CACHE_KEY),
        AsyncStorage.getItem(NEWS_CACHE_TIMESTAMP_KEY),
      ]);

      if (cachedNews && timestamp) {
        const cacheTime = parseInt(timestamp, 10);
        const now = Date.now();
        
        // Check if cache is still valid (within TTL)
        if (now - cacheTime < NEWS_CACHE_TTL) {
          const parsed = JSON.parse(cachedNews);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error loading news from cache:', error);
      return null;
    }
  }, []);

  // Save news to cache
  const saveNewsToCache = useCallback(async (articles: NewsArticle[]) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(articles)),
        AsyncStorage.setItem(NEWS_CACHE_TIMESTAMP_KEY, Date.now().toString()),
      ]);
    } catch (error) {
      console.error('Error saving news to cache:', error);
    }
  }, []);

  // Fetch news from backend - NO MOCK FALLBACK
  const refreshNews = useCallback(async (signal?: AbortSignal) => {
    setIsLoadingNews(true);
    setNewsError(null);

    // Try to load from cache first for offline support
    const cachedNews = await loadNewsFromCache();
    if (cachedNews && cachedNews.length > 0) {
      setNews(cachedNews);
      setIsLoadingNews(false);
    }

    if (!isBackendConfigured()) {
      console.warn('Backend not configured - using cached news if available');
      if (!cachedNews || cachedNews.length === 0) {
        setNewsError('Backend not configured');
        setNews([]);
      }
      setIsLoadingNews(false);
      return;
    }

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
            // Save to cache for offline viewing
            await saveNewsToCache(validatedArticles);
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
        // Keep cached news if available
        if (!cachedNews || cachedNews.length === 0) {
          setNews([]);
          setNewsError(response?.error || 'Failed to fetch news');
        }
      }
    } catch (error: any) {
      console.error('Error fetching news:', error);
      // Keep cached news if available on error
      if (!cachedNews || cachedNews.length === 0) {
        setNews([]);
        setNewsError(error?.message || 'Failed to fetch news');
      }
    } finally {
      setIsLoadingNews(false);
    }
  }, [loadNewsFromCache, saveNewsToCache]);

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
    } catch (error: any) {
      console.error(`[News] Error fetching entity news for entity ${entityId}:`, {
        entityId,
        entityName: entityName || 'unknown',
        error: error.message || String(error),
        errorType: error.name || 'Error',
        status: error.status || 'unknown',
        endpoint: `/api/news?entityId=${entityId}`,
        hint: 'Entity-specific news unavailable. Returning empty array.',
      });
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

  // Search news articles
  const searchNews = useCallback(async (query: string): Promise<NewsArticle[]> => {
    if (!query || query.trim().length === 0) {
      return [];
    }

    if (!isBackendConfigured()) {
      // Search in cached news if backend not available
      const cachedNews = await loadNewsFromCache();
      if (cachedNews) {
        const searchTerm = query.trim().toLowerCase();
        return cachedNews.filter(article => 
          article.title.toLowerCase().includes(searchTerm) ||
          article.summary?.toLowerCase().includes(searchTerm) ||
          article.content?.toLowerCase().includes(searchTerm) ||
          article.entityName?.toLowerCase().includes(searchTerm)
        );
      }
      return [];
    }

    try {
      const response = await apiRequest<{ success?: boolean; data?: unknown[] }>(
        `/api/news/search?q=${encodeURIComponent(query.trim())}&limit=50`
      );

      if (response && response.success && response.data !== undefined && response.data !== null) {
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
          if (Array.isArray(validatedArticles)) {
            return validatedArticles;
          }
        }
      }

      return [];
    } catch (error) {
      console.error('Error searching news:', error);
      // Fallback to local search
      const searchTerm = query.trim().toLowerCase();
      return news.filter(article => 
        article.title.toLowerCase().includes(searchTerm) ||
        article.summary?.toLowerCase().includes(searchTerm) ||
        article.content?.toLowerCase().includes(searchTerm) ||
        article.entityName?.toLowerCase().includes(searchTerm)
      );
    }
  }, [news, loadNewsFromCache]);

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
    searchNews,
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

