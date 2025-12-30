import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { authenticateRequest, createResponse, createErrorResponse } from '../middleware/auth';
import {
  createPost as createPostService,
  getFeed as getFeedService,
  getEntityPosts as getEntityPostsService,
  toggleLikePost as toggleLikePostService,
  addComment as addCommentService,
  getComments as getCommentsService,
  toggleFollowUser as toggleFollowUserService,
  searchUsers as searchUsersService,
  deletePost as deletePostService,
  toggleBookmarkPost as toggleBookmarkPostService,
  toggleLikeComment as toggleLikeCommentService,
} from '../services/socialService';

export async function createPost(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const body = JSON.parse(event.body || '{}');

    const { content, entityId, entityTicker, entityName, sentiment } = body;

    if (!content) {
      return createErrorResponse(400, 'Missing required field: content');
    }

    const result = await createPostService(
      userId,
      content,
      entityId,
      entityTicker,
      entityName,
      sentiment
    );

    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to create post');
    }

    return createResponse(201, {
      success: true,
      data: result.post,
    });
  } catch (error: any) {
    console.error('Error creating post:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function getFeed(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const limit = parseInt(event.queryStringParameters?.limit || '50', 10);
    const lastKey = event.queryStringParameters?.lastKey;

    const result = await getFeedService(userId, limit, lastKey);

    return createResponse(200, {
      success: true,
      data: {
        posts: result.posts,
        lastEvaluatedKey: result.lastEvaluatedKey,
      },
    });
  } catch (error: any) {
    console.error('Error getting feed:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function toggleLikePost(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const postId = event.pathParameters?.postId;

    if (!postId) {
      return createErrorResponse(400, 'Missing postId');
    }

    const result = await toggleLikePostService(userId, postId);

    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to toggle like');
    }

    return createResponse(200, {
      success: true,
      data: { isLiked: result.isLiked },
    });
  } catch (error: any) {
    console.error('Error toggling like:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function addComment(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const postId = event.pathParameters?.postId;
    const body = JSON.parse(event.body || '{}');

    if (!postId) {
      return createErrorResponse(400, 'Missing postId');
    }

    if (!body.content) {
      return createErrorResponse(400, 'Missing required field: content');
    }

    const result = await addCommentService(userId, postId, body.content);

    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to add comment');
    }

    return createResponse(201, {
      success: true,
      data: result.comment,
    });
  } catch (error: any) {
    console.error('Error adding comment:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function getComments(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const postId = event.pathParameters?.postId;

    if (!postId) {
      return createErrorResponse(400, 'Missing postId');
    }

    const limit = parseInt(event.queryStringParameters?.limit || '50', 10);
    const comments = await getCommentsService(postId, limit);

    return createResponse(200, {
      success: true,
      data: comments,
    });
  } catch (error: any) {
    console.error('Error getting comments:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function toggleFollowUser(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const followingUserId = event.pathParameters?.userId;

    if (!followingUserId) {
      return createErrorResponse(400, 'Missing userId');
    }

    const result = await toggleFollowUserService(userId, followingUserId);

    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to toggle follow');
    }

    return createResponse(200, {
      success: true,
      data: { isFollowing: result.isFollowing },
    });
  } catch (error: any) {
    console.error('Error toggling follow:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function searchUsers(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const query = event.queryStringParameters?.q;

    if (!query) {
      return createErrorResponse(400, 'Missing query parameter: q');
    }

    const limit = parseInt(event.queryStringParameters?.limit || '20', 10);
    const users = await searchUsersService(query, limit);

    return createResponse(200, {
      success: true,
      data: users.map((user) => ({
        id: user.userId,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
      })),
    });
  } catch (error: any) {
    console.error('Error searching users:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function deletePost(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const postId = event.pathParameters?.postId;

    if (!postId) {
      return createErrorResponse(400, 'Missing postId');
    }

    const result = await deletePostService(userId, postId);

    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to delete post');
    }

    return createResponse(200, {
      success: true,
    });
  } catch (error: any) {
    console.error('Error deleting post:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function toggleBookmarkPost(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const postId = event.pathParameters?.postId;

    if (!postId) {
      return createErrorResponse(400, 'Missing postId');
    }

    const result = await toggleBookmarkPostService(userId, postId);

    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to toggle bookmark');
    }

    return createResponse(200, {
      success: true,
      data: { isBookmarked: result.isBookmarked },
    });
  } catch (error: any) {
    console.error('Error toggling bookmark:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function getEntityPosts(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Extract entityId from path: /api/social/entities/:entityId/posts
    const path = event.path || '';
    const match = path.match(/\/api\/social\/entities\/(\d+)\/posts/);
    const entityId = match ? parseInt(match[1], 10) : parseInt(event.pathParameters?.entityId || '0', 10);

    if (!entityId || isNaN(entityId)) {
      return createErrorResponse(400, 'Invalid entityId');
    }

    const limit = parseInt(event.queryStringParameters?.limit || '20', 10);
    const offset = parseInt(event.queryStringParameters?.offset || '0', 10);

    if (limit > 100) {
      return createErrorResponse(400, 'Limit cannot exceed 100');
    }

    const result = await getEntityPostsService(entityId, limit, offset);

    return createResponse(200, {
      posts: result.posts,
    });
  } catch (error: any) {
    console.error('Error getting entity posts:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

export async function toggleLikeComment(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const commentId = event.pathParameters?.commentId;

    if (!commentId) {
      return createErrorResponse(400, 'Missing commentId');
    }

    const result = await toggleLikeCommentService(userId, commentId);

    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to toggle like');
    }

    return createResponse(200, {
      success: true,
      data: { isLiked: result.isLiked },
    });
  } catch (error: any) {
    console.error('Error toggling comment like:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}

