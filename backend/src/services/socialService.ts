import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Post, Comment, Like, CommentLike, Bookmark, Follow, User } from '../models/types';
import { v4 as uuidv4 } from 'uuid';
import { moderateWithComprehend } from '../utils/contentModeration';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'moro-assets';

export async function createPost(
  userId: string,
  content: string,
  entityId?: number,
  entityName?: string,
  sentiment?: 'positive' | 'negative' | 'neutral',
  images?: string[]
): Promise<{ success: boolean; post?: Post; error?: string }> {
  try {
    // Content moderation using AWS Comprehend for comprehensive AI-powered detection
    const moderationResult = await moderateWithComprehend(content);
    if (!moderationResult.approved) {
      return { success: false, error: moderationResult.reason || 'Content moderation failed' };
    }

    // Get user info
    const userResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.USERS,
        Key: { userId },
      })
    );

    if (!userResult.Item) {
      return { success: false, error: 'User not found' };
    }

    const user = userResult.Item as User;
    const now = new Date().toISOString();
    const postId = uuidv4();

    // Build image URLs (convert S3 keys to full URLs)
    const imageUrls: string[] = [];
    if (images && images.length > 0) {
      const region = process.env.AWS_REGION || 'us-east-1';
      imageUrls.push(...images.map(key => `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`));
    }

    const post: Post = {
      postId,
      userId,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      content: content.trim(),
      entityId,
      entityName,
      sentiment,
      images: imageUrls.length > 0 ? imageUrls : undefined,
      likes: 0,
      comments: 0,
      timestamp: now,
      createdAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.POSTS,
        Item: post,
      })
    );

    return { success: true, post };
  } catch (error: any) {
    console.error('Error creating post:', error);
    return { success: false, error: error.message || 'Failed to create post' };
  }
}

export async function getFeed(
  userId: string,
  limit: number = 50,
  lastKey?: string
): Promise<{ posts: Post[]; lastEvaluatedKey?: string }> {
  try {
    // Global Feed implementation (Scan)
    // This retrieves posts from all users to populate the "Trending" feed

    let exclusiveStartKey;
    if (lastKey) {
      try {
        exclusiveStartKey = JSON.parse(Buffer.from(lastKey, 'base64').toString('utf-8'));
      } catch (e) {
        console.warn('Invalid lastKey:', lastKey);
      }
    }

    // Scan posts table to get global activity
    // Note: In a real production app, you would use a GSI on timestamp (e.g., 'type-timestamp-index') 
    // to efficiently query recent posts across the system.
    // For now, Scan with a limit works for the MVP scale.
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.POSTS,
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey,
      })
    );

    const posts = (scanResult.Items || []) as Post[];

    // Sort by timestamp descending (in-memory sort of the scanned batch)
    posts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Prepare next cursor
    let nextLastEvaluatedKey: string | undefined;
    if (scanResult.LastEvaluatedKey) {
      nextLastEvaluatedKey = Buffer.from(JSON.stringify(scanResult.LastEvaluatedKey)).toString('base64');
    }

    // Get like status for each post
    const postsWithLikes = await Promise.all(
      posts.map(async (post) => {
        const likeResult = await docClient.send(
          new QueryCommand({
            TableName: TABLE_NAMES.LIKES,
            IndexName: 'postId-userId-index',
            KeyConditionExpression: 'postId = :postId AND userId = :userId',
            ExpressionAttributeValues: {
              ':postId': post.postId,
              ':userId': userId,
            },
          })
        );

        return {
          ...post,
          isLiked: (likeResult.Items?.length || 0) > 0,
          isBookmarked: false, // TODO: Implement bookmarks check
        };
      })
    );

    return { posts: postsWithLikes, lastEvaluatedKey: nextLastEvaluatedKey };
  } catch (error: any) {
    console.error('Error getting feed:', error);
    return { posts: [] };
  }
}

export async function toggleLikePost(
  userId: string,
  postId: string
): Promise<{ success: boolean; isLiked: boolean; error?: string }> {
  try {
    // Check if already liked
    const likeResult = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.LIKES,
        IndexName: 'postId-userId-index',
        KeyConditionExpression: 'postId = :postId AND userId = :userId',
        ExpressionAttributeValues: {
          ':postId': postId,
          ':userId': userId,
        },
      })
    );

    const existingLike = likeResult.Items?.[0];

    if (existingLike) {
      // Unlike
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAMES.LIKES,
          Key: { likeId: existingLike.likeId },
        })
      );

      // Decrement like count
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAMES.POSTS,
          Key: { postId },
          UpdateExpression: 'SET likes = likes - :one',
          ExpressionAttributeValues: {
            ':one': 1,
          },
        })
      );

      return { success: true, isLiked: false };
    } else {
      // Like
      const like: Like = {
        likeId: uuidv4(),
        postId,
        userId,
        createdAt: new Date().toISOString(),
      };

      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAMES.LIKES,
          Item: like,
        })
      );

      // Increment like count
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAMES.POSTS,
          Key: { postId },
          UpdateExpression: 'SET likes = likes + :one',
          ExpressionAttributeValues: {
            ':one': 1,
          },
        })
      );

      return { success: true, isLiked: true };
    }
  } catch (error: any) {
    console.error('Error toggling like:', error);
    return { success: false, isLiked: false, error: error.message || 'Failed to toggle like' };
  }
}

export async function addComment(
  userId: string,
  postId: string,
  content: string,
  parentCommentId?: string
): Promise<{ success: boolean; comment?: Comment; error?: string }> {
  try {
    // Get user info
    const userResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.USERS,
        Key: { userId },
      })
    );

    if (!userResult.Item) {
      return { success: false, error: 'User not found' };
    }

    const user = userResult.Item as User;

    // Content moderation using AWS Comprehend for comprehensive AI-powered detection
    const moderationResult = await moderateWithComprehend(content);
    if (!moderationResult.approved) {
      return { success: false, error: moderationResult.reason || 'Content moderation failed' };
    }

    const now = new Date().toISOString();
    const commentId = uuidv4();

    // If replying to a comment, get parent comment info
    let replyToUserId: string | undefined;
    let replyToUsername: string | undefined;
    let replyToDisplayName: string | undefined;

    if (parentCommentId) {
      const parentCommentResult = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAMES.COMMENTS,
          Key: { commentId: parentCommentId },
        })
      );

      if (parentCommentResult.Item) {
        const parentComment = parentCommentResult.Item as Comment;
        replyToUserId = parentComment.userId;
        replyToUsername = parentComment.username;
        replyToDisplayName = parentComment.displayName;
      } else {
        return { success: false, error: 'Parent comment not found' };
      }
    }

    const comment: Comment = {
      commentId,
      postId,
      userId,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      content,
      likes: 0,
      timestamp: now,
      createdAt: now,
      parentCommentId,
      replyToUserId,
      replyToUsername,
      replyToDisplayName,
      isEdited: false,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.COMMENTS,
        Item: comment,
      })
    );

    // Increment comment count
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAMES.POSTS,
        Key: { postId },
        UpdateExpression: 'SET comments = comments + :one',
        ExpressionAttributeValues: {
          ':one': 1,
        },
      })
    );

    return { success: true, comment };
  } catch (error: any) {
    console.error('Error adding comment:', error);
    return { success: false, error: error.message || 'Failed to add comment' };
  }
}

export async function getComments(
  postId: string,
  limit: number = 50
): Promise<Comment[]> {
  try {
    // Get all comments for this post (not just top-level)
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.COMMENTS,
        IndexName: 'postId-timestamp-index',
        KeyConditionExpression: 'postId = :postId',
        ExpressionAttributeValues: {
          ':postId': postId,
        },
        ScanIndexForward: false,
        Limit: limit * 2, // Get more to account for nested replies
      })
    );

    const allComments = (result.Items || []) as Comment[];

    // Build nested structure: separate top-level comments from replies
    const topLevelComments: Comment[] = [];
    const repliesMap = new Map<string, Comment[]>();

    // First pass: separate top-level and replies
    for (const comment of allComments) {
      if (comment.parentCommentId) {
        // This is a reply
        if (!repliesMap.has(comment.parentCommentId)) {
          repliesMap.set(comment.parentCommentId, []);
        }
        repliesMap.get(comment.parentCommentId)!.push(comment);
      } else {
        // Top-level comment
        topLevelComments.push(comment);
      }
    }

    // Second pass: attach replies to their parents
    const buildNestedComments = (comments: Comment[]): Comment[] => {
      return comments.map(comment => {
        const replies = repliesMap.get(comment.commentId) || [];
        return {
          ...comment,
          replies: buildNestedComments(replies).sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          ),
        };
      });
    };

    return buildNestedComments(topLevelComments).slice(0, limit);
  } catch (error) {
    console.error('Error getting comments:', error);
    return [];
  }
}

/**
 * Edit a comment
 */
export async function editComment(
  userId: string,
  commentId: string,
  newContent: string
): Promise<{ success: boolean; comment?: Comment; error?: string }> {
  try {
    // Get existing comment
    const commentResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.COMMENTS,
        Key: { commentId },
      })
    );

    if (!commentResult.Item) {
      return { success: false, error: 'Comment not found' };
    }

    const comment = commentResult.Item as Comment;

    // Check ownership
    if (comment.userId !== userId) {
      return { success: false, error: 'Not authorized to edit this comment' };
    }

    const now = new Date().toISOString();

    // Update comment
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAMES.COMMENTS,
        Key: { commentId },
        UpdateExpression: 'SET content = :content, editedAt = :editedAt, isEdited = :isEdited',
        ExpressionAttributeValues: {
          ':content': newContent,
          ':editedAt': now,
          ':isEdited': true,
        },
      })
    );

    // Get updated comment
    const updatedResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.COMMENTS,
        Key: { commentId },
      })
    );

    return {
      success: true,
      comment: updatedResult.Item as Comment,
    };
  } catch (error: any) {
    console.error('Error editing comment:', error);
    return { success: false, error: error.message || 'Failed to edit comment' };
  }
}

/**
 * Check if two users follow each other (mutual follow)
 */
export async function checkMutualFollow(
  userId: string,
  otherUserId: string
): Promise<{ isMutual: boolean; userFollowsOther: boolean; otherFollowsUser: boolean }> {
  try {
    // Check if user follows other
    const userFollowsResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.FOLLOWS,
        Key: {
          userId,
          followingUserId: otherUserId,
        },
      })
    );

    // Check if other follows user
    const otherFollowsResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.FOLLOWS,
        Key: {
          userId: otherUserId,
          followingUserId: userId,
        },
      })
    );

    const userFollowsOther = !!userFollowsResult.Item;
    const otherFollowsUser = !!otherFollowsResult.Item;

    return {
      isMutual: userFollowsOther && otherFollowsUser,
      userFollowsOther,
      otherFollowsUser,
    };
  } catch (error) {
    console.error('Error checking mutual follow:', error);
    return { isMutual: false, userFollowsOther: false, otherFollowsUser: false };
  }
}

export async function toggleFollowUser(
  userId: string,
  followingUserId: string
): Promise<{ success: boolean; isFollowing: boolean; error?: string }> {
  try {
    if (userId === followingUserId) {
      return { success: false, isFollowing: false, error: 'Cannot follow yourself' };
    }

    // Check if already following
    const followResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.FOLLOWS,
        Key: {
          userId,
          followingUserId,
        },
      })
    );

    if (followResult.Item) {
      // Unfollow
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAMES.FOLLOWS,
          Key: {
            userId,
            followingUserId,
          },
        })
      );

      // Update follower/following counts
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAMES.USERS,
          Key: { userId: followingUserId },
          UpdateExpression: 'SET followersCount = followersCount - :one',
          ExpressionAttributeValues: { ':one': 1 },
        })
      );

      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAMES.USERS,
          Key: { userId },
          UpdateExpression: 'SET followingCount = followingCount - :one',
          ExpressionAttributeValues: { ':one': 1 },
        })
      );

      return { success: true, isFollowing: false };
    } else {
      // Follow
      const follow: Follow = {
        userId,
        followingUserId,
        createdAt: new Date().toISOString(),
      };

      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAMES.FOLLOWS,
          Item: follow,
        })
      );

      // Update follower/following counts
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAMES.USERS,
          Key: { userId: followingUserId },
          UpdateExpression: 'SET followersCount = followersCount + :one',
          ExpressionAttributeValues: { ':one': 1 },
        })
      );

      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAMES.USERS,
          Key: { userId },
          UpdateExpression: 'SET followingCount = followingCount + :one',
          ExpressionAttributeValues: { ':one': 1 },
        })
      );

      return { success: true, isFollowing: true };
    }
  } catch (error: any) {
    console.error('Error toggling follow:', error);
    return { success: false, isFollowing: false, error: error.message || 'Failed to toggle follow' };
  }
}

export async function searchUsers(query: string, limit: number = 20): Promise<User[]> {
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.USERS,
        FilterExpression: 'contains(username, :query) OR contains(displayName, :query)',
        ExpressionAttributeValues: {
          ':query': query,
        },
        Limit: limit,
      })
    );

    return (result.Items || []) as User[];
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}

export async function deletePost(
  userId: string,
  postId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the post to verify ownership
    const postResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.POSTS,
        Key: { postId },
      })
    );

    if (!postResult.Item) {
      return { success: false, error: 'Post not found' };
    }

    const post = postResult.Item as Post;
    if (post.userId !== userId) {
      return { success: false, error: 'Not authorized to delete this post' };
    }

    // Delete the post
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAMES.POSTS,
        Key: { postId },
      })
    );

    // Note: In production, you'd also want to delete associated comments and likes
    // This is a simplified implementation

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting post:', error);
    return { success: false, error: error.message || 'Failed to delete post' };
  }
}

export async function toggleBookmarkPost(
  userId: string,
  postId: string
): Promise<{ success: boolean; isBookmarked: boolean; error?: string }> {
  try {
    // Check if already bookmarked using a scan (would be better with GSI in production)
    const bookmarkResult = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.WATCHLISTS, // Reusing watchlists table for bookmarks
        FilterExpression: 'userId = :userId AND postId = :postId AND itemType = :itemType',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':postId': postId,
          ':itemType': 'bookmark',
        },
        Limit: 1,
      })
    );

    const existingBookmark = bookmarkResult.Items?.[0];

    if (existingBookmark) {
      // Remove bookmark
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAMES.WATCHLISTS,
          Key: {
            userId,
            entityId: parseInt(existingBookmark.entityId || '0', 10)
          },
        })
      );

      return { success: true, isBookmarked: false };
    } else {
      // Add bookmark (using a special entityId format for bookmarks)
      const bookmark: Bookmark = {
        bookmarkId: uuidv4(),
        postId,
        userId,
        createdAt: new Date().toISOString(),
      };

      // Store in a separate way - using postId as a unique identifier
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAMES.WATCHLISTS,
          Item: {
            userId,
            entityId: -parseInt(postId.replace(/-/g, '').slice(0, 8), 16) || -1, // Negative entityId for bookmarks
            postId,
            itemType: 'bookmark',
            createdAt: bookmark.createdAt,
          },
        })
      );

      return { success: true, isBookmarked: true };
    }
  } catch (error: any) {
    console.error('Error toggling bookmark:', error);
    return { success: false, isBookmarked: false, error: error.message || 'Failed to toggle bookmark' };
  }
}

export async function toggleLikeComment(
  userId: string,
  commentId: string
): Promise<{ success: boolean; isLiked: boolean; error?: string }> {
  try {
    // Check if already liked using a scan (would be better with GSI in production)
    const likeResult = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.LIKES,
        FilterExpression: 'commentId = :commentId AND userId = :userId',
        ExpressionAttributeValues: {
          ':commentId': commentId,
          ':userId': userId,
        },
        Limit: 1,
      })
    );

    const existingLike = likeResult.Items?.[0];

    if (existingLike) {
      // Unlike
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAMES.LIKES,
          Key: { likeId: existingLike.likeId },
        })
      );

      // Decrement like count on comment
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAMES.COMMENTS,
          Key: { commentId },
          UpdateExpression: 'SET likes = likes - :one',
          ExpressionAttributeValues: {
            ':one': 1,
          },
        })
      );

      return { success: true, isLiked: false };
    } else {
      // Like
      const like: CommentLike = {
        likeId: uuidv4(),
        commentId,
        userId,
        createdAt: new Date().toISOString(),
      };

      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAMES.LIKES,
          Item: {
            ...like,
            // Store both commentId for comment likes (no postId)
          },
        })
      );

      // Increment like count on comment
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAMES.COMMENTS,
          Key: { commentId },
          UpdateExpression: 'SET likes = likes + :one',
          ExpressionAttributeValues: {
            ':one': 1,
          },
        })
      );

      return { success: true, isLiked: true };
    }
  } catch (error: any) {
    console.error('Error toggling comment like:', error);
    return { success: false, isLiked: false, error: error.message || 'Failed to toggle like' };
  }
}

/**
 * Generate presigned URL for post image upload
 */
export async function generatePostImageUploadUrl(
  userId: string,
  contentType: string,
  imageIndex: number
): Promise<{ success: boolean; uploadUrl?: string; key?: string; error?: string }> {
  try {
    // Extract file extension from content type
    const extension = contentType.includes('png') ? 'png' : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'jpg';
    const timestamp = Date.now();
    const key = `posts/${userId}/${timestamp}-${imageIndex}.${extension}`;
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      // Add metadata to track upload
      Metadata: {
        userId,
        uploadedAt: timestamp.toString(),
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return {
      success: true,
      uploadUrl,
      key,
    };
  } catch (error: any) {
    console.error('Error generating post image upload URL:', error);
    return { success: false, error: error.message || 'Failed to generate upload URL' };
  }
}

/**
 * Get posts for a specific category
 * Maps categoryId to entity category, gets entities in that category, then gets posts
 */
export async function getCategoryPosts(
  categoryId: string,
  limit: number = 50,
  lastKey?: string
): Promise<{ posts: Post[]; lastEvaluatedKey?: string }> {
  try {
    // Map categoryId to entity category
    // Category IDs: 'Influencers', 'Music Artists', 'Sports', 'Political Figures', 'Startups'
    // Entity categories: 'People', 'Events', 'Politics', 'Tech'
    const categoryMap: Record<string, string> = {
      'Influencers': 'People',
      'Music Artists': 'People',
      'Sports': 'Events',
      'Political Figures': 'Politics',
      'Startups': 'Tech',
    };

    const entityCategory = categoryMap[categoryId] || categoryId;

    // Get all entities in this category
    const { getAllEntities } = await import('./tradingService');
    const entities = await getAllEntities(entityCategory);

    // Filter entities based on categoryId for People category
    let entityIds: number[] = [];
    if (categoryId === 'Influencers') {
      // Influencers: IDs 11-20
      entityIds = entities.filter(e => e.entityId >= 11 && e.entityId <= 20).map(e => e.entityId);
    } else if (categoryId === 'Music Artists') {
      // Music Artists: IDs 21-30
      entityIds = entities.filter(e => e.entityId >= 21 && e.entityId <= 30).map(e => e.entityId);
    } else {
      entityIds = entities.map(e => e.entityId);
    }

    if (entityIds.length === 0) {
      return { posts: [], lastEvaluatedKey: undefined };
    }

    // Get posts for all entities in this category
    // Query each entity's posts using the entityId-timestamp-index GSI
    // Then combine and sort by timestamp
    let exclusiveStartKey;
    if (lastKey) {
      try {
        exclusiveStartKey = JSON.parse(Buffer.from(lastKey, 'base64').toString('utf-8'));
      } catch (e) {
        console.warn('Invalid lastKey:', lastKey);
      }
    }

    // Query posts for each entity and combine results
    const allPosts: Post[] = [];
    for (const entityId of entityIds) {
      const queryResult = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAMES.POSTS,
          IndexName: 'entityId-timestamp-index',
          KeyConditionExpression: 'entityId = :entityId',
          ExpressionAttributeValues: {
            ':entityId': entityId,
          },
          ScanIndexForward: false, // Sort by timestamp descending
          Limit: limit, // Get limit posts per entity to avoid too many queries
        })
      );

      if (queryResult.Items) {
        allPosts.push(...(queryResult.Items as Post[]));
      }
    }

    // Sort all posts by timestamp descending
    allPosts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit and pagination
    const startIndex = exclusiveStartKey ? parseInt(exclusiveStartKey.startIndex || '0', 10) : 0;
    const paginatedPosts = allPosts.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < allPosts.length;

    // Prepare next cursor
    let nextLastEvaluatedKey: string | undefined;
    if (hasMore) {
      nextLastEvaluatedKey = Buffer.from(JSON.stringify({ startIndex: startIndex + limit })).toString('base64');
    }

    return {
      posts: paginatedPosts,
      lastEvaluatedKey: nextLastEvaluatedKey,
    };
  } catch (error: any) {
    console.error('Error getting category posts:', error);
    return { posts: [], lastEvaluatedKey: undefined };
  }
}

