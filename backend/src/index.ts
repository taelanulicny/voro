// Lambda handler entry point
// Routes requests to appropriate handlers based on the function name or path

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { logger } from './utils/logger';
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
import * as pushNotificationHandlers from './handlers/pushNotifications';
import * as purchaseHandlers from './handlers/purchases';
import * as supportHandlers from './handlers/support';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const path = event.path || '';
  const method = event.httpMethod || '';
  
  // Debug logging for group members requests
  if (path.includes('/groups') && path.includes('/members')) {
    logger.debug('[Router] Group members request detected', { 
      path, 
      method, 
      rawPath: event.path,
      pathParameters: event.pathParameters,
      resource: event.resource 
    });
  }
  
  // Debug logging for troubleshooting
  if (path.includes('search')) {
    logger.debug('[Router] Search request', { path, method, query: event.queryStringParameters });
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
    if (path.endsWith('/set-password') && method === 'POST') {
      return authHandlers.setPassword(event);
    }
    if (path.endsWith('/change-password') && method === 'POST') {
      return authHandlers.changePassword(event);
    }
    if (path.endsWith('/change-email') && method === 'POST') {
      return authHandlers.changeEmail(event);
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
    // Check for DELETE /api/social/posts/:postId (must check before other postId routes)
    const deletePostMatch = path.match(/\/api\/social\/posts\/([^/]+)$/);
    if (deletePostMatch && method === 'DELETE') {
      // Extract postId from path and set it in pathParameters
      const postId = deletePostMatch[1];
      event.pathParameters = event.pathParameters || {};
      event.pathParameters.postId = postId;
      logger.debug('[Router] Matched delete post endpoint', { path, postId });
      return socialHandlers.deletePost(event);
    }
    // Check for POST /api/social/posts/:postId/like
    const likePostMatch = path.match(/\/api\/social\/posts\/([^/]+)\/like$/);
    if (likePostMatch && method === 'POST') {
      const postId = likePostMatch[1];
      event.pathParameters = event.pathParameters || {};
      event.pathParameters.postId = postId;
      logger.debug('[Router] Matched like post endpoint', { path, postId });
      return socialHandlers.toggleLikePost(event);
    }
    // Check for POST /api/social/posts/:postId/bookmark
    const bookmarkPostMatch = path.match(/\/api\/social\/posts\/([^/]+)\/bookmark$/);
    if (bookmarkPostMatch && method === 'POST') {
      const postId = bookmarkPostMatch[1];
      event.pathParameters = event.pathParameters || {};
      event.pathParameters.postId = postId;
      logger.debug('[Router] Matched bookmark post endpoint', { path, postId });
      return socialHandlers.toggleBookmarkPost(event);
    }
    if (path.includes('/comments')) {
      // Check for POST /api/social/posts/:postId/comments
      const addCommentMatch = path.match(/\/api\/social\/posts\/([^/]+)\/comments$/);
      if (addCommentMatch && method === 'POST') {
        const postId = addCommentMatch[1];
        event.pathParameters = event.pathParameters || {};
        event.pathParameters.postId = postId;
        logger.debug('[Router] Matched add comment endpoint', { path, postId });
        return socialHandlers.addComment(event);
      }
      // Check for GET /api/social/posts/:postId/comments
      const getCommentsMatch = path.match(/\/api\/social\/posts\/([^/]+)\/comments$/);
      if (getCommentsMatch && method === 'GET') {
        const postId = getCommentsMatch[1];
        event.pathParameters = event.pathParameters || {};
        event.pathParameters.postId = postId;
        logger.debug('[Router] Matched get comments endpoint', { path, postId });
        return socialHandlers.getComments(event);
      }
      // Edit comment endpoint: PUT /api/social/comments/:commentId
      if (path.match(/\/comments\/[^/]+$/) && method === 'PUT') {
        return socialHandlers.editCommentHandler(event);
      }
      // Check for POST /api/social/comments/:commentId/like
      const likeCommentMatch = path.match(/\/api\/social\/comments\/([^/]+)\/like$/);
      if (likeCommentMatch && method === 'POST') {
        const commentId = likeCommentMatch[1];
        event.pathParameters = event.pathParameters || {};
        event.pathParameters.commentId = commentId;
        logger.debug('[Router] Matched like comment endpoint', { path, commentId });
        return socialHandlers.toggleLikeComment(event);
      }
    }
    if (method === 'POST') {
      return socialHandlers.createPost(event);
    }
  }

  // Check for category posts endpoint under /api/social/categories
  const socialCategoryPostsMatch = path.match(/\/api\/social\/categories\/([^/]+)\/posts$/);
  if (socialCategoryPostsMatch && method === 'GET') {
    logger.debug('[Router] Matched social category posts endpoint', { path, categoryId: socialCategoryPostsMatch[1] });
    return categoryHandlers.getCategoryPostsHandler(event);
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
      logger.debug('[Router] Routing to searchSuggestionsHandler');
      return searchHandlers.searchSuggestionsHandler(event);
    }
    if (method === 'GET') {
      logger.debug('[Router] Routing to searchHandler');
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
    if (path.includes('/preferences') && method === 'PUT') {
      return userHandlers.updatePreferencesHandler(event);
    }
    if (path.includes('/avatar/upload-url') && method === 'GET') {
      return userHandlers.getAvatarUploadUrlHandler(event);
    }
    if (path.includes('/account') && method === 'DELETE') {
      return accountHandlers.deleteAccount(event);
    }
    // Blocked users endpoints
    if (path.includes('/blocked')) {
      const blockedUserIdMatch = path.match(/\/api\/user\/blocked\/([^/]+)$/);
      if (blockedUserIdMatch && method === 'DELETE') {
        const blockedUserId = blockedUserIdMatch[1];
        event.pathParameters = event.pathParameters || {};
        event.pathParameters.userId = blockedUserId;
        return accountHandlers.unblockUser(event);
      }
      if (method === 'GET') {
        return accountHandlers.getBlockedUsers(event);
      }
    }
    // Block user endpoint
    const blockUserMatch = path.match(/\/api\/user\/block\/([^/]+)$/);
    if (blockUserMatch && method === 'POST') {
      const blockedUserId = blockUserMatch[1];
      event.pathParameters = event.pathParameters || {};
      event.pathParameters.userId = blockedUserId;
      return accountHandlers.blockUser(event);
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

  // Check for group members endpoint FIRST, before other group routes
  // Handle paths like /api/groups/:groupId/members or /dev/api/groups/:groupId/members
  const groupMembersMatch = path.match(/groups\/([^/]+)\/members\/?$/);
  if (groupMembersMatch && method === 'GET') {
    const extractedGroupId = groupMembersMatch[1];
    event.pathParameters = event.pathParameters || {};
    event.pathParameters.groupId = extractedGroupId;
    logger.debug('[Router] Matched get group members endpoint', { path, groupId: extractedGroupId, method });
    return groupHandlers.getGroupMembersHandler(event);
  }

  // Group member role/remove: PUT or DELETE .../groups/:groupId/members/:userId[/role]
  const groupMemberActionMatch = path.match(/groups\/([^/]+)\/members\/([^/]+)(?:\/role)?\/?$/);
  if (groupMemberActionMatch) {
    const extractedGroupId = groupMemberActionMatch[1];
    const extractedUserId = groupMemberActionMatch[2];
    event.pathParameters = event.pathParameters || {};
    event.pathParameters.groupId = extractedGroupId;
    event.pathParameters.userId = extractedUserId;
    if (method === 'PUT' && path.endsWith('/role')) {
      logger.debug('[Router] Matched update member role', { path, groupId: extractedGroupId, userId: extractedUserId });
      return groupHandlers.updateMemberRoleHandler(event);
    }
    if (method === 'DELETE') {
      logger.debug('[Router] Matched remove member', { path, groupId: extractedGroupId, userId: extractedUserId });
      return groupHandlers.removeMemberHandler(event);
    }
  }

  // Group messages: GET or POST .../groups/:groupId/messages
  const groupMessagesMatch = path.match(/groups\/([^/]+)\/messages\/?$/);
  if (groupMessagesMatch && (method === 'GET' || method === 'POST')) {
    const extractedGroupId = groupMessagesMatch[1];
    event.pathParameters = event.pathParameters || {};
    event.pathParameters.groupId = extractedGroupId;
    if (method === 'GET') {
      logger.debug('[Router] Matched get group messages', { path, groupId: extractedGroupId });
      return groupHandlers.getGroupMessagesHandler(event);
    }
    logger.debug('[Router] Matched send group message', { path, groupId: extractedGroupId });
    return groupHandlers.sendGroupMessageHandler(event);
  }

  if (path.includes('/api/groups') || path.includes('/api/social/groups')) {
    // Skip if this is a members route (already handled above)
    if (path.includes('/members') && method === 'GET') {
      logger.warn('[Router] Members route reached groups block, this should not happen', { path, method });
      // Try one more time with a simpler check
      const simpleMembersMatch = path.match(/groups\/([^/]+)\/members/);
      if (simpleMembersMatch) {
        const extractedGroupId = simpleMembersMatch[1];
        event.pathParameters = event.pathParameters || {};
        event.pathParameters.groupId = extractedGroupId;
        logger.debug('[Router] Matched members route with fallback check', { path, groupId: extractedGroupId });
        return groupHandlers.getGroupMembersHandler(event);
      }
    }
    
    logger.debug('[Router] Processing groups route', { path, method, pathParameters: event.pathParameters });
    // Normalize path (remove trailing slash)
    const normalizedPath = path.replace(/\/$/, '');

    // Handle join group: POST /api/groups/:groupId/join
    const joinGroupMatch = path.match(/\/api\/groups\/([^/]+)\/join\/?$/);
    if (joinGroupMatch && method === 'POST') {
      const extractedGroupId = joinGroupMatch[1];
      event.pathParameters = event.pathParameters || {};
      event.pathParameters.groupId = extractedGroupId;
      logger.debug('[Router] Matched join group endpoint', { path, groupId: extractedGroupId });
      return groupHandlers.joinGroupHandler(event);
    }

    // Handle leave group: POST /api/groups/:groupId/leave
    const leaveGroupMatch = path.match(/\/api\/groups\/([^/]+)\/leave\/?$/);
    if (leaveGroupMatch && method === 'POST') {
      const extractedGroupId = leaveGroupMatch[1];
      event.pathParameters = event.pathParameters || {};
      event.pathParameters.groupId = extractedGroupId;
      logger.debug('[Router] Matched leave group endpoint', { path, groupId: extractedGroupId });
      return groupHandlers.leaveGroupHandler(event);
    }

    // Handle delete group: DELETE .../groups/:groupId (extract groupId from path; works with /api/groups/ or /api/social/groups/ or stage prefix)
    const deleteGroupMatch = path.match(/groups\/([^/]+)\/?$/);
    if (deleteGroupMatch && method === 'DELETE') {
      const extractedGroupId = deleteGroupMatch[1];
      event.pathParameters = event.pathParameters || {};
      event.pathParameters.groupId = extractedGroupId;
      logger.debug('[Router] Matched delete group endpoint', { path, groupId: extractedGroupId });
      return groupHandlers.deleteGroupHandler(event);
    }

    const groupId = event.pathParameters?.groupId;
    if (path.includes('/user') && method === 'GET') {
      return groupHandlers.getUserGroupsHandler(event);
    }
    if (method === 'DELETE' && groupId) {
      return groupHandlers.deleteGroupHandler(event);
    }
    if (method === 'GET' && groupId && !path.includes('/members')) {
      return groupHandlers.getGroupHandler(event);
    }
    // POST to /api/groups - create group (check exact path match)
    if (method === 'POST' && (normalizedPath === '/api/groups')) {
      logger.debug('[Router] Routing POST /api/groups to createGroupHandler');
      return groupHandlers.createGroupHandler(event);
    }
    if (method === 'GET' && !path.includes('/members')) {
      logger.debug('[Router] Falling back to getGroupsHandler', { path, method });
      return groupHandlers.getGroupsHandler(event);
    }
  }

  if (path.includes('/api/categories')) {
    // Check for category posts endpoint first (before other category routes)
    // Match patterns like /api/categories/Influencers/posts or /dev/api/categories/Music%20Artists/posts
    const categoryPostsMatch = path.match(/\/(?:[^/]+\/)?api\/categories\/([^/]+)\/posts\/?$/);
    if (categoryPostsMatch && method === 'GET') {
      const categoryId = decodeURIComponent(categoryPostsMatch[1]);
      event.pathParameters = event.pathParameters || {};
      event.pathParameters.categoryId = categoryId;
      logger.debug('[Router] Matched category posts endpoint', { path, categoryId, method, rawPath: event.path });
      return categoryHandlers.getCategoryPostsHandler(event);
    }
    // Check for specific category endpoints BEFORE generic category entities
    // These need to be checked first to avoid conflicts with category entity routes
    const volumesMatch = path.match(/\/(?:[^/]+\/)?api\/categories\/volumes\/?$/);
    if (volumesMatch && method === 'GET') {
      logger.debug('[Router] Matched category volumes endpoint', { path, method, rawPath: event.path });
      return categoryHandlers.getCategoryVolumesHandler(event);
    }
    if (path.includes('/matchups') && method === 'GET') {
      return categoryHandlers.getMatchupsHandler(event);
    }
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
    // Check for category entities endpoint: /api/categories/:categoryId/entities or /api/categories/:categoryId
    // This should be last to avoid matching the specific endpoints above
    const categoryEntitiesMatch = path.match(/\/(?:[^/]+\/)?api\/categories\/([^/]+)(?:\/entities)?\/?$/);
    if (categoryEntitiesMatch && method === 'GET') {
      const categoryId = decodeURIComponent(categoryEntitiesMatch[1]);
      event.pathParameters = event.pathParameters || {};
      event.pathParameters.categoryId = categoryId;
      logger.debug('[Router] Matched category entities endpoint', { path, categoryId, method, rawPath: event.path });
      return categoryHandlers.getCategoryEntitiesHandler(event);
    }
  }

  if (path.includes('/api/purchases')) {
    if (path.includes('/process') && method === 'POST') {
      return purchaseHandlers.processPurchaseHandler(event);
    }
    if (path.includes('/history') && method === 'GET') {
      return purchaseHandlers.getPurchaseHistoryHandler(event);
    }
  }

  if (path.includes('/api/notifications')) {
    // Push notification routes (must come before general notification routes)
    if (path.includes('/token')) {
      // DELETE /api/notifications/token/:deviceId
      const deleteTokenMatch = path.match(/\/api\/notifications\/token\/([^/]+)$/);
      if (deleteTokenMatch && method === 'DELETE') {
        const deviceId = deleteTokenMatch[1];
        event.pathParameters = event.pathParameters || {};
        event.pathParameters.deviceId = deviceId;
        return pushNotificationHandlers.deletePushToken(event);
      }
      // POST /api/notifications/token
      if (path.endsWith('/token') && method === 'POST') {
        return pushNotificationHandlers.storePushToken(event);
      }
      // GET /api/notifications/tokens
      if (path.endsWith('/tokens') && method === 'GET') {
        return pushNotificationHandlers.getPushTokens(event);
      }
    }
    // POST /api/notifications/test
    if (path.endsWith('/test') && method === 'POST') {
      return pushNotificationHandlers.sendTestNotification(event);
    }
    // General notification routes
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

  if (path.includes('/api/support/tickets') && method === 'POST') {
    return supportHandlers.createTicketHandler(event);
  }

  // Default 404 - log for debugging
  logger.debug('[Router] 404 - Path not matched', { path, method, queryParams: event.queryStringParameters, pathParams: event.pathParameters });
  logger.debug('[Router] Available routes include: /api/auth, /api/trade, /api/portfolio, /api/entities, /api/search, /api/social, /api/user, /api/news, /api/watchlist, /api/groups, /api/categories');
  logger.warn('[Router] 404 - Unmatched request', { 
    path, 
    method, 
    fullPath: event.path,
    resource: event.resource,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters
  });
  
  return {
    statusCode: 404,
    headers: {
      'Content-Type': 'application/json',
      // SECURITY: No CORS headers for mobile-only API (mobile apps don't use CORS)
    },
    body: JSON.stringify({
      success: false,
      error: 'Endpoint not found',
      path: path,
      method: method,
      message: `No handler found for ${method} ${path}. Check server logs for available routes.`,
    }),
  };
};

