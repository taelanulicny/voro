/**
 * API Configuration
 * 
 * Set your backend API URL in .env file:
 * EXPO_PUBLIC_API_URL=https://your-api.com
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export const API_CONFIG = {
  baseURL: API_URL,
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  endpoints: {
    social: {
      // Posts
      createPost: '/social/posts',
      getActivityFeed: '/social/feed',
      getUserPosts: '/social/users/:userId/posts',
      getEntityPosts: '/social/entities/:entityId/posts',
      deletePost: '/social/posts/:postId',
      likePost: '/social/posts/:postId/like',
      bookmarkPost: '/social/posts/:postId/bookmark',
      // Comments
      getComments: '/social/posts/:postId/comments',
      addComment: '/social/posts/:postId/comments',
      deleteComment: '/social/comments/:commentId',
      likeComment: '/social/comments/:commentId/like',
      // Follow
      followUser: '/social/users/:userId/follow',
      unfollowUser: '/social/users/:userId/follow',
      getFollowers: '/social/users/:userId/followers',
      getFollowing: '/social/users/:userId/following',
      // User
      searchUsers: '/social/users/search',
      getUserProfile: '/social/users/:userId',
      // Groups
      getGroups: '/social/groups',
      getUserGroups: '/social/users/:userId/groups',
      createGroup: '/social/groups',
      joinGroup: '/social/groups/:groupId/join',
      leaveGroup: '/social/groups/:groupId/leave',
      getGroupPosts: '/social/groups/:groupId/posts',
      // Activities
      getActivities: '/social/activities',
    },
  },
};

/**
 * API Response Types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    bio?: string;
  };
}

/**
 * Make API request with error handling
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // Create AbortController for timeout (React Native compatible)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

  try {
    const url = `${API_CONFIG.baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...API_CONFIG.headers,
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return {
      success: true,
      data: data.data || data,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('API Request Error:', error);
    
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return {
        success: false,
        error: 'Request timeout. Please check your connection and try again.',
      };
    }

    if (error.message?.includes('Network request failed')) {
      return {
        success: false,
        error: 'Network error. Please check your internet connection.',
      };
    }

    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Make authenticated API request (with token)
 */
export async function authenticatedRequest<T = any>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Helper functions for building URLs
 */
export function buildURL(path: string): string {
  return path.startsWith('http') ? path : `${API_CONFIG.baseURL}${path}`;
}

export function buildURLWithQuery(path: string, params: Record<string, string>): string {
  const url = buildURL(path);
  const queryString = new URLSearchParams(params).toString();
  return queryString ? `${url}?${queryString}` : url;
}

