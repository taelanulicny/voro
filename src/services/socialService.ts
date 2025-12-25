/**
 * Social Service
 *
 * Handles all social features API calls:
 * - Posts (create, edit, delete, like)
 * - Comments (add, view, like)
 * - Follow system (follow, unfollow, get followers/following)
 * - Groups (create, join, leave, browse)
 * - Activity feed (get user feed, get following feed)
 */

import { API_CONFIG, buildURL, buildURLWithQuery } from '../config/api';
import { Post, Comment, UserProfile, Group, Activity } from '../types';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// ==========================================
// 📝 POST MANAGEMENT
// ==========================================

/**
 * Create a new post
 */
export async function createPost(params: {
  content: string;
  entityId?: number;
  entityTicker?: string;
  entityName?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  images?: string[];
}): Promise<ApiResponse<Post>> {
  try {
    const response = await fetch(buildURL(API_CONFIG.endpoints.social.createPost), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Authorization header would be added here
        // 'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to create post',
      };
    }

    return {
      success: true,
      data: data.post,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Get posts for the activity feed (following users)
 */
export async function getActivityFeed(params?: {
  offset?: number;
  limit?: number;
}): Promise<ApiResponse<Post[]>> {
  try {
    const queryParams = {
      offset: params?.offset?.toString() || '0',
      limit: params?.limit?.toString() || '20',
    };

    const response = await fetch(
      buildURLWithQuery(API_CONFIG.endpoints.social.getActivityFeed, queryParams),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header would be added here
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to fetch activity feed',
      };
    }

    return {
      success: true,
      data: data.posts,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Get posts by a specific user
 */
export async function getUserPosts(
  userId: string,
  params?: {
    offset?: number;
    limit?: number;
  }
): Promise<ApiResponse<Post[]>> {
  try {
    const queryParams = {
      offset: params?.offset?.toString() || '0',
      limit: params?.limit?.toString() || '20',
    };

    const url = buildURLWithQuery(
      API_CONFIG.endpoints.social.getUserPosts.replace(':userId', userId),
      queryParams
    );

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to fetch user posts',
      };
    }

    return {
      success: true,
      data: data.posts,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Get posts for a specific entity
 */
export async function getEntityPosts(
  entityId: number,
  params?: {
    offset?: number;
    limit?: number;
  }
): Promise<ApiResponse<Post[]>> {
  try {
    const queryParams = {
      offset: params?.offset?.toString() || '0',
      limit: params?.limit?.toString() || '20',
    };

    const url = buildURLWithQuery(
      API_CONFIG.endpoints.social.getEntityPosts.replace(':entityId', entityId.toString()),
      queryParams
    );

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to fetch entity posts',
      };
    }

    return {
      success: true,
      data: data.posts,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Delete a post
 */
export async function deletePost(postId: string): Promise<ApiResponse> {
  try {
    const response = await fetch(
      buildURL(API_CONFIG.endpoints.social.deletePost.replace(':postId', postId)),
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header would be added here
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to delete post',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Like or unlike a post
 */
export async function toggleLikePost(postId: string): Promise<ApiResponse<{ isLiked: boolean; likes: number }>> {
  try {
    const response = await fetch(
      buildURL(API_CONFIG.endpoints.social.likePost.replace(':postId', postId)),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header would be added here
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to toggle like',
      };
    }

    return {
      success: true,
      data: {
        isLiked: data.isLiked,
        likes: data.likes,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Bookmark or unbookmark a post
 */
export async function toggleBookmarkPost(postId: string): Promise<ApiResponse<{ isBookmarked: boolean }>> {
  try {
    const response = await fetch(
      buildURL(API_CONFIG.endpoints.social.bookmarkPost.replace(':postId', postId)),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header would be added here
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to toggle bookmark',
      };
    }

    return {
      success: true,
      data: {
        isBookmarked: data.isBookmarked,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ==========================================
// 💬 COMMENT MANAGEMENT
// ==========================================

/**
 * Get comments for a post
 */
export async function getPostComments(postId: string): Promise<ApiResponse<Comment[]>> {
  try {
    const response = await fetch(
      buildURL(API_CONFIG.endpoints.social.getComments.replace(':postId', postId)),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to fetch comments',
      };
    }

    return {
      success: true,
      data: data.comments,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Add a comment to a post
 */
export async function addComment(postId: string, content: string): Promise<ApiResponse<Comment>> {
  try {
    const response = await fetch(
      buildURL(API_CONFIG.endpoints.social.addComment.replace(':postId', postId)),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header would be added here
        },
        body: JSON.stringify({ content }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to add comment',
      };
    }

    return {
      success: true,
      data: data.comment,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string): Promise<ApiResponse> {
  try {
    const response = await fetch(
      buildURL(API_CONFIG.endpoints.social.deleteComment.replace(':commentId', commentId)),
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header would be added here
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to delete comment',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Like or unlike a comment
 */
export async function toggleLikeComment(commentId: string): Promise<ApiResponse<{ isLiked: boolean; likes: number }>> {
  try {
    const response = await fetch(
      buildURL(API_CONFIG.endpoints.social.likeComment.replace(':commentId', commentId)),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header would be added here
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to toggle like',
      };
    }

    return {
      success: true,
      data: {
        isLiked: data.isLiked,
        likes: data.likes,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ==========================================
// 👥 FOLLOW SYSTEM
// ==========================================

/**
 * Follow a user
 */
export async function followUser(userId: string): Promise<ApiResponse> {
  try {
    const response = await fetch(
      buildURL(API_CONFIG.endpoints.social.followUser.replace(':userId', userId)),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header would be added here
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to follow user',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(userId: string): Promise<ApiResponse> {
  try {
    const response = await fetch(
      buildURL(API_CONFIG.endpoints.social.unfollowUser.replace(':userId', userId)),
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header would be added here
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to unfollow user',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Get user's followers
 */
export async function getFollowers(userId: string): Promise<ApiResponse<UserProfile[]>> {
  try {
    const response = await fetch(
      buildURL(API_CONFIG.endpoints.social.getFollowers.replace(':userId', userId)),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to fetch followers',
      };
    }

    return {
      success: true,
      data: data.followers,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Get users that a user is following
 */
export async function getFollowing(userId: string): Promise<ApiResponse<UserProfile[]>> {
  try {
    const response = await fetch(
      buildURL(API_CONFIG.endpoints.social.getFollowing.replace(':userId', userId)),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to fetch following',
      };
    }

    return {
      success: true,
      data: data.following,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ==========================================
// 🔍 USER DISCOVERY
// ==========================================

/**
 * Search for users
 */
export async function searchUsers(query: string): Promise<ApiResponse<UserProfile[]>> {
  try {
    const response = await fetch(
      buildURLWithQuery(API_CONFIG.endpoints.social.searchUsers, { query }),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to search users',
      };
    }

    return {
      success: true,
      data: data.users,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Get user profile by ID
 */
export async function getUserProfileById(userId: string): Promise<ApiResponse<UserProfile>> {
  try {
    const response = await fetch(
      buildURL(API_CONFIG.endpoints.social.getUserProfile.replace(':userId', userId)),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to fetch user profile',
      };
    }

    return {
      success: true,
      data: data.profile,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ==========================================
// 👥 GROUP MANAGEMENT
// ==========================================

/**
 * Get all groups
 */
export async function getGroups(params?: {
  category?: string;
  offset?: number;
  limit?: number;
}): Promise<ApiResponse<Group[]>> {
  try {
    const queryParams: Record<string, string> = {
      offset: params?.offset?.toString() || '0',
      limit: params?.limit?.toString() || '20',
    };

    if (params?.category) {
      queryParams.category = params.category;
    }

    const response = await fetch(
      buildURLWithQuery(API_CONFIG.endpoints.social.getGroups, queryParams),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to fetch groups',
      };
    }

    return {
      success: true,
      data: data.groups,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Get user's groups
 */
export async function getUserGroups(userId: string): Promise<ApiResponse<Group[]>> {
  try {
    const response = await fetch(
      buildURL(API_CONFIG.endpoints.social.getUserGroups.replace(':userId', userId)),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to fetch user groups',
      };
    }

    return {
      success: true,
      data: data.groups,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Create a new group
 */
export async function createGroup(params: {
  name: string;
  description: string;
  isPrivate: boolean;
  category?: string;
}): Promise<ApiResponse<Group>> {
  try {
    const response = await fetch(buildURL(API_CONFIG.endpoints.social.createGroup), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Authorization header would be added here
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to create group',
      };
    }

    return {
      success: true,
      data: data.group,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Join a group
 */
export async function joinGroup(groupId: string): Promise<ApiResponse> {
  try {
    const response = await fetch(
      buildURL(API_CONFIG.endpoints.social.joinGroup.replace(':groupId', groupId)),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header would be added here
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to join group',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Leave a group
 */
export async function leaveGroup(groupId: string): Promise<ApiResponse> {
  try {
    const response = await fetch(
      buildURL(API_CONFIG.endpoints.social.leaveGroup.replace(':groupId', groupId)),
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header would be added here
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to leave group',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Get posts from a group
 */
export async function getGroupPosts(
  groupId: string,
  params?: {
    offset?: number;
    limit?: number;
  }
): Promise<ApiResponse<Post[]>> {
  try {
    const queryParams = {
      offset: params?.offset?.toString() || '0',
      limit: params?.limit?.toString() || '20',
    };

    const url = buildURLWithQuery(
      API_CONFIG.endpoints.social.getGroupPosts.replace(':groupId', groupId),
      queryParams
    );

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to fetch group posts',
      };
    }

    return {
      success: true,
      data: data.posts,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ==========================================
// 📊 ACTIVITY FEED
// ==========================================

/**
 * Get recent activities from followed users
 */
export async function getRecentActivities(params?: {
  offset?: number;
  limit?: number;
}): Promise<ApiResponse<Activity[]>> {
  try {
    const queryParams = {
      offset: params?.offset?.toString() || '0',
      limit: params?.limit?.toString() || '50',
    };

    const response = await fetch(
      buildURLWithQuery(API_CONFIG.endpoints.social.getActivities, queryParams),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header would be added here
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to fetch activities',
      };
    }

    return {
      success: true,
      data: data.activities,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export default {
  // Posts
  createPost,
  getActivityFeed,
  getUserPosts,
  getEntityPosts,
  deletePost,
  toggleLikePost,
  toggleBookmarkPost,
  // Comments
  getPostComments,
  addComment,
  deleteComment,
  toggleLikeComment,
  // Follow
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  // User Discovery
  searchUsers,
  getUserProfileById,
  // Groups
  getGroups,
  getUserGroups,
  createGroup,
  joinGroup,
  leaveGroup,
  getGroupPosts,
  // Activities
  getRecentActivities,
};
