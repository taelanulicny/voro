/**
 * API Configuration
 * 
 * Set your backend API URL in .env file:
 * EXPO_PUBLIC_API_URL=https://your-api.com
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

// Check if backend is configured
export const isBackendConfigured = () => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  return url && url !== 'http://localhost:3000/api' && url.trim() !== '';
};

export const API_CONFIG = {
  baseURL: API_URL,
  timeout: 10000, // 10 seconds
  maxRetries: 3, // Maximum number of retry attempts
  retryDelay: 1000, // Initial retry delay in milliseconds
  retryableStatusCodes: [408, 429, 500, 502, 503, 504], // HTTP status codes that should trigger retry
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

/**
 * API Request Options
 */
export interface ApiRequestOptions extends RequestInit {
  /**
   * Optional AbortController signal for request cancellation
   * If not provided, a timeout-based AbortController will be created
   */
  signal?: AbortSignal;
  
  /**
   * Number of retry attempts (overrides API_CONFIG.maxRetries)
   */
  retries?: number;
  
  /**
   * Whether to retry on network errors (default: true)
   */
  retryOnNetworkError?: boolean;
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
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any, statusCode?: number): boolean {
  // If we have a status code, check if it's retryable
  if (statusCode && API_CONFIG.retryableStatusCodes.includes(statusCode)) {
    return true;
  }
  
  // Network errors are retryable
  if (
    error.name === 'AbortError' ||
    error.name === 'TimeoutError' ||
    error.message?.includes('Network request failed') ||
    error.message?.includes('Failed to connect')
  ) {
    return true;
  }
  
  return false;
}

/**
 * Make API request with error handling, retry logic, and AbortController support
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  // If backend is not configured, return error gracefully
  if (!isBackendConfigured()) {
    return {
      success: false,
      error: 'Backend API not configured. Please set EXPO_PUBLIC_API_URL in your .env file.',
    };
  }

  const maxRetries = options.retries ?? API_CONFIG.maxRetries;
  const retryOnNetworkError = options.retryOnNetworkError ?? true;
  const url = `${API_CONFIG.baseURL}${endpoint}`;
  
  let lastError: any;
  let lastStatusCode: number | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Use provided signal or create a new AbortController for timeout
    let controller: AbortController;
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (options.signal) {
      // Use provided signal (from context AbortController)
      controller = new AbortController();
      
      // Combine provided signal with timeout signal
      const timeoutController = new AbortController();
      timeoutId = setTimeout(() => timeoutController.abort(), API_CONFIG.timeout);
      
      // Abort if either signal is aborted
      if (options.signal.aborted) {
        if (timeoutId) clearTimeout(timeoutId);
        return {
          success: false,
          error: 'Request cancelled',
        };
      }
      
      options.signal.addEventListener('abort', () => {
        controller.abort();
        if (timeoutId) clearTimeout(timeoutId);
      });
      
      timeoutController.signal.addEventListener('abort', () => {
        controller.abort();
        if (timeoutId) clearTimeout(timeoutId);
      });
    } else {
      // Create new AbortController for timeout only
      controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...API_CONFIG.headers,
          ...options.headers,
        },
        signal: controller.signal,
      });

      // Clean up timeout and listeners
      if (timeoutId) clearTimeout(timeoutId);
      if ((controller as any)._cleanup) {
        (controller as any)._cleanup();
      }

      const data = await response.json();
      lastStatusCode = response.status;

      if (!response.ok) {
        // Check if status code is retryable
        if (
          attempt < maxRetries &&
          API_CONFIG.retryableStatusCodes.includes(response.status)
        ) {
          // Calculate exponential backoff delay: initialDelay * 2^attempt
          const delay = API_CONFIG.retryDelay * Math.pow(2, attempt);
          await sleep(delay);
          continue; // Retry
        }
        
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
      // Clean up timeout and listeners
      if (timeoutId) clearTimeout(timeoutId);
      if ((controller as any)._cleanup) {
        (controller as any)._cleanup();
      }
      
      lastError = error;
      
      // Check if request was aborted (user cancellation, not retryable)
      if (error.name === 'AbortError') {
        // Check if it was our timeout or external cancellation
        if (options.signal?.aborted) {
          return {
            success: false,
            error: 'Request cancelled',
          };
        }
        return {
          success: false,
          error: 'Request timeout. Please check your connection and try again.',
        };
      }

      // Check if error is retryable
      const shouldRetry = 
        attempt < maxRetries &&
        retryOnNetworkError &&
        isRetryableError(error, lastStatusCode);

      if (shouldRetry) {
        // Calculate exponential backoff delay: initialDelay * 2^attempt
        const delay = API_CONFIG.retryDelay * Math.pow(2, attempt);
        await sleep(delay);
        continue; // Retry
      }

      // Don't retry, return error
      // Only log errors if backend is configured (avoid spam when backend isn't running)
      if (isBackendConfigured()) {
        console.error('API Request Error:', error);
      }

      if (error.message?.includes('Network request failed') || error.message?.includes('Failed to connect')) {
        // Don't show error for localhost connections when backend isn't running
        if (API_CONFIG.baseURL.includes('localhost')) {
          return {
            success: false,
            error: 'Backend not available. Please start the backend server or configure EXPO_PUBLIC_API_URL.',
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

  // All retries exhausted
  return {
    success: false,
    error: lastError?.message || 'Request failed after retries',
  };
}

/**
 * Make authenticated API request (with token)
 */
export async function authenticatedRequest<T = any>(
  endpoint: string,
  token: string,
  options: ApiRequestOptions = {}
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

