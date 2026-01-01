import { z } from 'zod';

// ============================================
// User Schemas
// ============================================

export const UserSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  email: z.string().email('Invalid email format').optional(),
  username: z.string().min(1, 'Username is required').max(30, 'Username cannot exceed 30 characters'),
  displayName: z.string().min(1, 'Display name is required').max(50, 'Display name cannot exceed 50 characters'),
  avatarUrl: z.string().url('Invalid avatar URL').optional().nullable(),
  bio: z.string().max(160, 'Bio cannot exceed 160 characters').optional().nullable(),
  followersCount: z.number().int().nonnegative().default(0),
  followingCount: z.number().int().nonnegative().default(0),
  isFollowing: z.boolean().optional(),
});

export type ValidatedUser = z.infer<typeof UserSchema>;

// ============================================
// Post Schemas
// ============================================

export const PostSchema = z.object({
  // Backend uses postId, frontend uses id - accept both for backward compatibility
  id: z.string().optional(),
  postId: z.string().optional(),
  userId: z.string().min(1, 'User ID is required'),
  username: z.string().min(1, 'Username is required'),
  displayName: z.string().min(1, 'Display name is required'),
  avatarUrl: z.string().url().optional().nullable(),
  content: z.string().min(1, 'Content is required').max(5000, 'Content cannot exceed 5000 characters'),
  entityId: z.number().int().positive().optional().nullable(),
  entityTicker: z.string().min(1).optional().nullable(),
  entityName: z.string().min(1).optional().nullable(),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional().nullable(),
  images: z.array(z.string().url()).max(4, 'Maximum 4 images allowed').optional(),
  likes: z.number().int().nonnegative().default(0),
  comments: z.number().int().nonnegative().default(0),
  isLiked: z.boolean().default(false),
  isBookmarked: z.boolean().default(false),
  timestamp: z.string().datetime({ message: 'Invalid timestamp format' }),
}).transform((data) => {
  // Normalize id field - ensure it's always present and non-empty
  const normalizedId = data.postId || data.id;
  if (!normalizedId || normalizedId.trim() === '') {
    throw new z.ZodError([{
      code: 'custom',
      path: ['id'],
      message: 'Post ID is required (either id or postId must be provided)',
    }]);
  }
  return {
    ...data,
    id: normalizedId,
  };
}).refine((data) => data.id.length > 0, {
  message: 'Post ID cannot be empty',
  path: ['id'],
});

export type ValidatedPost = z.infer<typeof PostSchema>;

export const PostArraySchema = z.array(PostSchema);

// ============================================
// Comment Schemas
// ============================================

export const CommentSchema = z.object({
  // Backend uses commentId, frontend uses id - accept both for backward compatibility
  id: z.string().optional(),
  commentId: z.string().optional(),
  postId: z.string().min(1, 'Post ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  username: z.string().min(1, 'Username is required'),
  displayName: z.string().min(1, 'Display name is required'),
  avatarUrl: z.string().url().optional().nullable(),
  content: z.string().min(1, 'Content is required').max(2000, 'Content cannot exceed 2000 characters'),
  likes: z.number().int().nonnegative().default(0),
  isLiked: z.boolean().default(false),
  timestamp: z.string().datetime({ message: 'Invalid timestamp format' }),
  parentCommentId: z.string().min(1).optional(),
  replyTo: z.object({
    userId: z.string().min(1),
    username: z.string().min(1),
    displayName: z.string().min(1),
  }).optional(),
  replies: z.array(z.lazy(() => CommentSchema)).optional(),
  editedAt: z.string().datetime({ message: 'Invalid editedAt format' }).optional(),
  isEdited: z.boolean().optional(),
}).transform((data) => {
  // Normalize id field - ensure it's always present and non-empty
  // Standardize on 'id' field name (backend may send 'commentId')
  const normalizedId = data.commentId || data.id;
  if (!normalizedId || typeof normalizedId !== 'string' || normalizedId.trim() === '') {
    throw new z.ZodError([{
      code: 'custom',
      path: ['id'],
      message: 'Comment ID is required (either id or commentId must be provided and non-empty)',
    }]);
  }
  // Build replyTo object from backend fields if needed
  const replyTo = data.replyTo || (data.replyToUserId ? {
    userId: data.replyToUserId,
    username: data.replyToUsername || '',
    displayName: data.replyToDisplayName || '',
  } : undefined);
  
  // Remove commentId from output to standardize on 'id'
  const { commentId, replyToUserId, replyToUsername, replyToDisplayName, ...rest } = data;
  return {
    ...rest,
    id: normalizedId,
    replyTo,
  };
}).refine((data) => data.id && data.id.length > 0, {
  message: 'Comment ID cannot be empty',
  path: ['id'],
});

export type ValidatedComment = z.infer<typeof CommentSchema>;

export const CommentArraySchema = z.array(CommentSchema);

// ============================================
// Entity Schemas
// ============================================

export const EntitySchema = z.object({
  id: z.number().int().positive('Entity ID must be a positive integer'),
  ticker: z.string().min(1, 'Ticker is required').max(10, 'Ticker cannot exceed 10 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
  type: z.enum(['stock', 'crypto', 'commodity', 'forex'], {
    errorMap: () => ({ message: 'Invalid entity type' }),
  }).optional(),
  currentPrice: z.number().nonnegative('Price cannot be negative'),
  change24h: z.number().default(0),
  changePercent24h: z.number().default(0),
  volume24h: z.number().nonnegative().optional(),
  marketCap: z.number().nonnegative().optional(),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  logoUrl: z.string().url('Invalid logo URL').optional().nullable(),
  category: z.string().min(1).optional(),
});

export type ValidatedEntity = z.infer<typeof EntitySchema>;

export const EntityArraySchema = z.array(EntitySchema);

// ============================================
// News Schemas
// ============================================

export const NewsArticleSchema = z.object({
  // Backend uses articleId, frontend uses id - accept both for backward compatibility
  id: z.string().optional(),
  articleId: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
  summary: z.string().min(1, 'Summary is required').max(500, 'Summary cannot exceed 500 characters'),
  content: z.string().min(1, 'Content is required'),
  source: z.string().min(1, 'Source is required'),
  sourceUrl: z.string().url().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  author: z.string().min(1).optional().nullable(),
  publishedAt: z.string().datetime({ message: 'Invalid publishedAt format' }),
  category: z.enum(['Tech', 'Politics', 'Events', 'People', 'General'], {
    errorMap: () => ({ message: 'Invalid category' }),
  }),
  entityId: z.number().int().positive().optional().nullable(),
  entityTicker: z.string().min(1).optional().nullable(),
  entityName: z.string().min(1).optional().nullable(),
  sentiment: z.enum(['positive', 'negative', 'neutral'], {
    errorMap: () => ({ message: 'Invalid sentiment' }),
  }),
  sentimentScore: z.number().int().min(-100).max(100),
  impactLevel: z.enum(['low', 'medium', 'high', 'critical'], {
    errorMap: () => ({ message: 'Invalid impact level' }),
  }),
  tags: z.array(z.string().min(1)).default([]),
  viewCount: z.number().int().nonnegative().default(0),
  isBreaking: z.boolean().default(false),
}).transform((data) => {
  // Normalize id field - ensure it's always present and non-empty
  // Standardize on 'id' field name (backend may send 'articleId')
  const normalizedId = data.articleId || data.id;
  if (!normalizedId || typeof normalizedId !== 'string' || normalizedId.trim() === '') {
    throw new z.ZodError([{
      code: 'custom',
      path: ['id'],
      message: 'Article ID is required (either id or articleId must be provided and non-empty)',
    }]);
  }
  // Remove articleId from output to standardize on 'id'
  const { articleId, ...rest } = data;
  return {
    ...rest,
    id: normalizedId,
  };
}).refine((data) => data.id && data.id.length > 0, {
  message: 'Article ID cannot be empty',
  path: ['id'],
});

export type ValidatedNewsArticle = z.infer<typeof NewsArticleSchema>;

export const NewsArticleArraySchema = z.array(NewsArticleSchema);

// ============================================
// Transaction Schemas
// ============================================

export const TransactionSchema = z.object({
  // Backend uses transactionId, frontend uses id - accept both for backward compatibility
  id: z.string().optional(),
  transactionId: z.string().optional(),
  entityId: z.number().int().positive('Entity ID must be a positive integer'),
  entityName: z.string().min(1, 'Entity name is required'),
  entityTicker: z.string().min(1, 'Entity ticker is required'),
  type: z.enum(['buy', 'sell'], {
    errorMap: () => ({ message: 'Transaction type must be buy or sell' }),
  }),
  quantity: z.number().positive('Quantity must be greater than 0'),
  pricePerToken: z.number().positive('Price per token must be greater than 0'),
  totalAmount: z.number().positive('Total amount must be greater than 0'),
  timestamp: z.string().datetime({ message: 'Invalid timestamp format' }),
  category: z.string().min(1, 'Category is required'),
}).transform((data) => {
  // Normalize id field - ensure it's always present and non-empty
  // Standardize on 'id' field name (backend may send 'transactionId')
  const normalizedId = data.transactionId || data.id;
  if (!normalizedId || typeof normalizedId !== 'string' || normalizedId.trim() === '') {
    throw new z.ZodError([{
      code: 'custom',
      path: ['id'],
      message: 'Transaction ID is required (either id or transactionId must be provided and non-empty)',
    }]);
  }
  // Remove transactionId from output to standardize on 'id'
  const { transactionId, ...rest } = data;
  return {
    ...rest,
    id: normalizedId,
  };
}).refine((data) => data.id && data.id.length > 0, {
  message: 'Transaction ID cannot be empty',
  path: ['id'],
});

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
  entityId: z.number().int().positive('Entity ID must be a positive integer'),
  entityName: z.string().min(1, 'Entity name is required'),
  entityTicker: z.string().min(1, 'Entity ticker is required'),
  quantity: z.number().nonnegative('Quantity cannot be negative'),
  averageCost: z.number().nonnegative('Average cost cannot be negative'),
  currentPrice: z.number().nonnegative('Current price cannot be negative'),
  totalValue: z.number().nonnegative('Total value cannot be negative'),
  totalCost: z.number().nonnegative('Total cost cannot be negative'),
  profitLoss: z.number(),
  profitLossPercent: z.number(),
  category: z.string().min(1, 'Category is required'),
});

export type ValidatedHolding = z.infer<typeof HoldingSchema>;

export const PortfolioSchema = z.object({
  cashBalance: z.number().nonnegative('Cash balance cannot be negative'),
  totalValue: z.number().nonnegative('Total value cannot be negative'),
  holdings: z.array(HoldingSchema).default([]),
  todayChange: z.number(),
  todayChangePercent: z.number(),
});

export type ValidatedPortfolio = z.infer<typeof PortfolioSchema>;

export const PortfolioResponseSchema = PortfolioSchema;

// ============================================
// Group Schemas
// ============================================

export const GroupSchema = z.object({
  // Backend uses groupId, frontend uses id - accept both for backward compatibility
  id: z.string().optional(),
  groupId: z.string().optional(),
  name: z.string().min(1, 'Group name is required').max(50, 'Group name cannot exceed 50 characters'),
  description: z.string().min(1, 'Description is required').max(500, 'Description cannot exceed 500 characters'),
  category: z.string().min(1, 'Category is required'),
  memberCount: z.number().int().nonnegative().default(0),
  isPrivate: z.boolean().default(false),
  isMember: z.boolean().default(false),
  coverImage: z.string().url().optional().nullable(),
  createdAt: z.string().datetime({ message: 'Invalid createdAt format' }),
  updatedAt: z.string().datetime({ message: 'Invalid updatedAt format' }).optional(),
  ownerId: z.string().min(1).optional(),
}).transform((data) => {
  // Normalize id field - ensure it's always present and non-empty
  // Standardize on 'id' field name (backend may send 'groupId')
  const normalizedId = data.groupId || data.id;
  if (!normalizedId || typeof normalizedId !== 'string' || normalizedId.trim() === '') {
    throw new z.ZodError([{
      code: 'custom',
      path: ['id'],
      message: 'Group ID is required (either id or groupId must be provided and non-empty)',
    }]);
  }
  // Remove groupId from output to standardize on 'id'
  const { groupId, ...rest } = data;
  return {
    ...rest,
    id: normalizedId,
  };
}).refine((data) => data.id && data.id.length > 0, {
  message: 'Group ID cannot be empty',
  path: ['id'],
});

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
  notificationId: z.string().min(1, 'Notification ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  type: z.enum(['like', 'comment', 'reply', 'follow', 'mention', 'trade', 'price_alert', 'group_invite', 'group_post', 'system'], {
    errorMap: () => ({ message: 'Invalid notification type' }),
  }),
  title: z.string().min(1, 'Title is required').max(100, 'Title cannot exceed 100 characters'),
  message: z.string().min(1, 'Message is required').max(500, 'Message cannot exceed 500 characters'),
  isRead: z.boolean().default(false),
  createdAt: z.string().datetime({ message: 'Invalid createdAt format' }),
  actorUserId: z.string().min(1).optional(),
  actorUsername: z.string().min(1).optional(),
  actorDisplayName: z.string().min(1).optional(),
  actorAvatarUrl: z.string().url().optional().nullable(),
  postId: z.string().min(1).optional(),
  commentId: z.string().min(1).optional(),
  entityId: z.number().int().positive().optional(),
  entityTicker: z.string().min(1).optional(),
  entityName: z.string().min(1).optional(),
  groupId: z.string().min(1).optional(),
  groupName: z.string().min(1).optional(),
  targetPrice: z.number().positive().optional(),
  currentPrice: z.number().nonnegative().optional(),
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
// Type Exports (Generated from Zod Schemas)
// ============================================

/**
 * All types are automatically generated from Zod schemas using z.infer.
 * This ensures type safety and consistency between runtime validation and TypeScript types.
 * 
 * To use these types:
 * ```typescript
 * import type { ValidatedPost, ValidatedUser } from '../validators/schemas';
 * ```
 * 
 * Or import from types/index.ts:
 * ```typescript
 * import type { Post, User } from '../types';
 * ```
 */

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
export function validateArrayLoose<T>(schema: z.ZodSchema<T>, data: unknown): T[] {
  // Early return if data is not an array or is null/undefined
  if (!data || !Array.isArray(data)) {
    return [];
  }
  
  // Ensure we have a valid array before processing
  const arrayData = Array.isArray(data) ? data : [];
  
  return arrayData
    .filter(item => item !== undefined && item !== null) // Filter out undefined/null first
    .map(item => safeValidate(schema, item))
    .filter((item): item is T => item !== null);
}

// ============================================
// Request Body Schemas (for outgoing requests)
// ============================================

export const CreatePostRequestSchema = z.object({
  content: z.string().min(1).max(5000),
  entityId: z.number().optional(),
  entityTicker: z.string().optional(),
  entityName: z.string().optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
});

export type CreatePostRequest = z.infer<typeof CreatePostRequestSchema>;

export const CreateCommentRequestSchema = z.object({
  content: z.string().min(1).max(2000),
});

export type CreateCommentRequest = z.infer<typeof CreateCommentRequestSchema>;

export const ExecuteTradeRequestSchema = z.object({
  entityId: z.number(),
  type: z.enum(['buy', 'sell']),
  quantity: z.number().positive(),
  pricePerToken: z.number().positive(),
  idempotencyKey: z.string().optional(),
});

export type ExecuteTradeRequest = z.infer<typeof ExecuteTradeRequestSchema>;

export const UpdateProfileRequestSchema = z.object({
  displayName: z.string().min(1).max(50),
  bio: z.string().max(160).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

export const CreateGroupRequestSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().min(1).max(500),
  category: z.string().min(1),
  isPrivate: z.boolean(),
});

export type CreateGroupRequest = z.infer<typeof CreateGroupRequestSchema>;

export const AddToWatchlistRequestSchema = z.object({
  entityId: z.number(),
});

export type AddToWatchlistRequest = z.infer<typeof AddToWatchlistRequestSchema>;

