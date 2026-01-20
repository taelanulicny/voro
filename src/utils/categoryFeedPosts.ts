import { Post } from '../types';

/**
 * Get all category feed posts
 * Returns empty arrays for all categories - posts will come from backend/activityFeed
 */
export function getAllCategoryFeedPosts(): Post[] {
  // Return empty array - all posts come from backend/activityFeed
  // This function is kept for compatibility with existing code that calls it
  return [];
}
