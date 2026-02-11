import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { authenticateRequest, createResponse, createErrorResponse } from '../middleware/auth';
import {
  getUserProfile,
  getUserByUsername,
  updateUserProfile,
  generateAvatarUploadUrl,
  updateUserPreferences,
} from '../services/userService';
import { logger } from '../utils/logger';

function getUserIdFromEvent(event: APIGatewayProxyEvent): string | null {
  const fromParams = event.pathParameters?.userId;
  if (fromParams) return fromParams;
  const path = event.path || '';
  const match = path.match(/\/api\/user\/([^/]+)\/?$/);
  return match ? match[1] : null;
}

export async function getUserProfileHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const identifier = getUserIdFromEvent(event);

    if (!identifier) {
      return createErrorResponse(400, 'Missing userId');
    }

    let user = await getUserProfile(identifier);
    if (!user && !identifier.includes('-') && identifier.length >= 3) {
      user = await getUserByUsername(identifier);
    }

    if (!user) {
      return createErrorResponse(404, 'User not found');
    }

    // Privacy: if profile is private, only allow self or followers to see it
    const isPrivate = user.privacySettings?.profileVisibility === 'private';
    if (isPrivate) {
      const auth = await authenticateRequest(event);
      const requesterId = auth.authenticated && auth.event ? auth.event.userId : null;
      const isSelf = requesterId === user.userId;
      if (!isSelf) {
        const { isFollowingUser } = await import('../services/socialService');
        const allowed = requesterId && (await isFollowingUser(requesterId, user.userId));
        if (!allowed) {
          return createErrorResponse(404, 'User not found');
        }
      }
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
        // SECURITY: Email removed from public profile to prevent PII exposure
        username: user.username,
        displayName: user.displayName,
        avatarUrl,
        bio: user.bio,
        followersCount: user.followersCount || 0,
        followingCount: user.followingCount || 0,
        portfolioValue: user.portfolioValue || 0,
        joinedDate: user.joinedDate,
      },
    });
  } catch (error: unknown) {
    logger.error('Error getting user profile', error);
    return createErrorResponse(500, 'Internal server error');
  }
}

export async function updateProfileHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const body = JSON.parse(event.body || '{}');

    const { username, displayName, bio, avatarUrl } = body;

    const result = await updateUserProfile(userId, {
      username,
      displayName,
      bio,
      avatarUrl,
    });

    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to update profile');
    }

    // Generate presigned URL for avatar (avatars are private, accessed via presigned URLs)
    let finalAvatarUrl = result.user?.avatarUrl;
    if (finalAvatarUrl && !finalAvatarUrl.startsWith('http')) {
      // If avatarUrl is an S3 key, generate a presigned URL
      const { getAvatarUrl } = await import('../services/userService');
      const presignedUrl = await getAvatarUrl(finalAvatarUrl);
      finalAvatarUrl = presignedUrl || finalAvatarUrl; // Fallback to key if generation fails
    }

    return createResponse(200, {
      success: true,
      data: {
        id: result.user?.userId,
        email: result.user?.email,
        username: result.user?.username,
        displayName: result.user?.displayName,
        avatarUrl: finalAvatarUrl,
        bio: result.user?.bio,
      },
    });
  } catch (error: unknown) {
    logger.error('Error updating profile', error);
    return createErrorResponse(500, 'Internal server error');
  }
}

export async function getAvatarUploadUrlHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const contentType = event.queryStringParameters?.contentType || 'image/jpeg';

    const result = await generateAvatarUploadUrl(userId, contentType);

    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to generate upload URL');
    }

    // Generate presigned URL for viewing the uploaded avatar
    // Avatars are stored privately and accessed via presigned URLs
    const { getAvatarUrl } = await import('../services/userService');
    const avatarUrl = await getAvatarUrl(result.key!);

    return createResponse(200, {
      success: true,
      data: {
        uploadUrl: result.uploadUrl,
        key: result.key,
        avatarUrl: avatarUrl || result.key, // Presigned URL for viewing (expires in 1 hour)
        // Note: Store the key (not the presigned URL) in the user profile
        // Presigned URLs are generated on-demand when fetching user profiles
      },
    });
  } catch (error: unknown) {
    logger.error('Error generating upload URL', error);
    return createErrorResponse(500, 'Internal server error');
  }
}

export async function updatePreferencesHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const body = JSON.parse(event.body || '{}');

    const { privacySettings, notificationSettings, tradingPreferences, homeLayout } = body;

    const result = await updateUserPreferences(userId, {
      privacySettings,
      notificationSettings,
      tradingPreferences,
      homeLayout,
    });

    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to update preferences');
    }

    return createResponse(200, {
      success: true,
      user: result.user,
    });
  } catch (error: unknown) {
    logger.error('Error updating preferences', error);
    return createErrorResponse(500, 'Internal server error');
  }
}

