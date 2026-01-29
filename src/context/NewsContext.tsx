import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { NewsArticle, NewsFilter } from '../types';
import { ENTITIES } from '../utils/entities';
import { fetchTopHeadlines, isNewsApiConfigured } from '../services/newsApiService';

interface NewsContextType {
  news: NewsArticle[];
  isLoadingNews: boolean;
  breakingNews: NewsArticle[];

  // Actions
  refreshNews: () => Promise<void>;
  getNewsByEntity: (entityId: number) => NewsArticle[];
  getNewsByFilter: (filter: NewsFilter) => NewsArticle[];
  markAsRead: (articleId: string) => void;
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

export function NewsProvider({ children }: { children: ReactNode }) {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);

  const breakingNews = news.filter(article => article.isBreaking);

  // Fetch news from NewsAPI
  const refreshNews = useCallback(async () => {
    if (!isNewsApiConfigured()) {
      console.warn('[NewsContext] NewsAPI not configured. Set EXPO_PUBLIC_NEWS_API_KEY environment variable.');
      setNews([]);
      return;
    }

    setIsLoadingNews(true);
    try {
      // Fetch top headlines from multiple categories
      const [general, tech, business] = await Promise.all([
        fetchTopHeadlines({ pageSize: 20 }),
        fetchTopHeadlines({ category: 'technology', pageSize: 10 }),
        fetchTopHeadlines({ category: 'business', pageSize: 10 }),
      ]);

      // Combine and deduplicate
      const allNews = [...general, ...tech, ...business];
      const uniqueNews = Array.from(
        new Map(allNews.map(article => [article.url, article])).values()
      );

      setNews(uniqueNews);
    } catch (error) {
      console.error('[NewsContext] Error fetching news:', error);
      setNews([]);
    } finally {
      setIsLoadingNews(false);
    }
  }, []);

  // Load news on mount
  useEffect(() => {
    refreshNews();
  }, [refreshNews]);

  const getNewsByEntity = useCallback((entityId: number): NewsArticle[] => {
    return news.filter(article => article.entityId === entityId);
  }, [news]);

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
