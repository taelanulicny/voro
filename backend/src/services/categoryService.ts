import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import { ScanCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { Entity, PriceHistory, Transaction, Post } from '../models/types';
import { getAllEntities, getEntityPrice } from './tradingService';
import { BASE_PRICE } from './priceCalculationService';
import { getCurrentTradingSessionStart, getPreviousTradingSessionStart } from '../utils/tradingSession';

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

export interface EntityWithStats {
  entityId: number;
  name: string;
  category: string;
  basePrice: number;
  description: string;
  logoUrl?: string;
  currentPrice: number;
  changeSession: number;
  changePercentSession: number;
  volumeSession?: number;
  postCount?: number;
  commentCount?: number;
}

/**
 * Get trending entities sorted by trading session trade volume
 */
export async function getTrendingEntities(limit: number = 20): Promise<EntityWithStats[]> {
  try {
    const sessionStart = getCurrentTradingSessionStart();

    // Get all transactions from current trading session
    const transactionsResult = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.TRANSACTIONS,
        FilterExpression: 'timestamp > :sessionStart',
        ExpressionAttributeValues: {
          ':sessionStart': sessionStart,
        },
      })
    );

    const transactions = (transactionsResult.Items || []) as Transaction[];

    // Calculate volume per entity (sum of tokensCommitted)
    const volumeMap: Record<number, number> = {};
    transactions.forEach((tx) => {
      volumeMap[tx.entityId] = (volumeMap[tx.entityId] || 0) + tx.tokensCommitted;
    });

    // Get all entities
    const entities = await getAllEntities();

    // Calculate stats for each entity
    const entitiesWithStats = await Promise.all(
      entities.map(async (entity) => {
        const currentPrice = await getEntityPrice(entity.entityId);
        const price = currentPrice || BASE_PRICE;
        const changeSession = price - BASE_PRICE;
        const changePercentSession = (changeSession / BASE_PRICE) * 100;

        return {
          ...entity,
          currentPrice: price,
          changeSession,
          changePercentSession,
          volumeSession: volumeMap[entity.entityId] || 0,
        };
      })
    );

    // Sort by volume (descending) and limit
    return entitiesWithStats
      .sort((a, b) => (b.volumeSession || 0) - (a.volumeSession || 0))
      .slice(0, limit);
  } catch (error: any) {
    console.error('Error getting trending entities:', error);
    return [];
  }
}

/**
 * Get biggest movers (gainers and losers by price change)
 */
export async function getMovers(limit: number = 20): Promise<{
  gainers: EntityWithStats[];
  losers: EntityWithStats[];
}> {
  try {
    const entities = await getAllEntities();

    // Calculate stats for each entity
    const entitiesWithStats = await Promise.all(
      entities.map(async (entity) => {
        const currentPrice = await getEntityPrice(entity.entityId);
        const price = currentPrice || BASE_PRICE;
        const changeSession = price - BASE_PRICE;
        const changePercentSession = (changeSession / BASE_PRICE) * 100;

        return {
          ...entity,
          currentPrice: price,
          changeSession,
          changePercentSession,
        };
      })
    );

    // Sort by price change
    const sorted = entitiesWithStats.sort((a, b) => b.changePercentSession - a.changePercentSession);

    // Gainers (positive change)
    const gainers = sorted
      .filter((e) => e.changePercentSession > 0)
      .slice(0, limit);

    // Losers (negative change)
    const losers = sorted
      .filter((e) => e.changePercentSession < 0)
      .reverse()
      .slice(0, limit);

    return { gainers, losers };
  } catch (error: any) {
    console.error('Error getting movers:', error);
    return { gainers: [], losers: [] };
  }
}

/**
 * Get most discussed entities (by post count)
 */
export async function getMostDiscussed(limit: number = 20): Promise<
  Array<{
    entityId: number;
    entityName: string;
    postCount: number;
    commentCount: number;
  }>
> {
  try {
    // Get all posts
    const postsResult = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.POSTS,
      })
    );

    const posts = (postsResult.Items || []) as Post[];

    // Count posts and comments per entity
    const entityStats: Record<
      number,
      { postCount: number; commentCount: number; entityName?: string }
    > = {};

    posts.forEach((post) => {
      if (post.entityId) {
        if (!entityStats[post.entityId]) {
          entityStats[post.entityId] = {
            postCount: 0,
            commentCount: 0,
            entityName: post.entityName,
          };
        }
        entityStats[post.entityId].postCount += 1;
        entityStats[post.entityId].commentCount += post.comments || 0;
      }
    });

    // Convert to array and sort by post count
    const result = Object.entries(entityStats)
      .map(([entityId, stats]) => ({
        entityId: parseInt(entityId, 10),
        entityName: stats.entityName || 'Unknown',
        postCount: stats.postCount,
        commentCount: stats.commentCount,
      }))
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, limit);

    return result;
  } catch (error: any) {
    console.error('Error getting most discussed entities:', error);
    return [];
  }
}

/**
 * Get entities for discovery feed (with pagination)
 */
export async function getDiscoverEntities(
  category?: string,
  limit: number = 20,
  lastKey?: string
): Promise<{ entities: EntityWithStats[]; nextCursor?: string }> {
  try {
    // Get entities (optionally filtered by category)
    let entities = await getAllEntities(category);

    // Calculate stats for each entity
    const entitiesWithStats = await Promise.all(
      entities.map(async (entity) => {
        const currentPrice = await getEntityPrice(entity.entityId);
        const price = currentPrice || BASE_PRICE;
        const changeSession = price - BASE_PRICE;
        const changePercentSession = (changeSession / BASE_PRICE) * 100;

        return {
          ...entity,
          currentPrice: price,
          changeSession,
          changePercentSession,
        };
      })
    );

    // Apply pagination
    let startIndex = 0;
    if (lastKey) {
      try {
        startIndex = parseInt(Buffer.from(lastKey, 'base64').toString(), 10) || 0;
      } catch (e) {
        // Invalid cursor, start from beginning
      }
    }

    const paginatedEntities = entitiesWithStats.slice(startIndex, startIndex + limit);
    const nextIndex = startIndex + limit;
    const hasMore = nextIndex < entitiesWithStats.length;

    return {
      entities: paginatedEntities,
      nextCursor: hasMore
        ? Buffer.from(nextIndex.toString()).toString('base64')
        : undefined,
    };
  } catch (error: any) {
    console.error('Error getting discover entities:', error);
    return { entities: [] };
  }
}

/**
 * Get personalized recommendations for a user
 */
export async function getForYouEntities(
  userId: string,
  limit: number = 20
): Promise<{
  entities: EntityWithStats[];
  reasons: Record<number, string>;
}> {
  try {
    // Get user's watchlist
    const watchlistResult = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.WATCHLISTS,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      })
    );

    const watchlist = watchlistResult.Items || [];
    const watchlistEntityIds = new Set(watchlist.map((item) => item.entityId));

    // Get user's portfolio
    const portfolioResult = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.PORTFOLIOS,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      })
    );

    const portfolio = portfolioResult.Items || [];
    const portfolioEntityIds = new Set(portfolio.map((item) => item.entityId));

    // Get all entities
    const entities = await getAllEntities();

    // Calculate stats and reasons
    const entitiesWithReasons: Array<EntityWithStats & { reason: string }> = await Promise.all(
      entities.map(async (entity) => {
        const currentPrice = await getEntityPrice(entity.entityId);
        const price = currentPrice || BASE_PRICE;
        const changeSession = price - BASE_PRICE;
        const changePercentSession = (changeSession / BASE_PRICE) * 100;

        let reason = '';
        if (watchlistEntityIds.has(entity.entityId)) {
          reason = 'In your watchlist';
        } else if (portfolioEntityIds.has(entity.entityId)) {
          reason = 'Similar to your holdings';
        } else {
          // Same category as user's holdings
          const userCategories = new Set(
            portfolio.map((p: any) => {
              // Get entity category
              const holdingEntity = entities.find((e) => e.entityId === p.entityId);
              return holdingEntity?.category;
            }).filter(Boolean)
          );
          if (userCategories.has(entity.category)) {
            reason = `Popular in ${entity.category}`;
          } else {
            reason = 'Trending now';
          }
        }

        return {
          ...entity,
          currentPrice: price,
          changeSession,
          changePercentSession,
          reason,
        };
      })
    );

    // Sort by relevance (watchlist first, then portfolio categories, then trending)
    entitiesWithReasons.sort((a, b) => {
      const aInWatchlist = watchlistEntityIds.has(a.entityId);
      const bInWatchlist = watchlistEntityIds.has(b.entityId);
      if (aInWatchlist && !bInWatchlist) return -1;
      if (!aInWatchlist && bInWatchlist) return 1;

      const aInPortfolio = portfolioEntityIds.has(a.entityId);
      const bInPortfolio = portfolioEntityIds.has(b.entityId);
      if (aInPortfolio && !bInPortfolio) return -1;
      if (!aInPortfolio && bInPortfolio) return 1;

      // Then by price change (trending)
      return b.changePercentSession - a.changePercentSession;
    });

    // Build reasons map and extract entities
    const reasons: Record<number, string> = {};
    const entitiesWithStats: EntityWithStats[] = [];
    
    entitiesWithReasons.forEach((entity) => {
      reasons[entity.entityId] = entity.reason;
      const { reason, ...entityWithoutReason } = entity;
      entitiesWithStats.push(entityWithoutReason);
    });

    return {
      entities: entitiesWithStats.slice(0, limit),
      reasons,
    };
  } catch (error: any) {
    console.error('Error getting for-you entities:', error);
    return { entities: [], reasons: {} };
  }
}

/**
 * Get category trade volumes - aggregated trade volume per category
 * Returns current and previous period volumes to show trends
 */
export async function getCategoryVolumes(): Promise<CategoryVolume[]> {
  try {
    const currentSessionStart = getCurrentTradingSessionStart();
    const previousSessionStart = getPreviousTradingSessionStart();

    // Get all transactions from current and previous trading sessions
    const transactionsResult = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.TRANSACTIONS,
        FilterExpression: 'timestamp > :previousSessionStart',
        ExpressionAttributeValues: {
          ':previousSessionStart': previousSessionStart,
        },
      })
    );

    const transactions = (transactionsResult.Items || []) as Transaction[];

    // Get all entities to map entityId -> category
    const entities = await getAllEntities();
    const entityCategoryMap: Record<number, string> = {};
    const categoryEntityCount: Record<string, number> = {};
    
    entities.forEach((entity) => {
      entityCategoryMap[entity.entityId] = entity.category;
      categoryEntityCount[entity.category] = (categoryEntityCount[entity.category] || 0) + 1;
    });

    // Calculate volume per category for current and previous trading sessions
    const currentVolumeMap: Record<string, number> = {};
    const previousVolumeMap: Record<string, number> = {};

    const currentSessionStartTime = new Date(currentSessionStart).getTime();
    const previousSessionStartTime = new Date(previousSessionStart).getTime();

    transactions.forEach((tx) => {
      const category = entityCategoryMap[tx.entityId];
      if (!category) return;

      const txTime = new Date(tx.timestamp).getTime();

      if (txTime >= currentSessionStartTime) {
        // Current trading session
        currentVolumeMap[category] = (currentVolumeMap[category] || 0) + tx.tokensCommitted;
      } else if (txTime >= previousSessionStartTime) {
        // Previous trading session
        previousVolumeMap[category] = (previousVolumeMap[category] || 0) + tx.tokensCommitted;
      }
    });

    // Get all unique categories
    const allCategories = new Set([
      ...Object.keys(currentVolumeMap),
      ...Object.keys(previousVolumeMap),
      ...Object.values(entityCategoryMap),
    ]);

    // Calculate total volume for percentage calculation
    const totalCurrentVolume = Object.values(currentVolumeMap).reduce((a, b) => a + b, 0);
    const totalPreviousVolume = Object.values(previousVolumeMap).reduce((a, b) => a + b, 0);

    // Build category volumes array
    const categoryVolumes: CategoryVolume[] = [];

    allCategories.forEach((category) => {
      const currentVolume = currentVolumeMap[category] || 0;
      const previousVolume = previousVolumeMap[category] || 0;
      
      // Calculate percentages (avoid division by zero)
      const percentage = totalCurrentVolume > 0 
        ? (currentVolume / totalCurrentVolume) * 100 
        : 0;
      const previousPercentage = totalPreviousVolume > 0 
        ? (previousVolume / totalPreviousVolume) * 100 
        : 0;

      // Determine color based on percentage change
      const color: 'green' | 'red' = percentage >= previousPercentage ? 'green' : 'red';

      categoryVolumes.push({
        name: category,
        categoryId: category,
        percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
        previousPercentage: Math.round(previousPercentage * 10) / 10,
        color,
        volumeSession: currentVolume,
        previousVolumeSession: previousVolume,
        entityCount: categoryEntityCount[category] || 0,
      });
    });

    // Sort by current percentage (descending)
    categoryVolumes.sort((a, b) => b.percentage - a.percentage);

    return categoryVolumes;
  } catch (error: any) {
    console.error('Error getting category volumes:', error);
    return [];
  }
}

