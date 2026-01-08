import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { authenticateRequest, createResponse, createErrorResponse } from '../middleware/auth';
import {
  getUserProfile,
  updateUserProfile,
  generateAvatarUploadUrl,
} from '../services/userService';

export async function getUserProfileHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const userId = event.pathParameters?.userId;

    if (!userId) {
      return createErrorResponse(400, 'Missing userId');
    }

    const user = await getUserProfile(userId);

    if (!user) {
      return createErrorResponse(404, 'User not found');
    }

    return createResponse(200, {
      success: true,
      data: {
        id: user.userId,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        portfolioValue: user.portfolioValue,
        joinedDate: user.joinedDate,
      },
    });
  } catch (error: any) {
    console.error('Error getting user profile:', error);
    return createErrorResponse(500, 'Internal server error', error);
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

    const { displayName, bio, avatarUrl } = body;

    const result = await updateUserProfile(userId, {
      displayName,
      bio,
      avatarUrl,
    });

    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to update profile');
    }

    return createResponse(200, {
      success: true,
      data: {
        id: result.user?.userId,
        email: result.user?.email,
        username: result.user?.username,
        displayName: result.user?.displayName,
        avatarUrl: result.user?.avatarUrl,
        bio: result.user?.bio,
      },
    });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return createErrorResponse(500, 'Internal server error', error);
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

    return createResponse(200, {
      success: true,
      data: {
        uploadUrl: result.uploadUrl,
        key: result.key,
      },
    });
  } catch (error: any) {
    console.error('Error generating upload URL:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

