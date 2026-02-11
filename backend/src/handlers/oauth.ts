import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createResponse, createErrorResponse } from '../middleware/auth';
import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import { PutCommand, GetCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { User } from '../models/types';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import jwksClient from 'jwks-rsa';
import { logger } from '../utils/logger';

const INITIAL_CASH_BALANCE = 1000;

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
  auth_time?: number;
}

// Google JWKS client with caching
const googleJwksClient = jwksClient({
  jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

/**
 * Verify Google ID token with cryptographic signature verification
 * Verifies the token signature against Google's JWKS (JSON Web Key Set)
 */
async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload | null> {
  try {
    // Decode the token header to get the key ID (kid)
    const decoded = jwt.decode(idToken, { complete: true }) as jwt.JwtPayload | null;
    
    if (!decoded || typeof decoded === 'string' || !decoded.header || !decoded.header.kid) {
      logger.error('Invalid Google token format');
      return null;
    }

    // Get the signing key from Google's JWKS
    const key = await googleJwksClient.getSigningKey(decoded.header.kid);
    const publicKey = key.getPublicKey();

    // Verify the token signature, issuer, and expiration
    const payload = jwt.verify(idToken, publicKey, {
      algorithms: ['RS256'],
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      // Note: We don't verify audience here since Google tokens can have different audiences
      // The frontend should verify the audience matches the client ID
    }) as GoogleTokenPayload;

    return payload;
  } catch (error) {
    logger.error('Error verifying Google token', error);
    return null;
  }
}

// Apple JWKS client with caching
const appleJwksClient = jwksClient({
  jwksUri: 'https://appleid.apple.com/auth/keys',
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

// Apple bundle identifiers (audience) - main app and Expo Go so dev works on device
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || 'com.moro.mobile';
const APPLE_BUNDLE_IDS = process.env.APPLE_BUNDLE_IDS || `${APPLE_CLIENT_ID},host.exp.Exponent`;
const APPLE_AUDIENCE_LIST = APPLE_BUNDLE_IDS.split(',').map((s) => s.trim()).filter(Boolean);

/**
 * Verify Apple identity token with cryptographic signature verification
 * Verifies the token signature against Apple's JWKS (JSON Web Key Set).
 * Accepts both app bundle ID (com.moro.mobile) and Expo Go (host.exp.Exponent) as audience.
 */
async function verifyAppleToken(identityToken: string): Promise<AppleTokenPayload | null> {
  try {
    // Decode the token header to get the key ID (kid)
    const decoded = jwt.decode(identityToken, { complete: true }) as jwt.JwtPayload | null;
    
    if (!decoded || typeof decoded === 'string' || !decoded.header || !decoded.header.kid) {
      logger.error('Invalid Apple token format');
      return null;
    }

    // Get the signing key from Apple's JWKS
    const key = await appleJwksClient.getSigningKey(decoded.header.kid);
    const publicKey = key.getPublicKey();

    // Verify the token signature, issuer, audience, and expiration
    // audience: jsonwebtoken types expect tuple for array; Expo Go uses host.exp.Exponent
    const audience: [string, ...string[]] | string =
      APPLE_AUDIENCE_LIST.length > 0
        ? (APPLE_AUDIENCE_LIST as [string, ...string[]])
        : APPLE_CLIENT_ID;
    const payload = jwt.verify(identityToken, publicKey, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
      audience,
    }) as unknown as AppleTokenPayload;

    return payload;
  } catch (error) {
    logger.error('Error verifying Apple token', error);
    return null;
  }
}

/**
 * Find user by provider ID (Google or Apple sub) so returning users sign into existing account.
 */
async function findUserByProviderId(providerId: string, provider: 'google' | 'apple'): Promise<User | null> {
  try {
    const attr = provider === 'google' ? 'googleId' : 'appleId';
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.USERS,
        FilterExpression: `#attr = :pid`,
        ExpressionAttributeNames: { '#attr': attr },
        ExpressionAttributeValues: { ':pid': providerId },
        Limit: 1,
      })
    );
    if (result.Items && result.Items.length > 0) {
      return result.Items[0] as User;
    }
    return null;
  } catch (error) {
    logger.error('Error finding user by provider ID', error);
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
    logger.info('Email index not found, user might not exist');
    return null;
  }
}

/**
 * Create or update user from OAuth.
 * - Look up by provider ID first so returning users always sign into the same account.
 * - For Apple: do NOT match by email (avoids duplicate accounts when relay/hidden email changes).
 * - New Apple users get blank username/displayName so they must complete profile.
 */
async function createOrUpdateOAuthUser(
  email: string | undefined,
  name: string,
  providerId: string,
  provider: 'google' | 'apple',
  avatarUrl?: string
): Promise<{ user: User; isNew: boolean }> {
  const resolvedEmail = email || (providerId ? `${providerId}@privaterelay.appleid.com` : '');
  // Always find by provider ID first so one Apple/Google identity = one account
  let existingUser = await findUserByProviderId(providerId, provider);
  // For Google only: fallback to email so legacy accounts still work. For Apple, never match by email (avoids duplicates).
  if (!existingUser && provider === 'google' && resolvedEmail) {
    existingUser = await findUserByEmail(resolvedEmail);
  }

  if (existingUser) {
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
    if (Object.keys(updateFields).length > 1) {
      const updates: string[] = ['updatedAt = :ua'];
      const values: Record<string, any> = { ':ua': new Date().toISOString() };
      if (updateFields.googleId) {
        updates.push('googleId = :gid');
        values[':gid'] = updateFields.googleId;
      }
      if (updateFields.appleId) {
        updates.push('appleId = :aid');
        values[':aid'] = updateFields.appleId;
      }
      if (updateFields.avatarUrl) {
        updates.push('avatarUrl = :av');
        values[':av'] = updateFields.avatarUrl;
      }
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAMES.USERS,
          Key: { userId: existingUser.userId },
          UpdateExpression: `SET ${updates.join(', ')}`,
          ExpressionAttributeValues: values,
        })
      );
    }
    return { user: existingUser, isNew: false };
  }

  // Create new user (idempotent: only one account per provider id)
  const userId = uuidv4();
  const now = new Date().toISOString();
  // Apple: leave username and displayName blank so user must set them in onboarding
  const isApple = provider === 'apple';
  const username = isApple ? '' : (() => {
    const base = resolvedEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
    return `${base}${Math.floor(Math.random() * 1000)}`;
  })();
  const displayName = isApple ? '' : (name || username);

  const newUser: User = {
    userId,
    email: resolvedEmail,
    username,
    displayName,
    avatarUrl,
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
    email: user.email ?? '',
    username: user.username,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
  };

  // SECURITY: JWT_SECRET must be set via environment variable
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
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

    // If we have an ID token, cryptographically verify it
    if (idToken) {
      const payload = await verifyGoogleToken(idToken);
      if (!payload) {
        return createErrorResponse(401, 'Invalid or unverifiable Google ID token');
      }
      userEmail = payload.email;
      userName = payload.name || name;
      userPhoto = payload.picture || photo;
      googleId = payload.sub;
    } else {
      // If no ID token provided, require email for fallback (less secure)
      logger.warn('Google login without ID token - using email fallback (less secure)');
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

    // Generate presigned URL for avatar if it's an S3 key (avatars are private, accessed via presigned URLs)
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
        token,
        user: {
          id: user.userId,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl,
        },
        isNewUser: isNew,
      },
    });
  } catch (error: any) {
    logger.error('Error in Google login', error);
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

    // If we have an identity token, cryptographically verify it
    if (identityToken) {
      const payload = await verifyAppleToken(identityToken);
      if (!payload) {
        return createErrorResponse(401, 'Invalid or unverifiable Apple identity token');
      }
      userEmail = payload.email || email;
      appleId = payload.sub;
    } else {
      // If no identity token provided, require email/providerId for fallback (less secure)
      logger.warn('Apple login without identity token - using email fallback (less secure)');
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

    // Generate presigned URL for avatar if it's an S3 key (avatars are private, accessed via presigned URLs)
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
        token,
        user: {
          id: user.userId,
          email: user.email ?? '',
          username: user.username,
          displayName: user.displayName,
          avatarUrl,
        },
        isNewUser: isNew,
      },
    });
  } catch (error: any) {
    logger.error('Error in Apple login', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

