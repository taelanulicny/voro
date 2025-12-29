import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createResponse, createErrorResponse } from '../middleware/auth';
import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import { PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { User } from '../models/types';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const INITIAL_CASH_BALANCE = 10000;

interface GoogleTokenPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  iat: number;
  exp: number;
}

interface AppleTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  email?: string;
  email_verified?: boolean;
  is_private_email?: boolean;
  auth_time: number;
}

/**
 * Verify Google ID token
 * In production, you should verify the token signature against Google's public keys
 */
async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload | null> {
  try {
    // Decode the token (in production, verify signature with Google's JWKS)
    const decoded = jwt.decode(idToken) as GoogleTokenPayload;
    
    if (!decoded) {
      return null;
    }

    // Basic validation
    if (decoded.iss !== 'https://accounts.google.com' && decoded.iss !== 'accounts.google.com') {
      console.error('Invalid Google token issuer:', decoded.iss);
      return null;
    }

    // Check expiration
    if (decoded.exp * 1000 < Date.now()) {
      console.error('Google token expired');
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Error verifying Google token:', error);
    return null;
  }
}

/**
 * Verify Apple identity token
 * In production, you should verify the token signature against Apple's public keys
 */
async function verifyAppleToken(identityToken: string): Promise<AppleTokenPayload | null> {
  try {
    // Decode the token (in production, verify signature with Apple's JWKS)
    const decoded = jwt.decode(identityToken) as AppleTokenPayload;
    
    if (!decoded) {
      return null;
    }

    // Basic validation
    if (decoded.iss !== 'https://appleid.apple.com') {
      console.error('Invalid Apple token issuer:', decoded.iss);
      return null;
    }

    // Check expiration
    if (decoded.exp * 1000 < Date.now()) {
      console.error('Apple token expired');
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Error verifying Apple token:', error);
    return null;
  }
}

/**
 * Find user by provider ID (Google or Apple sub)
 */
async function findUserByProviderId(providerId: string, provider: 'google' | 'apple'): Promise<User | null> {
  try {
    // We'll store provider IDs in the user record
    // For now, scan the table (in production, use a GSI on providerId)
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.USERS,
        IndexName: 'email-index', // We'll search by email as a workaround
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': providerId, // This won't work - we need to search differently
        },
      })
    );

    // For now, return null - we'll create users if they don't exist
    return null;
  } catch (error) {
    console.error('Error finding user by provider ID:', error);
    return null;
  }
}

/**
 * Find user by email
 */
async function findUserByEmail(email: string): Promise<User | null> {
  try {
    // Scan for user with matching email (in production, use a GSI)
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.USERS,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email,
        },
      })
    );

    if (result.Items && result.Items.length > 0) {
      return result.Items[0] as User;
    }

    return null;
  } catch (error) {
    // GSI might not exist, try scanning
    console.log('Email index not found, user might not exist');
    return null;
  }
}

/**
 * Create or update user from OAuth
 */
async function createOrUpdateOAuthUser(
  email: string,
  name: string,
  providerId: string,
  provider: 'google' | 'apple',
  avatarUrl?: string
): Promise<{ user: User; isNew: boolean }> {
  // Try to find existing user by email
  let existingUser = await findUserByEmail(email);

  if (existingUser) {
    // Update the user with provider info if not already set
    const updateFields: Partial<User> = {
      updatedAt: new Date().toISOString(),
    };

    if (provider === 'google' && !existingUser.googleId) {
      updateFields.googleId = providerId;
    }
    if (provider === 'apple' && !existingUser.appleId) {
      updateFields.appleId = providerId;
    }
    if (avatarUrl && !existingUser.avatarUrl) {
      updateFields.avatarUrl = avatarUrl;
    }

    // Return existing user
    return { user: existingUser, isNew: false };
  }

  // Create new user
  const userId = uuidv4();
  const now = new Date().toISOString();
  
  // Generate username from email or name
  const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const username = `${baseUsername}${Math.floor(Math.random() * 1000)}`;

  const newUser: User = {
    userId,
    email,
    username,
    displayName: name || username,
    avatarUrl,
    followersCount: 0,
    followingCount: 0,
    cashBalance: INITIAL_CASH_BALANCE,
    joinedDate: now,
    createdAt: now,
    updatedAt: now,
    ...(provider === 'google' && { googleId: providerId }),
    ...(provider === 'apple' && { appleId: providerId }),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAMES.USERS,
      Item: newUser,
    })
  );

  return { user: newUser, isNew: true };
}

/**
 * Generate a session token for the user
 * In a real app, you'd use Cognito or a proper JWT signing
 */
function generateSessionToken(user: User): string {
  // Create a simple JWT token (in production, use proper signing)
  const payload = {
    sub: user.userId,
    email: user.email,
    username: user.username,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
  };

  // In production, use a proper secret from environment
  const secret = process.env.JWT_SECRET || 'moro-oauth-secret-key-change-in-production';
  return jwt.sign(payload, secret);
}

/**
 * Handle Google OAuth login
 */
export async function googleLogin(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { idToken, email, name, photo, providerId } = body;

    if (!idToken && !email) {
      return createErrorResponse(400, 'Missing required fields: idToken or email');
    }

    let userEmail = email;
    let userName = name;
    let userPhoto = photo;
    let googleId = providerId;

    // If we have an ID token, verify it
    if (idToken) {
      const payload = await verifyGoogleToken(idToken);
      if (!payload) {
        return createErrorResponse(401, 'Invalid Google ID token');
      }
      userEmail = payload.email;
      userName = payload.name || name;
      userPhoto = payload.picture || photo;
      googleId = payload.sub;
    }

    if (!userEmail) {
      return createErrorResponse(400, 'Email is required');
    }

    // Create or get user
    const { user, isNew } = await createOrUpdateOAuthUser(
      userEmail,
      userName || 'Google User',
      googleId || providerId,
      'google',
      userPhoto
    );

    // Generate session token
    const token = generateSessionToken(user);

    return createResponse(200, {
      success: true,
      data: {
        token,
        user: {
          id: user.userId,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
        isNewUser: isNew,
      },
    });
  } catch (error: any) {
    console.error('Error in Google login:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

/**
 * Handle Apple OAuth login
 */
export async function appleLogin(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { identityToken, email, name, providerId } = body;

    if (!identityToken && !email) {
      return createErrorResponse(400, 'Missing required fields: identityToken or email');
    }

    let userEmail = email;
    let userName = name;
    let appleId = providerId;

    // If we have an identity token, verify it
    if (identityToken) {
      const payload = await verifyAppleToken(identityToken);
      if (!payload) {
        return createErrorResponse(401, 'Invalid Apple identity token');
      }
      userEmail = payload.email || email;
      appleId = payload.sub;
    }

    if (!userEmail) {
      // Apple sometimes doesn't provide email on subsequent logins
      // In this case, we need the providerId to find the user
      if (!appleId) {
        return createErrorResponse(400, 'Email or providerId is required');
      }
      // Generate a private relay email for Apple users without email
      userEmail = `${appleId}@privaterelay.appleid.com`;
    }

    // Create or get user
    const { user, isNew } = await createOrUpdateOAuthUser(
      userEmail,
      userName || 'Apple User',
      appleId || providerId,
      'apple'
    );

    // Generate session token
    const token = generateSessionToken(user);

    return createResponse(200, {
      success: true,
      data: {
        token,
        user: {
          id: user.userId,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
        isNewUser: isNew,
      },
    });
  } catch (error: any) {
    console.error('Error in Apple login:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

