import { useState, useCallback, useEffect } from 'react';
import { authenticatedRequest, apiRequest, isBackendConfigured } from '../config/api';
import { Entity, PriceDataPoint } from '../types';
import { useAuth } from '../context/AuthContext';

export interface EntityWithStats extends Entity {
  volume24h?: number;
  postCount?: number;
  commentCount?: number;
  category?: string;
}

export interface MoversData {
  gainers: EntityWithStats[];
  losers: EntityWithStats[];
}

export interface DiscoverData {
  entities: EntityWithStats[];
  nextCursor?: string;
}

export interface ForYouData {
  entities: EntityWithStats[];
  reasons: Record<number, string>;
}

// Map backend entity format to frontend Entity format
const mapBackendEntity = (backendEntity: any): EntityWithStats => {
  return {
    id: backendEntity.entityId,
    ticker: backendEntity.ticker,
    name: backendEntity.name,
    type: 'stock' as const,
    currentPrice: backendEntity.currentPrice || backendEntity.basePrice || 0,
    change24h: backendEntity.change24h || 0,
    changePercent24h: backendEntity.changePercent24h || 0,
    volume24h: backendEntity.volume24h || 0,
    marketCap: 0, // Not provided by backend
    description: backendEntity.description,
    logoUrl: backendEntity.logoUrl,
    category: backendEntity.category,
    postCount: backendEntity.postCount,
    commentCount: backendEntity.commentCount,
  };
};

export function useCategoryData() {
  const { token, isAuthenticated } = useAuth();
  const [trending, setTrending] = useState<EntityWithStats[]>([]);
  const [movers, setMovers] = useState<MoversData>({ gainers: [], losers: [] });
  const [discussed, setDiscussed] = useState<EntityWithStats[]>([]);
  const [discoverEntities, setDiscoverEntities] = useState<EntityWithStats[]>([]);
  const [forYouEntities, setForYouEntities] = useState<EntityWithStats[]>([]);
  const [forYouReasons, setForYouReasons] = useState<Record<number, string>>({});
  
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);
  const [isLoadingMovers, setIsLoadingMovers] = useState(false);
  const [isLoadingDiscussed, setIsLoadingDiscussed] = useState(false);
  const [isLoadingDiscover, setIsLoadingDiscover] = useState(false);
  const [isLoadingForYou, setIsLoadingForYou] = useState(false);
  
  const [discoverCursor, setDiscoverCursor] = useState<string | null>(null);
  const [hasMoreDiscover, setHasMoreDiscover] = useState(true);

  const fetchTrending = useCallback(async () => {
    if (!isBackendConfigured()) return;
    
    setIsLoadingTrending(true);
    try {
      const response = await apiRequest<{ entities: any[]; timeframe: string }>(
        '/api/categories/trending?limit=20'
      );
      
      if (response.success && response.data?.entities) {
        const mapped = response.data.entities.map(mapBackendEntity);
        setTrending(mapped);
      }
    } catch (error: any) {
      console.error('[Categories] Error fetching trending entities:', {
        error: error.message || String(error),
        errorType: error.name || 'Error',
        status: error.status || 'unknown',
        endpoint: '/api/categories/trending',
        hint: 'Trending entities unavailable. Check backend connectivity.',
      });
    } finally {
      setIsLoadingTrending(false);
    }
  }, []);

  const fetchMovers = useCallback(async () => {
    if (!isBackendConfigured()) return;
    
    setIsLoadingMovers(true);
    try {
      const response = await apiRequest<MoversData>('/api/categories/movers?limit=20');
      
      if (response.success && response.data) {
        setMovers({
          gainers: response.data.gainers?.map(mapBackendEntity) || [],
          losers: response.data.losers?.map(mapBackendEntity) || [],
        });
      }
    } catch (error: any) {
      console.error('[Categories] Error fetching movers:', {
        error: error.message || String(error),
        errorType: error.name || 'Error',
        status: error.status || 'unknown',
        endpoint: '/api/categories/movers',
        hint: 'Top gainers/losers unavailable. Check backend connectivity.',
      });
    } finally {
      setIsLoadingMovers(false);
    }
  }, []);

  const fetchDiscussed = useCallback(async () => {
    if (!isBackendConfigured()) return;
    
    setIsLoadingDiscussed(true);
    try {
      const response = await apiRequest<{ entities: any[] }>('/api/categories/discussed?limit=20');
      
      if (response.success && response.data?.entities) {
        // Fetch full entity data for each discussed entity
        const entitiesResponse = await apiRequest<any[]>('/api/entities');
        const allEntities = entitiesResponse.success && entitiesResponse.data ? entitiesResponse.data : [];
        
        // Map discussed items to full entities
        const discussedEntities = response.data.entities.map((item: any) => {
          const fullEntity = allEntities.find((e: any) => e.entityId === item.entityId);
          if (fullEntity) {
            return {
              ...mapBackendEntity(fullEntity),
              postCount: item.postCount,
              commentCount: item.commentCount,
            };
          }
          // If entity not found, create a minimal entity from discussed data
          return {
            id: item.entityId,
            ticker: item.entityTicker,
            name: item.entityName,
            type: 'stock' as const,
            currentPrice: 0,
            change24h: 0,
            changePercent24h: 0,
            volume24h: 0,
            marketCap: 0,
            postCount: item.postCount,
            commentCount: item.commentCount,
          };
        });
        
        setDiscussed(discussedEntities as EntityWithStats[]);
      }
    } catch (error: any) {
      console.error('[Categories] Error fetching discussed entities:', {
        error: error.message || String(error),
        errorType: error.name || 'Error',
        status: error.status || 'unknown',
        endpoint: '/api/categories/discussed',
        hint: 'Most discussed entities unavailable. Check backend connectivity.',
      });
    } finally {
      setIsLoadingDiscussed(false);
    }
  }, []);

  const fetchDiscover = useCallback(async (category?: string | null, cursor?: string | null, append = false) => {
    if (!isBackendConfigured()) return;
    
    setIsLoadingDiscover(true);
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (category && category !== 'All') {
        params.set('category', category);
      }
      if (cursor) params.set('cursor', cursor);
      
      const response = await apiRequest<DiscoverData>(`/api/categories/discover?${params}`);
      
      if (response.success && response.data) {
        const mapped = response.data.entities.map(mapBackendEntity);
        if (append) {
          setDiscoverEntities(prev => [...prev, ...mapped]);
        } else {
          setDiscoverEntities(mapped);
        }
        setDiscoverCursor(response.data.nextCursor || null);
        setHasMoreDiscover(!!response.data.nextCursor);
      }
    } catch (error: any) {
      console.error('[Categories] Error fetching discover entities:', {
        error: error.message || String(error),
        errorType: error.name || 'Error',
        status: error.status || 'unknown',
        endpoint: '/api/categories/discover',
        category: category || 'all',
        hint: 'Discover feed unavailable. Check backend connectivity.',
      });
    } finally {
      setIsLoadingDiscover(false);
    }
  }, []);

  const loadMoreDiscover = useCallback((category?: string | null) => {
    if (!isLoadingDiscover && hasMoreDiscover && discoverCursor) {
      fetchDiscover(category, discoverCursor, true);
    }
  }, [discoverCursor, hasMoreDiscover, isLoadingDiscover, fetchDiscover]);

  // Fetch 24h price history for sparklines (lazy loading)
  const fetchEntityPriceHistory = useCallback(async (entityId: number): Promise<PriceDataPoint[] | null> => {
    if (!isBackendConfigured()) return null;
    
    try {
      const response = await apiRequest<{ data?: PriceDataPoint[] }>(
        `/api/entities/${entityId}/price-history?timeRange=1D`
      );
      
      if (response.success && response.data) {
        // Ensure data is in correct format
        if (Array.isArray(response.data)) {
          return response.data;
        }
        // Handle nested data structure
        const data = response.data as any;
        if (Array.isArray(data.data)) {
          return data.data;
        }
        if (Array.isArray(data.priceHistory)) {
          return data.priceHistory;
        }
      }
      return null;
    } catch (error: any) {
      console.error(`[Price History] Error fetching price history for entity ${entityId}:`, {
        entityId,
        error: error.message || String(error),
        errorType: error.name || 'Error',
        status: error.status || 'unknown',
        endpoint: `/api/entities/${entityId}/price-history`,
        hint: 'Price history unavailable. Sparkline may not display.',
      });
      return null;
    }
  }, []);

  const fetchForYou = useCallback(async () => {
    if (!isBackendConfigured() || !token || !isAuthenticated) return;
    
    setIsLoadingForYou(true);
    try {
      const response = await authenticatedRequest<ForYouData>(
        '/api/categories/for-you?limit=20',
        token
      );
      
      if (response.success && response.data) {
        const mapped = response.data.entities.map(mapBackendEntity);
        setForYouEntities(mapped);
        setForYouReasons(response.data.reasons || {});
      }
    } catch (error: any) {
      console.error('[Categories] Error fetching for-you entities:', {
        error: error.message || String(error),
        errorType: error.name || 'Error',
        status: error.status || 'unknown',
        endpoint: '/api/categories/for-you',
        hint: 'Personalized recommendations unavailable. Check backend connectivity and authentication.',
      });
    } finally {
      setIsLoadingForYou(false);
    }
  }, [token, isAuthenticated]);

  // Initial load
  useEffect(() => {
    fetchTrending();
    fetchMovers();
    fetchDiscussed();
    fetchDiscover();
    fetchForYou();
  }, [fetchTrending, fetchMovers, fetchDiscussed, fetchDiscover, fetchForYou]);

  return {
    trending,
    movers,
    discussed,
    discoverEntities,
    forYouEntities,
    forYouReasons,
    isLoadingTrending,
    isLoadingMovers,
    isLoadingDiscussed,
    isLoadingDiscover,
    isLoadingForYou,
    hasMoreDiscover,
    loadMoreDiscover,
    refreshTrending: fetchTrending,
    refreshMovers: fetchMovers,
    refreshDiscussed: fetchDiscussed,
    refreshDiscover: () => fetchDiscover(undefined, undefined, false),
    refreshForYou: fetchForYou,
    fetchDiscover, // Expose for category filtering
    fetchEntityPriceHistory, // Expose for sparkline data
  };
}

