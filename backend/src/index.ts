// Lambda handler entry point
// Routes requests to appropriate handlers based on the function name or path

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import * as authHandlers from './handlers/auth';
import * as oauthHandlers from './handlers/oauth';
import * as tradingHandlers from './handlers/trading';
import * as socialHandlers from './handlers/social';
import * as userHandlers from './handlers/user';
import * as newsHandlers from './handlers/news';
import * as watchlistHandlers from './handlers/watchlist';
import * as accountHandlers from './handlers/account';
import * as leaderboardHandlers from './handlers/leaderboard';
import * as groupHandlers from './handlers/groups';
import * as categoryHandlers from './handlers/categories';
import * as searchHandlers from './handlers/search';
import * as notificationHandlers from './handlers/notifications';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const path = event.path || '';
  const method = event.httpMethod || '';
  
  // Debug logging for troubleshooting
  if (path.includes('search')) {
    console.log('[Router] Search request - Path:', path, 'Method:', method, 'Query:', event.queryStringParameters);
  }

  // Route based on path
  if (path.includes('/api/auth/')) {
    if (path.endsWith('/signup') && method === 'POST') {
      return authHandlers.signup(event);
    }
    if (path.endsWith('/login') && method === 'POST') {
      return authHandlers.login(event);
    }
    if (path.endsWith('/google') && method === 'POST') {
      return oauthHandlers.googleLogin(event);
    }
    if (path.endsWith('/apple') && method === 'POST') {
      return oauthHandlers.appleLogin(event);
    }
    if (path.endsWith('/refresh') && method === 'POST') {
      return authHandlers.refreshToken(event);
    }
    if (path.endsWith('/me') && method === 'GET') {
      return authHandlers.getMe(event);
    }
  }

  if (path.includes('/api/trade/execute') && method === 'POST') {
    return tradingHandlers.executeTrade(event);
  }
  if (path.includes('/api/portfolio') && method === 'GET') {
    return tradingHandlers.getPortfolio(event);
  }
  if (path.includes('/api/transactions') && method === 'GET') {
    return tradingHandlers.getTransactionsHandler(event);
  }
  if (path.includes('/api/prices') && method === 'GET') {
    return tradingHandlers.getAllPricesHandler(event);
  }
  if (path.includes('/api/entities')) {
    if (path.includes('/price-history') && method === 'GET') {
      return tradingHandlers.getPriceHistoryHandler(event);
    }
    if (path.includes('/price') && method === 'GET') {
      return tradingHandlers.getEntityPriceHandler(event);
    }
    if (method === 'GET') {
      return tradingHandlers.getAllEntitiesHandler(event);
    }
  }

  if (path.includes('/api/social/posts')) {
    // Check for image upload URL endpoint first (before postId routes)
    if (path.includes('/images/upload-url') && method === 'GET') {
      return socialHandlers.getPostImageUploadUrl(event);
    }
    if (path.includes('/like') && method === 'POST') {
      return socialHandlers.toggleLikePost(event);
    }
    if (path.includes('/bookmark') && method === 'POST') {
      return socialHandlers.toggleBookmarkPost(event);
    }
    if (path.includes('/comments')) {
      // Edit comment endpoint: PUT /api/social/comments/:commentId
      if (path.match(/\/comments\/[^/]+$/) && method === 'PUT') {
        return socialHandlers.editCommentHandler(event);
      }
      if (path.includes('/like') && method === 'POST') {
        return socialHandlers.toggleLikeComment(event);
      }
      if (method === 'POST') {
        return socialHandlers.addComment(event);
      }
      if (method === 'GET') {
        return socialHandlers.getComments(event);
      }
    }
    if (method === 'DELETE') {
      return socialHandlers.deletePost(event);
    }
    if (method === 'POST') {
      return socialHandlers.createPost(event);
    }
  }
  // Search endpoint - check early to avoid conflicts with other routes
  // Match /api/search or /search (depending on API Gateway base path)
  const isSearchPath = path === '/api/search' || 
                       path.startsWith('/api/search') || 
                       path === '/search' ||
                       path.startsWith('/search');
  
  if (isSearchPath) {
    const isSuggestions = path.includes('/suggestions') || path.endsWith('/suggestions');
    if (isSuggestions && method === 'GET') {
      console.log('[Router] Routing to searchSuggestionsHandler');
      return searchHandlers.searchSuggestionsHandler(event);
    }
    if (method === 'GET') {
      console.log('[Router] Routing to searchHandler');
      return searchHandlers.searchHandler(event);
    }
  }

  if (path.includes('/api/social/feed') && method === 'GET') {
    return socialHandlers.getFeed(event);
  }
  if (path.includes('/api/social/users')) {
    // Make sure this is specifically /api/social/users/search, not just any path with /search
    if (path.includes('/api/social/users/search') && method === 'GET') {
      return socialHandlers.searchUsers(event);
    }
    // Check mutual follow: GET /api/social/users/:userId/mutual-follow
    if (path.includes('/mutual-follow') && method === 'GET') {
      return socialHandlers.checkMutualFollowHandler(event);
    }
    if (path.includes('/follow') && method === 'POST') {
      return socialHandlers.toggleFollowUser(event);
    }
  }

  if (path.includes('/api/user/')) {
    if (path.includes('/profile') && method === 'PUT') {
      return userHandlers.updateProfileHandler(event);
    }
    if (path.includes('/avatar/upload-url') && method === 'GET') {
      return userHandlers.getAvatarUploadUrlHandler(event);
    }
    if (path.includes('/account') && method === 'DELETE') {
      return accountHandlers.deleteAccount(event);
    }
    if (method === 'GET') {
      return userHandlers.getUserProfileHandler(event);
    }
  }

  if (path.includes('/api/news') && method === 'GET') {
    return newsHandlers.getNews(event);
  }

  if (path.includes('/api/watchlist')) {
    if (method === 'GET') {
      return watchlistHandlers.getWatchlist(event);
    }
    if (method === 'POST') {
      return watchlistHandlers.addToWatchlist(event);
    }
    if (method === 'DELETE') {
      return watchlistHandlers.removeFromWatchlist(event);
    }
  }

  if (path.includes('/api/leaderboard') && method === 'GET') {
    return leaderboardHandlers.getLeaderboardHandler(event);
  }

  if (path.includes('/api/groups')) {
    const groupId = event.pathParameters?.groupId;
    // Normalize path (remove trailing slash)
    const normalizedPath = path.replace(/\/$/, '');
    
    // Check specific routes first (most specific to least specific)
    if (path.endsWith('/join') && method === 'POST' && groupId) {
      return groupHandlers.joinGroupHandler(event);
    }
    if (path.endsWith('/leave') && method === 'POST' && groupId) {
      return groupHandlers.leaveGroupHandler(event);
    }
    if (path.includes('/user') && method === 'GET') {
      return groupHandlers.getUserGroupsHandler(event);
    }
    if (method === 'DELETE' && groupId) {
      return groupHandlers.deleteGroupHandler(event);
    }
    if (method === 'GET' && groupId) {
      return groupHandlers.getGroupHandler(event);
    }
    // POST to /api/groups - create group (check exact path match)
    if (method === 'POST' && (normalizedPath === '/api/groups')) {
      console.log('[Router] Routing POST /api/groups to createGroupHandler');
      return groupHandlers.createGroupHandler(event);
    }
    if (method === 'GET') {
      return groupHandlers.getGroupsHandler(event);
    }
  }

  if (path.includes('/api/categories')) {
    if (path.includes('/trending') && method === 'GET') {
      return categoryHandlers.getTrendingHandler(event);
    }
    if (path.includes('/movers') && method === 'GET') {
      return categoryHandlers.getMoversHandler(event);
    }
    if (path.includes('/discussed') && method === 'GET') {
      return categoryHandlers.getDiscussedHandler(event);
    }
    if (path.includes('/discover') && method === 'GET') {
      return categoryHandlers.getDiscoverHandler(event);
    }
    if (path.includes('/for-you') && method === 'GET') {
      return categoryHandlers.getForYouHandler(event);
    }
  }

  if (path.includes('/api/notifications')) {
    if (path.includes('/count') && method === 'GET') {
      return notificationHandlers.getUnreadCountHandler(event);
    }
    if (path.includes('/read-all') && method === 'POST') {
      return notificationHandlers.markAllAsReadHandler(event);
    }
    if (path.includes('/delete-all') && method === 'DELETE') {
      return notificationHandlers.deleteAllNotificationsHandler(event);
    }
    if (path.match(/\/api\/notifications\/(.+)\/read/) && method === 'POST') {
      return notificationHandlers.markAsReadHandler(event);
    }
    if (path.match(/\/api\/notifications\/(.+)/) && method === 'DELETE') {
      return notificationHandlers.deleteNotificationHandler(event);
    }
    if (method === 'GET') {
      return notificationHandlers.getNotificationsHandler(event);
    }
  }

  // Default 404 - log for debugging
  console.log('[Router] 404 - Path not matched:', path, 'Method:', method);
  console.log('[Router] Available routes include: /api/auth, /api/trade, /api/portfolio, /api/entities, /api/search, /api/social, /api/user, /api/news, /api/watchlist, /api/groups, /api/categories');
  
  return {
    statusCode: 404,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      success: false,
      error: 'Endpoint not found',
      path: path,
      method: method,
    }),
  };
};

