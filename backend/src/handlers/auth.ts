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

    const needsCompleteAccount = !!(user.appleId && !user.hasPassword);

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
        privacySettings: user.privacySettings,
        notificationSettings: user.notificationSettings,
        tradingPreferences: user.tradingPreferences,
        homeLayout: user.homeLayout,
        needsCompleteAccount,
      },
    });
  } catch (error: any) {
    logger.error('Error in getMe handler', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function changePassword(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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
    if (user.appleId && !user.hasPassword) {
      return createErrorResponse(400, 'Set a password first. Complete your account with an email and password before you can change it.');
    }

    const body = JSON.parse(event.body || '{}');
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return createErrorResponse(400, 'Missing required fields: currentPassword, newPassword');
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return createErrorResponse(400, 'Password must be at least 8 characters long');
    }

    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return createErrorResponse(400, 'Password must contain uppercase, lowercase, and numbers');
    }

    const { changePassword: changePasswordService } = await import('../services/authService');
    const result = await changePasswordService(userId, currentPassword, newPassword);

    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to change password');
    }

    return createResponse(200, {
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    logger.error('Error in changePassword handler', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function setPassword(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }
    const userId = auth.event.userId!;
    const body = JSON.parse(event.body || '{}');
    const { email, newPassword } = body;
    if (!email || !newPassword) {
      return createErrorResponse(400, 'Missing required fields: email, newPassword');
    }
    const { setPassword: setPasswordService } = await import('../services/authService');
    const result = await setPasswordService(userId, email, newPassword);
    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to set password');
    }
    return createResponse(200, { success: true, message: 'Password set. You can now change it from Security settings.' });
  } catch (error: any) {
    logger.error('Error in setPassword handler', error);
    return createErrorResponse(500, 'Internal server error');
  }
}

export async function changeEmail(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const body = JSON.parse(event.body || '{}');
    const { newEmail, password } = body;

    if (!newEmail || !password) {
      return createErrorResponse(400, 'Missing required fields: newEmail, password');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return createErrorResponse(400, 'Invalid email format');
    }

    // Import the changeEmail service function
    const { changeEmail: changeEmailService } = await import('../services/authService');
    const result = await changeEmailService(userId, newEmail, password);

    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to change email');
    }

    return createResponse(200, {
      success: true,
      message: 'Verification email sent to new address',
      data: {
        pendingEmail: newEmail,
      },
    });
  } catch (error: any) {
    logger.error('Error in changeEmail handler', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

