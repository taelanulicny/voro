/**
 * API Configuration
 * 
 * The app can work in two modes:
 * 1. With backend: Set EXPO_PUBLIC_API_URL=https://your-api.com in .env file
 * 2. Standalone: Works without backend using local/mock data
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

// Check if backend is configured (optional - app works without it)
export const isBackendConfigured = () => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  // Backend is considered configured if:
  // 1. EXPO_PUBLIC_API_URL is set AND
  // 2. It's not localhost (which won't work on a phone) AND
  // 3. It's not empty
  return !!(url && !url.includes('localhost') && url.trim() !== '');
};

export const API_CONFIG = {
  baseURL: API_URL,
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  endpoints: {
    trading: {
      executeTrade: '/api/trade/execute',
      getPortfolio: '/api/portfolio',
      getTransactions: '/api/transactions',
      getAllEntities: '/api/entities',
      getEntityPrice: '/api/entities/:entityId/price',
    },
    social: {
      // Posts
      createPost: '/api/social/posts',
      getActivityFeed: '/api/social/feed',
      getUserPosts: '/api/social/users/:userId/posts',
      getEntityPosts: '/api/social/entities/:entityId/posts',
      deletePost: '/api/social/posts/:postId',
      likePost: '/api/social/posts/:postId/like',
      bookmarkPost: '/api/social/posts/:postId/bookmark',
      // Comments
      getComments: '/api/social/posts/:postId/comments',
      addComment: '/api/social/posts/:postId/comments',
      deleteComment: '/api/social/comments/:commentId',
      likeComment: '/api/social/comments/:commentId/like',
      // Follow
      followUser: '/api/social/users/:userId/follow',
      unfollowUser: '/api/social/users/:userId/follow',
      getFollowers: '/api/social/users/:userId/followers',
      getFollowing: '/api/social/users/:userId/following',
      // User
      searchUsers: '/api/social/users/search',
      getUserProfile: '/api/user/:userId',
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
  // If backend is not configured, return gracefully (app works in standalone mode)
  if (!isBackendConfigured()) {
    return {
      success: false,
      error: 'Backend not available. App is running in standalone mode.',
    };
  }

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
    // Only log errors if backend is configured (avoid spam when backend isn't running)
    if (isBackendConfigured()) {
      console.error('API Request Error:', error);
    }
    
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return {
        success: false,
        error: 'Request timeout. Please check your connection and try again.',
      };
    }

    if (error.message?.includes('Network request failed') || error.message?.includes('Failed to connect')) {
      // Don't show error for localhost connections when backend isn't running
      if (API_CONFIG.baseURL.includes('localhost')) {
        return {
          success: false,
          error: 'Backend not available. App is running in standalone mode.',
        };
      }
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

