import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { authenticateRequest, createResponse, createErrorResponse } from '../middleware/auth';
import { signup as signupService, login as loginService, refreshToken as refreshTokenService, getUserById } from '../services/authService';
import { logger } from '../utils/logger';

export async function signup(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { email, password, username, displayName } = body;

    if (!email || !password || !username || !displayName) {
      return createErrorResponse(400, 'Missing required fields: email, password, username, displayName');
    }

    const result = await signupService(email, password, username, displayName);

    if (!result.success) {
      return createErrorResponse(400, result.error || 'Signup failed');
    }

    return createResponse(201, {
      success: true,
      data: {
        userId: result.userId,
        message: 'User created successfully. Please check your email for verification.',
      },
    });
  } catch (error: any) {
    logger.error('Error in signup handler', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function login(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { email, password } = body;

    if (!email || !password) {
      return createErrorResponse(400, 'Missing required fields: email, password');
    }

    const result = await loginService(email, password);

    if (!result.success) {
      return createErrorResponse(401, result.error || 'Login failed');
    }

    return createResponse(200, {
      success: true,
      data: {
        token: result.token,
        refreshToken: result.refreshToken,
        user: result.user,
      },
    });
  } catch (error: any) {
    logger.error('Error in login handler', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function refreshToken(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { refreshToken } = body;

    if (!refreshToken) {
      return createErrorResponse(400, 'Missing refreshToken');
    }

    const result = await refreshTokenService(refreshToken);

    if (!result.success) {
      return createErrorResponse(401, result.error || 'Token refresh failed');
    }

    return createResponse(200, {
      success: true,
      data: {
        token: result.token,
      },
    });
  } catch (error: any) {
    logger.error('Error in refreshToken handler', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function getMe(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const user = await getUserById(userId);

    if (!user) {
      return createErrorResponse(404, 'User not found');
    }

    // Generate presigned URL for avatar (avatars are private, accessed via presigned URLs)
    let avatarUrl = user.avatarUrl;
    if (avatarUrl && !avatarUrl.startsWith('http')) {
      // If avatarUrl is an S3 key, generate a presigned URL
      const { getAvatarUrl } = await import('../services/userService');
      const presignedUrl = await getAvatarUrl(avatarUrl);
      avatarUrl = presignedUrl || avatarUrl; // Fallback to key if generation fails
    }

    return createResponse(200, {
      success: true,
      data: {
        id: user.userId,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl,
        bio: user.bio,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        portfolioValue: user.portfolioValue,
        joinedDate: user.joinedDate,
      },
    });
  } catch (error: any) {
    logger.error('Error in getMe handler', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

