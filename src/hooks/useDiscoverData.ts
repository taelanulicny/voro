import { useMemo } from 'react';
import { useTrading } from '../context/TradingContext';
import { useNews } from '../context/NewsContext';
import { ENTITIES, EntityData } from '../utils/entities';

/**
 * Entity data enriched with market metrics for the Discover tab
 */
export interface DiscoverEntity extends EntityData {
  currentPrice: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  newsCount: number;
  hasPosition: boolean;
}

/**
 * Hook to compute data for the Discover/Categories tab
 * Provides trending entities, movers, most discussed, and personalized recommendations
 */
export function useDiscoverData() {
  const {
    getEntityPrice,
    getEntityVolume,
    getEntityHigh,
    getEntityLow,
    getPosition,
    portfolio,
  } = useTrading();
  const { getNewsByEntity } = useNews();

  /**
   * Enrich all entities with current market data
   */
  const enrichedEntities: DiscoverEntity[] = useMemo(() => {
    return ENTITIES.map((entity) => {
      const currentPrice = getEntityPrice(entity.id);
      const volume = getEntityVolume(entity.id);
      const high = getEntityHigh(entity.id);
      const low = getEntityLow(entity.id);
      const newsArticles = getNewsByEntity(entity.id);
      const position = getPosition(entity.id);

      // Calculate opening price from high/low if available
      // If high === low === currentPrice, then no trading occurred yet, opening = 100
      const openingPrice = high === low && high === currentPrice ? 100 : entity.basePrice;
      const change24h = currentPrice - openingPrice;
      const changePercent24h = openingPrice !== 0 ? (change24h / openingPrice) * 100 : 0;

      return {
        ...entity,
        currentPrice,
        change24h,
        changePercent24h,
        volume24h: volume,
        high24h: high,
        low24h: low,
        newsCount: newsArticles.length,
        hasPosition: position !== null,
      };
    });
  }, [getEntityPrice, getEntityVolume, getEntityHigh, getEntityLow, getNewsByEntity, getPosition]);

  /**
   * Compute Trending entities (highest volume)
   * Entities with the most trading activity
   */
  const trending = useMemo(() => {
    return [...enrichedEntities]
      .filter((entity) => entity.volume24h > 0) // Only entities with volume
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, 10); // Top 10 trending
  }, [enrichedEntities]);

  /**
   * Compute Biggest Movers (highest absolute price change %)
   * Entities with the most significant price movements
   */
  const movers = useMemo(() => {
    return [...enrichedEntities]
      .filter((entity) => entity.changePercent24h !== 0) // Only entities with price movement
      .sort((a, b) => Math.abs(b.changePercent24h) - Math.abs(a.changePercent24h))
      .slice(0, 10); // Top 10 movers
  }, [enrichedEntities]);

  /**
   * Compute Most Discussed entities (most news articles)
   * Entities with the highest media coverage
   */
  const discussed = useMemo(() => {
    return [...enrichedEntities]
      .filter((entity) => entity.newsCount > 0) // Only entities with news
      .sort((a, b) => b.newsCount - a.newsCount)
      .slice(0, 10); // Top 10 most discussed
  }, [enrichedEntities]);

  /**
   * Compute New Entities
   * Note: Currently ENTITIES array doesn't have createdAt field
   * For MVP, we'll return empty array or newest additions manually
   * TODO: Add createdAt field to EntityData when backend supports it
   */
  const newEntities = useMemo(() => {
    // Placeholder: return empty array until createdAt is available
    // In the future, sort by createdAt descending
    return [];
  }, []);

  /**
   * Compute For You (personalized recommendations)
   * Based on user's current portfolio holdings
   * Recommends entities in the same categories as user's holdings
   */
  const forYou = useMemo(() => {
    // Get categories of user's current holdings
    const userCategories = new Set(
      portfolio.holdings.map((holding) => {
        const entity = ENTITIES.find((e) => e.id === holding.entityId);
        return entity?.category;
      }).filter(Boolean) as string[]
    );

    // If user has no holdings, recommend trending entities
    if (userCategories.size === 0) {
      return trending.slice(0, 10);
    }

    // Find entities in same categories that user doesn't have positions in
    const recommendations = enrichedEntities
      .filter((entity) => {
        // Must be in a category user is interested in
        if (!userCategories.has(entity.category)) return false;
        // Must not already have a position
        if (entity.hasPosition) return false;
        return true;
      })
      // Sort by volume (prioritize active entities)
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, 10);

    // If not enough recommendations, fill with trending entities
    if (recommendations.length < 5) {
      const trendingFallback = trending.filter(
        (entity) => !entity.hasPosition && !recommendations.find((r) => r.id === entity.id)
      );
      return [...recommendations, ...trendingFallback].slice(0, 10);
    }

    return recommendations;
  }, [enrichedEntities, portfolio.holdings, trending]);

  /**
   * Compute Top Gainers (highest positive price change %)
   */
  const topGainers = useMemo(() => {
    return [...enrichedEntities]
      .filter((entity) => entity.changePercent24h > 0)
      .sort((a, b) => b.changePercent24h - a.changePercent24h)
      .slice(0, 10);
  }, [enrichedEntities]);

  /**
   * Compute Top Losers (highest negative price change %)
   */
  const topLosers = useMemo(() => {
    return [...enrichedEntities]
      .filter((entity) => entity.changePercent24h < 0)
      .sort((a, b) => a.changePercent24h - b.changePercent24h)
      .slice(0, 10);
  }, [enrichedEntities]);

  return {
    // Core sections for Discover tab
    trending,
    movers,
    discussed,
    newEntities,
    forYou,

    // Additional useful sections
    topGainers,
    topLosers,

    // Full enriched data
    allEntities: enrichedEntities,
  };
}
