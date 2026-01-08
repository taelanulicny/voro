import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
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
      })
    );

    return (result.Item as User) || null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

export async function updateUserProfile(
  userId: string,
  updates: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
  }
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const now = new Date().toISOString();
    const updateExpressions: string[] = [];
    const expressionAttributeValues: Record<string, any> = { ':ua': now };

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
    const key = `avatars/${userId}/${Date.now()}.${contentType.split('/')[1] || 'jpg'}`;
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

