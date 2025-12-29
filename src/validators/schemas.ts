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
  id: z.string(),
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
});

export type ValidatedNewsArticle = z.infer<typeof NewsArticleSchema>;

export const NewsArticleArraySchema = z.array(NewsArticleSchema);

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
// Validation Helpers
// ============================================

/**
 * Safely validate data with a schema, returning null on failure
 */
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn('Validation failed:', error.errors);
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
  return data
    .map(item => safeValidate(schema, item))
    .filter((item): item is T => item !== null);
}

