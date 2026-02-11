import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import { GetCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { User } from '../models/types';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'moro-assets';

export async function getUserProfile(userId: string): Promise<User | null> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.USERS,
        Key: { userId },
        ConsistentRead: true,
      })
    );

    return (result.Item as User) || null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/** Look up user by username (fallback when identifier might be username) */
export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    const normalized = username.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');
    if (!normalized || normalized.length < 3) return null;
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.USERS,
        FilterExpression: 'username = :u',
        ExpressionAttributeValues: { ':u': normalized },
        Limit: 1,
      })
    );
    const item = result.Items?.[0];
    return (item as User) || null;
  } catch (error) {
    console.error('Error getting user by username:', error);
    return null;
  }
}

export async function updateUserProfile(
  userId: string,
  updates: {
    username?: string;
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
  }
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const now = new Date().toISOString();
    const updateExpressions: string[] = [];
    const expressionAttributeValues: Record<string, any> = { ':ua': now };

    if (updates.username !== undefined) {
      const trimmed = updates.username.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');
      if (trimmed.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters' };
      }
      // Reserved words (cannot be used as username)
      const RESERVED = new Set(['admin', 'support', 'moderator', 'moro', 'official', 'null', 'undefined']);
      if (RESERVED.has(trimmed)) {
        return { success: false, error: 'This username is not available' };
      }
      const existing = await getUserByUsername(trimmed);
      if (existing && existing.userId !== userId) {
        return { success: false, error: 'Username is already taken' };
      }
      updateExpressions.push('username = :username');
      expressionAttributeValues[':username'] = trimmed;
    }

    if (updates.displayName !== undefined) {
      updateExpressions.push('displayName = :displayName');
      expressionAttributeValues[':displayName'] = updates.displayName;
    }

    if (updates.bio !== undefined) {
      updateExpressions.push('bio = :bio');
      expressionAttributeValues[':bio'] = updates.bio;
    }

    if (updates.avatarUrl !== undefined) {
      updateExpressions.push('avatarUrl = :avatarUrl');
      expressionAttributeValues[':avatarUrl'] = updates.avatarUrl;
    }

    if (updateExpressions.length === 0) {
      return { success: false, error: 'No updates provided' };
    }

    updateExpressions.push('updatedAt = :ua');

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAMES.USERS,
        Key: { userId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );

    const updatedUser = await getUserProfile(userId);
    return { success: true, user: updatedUser || undefined };
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return { success: false, error: error.message || 'Failed to update profile' };
  }
}

export async function generateAvatarUploadUrl(
  userId: string,
  contentType: string
): Promise<{ success: boolean; uploadUrl?: string; key?: string; error?: string }> {
  try {
    // Extract file extension from content type
    const extension = contentType.includes('png') ? 'png' : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'jpg';
    const key = `avatars/${userId}/${Date.now()}.${extension}`;
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return {
      success: true,
      uploadUrl,
      key,
    };
  } catch (error: any) {
    console.error('Error generating upload URL:', error);
    return { success: false, error: error.message || 'Failed to generate upload URL' };
  }
}

export async function getAvatarUrl(key: string): Promise<string | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return url;
  } catch (error) {
    console.error('Error getting avatar URL:', error);
    return null;
  }
}

export async function updateUserPreferences(
  userId: string,
  preferences: {
    privacySettings?: {
      profileVisibility?: 'public' | 'private';
      showPortfolioValue?: boolean;
      allowDataSharing?: boolean;
    };
    notificationSettings?: {
      pushNotifications?: boolean;
      priceAlerts?: boolean;
      tradingAlerts?: boolean;
      socialNotifications?: boolean;
    };
    tradingPreferences?: {
      requireConfirmation?: boolean;
      showTradePreview?: boolean;
      enableSlippageWarning?: boolean;
    };
    homeLayout?: {
      addedCategories?: string[];
    };
  }
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const now = new Date().toISOString();
    const updateExpressions: string[] = [];
    const expressionAttributeValues: Record<string, any> = { ':ua': now };

    // Get current user to merge preferences
    const currentUser = await getUserProfile(userId);
    if (!currentUser) {
      return { success: false, error: 'User not found' };
    }

    // Merge privacy settings
    if (preferences.privacySettings) {
      const currentPrivacy = currentUser.privacySettings || {};
      const mergedPrivacy = { ...currentPrivacy, ...preferences.privacySettings };
      updateExpressions.push('privacySettings = :privacySettings');
      expressionAttributeValues[':privacySettings'] = mergedPrivacy;
    }

    // Merge notification settings
    if (preferences.notificationSettings) {
      const currentNotifications = currentUser.notificationSettings || {};
      const mergedNotifications = { ...currentNotifications, ...preferences.notificationSettings };
      updateExpressions.push('notificationSettings = :notificationSettings');
      expressionAttributeValues[':notificationSettings'] = mergedNotifications;
    }

    // Merge trading preferences
    if (preferences.tradingPreferences) {
      const currentTrading = currentUser.tradingPreferences || {};
      const mergedTrading = { ...currentTrading, ...preferences.tradingPreferences };
      updateExpressions.push('tradingPreferences = :tradingPreferences');
      expressionAttributeValues[':tradingPreferences'] = mergedTrading;
    }

    if (preferences.homeLayout) {
      const currentHome = currentUser.homeLayout || {};
      const mergedHome = { ...currentHome, ...preferences.homeLayout };
      updateExpressions.push('homeLayout = :homeLayout');
      expressionAttributeValues[':homeLayout'] = mergedHome;
    }

    if (updateExpressions.length === 0) {
      return { success: false, error: 'No preferences provided' };
    }

    updateExpressions.push('updatedAt = :ua');

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAMES.USERS,
        Key: { userId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );

    const updatedUser = await getUserProfile(userId);
    return { success: true, user: updatedUser || undefined };
  } catch (error: any) {
    console.error('Error updating user preferences:', error);
    return { success: false, error: error.message || 'Failed to update preferences' };
  }
}

