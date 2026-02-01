import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  GetUserCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  ChangePasswordCommand,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import { PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { User } from '../models/types';
import { logger } from '../utils/logger';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID!;
const INITIAL_CASH_BALANCE = 1000;

export async function signup(
  email: string,
  password: string,
  username: string,
  displayName: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    // Normalize email and username to lowercase for case-insensitive matching
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.toLowerCase().trim();

    // Sign up user in Cognito - use username as Cognito Username since email is configured as alias
    const signUpCommand = new SignUpCommand({
      ClientId: CLIENT_ID,
      Username: normalizedUsername, // Use username, not email (email is an alias)
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: normalizedEmail },
        { Name: 'preferred_username', Value: normalizedUsername },
        { Name: 'name', Value: displayName },
      ],
    });

    const signUpResponse = await cognitoClient.send(signUpCommand);

    if (!signUpResponse.UserSub) {
      return { success: false, error: 'Failed to create user' };
    }

    const userId = signUpResponse.UserSub;

    // Create user profile in DynamoDB
    const now = new Date().toISOString();
    const user: User = {
      userId,
      email: normalizedEmail,
      username: normalizedUsername,
      displayName,
      followersCount: 0,
      followingCount: 0,
      cashBalance: INITIAL_CASH_BALANCE,
      joinedDate: now,
      createdAt: now,
      updatedAt: now,
      // Default privacy settings - portfolio value is private by default
      privacySettings: {
        profileVisibility: 'public',
        showPortfolioValue: false,
        allowDataSharing: false,
      },
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.USERS,
        Item: user,
      })
    );

    return { success: true, userId };
  } catch (error: any) {
    console.error('Signup error:', error);
    return {
      success: false,
      error: error.message || 'Signup failed',
    };
  }
}

export async function login(
  email: string,
  password: string
): Promise<{
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: any;
  error?: string;
}> {
  try {
    // Normalize email to lowercase for case-insensitive login
    const normalizedEmail = email.toLowerCase().trim();

    const authCommand = new InitiateAuthCommand({
      ClientId: CLIENT_ID,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: normalizedEmail,
        PASSWORD: password,
      },
    });

    const authResponse = await cognitoClient.send(authCommand);

    if (!authResponse.AuthenticationResult) {
      return { success: false, error: 'Authentication failed' };
    }

    const accessToken = authResponse.AuthenticationResult.AccessToken;
    const idToken = authResponse.AuthenticationResult.IdToken;
    const refreshToken = authResponse.AuthenticationResult.RefreshToken;

    // Get user info from Cognito
    const getUserCommand = new GetUserCommand({
      AccessToken: accessToken!,
    });

    const userResponse = await cognitoClient.send(getUserCommand);
    // Get the 'sub' attribute which is the actual userId we store in DynamoDB
    const subAttr = userResponse.UserAttributes?.find(attr => attr.Name === 'sub');
    const userId = subAttr?.Value || userResponse.Username;

    // Get user profile from DynamoDB
    const userResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.USERS,
        Key: { userId },
      })
    );

    if (!userResult.Item) {
      return { success: false, error: 'User profile not found' };
    }

    const user = userResult.Item as User;

    // Generate presigned URL for avatar if it's an S3 key (avatars are private, accessed via presigned URLs)
    let avatarUrl = user.avatarUrl;
    if (avatarUrl && !avatarUrl.startsWith('http')) {
      // If avatarUrl is an S3 key, generate a presigned URL
      const { getAvatarUrl } = await import('./userService');
      const presignedUrl = await getAvatarUrl(avatarUrl);
      avatarUrl = presignedUrl || avatarUrl; // Fallback to key if generation fails
    }

    return {
      success: true,
      token: idToken, // Use ID token for API authentication
      refreshToken,
      user: {
        id: user.userId,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl,
        bio: user.bio,
      },
    };
  } catch (error: any) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error.message || 'Login failed',
    };
  }
}

export async function refreshToken(
  refreshToken: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const authCommand = new InitiateAuthCommand({
      ClientId: CLIENT_ID,
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    });

    const authResponse = await cognitoClient.send(authCommand);

    if (!authResponse.AuthenticationResult) {
      return { success: false, error: 'Token refresh failed' };
    }

    return {
      success: true,
      token: authResponse.AuthenticationResult.IdToken,
    };
  } catch (error: any) {
    console.error('Refresh token error:', error);
    return {
      success: false,
      error: error.message || 'Token refresh failed',
    };
  }
}

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.USERS,
        Key: { userId },
      })
    );

    return (result.Item as User) || null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

/**
 * Change user password using Cognito
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user to find their username
    const user = await getUserById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // First, authenticate to get access token
    const authCommand = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: user.username,
        PASSWORD: currentPassword,
      },
    });

    let accessToken: string;
    try {
      const authResult = await cognitoClient.send(authCommand);
      if (!authResult.AuthenticationResult?.AccessToken) {
        return { success: false, error: 'Current password is incorrect' };
      }
      accessToken = authResult.AuthenticationResult.AccessToken;
    } catch (authError: any) {
      if (authError.name === 'NotAuthorizedException') {
        return { success: false, error: 'Current password is incorrect' };
      }
      throw authError;
    }

    // Now change the password using the access token
    const changePasswordCommand = new ChangePasswordCommand({
      PreviousPassword: currentPassword,
      ProposedPassword: newPassword,
      AccessToken: accessToken,
    });

    await cognitoClient.send(changePasswordCommand);

    logger.info('Password changed successfully', { userId });
    return { success: true };
  } catch (error: any) {
    logger.error('Error changing password', { error, userId });

    if (error.name === 'InvalidPasswordException') {
      return { success: false, error: 'New password does not meet requirements' };
    }
    if (error.name === 'LimitExceededException') {
      return { success: false, error: 'Too many attempts. Please try again later' };
    }

    return { success: false, error: 'Failed to change password' };
  }
}

/**
 * Change user email using Cognito
 */
export async function changeEmail(
  userId: string,
  newEmail: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Normalize new email to lowercase
    const normalizedNewEmail = newEmail.toLowerCase().trim();

    // Get user to find their username and current email
    const user = await getUserById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Verify password by attempting authentication
    const authCommand = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: user.username,
        PASSWORD: password,
      },
    });

    try {
      await cognitoClient.send(authCommand);
    } catch (authError: any) {
      if (authError.name === 'NotAuthorizedException') {
        return { success: false, error: 'Password is incorrect' };
      }
      throw authError;
    }

    // Check if email is same
    if (user.email === normalizedNewEmail) {
      return { success: false, error: 'New email must be different from current email' };
    }

    // Update email in Cognito using admin command
    const updateCommand = new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: user.username,
      UserAttributes: [
        {
          Name: 'email',
          Value: normalizedNewEmail,
        },
        {
          Name: 'email_verified',
          Value: 'false', // Email needs to be verified
        },
      ],
    });

    await cognitoClient.send(updateCommand);

    // Update email in DynamoDB
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAMES.USERS,
        Key: { userId },
        UpdateExpression: 'SET email = :email, pendingEmail = :pendingEmail, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':email': normalizedNewEmail,
          ':pendingEmail': normalizedNewEmail,
          ':updatedAt': new Date().toISOString(),
        },
      })
    );

    logger.info('Email change initiated', { userId, newEmail: normalizedNewEmail });

    // TODO: Trigger email verification flow in Cognito
    // Cognito will automatically send verification email if configured

    return { success: true };
  } catch (error: any) {
    logger.error('Error changing email', { error, userId });

    if (error.name === 'InvalidParameterException') {
      return { success: false, error: 'Invalid email format' };
    }
    if (error.name === 'AliasExistsException') {
      return { success: false, error: 'Email is already in use' };
    }

    return { success: false, error: 'Failed to change email' };
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    // Note: This is a placeholder implementation.
    // For production, you'd want a GSI on email for efficient lookups.
    // For now, we rely on Cognito's email uniqueness.
    // TODO: Implement GSI-based email lookup when needed
    return null;
  } catch (error) {
    logger.error('Error getting user by email', { error, email });
    return null;
  }
}

