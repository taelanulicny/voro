import { useState, useCallback, useEffect } from 'react';
import { apiRequest } from '../config/api';
import type { DiscoverEntity } from './useDiscoverData';

interface BackendEntity {
  entityId: number;
  name: string;
  category: string;
  basePrice: number;
  description?: string;
  logoUrl?: string;
  currentPrice: number;
  changeSession: number;
  changePercentSession: number;
  volumeSession?: number;
  postCount?: number;
  commentCount?: number;
}

function mapBackendToDiscover(e: BackendEntity, hasPosition = false): DiscoverEntity {
  return {
    id: e.entityId,
    name: e.name,
    category: e.category,
    basePrice: e.basePrice,
    description: e.description || '',
    currentPrice: e.currentPrice,
    change24h: e.changeSession,
    changePercent24h: e.changePercentSession,
    volume24h: e.volumeSession || 0,
    high24h: e.currentPrice,
    low24h: e.currentPrice,
    newsCount: e.postCount || 0,
    hasPosition,
  };
}

export interface CategoryVolume {
  name: string;
  categoryId: string;
  percentage: number;
  previousPercentage: number;
  color: 'green' | 'red';
  volumeSession: number;
  previousVolumeSession: number;
  entityCount: number;
}

export function useDiscoverApi() {
  const [trending, setTrending] = useState<DiscoverEntity[]>([]);
  const [gainers, setGainers] = useState<DiscoverEntity[]>([]);
  const [losers, setLosers] = useState<DiscoverEntity[]>([]);
  const [categories, setCategories] = useState<CategoryVolume[]>([]);
  const [discoverByCategory, setDiscoverByCategory] = useState<Record<string, DiscoverEntity[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrending = useCallback(async () => {
    const res = await apiRequest<{ entities: BackendEntity[] }>(
      '/api/categories/trending?limit=20',
      { method: 'GET' }
    );
    if (res.success && res.data?.entities) {
      setTrending(res.data.entities.map((e) => mapBackendToDiscover(e)));
    }
  }, []);

  const fetchMovers = useCallback(async () => {
    const res = await apiRequest<{ gainers: BackendEntity[]; losers: BackendEntity[] }>(
      '/api/categories/movers?limit=20',
      { method: 'GET' }
    );
    if (res.success && res.data) {
      setGainers((res.data.gainers || []).map((e) => mapBackendToDiscover(e)));
      setLosers((res.data.losers || []).map((e) => mapBackendToDiscover(e)));
    }
  }, []);

  const fetchVolumes = useCallback(async () => {
    const res = await apiRequest<{ volumes: CategoryVolume[] }>(
      '/api/categories/volumes',
      { method: 'GET' }
    );
    if (res.success && res.data?.volumes) {
      setCategories(res.data.volumes);
    }
  }, []);

  const fetchDiscoverCategory = useCallback(async (category: string) => {
    const res = await apiRequest<{ entities: BackendEntity[] }>(
      `/api/categories/discover?category=${encodeURIComponent(category)}&limit=30`,
      { method: 'GET' }
    );
    if (res.success && res.data?.entities) {
      setDiscoverByCategory((prev) => ({
        ...prev,
        [category]: res.data!.entities.map((e) => mapBackendToDiscover(e)),
      }));
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchTrending(), fetchMovers(), fetchVolumes()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load discover');
    } finally {
      setLoading(false);
    }
  }, [fetchTrending, fetchMovers, fetchVolumes]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    trending,
    gainers,
    losers,
    categories,
    discoverByCategory,
    fetchDiscoverCategory,
    loading,
    error,
    refresh: load,
  };
}
