import { useState, useCallback, useEffect } from 'react';
import { authenticatedRequest, apiRequest, isBackendConfigured } from '../config/api';
import { Entity } from '../types';
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
    } catch (error) {
      console.error('Error fetching trending entities:', error);
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
    } catch (error) {
      console.error('Error fetching movers:', error);
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
    } catch (error) {
      console.error('Error fetching discussed entities:', error);
    } finally {
      setIsLoadingDiscussed(false);
    }
  }, []);

  const fetchDiscover = useCallback(async (category?: string, cursor?: string | null, append = false) => {
    if (!isBackendConfigured()) return;
    
    setIsLoadingDiscover(true);
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (category) params.set('category', category);
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
    } catch (error) {
      console.error('Error fetching discover entities:', error);
    } finally {
      setIsLoadingDiscover(false);
    }
  }, []);

  const loadMoreDiscover = useCallback(() => {
    if (!isLoadingDiscover && hasMoreDiscover && discoverCursor) {
      fetchDiscover(undefined, discoverCursor, true);
    }
  }, [discoverCursor, hasMoreDiscover, isLoadingDiscover, fetchDiscover]);

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
    } catch (error) {
      console.error('Error fetching for-you entities:', error);
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
  };
}

