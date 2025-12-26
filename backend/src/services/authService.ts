import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  GetUserCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import { PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { User } from '../models/types';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID!;
const INITIAL_CASH_BALANCE = 10000;

export async function signup(
  email: string,
  password: string,
  username: string,
  displayName: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    // Sign up user in Cognito - use username as Cognito Username since email is configured as alias
    const signUpCommand = new SignUpCommand({
      ClientId: CLIENT_ID,
      Username: username, // Use username, not email (email is an alias)
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'preferred_username', Value: username },
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
      email,
      username,
      displayName,
      followersCount: 0,
      followingCount: 0,
      cashBalance: INITIAL_CASH_BALANCE,
      joinedDate: now,
      createdAt: now,
      updatedAt: now,
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
    const authCommand = new InitiateAuthCommand({
      ClientId: CLIENT_ID,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: email,
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

    return {
      success: true,
      token: idToken, // Use ID token for API authentication
      refreshToken,
      user: {
        id: user.userId,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
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

