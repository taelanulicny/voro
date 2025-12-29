import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { Post, Comment, Like, CommentLike, Bookmark, Follow, User } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

export async function createPost(
  userId: string,
  content: string,
  entityId?: number,
  entityTicker?: string,
  entityName?: string,
  sentiment?: 'positive' | 'negative' | 'neutral'
): Promise<{ success: boolean; post?: Post; error?: string }> {
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
    const now = new Date().toISOString();
    const postId = uuidv4();

    const post: Post = {
      postId,
      userId,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      content,
      entityId,
      entityTicker,
      entityName,
      sentiment,
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
    // Get users being followed
    const followsResult = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.FOLLOWS,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      })
    );

    const followingUserIds = ((followsResult.Items || []) as Follow[]).map((f) => f.followingUserId);
    followingUserIds.push(userId); // Include own posts

    // Parse cursor if provided (format: "timestamp:postId")
    let cursorTimestamp: string | undefined;
    let cursorPostId: string | undefined;
    if (lastKey) {
      try {
        const decoded = Buffer.from(lastKey, 'base64').toString('utf-8');
        const [ts, pid] = decoded.split(':');
        cursorTimestamp = ts;
        cursorPostId = pid;
      } catch {
        // Invalid cursor, ignore
      }
    }

    // Get posts from followed users
    const posts: Post[] = [];
    for (const followedUserId of followingUserIds) {
      const postsResult = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAMES.POSTS,
          IndexName: 'userId-timestamp-index',
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: {
            ':userId': followedUserId,
          },
          ScanIndexForward: false,
          // Fetch extra to account for filtering
          Limit: limit * 2,
        })
      );

      if (postsResult.Items) {
        posts.push(...(postsResult.Items as Post[]));
      }
    }

    // Sort by timestamp descending
    posts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply cursor-based pagination: skip posts until we find the cursor position
    let startIndex = 0;
    if (cursorTimestamp && cursorPostId) {
      const cursorIndex = posts.findIndex(
        (p) => p.timestamp === cursorTimestamp && p.postId === cursorPostId
      );
      if (cursorIndex >= 0) {
        startIndex = cursorIndex + 1;
      }
    }

    // Get the page of posts
    const paginatedPosts = posts.slice(startIndex, startIndex + limit);

    // Calculate next cursor
    let nextLastEvaluatedKey: string | undefined;
    if (startIndex + limit < posts.length && paginatedPosts.length > 0) {
      const lastPost = paginatedPosts[paginatedPosts.length - 1];
      nextLastEvaluatedKey = Buffer.from(`${lastPost.timestamp}:${lastPost.postId}`).toString('base64');
    }

    // Get like status for each post
    const postsWithLikes = await Promise.all(
      paginatedPosts.map(async (post) => {
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
          isBookmarked: false, // TODO: Implement bookmarks
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
  content: string
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
    const now = new Date().toISOString();
    const commentId = uuidv4();

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
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.COMMENTS,
        IndexName: 'postId-timestamp-index',
        KeyConditionExpression: 'postId = :postId',
        ExpressionAttributeValues: {
          ':postId': postId,
        },
        ScanIndexForward: false,
        Limit: limit,
      })
    );

    return (result.Items || []) as Comment[];
  } catch (error) {
    console.error('Error getting comments:', error);
    return [];
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

