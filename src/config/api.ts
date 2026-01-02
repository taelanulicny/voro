/**
 * API Configuration
 * 
 * The app can work in two modes:
 * 1. With backend: Set EXPO_PUBLIC_API_URL=https://your-api.com in .env file
 * 2. Standalone: Works without backend using local/mock data
 * 
 * SECURITY: Certificate Pinning
 * - Certificate pinning requires custom development client (see SECURITY_FEATURES_IMPLEMENTATION.md)
 * - Current security: API Gateway enforces HTTPS/TLS (good protection)
 * - Certificate pinning adds defense-in-depth against sophisticated MITM attacks
 * - When enabled, uses react-native-ssl-pinning for all API requests
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

// Storage key for offline request queue
const OFFLINE_QUEUE_KEY = '@moro_offline_queue';
const MAX_QUEUE_SIZE = 100; // Maximum number of queued requests

// Try to import SSL pinning (will be undefined in managed workflow)
let sslPinningFetch: any;
try {
  sslPinningFetch = require('react-native-ssl-pinning').fetch;
} catch (e) {
  // Native module not available (managed workflow)
}

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
 * Request deduplication: Track in-flight requests to prevent duplicates
 */
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Client-side rate limiting
 * Tracks request counts per endpoint to prevent abuse
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configuration per endpoint pattern
const RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  '/api/trade/execute': { maxRequests: 10, windowMs: 60000 }, // 10 trades per minute
  '/api/social/posts': { maxRequests: 5, windowMs: 60000 }, // 5 posts per minute
  '/api/auth/login': { maxRequests: 5, windowMs: 300000 }, // 5 login attempts per 5 minutes
  '/api/auth/signup': { maxRequests: 3, windowMs: 3600000 }, // 3 signups per hour
  default: { maxRequests: 30, windowMs: 60000 }, // 30 requests per minute for other endpoints
};

function getRateLimitConfig(endpoint: string): { maxRequests: number; windowMs: number } {
  // Check for exact matches first
  for (const [pattern, config] of Object.entries(RATE_LIMITS)) {
    if (endpoint.includes(pattern)) {
      return config;
    }
  }
  return RATE_LIMITS.default;
}

function checkRateLimit(endpoint: string): { allowed: boolean; retryAfter?: number } {
  const config = getRateLimitConfig(endpoint);
  const now = Date.now();
  const key = endpoint;

  let entry = rateLimitStore.get(key);

  // Reset if window expired
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  return { allowed: true };
}

/**
 * Offline request queue for failed POST/PUT/DELETE requests
 */
interface QueuedRequest {
  id: string;
  endpoint: string;
  method: string;
  body?: string;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  maxRetries?: number;
  retryConfig?: RetryConfig;
}

const offlineQueue: QueuedRequest[] = [];
let isProcessingQueue = false;

/**
 * Response cache for stale-while-revalidate pattern
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const responseCache = new Map<string, CacheEntry<any>>();

// Default TTLs for different data types (in milliseconds)
const CACHE_TTL = {
  prices: 5000,      // 5 seconds
  portfolio: 30000,   // 30 seconds
  entities: 300000,   // 5 minutes
  default: 60000,     // 1 minute
};

function getRequestKey(endpoint: string, options: RequestInit): string {
  const method = options.method || 'GET';
  const body = options.body ? JSON.stringify(options.body) : '';
  const headers = JSON.stringify(options.headers || {});
  return `${method}:${endpoint}:${body}:${headers}`;
}

function getCacheKey(endpoint: string, options: RequestInit): string {
  // Only cache GET requests
  if (options.method && options.method !== 'GET') {
    return '';
  }
  return getRequestKey(endpoint, options);
}

function getCacheTTL(endpoint: string): number {
  if (endpoint.includes('/prices') || endpoint.includes('/price')) {
    return CACHE_TTL.prices;
  }
  if (endpoint.includes('/portfolio')) {
    return CACHE_TTL.portfolio;
  }
  if (endpoint.includes('/entities')) {
    return CACHE_TTL.entities;
  }
  return CACHE_TTL.default;
}

function getCachedResponse<T>(cacheKey: string): ApiResponse<T> | null {
  if (!cacheKey) return null;
  
  const entry = responseCache.get(cacheKey);
  if (!entry) return null;
  
  const age = Date.now() - entry.timestamp;
  if (age > entry.ttl) {
    // Cache expired, remove it
    responseCache.delete(cacheKey);
    return null;
  }
  
  // Return cached data
  return {
    success: true,
    data: entry.data,
  };
}

function setCachedResponse<T>(cacheKey: string, data: T, ttl: number): void {
  if (!cacheKey) return;
  
  responseCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

function invalidateCache(pattern?: string): void {
  if (!pattern) {
    responseCache.clear();
    return;
  }
  
  // Remove entries matching pattern
  for (const key of responseCache.keys()) {
    if (key.includes(pattern)) {
      responseCache.delete(key);
    }
  }
}

/**
 * Automatically invalidate cache based on endpoint and method
 * POST/PUT/DELETE operations invalidate related GET caches
 */
function autoInvalidateCache(endpoint: string, method: string): void {
  // Invalidate related caches based on endpoint patterns
  if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
    // Invalidate portfolio cache after trades
    if (endpoint.includes('/trade/execute')) {
      invalidateCache('/portfolio');
      invalidateCache('/transactions');
      invalidateCache('/prices');
    }
    
    // Invalidate social feed cache after post operations
    if (endpoint.includes('/social/posts')) {
      invalidateCache('/social/feed');
      invalidateCache('/social/posts');
      invalidateCache('/social/entities');
    }
    
    // Invalidate comments cache after comment operations
    if (endpoint.includes('/comments')) {
      invalidateCache('/comments');
      invalidateCache('/social/feed');
    }
    
    // Invalidate user-related caches after follow/unfollow
    if (endpoint.includes('/follow')) {
      invalidateCache('/followers');
      invalidateCache('/following');
      invalidateCache('/user');
    }
    
    // Invalidate watchlist cache after watchlist changes
    if (endpoint.includes('/watchlist')) {
      invalidateCache('/watchlist');
    }
    
    // Invalidate entity-related caches after entity operations
    if (endpoint.includes('/entities')) {
      invalidateCache('/entities');
    }
  }
}

export { invalidateCache };

/**
 * Load offline queue from AsyncStorage
 */
async function loadOfflineQueue(): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        offlineQueue.length = 0;
        offlineQueue.push(...parsed);
      }
    }
  } catch (error) {
    console.error('Error loading offline queue:', error);
  }
}

/**
 * Save offline queue to AsyncStorage
 */
async function saveOfflineQueue(): Promise<void> {
  try {
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue));
  } catch (error) {
    console.error('Error saving offline queue:', error);
  }
}

/**
 * Add request to offline queue
 */
async function queueRequest(request: QueuedRequest): Promise<void> {
  // Limit queue size
  if (offlineQueue.length >= MAX_QUEUE_SIZE) {
    // Remove oldest request
    offlineQueue.shift();
  }
  
  offlineQueue.push(request);
  await saveOfflineQueue();
}

/**
 * Remove request from offline queue
 */
async function removeFromQueue(requestId: string): Promise<void> {
  const index = offlineQueue.findIndex(r => r.id === requestId);
  if (index >= 0) {
    offlineQueue.splice(index, 1);
    await saveOfflineQueue();
  }
}

/**
 * Process offline queue - retry failed requests
 */
async function processOfflineQueue(getToken?: () => string | null): Promise<void> {
  if (isProcessingQueue || offlineQueue.length === 0) {
    return;
  }
  
  isProcessingQueue = true;
  
  try {
    // Load queue from storage
    await loadOfflineQueue();
    
    const requestsToProcess = [...offlineQueue];
    
    for (const queuedRequest of requestsToProcess) {
      try {
        // Check if request should be retried
        const maxRetries = queuedRequest.maxRetries || 3;
        if (queuedRequest.retryCount >= maxRetries) {
          // Remove request that has exceeded max retries
          await removeFromQueue(queuedRequest.id);
          continue;
        }
        
        // Get token if needed (for authenticated requests)
        let authHeaders = queuedRequest.headers || {};
        if (getToken && queuedRequest.headers?.Authorization) {
          const token = getToken();
          if (token) {
            authHeaders = {
              ...queuedRequest.headers,
              Authorization: `Bearer ${token}`,
            };
          }
        }
        
        // Reconstruct request
        const options: RequestInit = {
          method: queuedRequest.method as any,
          body: queuedRequest.body,
          headers: authHeaders,
        };
        
        // Make the request
        const response = await apiRequest(queuedRequest.endpoint, options, {
          ...queuedRequest.retryConfig,
          maxRetries: 1, // Don't retry again in queue processing
        });
        
        if (response.success) {
          // Request succeeded, remove from queue
          await removeFromQueue(queuedRequest.id);
          // Auto-invalidate cache after successful mutation
          autoInvalidateCache(queuedRequest.endpoint, queuedRequest.method);
        } else {
          // Request failed, increment retry count
          queuedRequest.retryCount++;
          const index = offlineQueue.findIndex(r => r.id === queuedRequest.id);
          if (index >= 0) {
            offlineQueue[index] = queuedRequest;
          }
          await saveOfflineQueue();
        }
      } catch (error) {
        // Request failed, increment retry count
        queuedRequest.retryCount++;
        const index = offlineQueue.findIndex(r => r.id === queuedRequest.id);
        if (index >= 0) {
          offlineQueue[index] = queuedRequest;
        }
        await saveOfflineQueue();
      }
    }
  } catch (error) {
    console.error('Error processing offline queue:', error);
  } finally {
    isProcessingQueue = false;
  }
}

/**
 * Initialize offline queue processing
 * Call this on app startup
 */
export async function initializeOfflineQueue(getToken?: () => string | null): Promise<void> {
  await loadOfflineQueue();
  
  // Process queue periodically (every 30 seconds)
  setInterval(() => {
    if (isBackendConfigured()) {
      processOfflineQueue(getToken).catch(console.error);
    }
  }, 30000);
  
  // Process queue immediately
  if (isBackendConfigured()) {
    processOfflineQueue(getToken).catch(console.error);
  }
}

/**
 * Retry helper with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  signal?: AbortSignal
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Check if request was cancelled
    if (signal?.aborted) {
      const abortError: any = new Error('Request cancelled');
      abortError.name = 'AbortError';
      throw abortError;
    }
    
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on client errors (4xx) except 408, 429
      if (error.status && error.status >= 400 && error.status < 500) {
        if (error.status !== 408 && error.status !== 429) {
          throw error;
        }
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(resolve, delay);
        // Cancel timeout if request is aborted
        if (signal) {
          signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            const abortError: any = new Error('Request cancelled');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        }
      });
    }
  }
  
  throw lastError;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retryConfig?: { maxRetries?: number; retryable?: boolean; deduplicate?: boolean }
): Promise<ApiResponse<T>> {
  // If backend is not configured, return gracefully (app works in standalone mode)
  if (!isBackendConfigured()) {
    return {
      success: false,
      error: 'Backend not available. App is running in standalone mode.',
    };
  }

  const shouldRetry = retryConfig?.retryable !== false && (retryConfig?.maxRetries || 0) > 0;
  const maxRetries = retryConfig?.maxRetries || 0;
  const shouldDeduplicate = retryConfig?.deduplicate !== false;
  const method = options.method || 'GET';
  const isMutation = method === 'POST' || method === 'PUT' || method === 'DELETE';
  const signal = options.signal; // Preserve AbortController signal

  const makeRequest = async (): Promise<ApiResponse<T>> => {
    try {
      const url = `${API_CONFIG.baseURL}${endpoint}`;
      
      // Check if certificate pinning is enabled and available
      const { getCertificatePinningConfig } = await import('../utils/security');
      const pinConfig = getCertificatePinningConfig();
      const usePinning = sslPinningFetch && pinConfig.enabled && pinConfig.pins && pinConfig.pins.length > 0;
      
      let response: Response;
      
      if (usePinning) {
        // Use SSL pinning fetch (requires react-native-ssl-pinning and custom dev client)
        try {
          // react-native-ssl-pinning uses different API
          const sslResponse = await sslPinningFetch(url, {
            method: options.method || 'GET',
            headers: {
              ...API_CONFIG.headers,
              ...(options.headers as Record<string, string>),
            },
            body: options.body ? JSON.stringify(options.body) : undefined,
            sslPinning: {
              certs: pinConfig.pins!,
            },
            timeoutInterval: API_CONFIG.timeout,
          });
          
          // sslPinningFetch returns data directly, not a Response object
          const data = typeof sslResponse === 'string' ? JSON.parse(sslResponse) : sslResponse;
          return {
            success: true,
            data,
          };
        } catch (pinError: any) {
          // Handle pinning failures - block request if certificate doesn't match
          if (pinError.message?.includes('SSL') || pinError.message?.includes('certificate') || pinError.message?.includes('pinning')) {
            console.error('Certificate pinning validation failed:', pinError);
            return {
              success: false,
              error: 'Certificate validation failed - possible MITM attack',
            };
          }
          throw pinError;
        }
      }
      
      // Regular fetch (managed workflow or development)
      // Check if request was cancelled
      if (signal?.aborted) {
        const abortError: any = new Error('Request cancelled');
        abortError.name = 'AbortError';
        throw abortError;
      }
      
      // Create timeout controller if no signal provided, or combine with existing signal
      let timeoutController: AbortController | null = null;
      let timeoutId: NodeJS.Timeout | null = null;
      let finalSignal = signal;
      
      if (signal) {
        // User provided signal - still need timeout
        timeoutController = new AbortController();
        timeoutId = setTimeout(() => timeoutController!.abort(), API_CONFIG.timeout);
        
        // Combine both signals: abort if either is aborted
        const combinedController = new AbortController();
        const abortHandler = () => combinedController.abort();
        signal.addEventListener('abort', abortHandler);
        timeoutController.signal.addEventListener('abort', abortHandler);
        finalSignal = combinedController.signal;
      } else {
        // No user signal - create timeout controller
        timeoutController = new AbortController();
        timeoutId = setTimeout(() => timeoutController!.abort(), API_CONFIG.timeout);
        finalSignal = timeoutController.signal;
      }
      
      try {
        response = await fetch(url, {
          ...options,
          headers: {
            ...API_CONFIG.headers,
            ...options.headers,
          },
          signal: finalSignal,
        });
      } finally {
        // Cleanup timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        // Cleanup signal listener if we combined signals
        if (signal && timeoutController) {
          signal.removeEventListener('abort', () => {});
        }
      }

      // Handle 401 Unauthorized - return gracefully instead of throwing
      if (response.status === 401) {
        try {
          const data = await response.json();
          return {
            success: false,
            error: data.error || 'Unauthorized - authentication required',
          };
        } catch {
          return {
            success: false,
            error: 'Unauthorized - authentication required',
          };
        }
      }

      // For 404 errors, return gracefully (endpoint might not exist yet)
      if (response.status === 404) {
        try {
          const data = await response.json();
          return {
            success: false,
            error: data.error || 'Endpoint not found',
          };
        } catch {
          // If JSON parsing fails, just return generic 404 error
          return {
            success: false,
            error: 'Endpoint not found',
          };
        }
      }

      const data = await response.json();

      if (!response.ok) {
        // For 400 Bad Request errors, return gracefully (invalid input - don't retry)
        if (response.status === 400) {
          return {
            success: false,
            error: data.error || data.message || 'Invalid request',
          };
        }
        // Throw error for retry logic (other status codes)
        const error: any = new Error(data.message || data.error || `HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        throw error;
      }

      const result: ApiResponse<T> = {
        success: true,
        data: data.data || data,
      };
      
      // Auto-invalidate cache after successful mutations
      if (result.success && isMutation) {
        autoInvalidateCache(endpoint, method);
      }
      
      return result;
    } catch (error: any) {
      // Check if request was cancelled
      if (error.name === 'AbortError' || signal?.aborted) {
        return {
          success: false,
          error: 'Request cancelled',
        };
      }
      
      // Don't log 404 or 400 errors as errors (client errors - expected)
      if (error.status === 404) {
        // Silently return failure for 404s
        return {
          success: false,
          error: error.message || 'Endpoint not found',
        };
      }
      
      if (error.status === 400) {
        // Silently return failure for 400s (invalid input)
        return {
          success: false,
          error: error.message || 'Invalid request',
        };
      }
      
      // Only log errors if backend is configured (avoid spam when backend isn't running)
      // For 500 errors, log as debug since they're likely backend issues that will be fixed
      if (isBackendConfigured()) {
        const errorDetails = {
          endpoint,
          method,
          status: error.status || 'unknown',
          statusText: error.statusText || 'unknown',
          message: error.message || String(error),
          errorType: error.name || 'Error',
          timestamp: new Date().toISOString(),
        };
        
        if (error.status >= 500) {
          // Log 500 errors as debug to reduce noise (backend issues, not client issues)
          console.debug(`[API Error] ${method} ${endpoint} → ${error.status || 'unknown'}:`, {
            ...errorDetails,
            hint: 'This is a backend server error. Check backend logs for details.',
          });
        } else if (error.status >= 400) {
          console.warn(`[API Error] ${method} ${endpoint} → ${error.status}:`, {
            ...errorDetails,
            hint: 'Client error - check request parameters and authentication.',
          });
        } else {
          console.error(`[API Error] ${method} ${endpoint}:`, errorDetails);
        }
      }
      
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        return {
          success: false,
          error: 'Request timed out. The server is taking too long to respond. Please check your connection and try again.',
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
        
        // Queue mutation requests for retry when connection is restored
        if (isMutation) {
          const queuedRequest: QueuedRequest = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            endpoint,
            method,
            body: options.body as string,
            headers: options.headers as Record<string, string>,
            timestamp: Date.now(),
            retryCount: 0,
            maxRetries: retryConfig?.maxRetries || 3,
            retryConfig,
          };
          
          queueRequest(queuedRequest).catch(console.error);
        }
        
        // Re-throw network errors for retry logic
        const networkError: any = new Error('Unable to connect to the server. Please check your internet connection and try again.');
        networkError.status = 0;
        throw networkError;
      }
      
      // Provide user-friendly messages for common HTTP errors
      if (error.status >= 500) {
        return {
          success: false,
          error: 'Server error. Our team has been notified. Please try again in a moment.',
        };
      }
      
      if (error.status === 429) {
        return {
          success: false,
          error: 'Too many requests. Please wait a moment and try again.',
        };
      }

      // Re-throw for retry logic
      throw error;
    }
  };

  // Stale-while-revalidate: Check cache first for GET requests
  const cacheKey = getCacheKey(endpoint, options);
  const cachedResponse = getCachedResponse<T>(cacheKey);
  const shouldUseStaleWhileRevalidate = cacheKey && !retryConfig?.retryable;
  
  if (shouldUseStaleWhileRevalidate && cachedResponse) {
    // Return cached data immediately, fetch fresh in background
    const ttl = getCacheTTL(endpoint);
    (async () => {
      try {
        // Check if request was cancelled
        if (signal?.aborted) return;
        
        let result: ApiResponse<T>;
        if (shouldRetry && maxRetries > 0) {
          try {
            result = await retryWithBackoff(makeRequest, maxRetries, 1000, signal);
          } catch (error: any) {
            // Silently fail background refresh
            return;
          }
        } else {
          result = await makeRequest();
        }
        
        // Update cache with fresh data
        if (result.success && result.data && !signal?.aborted) {
          setCachedResponse(cacheKey, result.data, ttl);
        }
      } catch (error) {
        // Silently fail background refresh
      }
    })();
    
    return cachedResponse;
  }

  // Request deduplication: if same request is in-flight, return the existing promise
  if (shouldDeduplicate) {
    const requestKey = getRequestKey(endpoint, options);
    const existingRequest = inFlightRequests.get(requestKey);
    
    if (existingRequest) {
      return existingRequest;
    }
    
    // Create new request and store it
    const requestPromise = (async () => {
      try {
        // Check if request was cancelled
        if (signal?.aborted) {
          return {
            success: false,
            error: 'Request cancelled',
          } as ApiResponse<T>;
        }
        
        let result: ApiResponse<T>;
        if (shouldRetry && maxRetries > 0) {
          try {
            result = await retryWithBackoff(makeRequest, maxRetries, 1000, signal);
          } catch (error: any) {
            if (error.name === 'AbortError' || signal?.aborted) {
              result = {
                success: false,
                error: 'Request cancelled',
              };
            } else {
              result = {
                success: false,
                error: error.message || 'An unexpected error occurred',
              };
            }
          }
        } else {
          result = await makeRequest();
        }
        
        // Cache successful GET responses
        if (result.success && result.data && cacheKey && !signal?.aborted) {
          const ttl = getCacheTTL(endpoint);
          setCachedResponse(cacheKey, result.data, ttl);
        }
        
        return result;
      } finally {
        // Remove from in-flight requests after completion
        inFlightRequests.delete(requestKey);
      }
    })();
    
    inFlightRequests.set(requestKey, requestPromise);
    return requestPromise;
  }

  // No deduplication, execute normally
  const executeRequest = async (): Promise<ApiResponse<T>> => {
    // Check if request was cancelled
    if (signal?.aborted) {
      return {
        success: false,
        error: 'Request cancelled',
      };
    }
    
    let result: ApiResponse<T>;
    if (shouldRetry && maxRetries > 0) {
      try {
        result = await retryWithBackoff(makeRequest, maxRetries, 1000, signal);
      } catch (error: any) {
        if (error.name === 'AbortError' || signal?.aborted) {
          result = {
            success: false,
            error: 'Request cancelled',
          };
        } else {
          result = {
            success: false,
            error: error.message || 'An unexpected error occurred',
          };
        }
      }
    } else {
      result = await makeRequest();
    }
    
    // Cache successful GET responses
    if (result.success && result.data && cacheKey && !signal?.aborted) {
      const ttl = getCacheTTL(endpoint);
      setCachedResponse(cacheKey, result.data, ttl);
    }
    
    return result;
  };

  return executeRequest();
}

/**
 * Make authenticated API request (with token)
 */
export interface RetryConfig {
  maxRetries?: number;
  retryable?: boolean;
}

// Import auth context hook (will be passed as parameter to avoid circular dependency)
let tryRefreshTokenCallback: (() => Promise<boolean>) | null = null;

export function setTryRefreshTokenCallback(callback: () => Promise<boolean>) {
  tryRefreshTokenCallback = callback;
}

export async function authenticatedRequest<T = any>(
  endpoint: string,
  token: string,
  options: RequestInit & { retryConfig?: RetryConfig } = {},
  getUpdatedToken?: () => string | null // Callback to get updated token after refresh
): Promise<ApiResponse<T>> {
  const { retryConfig, ...requestOptions } = options;
  const signal = options.signal; // Preserve AbortController signal
  
  // Check if request was cancelled
  if (signal?.aborted) {
    return {
      success: false,
      error: 'Request cancelled',
    };
  }
  
  // Check if token needs refresh before making request
  let currentToken = token;
  if (tryRefreshTokenCallback && !signal?.aborted) {
    const refreshed = await tryRefreshTokenCallback();
    if (refreshed && getUpdatedToken) {
      // Get updated token after refresh
      const newToken = getUpdatedToken();
      if (newToken) {
        currentToken = newToken;
      }
    }
  }
  
  const makeAuthenticatedRequest = async (): Promise<ApiResponse<T>> => {
    // Check if request was cancelled
    if (signal?.aborted) {
      return {
        success: false,
        error: 'Request cancelled',
      };
    }
    
    const response = await apiRequest<T>(endpoint, {
      ...requestOptions,
      signal, // Pass signal through
      headers: {
        ...requestOptions.headers,
        Authorization: `Bearer ${currentToken}`,
      },
    }, retryConfig);
    
    // Handle 401 Unauthorized - try to refresh token and retry
    if (!response.success && response.error?.includes('401') && tryRefreshTokenCallback && !signal?.aborted) {
      const refreshed = await tryRefreshTokenCallback();
      if (refreshed && getUpdatedToken) {
        const newToken = getUpdatedToken();
        if (newToken) {
          // Retry request with new token
          return apiRequest<T>(endpoint, {
            ...requestOptions,
            signal, // Pass signal through
            headers: {
              ...requestOptions.headers,
              Authorization: `Bearer ${newToken}`,
            },
          }, retryConfig);
        }
      }
    }
    
    return response;
  };
  
  return makeAuthenticatedRequest();
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

