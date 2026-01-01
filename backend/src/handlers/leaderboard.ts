import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { authenticateRequest, createResponse, createErrorResponse } from '../middleware/auth';
import { getLeaderboard, getUserRank } from '../services/leaderboardService';
import { logger } from '../utils/logger';

export async function getLeaderboardHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Leaderboard is public, but we can optionally include the user's rank if authenticated
    const auth = await authenticateRequest(event);
    const isAuthenticated = auth.authenticated;

    const queryParams = event.queryStringParameters || {};
    const timeframe = (queryParams.timeframe as 'daily' | 'weekly' | 'monthly' | 'alltime') || 'alltime';
    const limit = parseInt(queryParams.limit || '100', 10);

    if (limit > 500) {
      return createErrorResponse(400, 'Limit cannot exceed 500');
    }

    const leaderboard = await getLeaderboard(timeframe, limit);

    // If authenticated, add user's rank
    let userRank: number | null = null;
    if (isAuthenticated && auth.event?.userId) {
      userRank = await getUserRank(auth.event.userId);
    }

    return createResponse(200, {
      leaderboard,
      userRank,
      timeframe,
      totalUsers: leaderboard.length,
    });
  } catch (error: any) {
    logger.error('Error getting leaderboard', error);
    return createErrorResponse(500, error.message || 'Failed to get leaderboard');
  }
}

