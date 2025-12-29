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

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const path = event.path || '';
  const method = event.httpMethod || '';

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
  if (path.includes('/api/entities')) {
    if (path.includes('/price') && method === 'GET') {
      return tradingHandlers.getEntityPriceHandler(event);
    }
    if (method === 'GET') {
      return tradingHandlers.getAllEntitiesHandler(event);
    }
  }

  if (path.includes('/api/social/posts')) {
    if (path.includes('/like') && method === 'POST') {
      return socialHandlers.toggleLikePost(event);
    }
    if (path.includes('/comments')) {
      if (method === 'POST') {
        return socialHandlers.addComment(event);
      }
      if (method === 'GET') {
        return socialHandlers.getComments(event);
      }
    }
    if (method === 'POST') {
      return socialHandlers.createPost(event);
    }
  }
  if (path.includes('/api/social/feed') && method === 'GET') {
    return socialHandlers.getFeed(event);
  }
  if (path.includes('/api/social/users')) {
    if (path.includes('/search') && method === 'GET') {
      return socialHandlers.searchUsers(event);
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

  // Default 404
  return {
    statusCode: 404,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      success: false,
      error: 'Endpoint not found',
    }),
  };
};

