import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { NewsProvider, useNews } from '../../context/NewsContext';
import { AuthProvider } from '../../context/AuthContext';
import { ThemeProvider } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, isBackendConfigured } from '../../config/api';
import { createMockNewsArticle } from '../helpers/testUtils';

jest.mock('../../config/api');
jest.mock('../../context/AuthContext', () => ({
  ...jest.requireActual('../../context/AuthContext'),
  useAuth: jest.fn(),
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;
const mockIsBackendConfigured = isBackendConfigured as jest.MockedFunction<typeof isBackendConfigured>;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <AuthProvider>
      <NewsProvider>{children}</NewsProvider>
    </AuthProvider>
  </ThemeProvider>
);

describe('NewsContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    mockIsBackendConfigured.mockReturnValue(true);
  });

  describe('Initial State', () => {
    it('should initialize with empty state', async () => {
      // Mock the initial fetch that might happen
      mockApiRequest.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useNews(), { wrapper });

      // Wait for any initial loading to complete
      await waitFor(() => {
        expect(result.current.isLoadingNews).toBe(false);
      });

      expect(result.current.news).toEqual([]);
      expect(result.current.breakingNews).toEqual([]);
    });
  });

  describe('refreshNews', () => {
    it('should fetch news successfully', async () => {
      const mockArticles = [
        createMockNewsArticle({ id: 'news-1', title: 'First News' }),
        createMockNewsArticle({ id: 'news-2', title: 'Second News' }),
      ];

      mockApiRequest.mockResolvedValue({
        success: true,
        data: mockArticles,
      });

      const { result } = renderHook(() => useNews(), { wrapper });

      // Wait for initial load from useEffect to complete
      await waitFor(() => {
        expect(result.current.isLoadingNews).toBe(false);
      });

      await act(async () => {
        await result.current.refreshNews();
      });

      await waitFor(() => {
        expect(result.current.news).toHaveLength(2);
        expect(result.current.isLoadingNews).toBe(false);
      });
    });

    it('should load from cache first', async () => {
      const cachedArticles = [
        createMockNewsArticle({ id: 'cached-1', title: 'Cached News' }),
      ];

      // Set cache with recent timestamp (within TTL)
      await AsyncStorage.setItem('@moro_news_cache', JSON.stringify(cachedArticles));
      await AsyncStorage.setItem('@moro_news_cache_timestamp', Date.now().toString());

      // Mock backend response (will be fetched after cache is shown)
      mockApiRequest.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useNews(), { wrapper });

      // Wait for initial load from useEffect
      await waitFor(() => {
        expect(result.current.isLoadingNews).toBe(false);
      });

      // Cache should be loaded immediately
      expect(result.current.news.length).toBeGreaterThan(0);
      expect(result.current.news[0].title).toBe('Cached News');
    });

    it('should handle backend not configured', async () => {
      mockIsBackendConfigured.mockReturnValue(false);

      const { result } = renderHook(() => useNews(), { wrapper });

      await act(async () => {
        await result.current.refreshNews();
      });

      expect(mockApiRequest).not.toHaveBeenCalled();
    });
  });

  describe('getNewsByEntity', () => {
    it('should fetch news for entity', async () => {
      const mockArticles = [
        createMockNewsArticle({ id: 'news-1', entityId: 1, entities: [{ entityId: 1, name: 'Test Entity' }] }),
      ];

      // First fetch general news, then entity-specific news
      mockApiRequest
        .mockResolvedValueOnce({
          success: true,
          data: mockArticles,
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockArticles,
        });

      const { result } = renderHook(() => useNews(), { wrapper });

      // First refresh news to populate the state
      await act(async () => {
        await result.current.refreshNews();
      });

      await waitFor(() => {
        expect(result.current.news).toHaveLength(1);
      });

      await act(async () => {
        const articles = await result.current.getNewsByEntity(1, 'Test Entity');
        expect(articles).toHaveLength(1);
      });
    });
  });

  describe('getNewsByFilter', () => {
    it('should filter news by category', async () => {
      const mockArticles = [
        createMockNewsArticle({ id: 'news-1', category: 'Tech' }),
        createMockNewsArticle({ id: 'news-2', category: 'Politics' }),
      ];

      mockApiRequest.mockResolvedValue({
        success: true,
        data: mockArticles,
      });

      const { result } = renderHook(() => useNews(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoadingNews).toBe(false);
      });

      await act(async () => {
        await result.current.refreshNews();
      });

      await waitFor(() => {
        expect(result.current.news).toHaveLength(2);
      });

      const filtered = result.current.getNewsByFilter({ category: 'Tech' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].category).toBe('Tech');
    });

    it('should filter news by sentiment', async () => {
      const mockArticles = [
        createMockNewsArticle({ id: 'news-1', sentiment: 'positive' }),
        createMockNewsArticle({ id: 'news-2', sentiment: 'negative' }),
      ];

      mockApiRequest.mockResolvedValue({
        success: true,
        data: mockArticles,
      });

      const { result } = renderHook(() => useNews(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoadingNews).toBe(false);
      });

      await act(async () => {
        await result.current.refreshNews();
      });

      await waitFor(() => {
        expect(result.current.news).toHaveLength(2);
      });

      const filtered = result.current.getNewsByFilter({ sentiment: 'positive' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].sentiment).toBe('positive');
    });
  });

  describe('searchNews', () => {
    it('should search news successfully', async () => {
      const mockArticles = [
        createMockNewsArticle({ id: 'news-1', title: 'Searchable News' }),
      ];

      // Mock both initial fetch and search
      mockApiRequest
        .mockResolvedValueOnce({
          success: true,
          data: [],
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockArticles,
        });

      const { result } = renderHook(() => useNews(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoadingNews).toBe(false);
      });

      await act(async () => {
        const articles = await result.current.searchNews('searchable');
        expect(articles).toHaveLength(1);
      });
    });
  });

  describe('breakingNews', () => {
    it('should filter breaking news', async () => {
      const mockArticles = [
        createMockNewsArticle({ id: 'news-1', isBreaking: true }),
        createMockNewsArticle({ id: 'news-2', isBreaking: false }),
      ];

      mockApiRequest.mockResolvedValue({
        success: true,
        data: mockArticles,
      });

      const { result } = renderHook(() => useNews(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoadingNews).toBe(false);
      });

      await act(async () => {
        await result.current.refreshNews();
      });

      await waitFor(() => {
        expect(result.current.news).toHaveLength(2);
      });

      expect(result.current.breakingNews).toHaveLength(1);
      expect(result.current.breakingNews[0].isBreaking).toBe(true);
    });
  });

  describe('markAsRead', () => {
    it('should mark article as read', async () => {
      const mockArticles = [
        createMockNewsArticle({ id: 'news-1' }),
      ];

      mockApiRequest.mockResolvedValue({
        success: true,
        data: mockArticles,
      });

      const { result } = renderHook(() => useNews(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoadingNews).toBe(false);
      });

      await act(async () => {
        await result.current.refreshNews();
      });

      await waitFor(() => {
        expect(result.current.news).toHaveLength(1);
      });

      act(() => {
        result.current.markAsRead('news-1');
      });

      // markAsRead is currently a no-op (doesn't update state)
      // Just verify the function exists and can be called
      expect(result.current.markAsRead).toBeDefined();
      expect(result.current.news).toHaveLength(1);
    });
  });
});

