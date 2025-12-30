import { z } from 'zod';

// ============================================
// User Schemas
// ============================================

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().url().optional().nullable(),
  bio: z.string().optional().nullable(),
  followersCount: z.number().optional().default(0),
  followingCount: z.number().optional().default(0),
  isFollowing: z.boolean().optional(),
});

export type ValidatedUser = z.infer<typeof UserSchema>;

// ============================================
// Post Schemas
// ============================================

export const PostSchema = z.object({
  // Backend uses postId, frontend uses id - accept both
  id: z.string().optional(),
  postId: z.string().optional(),
  userId: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().url().optional().nullable(),
  content: z.string(),
  entityId: z.number().optional().nullable(),
  entityTicker: z.string().optional().nullable(),
  entityName: z.string().optional().nullable(),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional().nullable(),
  images: z.array(z.string().url()).optional(),
  likes: z.number().default(0),
  comments: z.number().default(0),
  isLiked: z.boolean().default(false),
  isBookmarked: z.boolean().default(false),
  timestamp: z.string(),
}).transform((data) => ({
  ...data,
  // Normalize id field
  id: data.postId || data.id || '',
}));

export type ValidatedPost = z.infer<typeof PostSchema>;

export const PostArraySchema = z.array(PostSchema);

// ============================================
// Comment Schemas
// ============================================

export const CommentSchema = z.object({
  // Backend uses commentId, frontend uses id - accept both
  id: z.string().optional(),
  commentId: z.string().optional(),
  postId: z.string(),
  userId: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().url().optional().nullable(),
  content: z.string(),
  likes: z.number().default(0),
  isLiked: z.boolean().default(false),
  timestamp: z.string(),
}).transform((data) => ({
  ...data,
  // Normalize id field
  id: data.commentId || data.id || '',
}));

export type ValidatedComment = z.infer<typeof CommentSchema>;

export const CommentArraySchema = z.array(CommentSchema);

// ============================================
// Entity Schemas
// ============================================

export const EntitySchema = z.object({
  id: z.number(),
  ticker: z.string(),
  name: z.string(),
  type: z.enum(['stock', 'crypto', 'commodity', 'forex']).optional(),
  currentPrice: z.number(),
  change24h: z.number().optional().default(0),
  changePercent24h: z.number().optional().default(0),
  volume24h: z.number().optional(),
  marketCap: z.number().optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional().nullable(),
  category: z.string().optional(),
});

export type ValidatedEntity = z.infer<typeof EntitySchema>;

export const EntityArraySchema = z.array(EntitySchema);

// ============================================
// News Schemas
// ============================================

export const NewsArticleSchema = z.object({
  // Backend uses articleId, frontend uses id - accept both
  id: z.string().optional(),
  articleId: z.string().optional(),
  title: z.string(),
  summary: z.string(),
  content: z.string(),
  source: z.string(),
  sourceUrl: z.string().url().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  author: z.string().optional().nullable(),
  publishedAt: z.string(),
  category: z.enum(['Tech', 'Politics', 'Events', 'People', 'General']),
  entityId: z.number().optional().nullable(),
  entityTicker: z.string().optional().nullable(),
  entityName: z.string().optional().nullable(),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  sentimentScore: z.number().min(-100).max(100),
  impactLevel: z.enum(['low', 'medium', 'high', 'critical']),
  tags: z.array(z.string()),
  viewCount: z.number().default(0),
  isBreaking: z.boolean().default(false),
}).transform((data) => ({
  ...data,
  // Normalize id field
  id: data.articleId || data.id || '',
}));

export type ValidatedNewsArticle = z.infer<typeof NewsArticleSchema>;

export const NewsArticleArraySchema = z.array(NewsArticleSchema);

// ============================================
// Transaction Schemas
// ============================================

export const TransactionSchema = z.object({
  // Backend uses transactionId, frontend uses id - accept both
  id: z.string().optional(),
  transactionId: z.string().optional(),
  entityId: z.number(),
  entityName: z.string(),
  entityTicker: z.string(),
  type: z.enum(['buy', 'sell']),
  quantity: z.number().positive(),
  pricePerToken: z.number().positive(),
  totalAmount: z.number().positive(),
  timestamp: z.string(),
  category: z.string(),
}).transform((data) => ({
  ...data,
  // Normalize id field
  id: data.transactionId || data.id || '',
}));

export type ValidatedTransaction = z.infer<typeof TransactionSchema>;

export const TransactionArraySchema = z.array(TransactionSchema);

export const TransactionsResponseSchema = z.object({
  transactions: TransactionArraySchema,
  lastEvaluatedKey: z.string().optional().nullable(),
});

// ============================================
// Portfolio Schemas
// ============================================

export const HoldingSchema = z.object({
  entityId: z.number(),
  entityName: z.string(),
  entityTicker: z.string(),
  quantity: z.number().nonnegative(),
  averageCost: z.number().nonnegative(),
  currentPrice: z.number().nonnegative(),
  totalValue: z.number().nonnegative(),
  totalCost: z.number().nonnegative(),
  profitLoss: z.number(),
  profitLossPercent: z.number(),
  category: z.string(),
});

export type ValidatedHolding = z.infer<typeof HoldingSchema>;

export const PortfolioSchema = z.object({
  cashBalance: z.number().nonnegative(),
  totalValue: z.number().nonnegative(),
  holdings: z.array(HoldingSchema),
  todayChange: z.number(),
  todayChangePercent: z.number(),
});

export type ValidatedPortfolio = z.infer<typeof PortfolioSchema>;

export const PortfolioResponseSchema = PortfolioSchema;

// ============================================
// Group Schemas
// ============================================

export const GroupSchema = z.object({
  // Backend uses groupId, frontend uses id - accept both
  id: z.string().optional(),
  groupId: z.string().optional(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  memberCount: z.number().nonnegative().default(0),
  isPrivate: z.boolean().default(false),
  isMember: z.boolean().optional().default(false),
  coverImage: z.string().url().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  ownerId: z.string().optional(),
}).transform((data) => ({
  ...data,
  // Normalize id field
  id: data.groupId || data.id || '',
}));

export type ValidatedGroup = z.infer<typeof GroupSchema>;

export const GroupArraySchema = z.array(GroupSchema);

export const GroupsResponseSchema = z.object({
  groups: GroupArraySchema,
  lastEvaluatedKey: z.string().optional().nullable(),
});

export const GroupResponseSchema = z.object({
  group: GroupSchema,
});

// ============================================
// Watchlist Schemas
// ============================================

export const WatchlistItemSchema = z.object({
  entityId: z.number(),
  entityTicker: z.string().optional(),
  entityName: z.string().optional(),
  category: z.string().optional(),
  addedAt: z.string().optional(),
  currentPrice: z.number().optional(),
  change24h: z.number().optional(),
  changePercent24h: z.number().optional(),
});

export type ValidatedWatchlistItem = z.infer<typeof WatchlistItemSchema>;

// ============================================
// Notification Schemas
// ============================================

export const NotificationSchema = z.object({
  notificationId: z.string(),
  userId: z.string(),
  type: z.enum(['like', 'comment', 'reply', 'follow', 'mention', 'trade', 'price_alert', 'group_invite', 'group_post', 'system']),
  title: z.string(),
  message: z.string(),
  isRead: z.boolean().default(false),
  createdAt: z.string(),
  actorUserId: z.string().optional(),
  actorUsername: z.string().optional(),
  actorDisplayName: z.string().optional(),
  actorAvatarUrl: z.string().url().optional().nullable(),
  postId: z.string().optional(),
  commentId: z.string().optional(),
  entityId: z.number().optional(),
  entityTicker: z.string().optional(),
  entityName: z.string().optional(),
  groupId: z.string().optional(),
  groupName: z.string().optional(),
  targetPrice: z.number().optional(),
  currentPrice: z.number().optional(),
  actionUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
});

export const NotificationArraySchema = z.array(NotificationSchema);

export type ValidatedNotification = z.infer<typeof NotificationSchema>;

export const WatchlistArraySchema = z.array(WatchlistItemSchema);

export const WatchlistResponseSchema = z.array(WatchlistItemSchema);

// ============================================
// Entities Response Schema
// ============================================

export const EntitiesResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.array(EntitySchema),
});

// ============================================
// API Response Schemas
// ============================================

export const FeedResponseSchema = z.object({
  posts: PostArraySchema,
  lastEvaluatedKey: z.string().optional().nullable(),
});

export const CommentsResponseSchema = z.array(CommentSchema);

export const EntityPricesResponseSchema = z.record(z.string(), z.number());

// ============================================
// Backend Entity Schema (different from frontend Entity)
// ============================================

export const BackendEntitySchema = z.object({
  entityId: z.number(),
  ticker: z.string(),
  name: z.string(),
  category: z.string(),
  basePrice: z.number(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional().nullable(),
  createdAt: z.string().optional(),
  currentPrice: z.number().optional(),
  change24h: z.number().optional(),
  changePercent24h: z.number().optional(),
  volume24h: z.number().optional(),
  marketCap: z.number().optional(),
});

export type ValidatedBackendEntity = z.infer<typeof BackendEntitySchema>;

export const BackendEntityArraySchema = z.array(BackendEntitySchema);

// ============================================
// Validation Helpers
// ============================================

/**
 * Safely validate data with a schema, returning null on failure
 */
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  // Early return if data is undefined or null (unless schema allows it)
  if (data === undefined || data === null) {
    return null;
  }
  
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Only log validation errors in development to reduce noise
      if (__DEV__) {
        const errorDetails = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.debug('Validation failed:', errorDetails);
      }
    }
    return null;
  }
}

/**
 * Validate data with a schema, throwing on failure with detailed error
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorDetails = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Validation failed: ${errorDetails}`);
    }
    throw error;
  }
}

/**
 * Validate an array, filtering out invalid items instead of throwing
 */
export function validateArrayLoose<T>(schema: z.ZodSchema<T>, data: unknown[]): T[] {
  // Early return if data is not an array
  if (!Array.isArray(data)) {
    return [];
  }
  
  return data
    .filter(item => item !== undefined && item !== null) // Filter out undefined/null first
    .map(item => safeValidate(schema, item))
    .filter((item): item is T => item !== null);
}

