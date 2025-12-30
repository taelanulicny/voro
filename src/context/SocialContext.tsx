import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Post, Comment, Group, Activity, User } from '../types';
import { useAuth } from './AuthContext';
import { authenticatedRequest, isBackendConfigured } from '../config/api';
import {
  PostSchema,
  CommentSchema,
  validateArrayLoose,
  safeValidate,
  FeedResponseSchema,
  GroupsResponseSchema,
  GroupResponseSchema,
  ValidatedGroup,
} from '../validators';

interface SocialContextType {
  // Posts state
  activityFeed: Post[];
  isLoadingFeed: boolean;

  // Pagination state
  hasMorePosts: boolean;
  isLoadingMore: boolean;

  // Comments state
  postComments: Record<string, Comment[]>;

  // Groups state
  groups: Group[];
  isLoadingGroups: boolean;

  // Follow state
  followedUsers: Set<string>;
  followers: User[];
  following: User[];

  // Post actions
  createPost: (params: {
    content: string;
    entityId?: number;
    entityTicker?: string;
    entityName?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
  }) => Promise<{ success: boolean; error?: string; post?: Post }>;
  toggleLikePost: (postId: string) => Promise<{ success: boolean }>;
  toggleBookmarkPost: (postId: string) => Promise<{ success: boolean }>;
  deletePost: (postId: string) => Promise<{ success: boolean }>;

  // Feed actions
  refreshActivityFeed: () => Promise<void>;
  loadMorePosts: () => Promise<void>;

  // Comment actions
  getComments: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<{ success: boolean; comment?: Comment }>;
  toggleLikeComment: (postId: string, commentId: string) => Promise<{ success: boolean }>;

  // Follow actions
  toggleFollowUser: (userId: string) => Promise<{ success: boolean }>;
  isFollowingUser: (userId: string) => boolean;

  // Group actions
  refreshGroups: () => Promise<void>;
  createGroup: (params: { name: string; description: string; category: string; isPrivate: boolean }) => Promise<{ success: boolean; group?: Group }>;
  joinGroup: (groupId: string) => Promise<{ success: boolean }>;
  leaveGroup: (groupId: string) => Promise<{ success: boolean }>;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

// Mock groups (not yet implemented in backend)
const MOCK_GROUPS: Group[] = [
  {
    id: '1',
    name: 'Tech Stock Bulls',
    description: 'Discussion group for technology stock investors',
    category: 'Technology',
    memberCount: 1234,
    isPrivate: false,
    isMember: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
  {
    id: '2',
    name: 'Crypto Enthusiasts',
    description: 'All things cryptocurrency and blockchain',
    category: 'Cryptocurrency',
    memberCount: 3421,
    isPrivate: false,
    isMember: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
  },
];

export function SocialProvider({ children }: { children: ReactNode }) {
  const { user, token, isAuthenticated } = useAuth();
  const [activityFeed, setActivityFeed] = useState<Post[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [postComments, setPostComments] = useState<Record<string, Comment[]>>({});
  const [groups, setGroups] = useState<Group[]>(MOCK_GROUPS);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);

  // Pagination state
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);


  // Helper to map validated post format to frontend format
  const mapValidatedPost = (p: ReturnType<typeof PostSchema.parse>): Post => ({
    id: p.id,
    userId: p.userId,
    username: p.username,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl || undefined,
    content: p.content,
    entityId: p.entityId || undefined,
    entityTicker: p.entityTicker || undefined,
    entityName: p.entityName || undefined,
    sentiment: p.sentiment || undefined,
    images: p.images,
    likes: p.likes,
    comments: p.comments,
    isLiked: p.isLiked,
    isBookmarked: p.isBookmarked,
    timestamp: p.timestamp,
  });

  // Fetch activity feed from backend (resets pagination)
  const refreshActivityFeed = useCallback(async (signal?: AbortSignal) => {
    if (!token || !isAuthenticated) {
      // No posts if not authenticated
      setActivityFeed([]);
      setHasMorePosts(false);
      setLastKey(null);
      return;
    }

    if (!isBackendConfigured()) {
      // No posts if backend not configured
      setActivityFeed([]);
      setHasMorePosts(false);
      setLastKey(null);
      return;
    }

    try {
      setIsLoadingFeed(true);
      const response = await authenticatedRequest<{
        posts?: unknown[];
        lastEvaluatedKey?: string;
      }>('/api/social/feed?limit=20', token, {
        method: 'GET',
        signal,
      });

      if (response.success && response.data) {
        // Validate feed response
        const validatedResponse = safeValidate(FeedResponseSchema, response.data);
        if (validatedResponse && validatedResponse.posts.length > 0) {
          const mappedPosts = validatedResponse.posts.map(mapValidatedPost);
          setActivityFeed(mappedPosts);
          setLastKey(validatedResponse.lastEvaluatedKey || null);
          setHasMorePosts(!!validatedResponse.lastEvaluatedKey);
        } else {
          console.warn('All posts failed validation');
          setActivityFeed([]);
          setHasMorePosts(false);
          setLastKey(null);
        }
      } else {
        // Backend returned empty (no posts yet)
        setActivityFeed([]);
        setHasMorePosts(false);
        setLastKey(null);
      }
    } catch (error) {
      // Empty feed on error
      console.debug('Error fetching feed (backend may not be running):', error);
      setActivityFeed([]);
      setHasMorePosts(false);
      setLastKey(null);
    } finally {
      setIsLoadingFeed(false);
    }
  }, [token, isAuthenticated]);

  // Load more posts (pagination)
  const loadMorePosts = useCallback(async (signal?: AbortSignal) => {
    // Don't load more if already loading, no more posts, or no lastKey
    if (isLoadingMore || !hasMorePosts || !lastKey || !token || !isAuthenticated) {
      return;
    }

    if (!isBackendConfigured()) {
      return;
    }

    try {
      setIsLoadingMore(true);
      const response = await authenticatedRequest<{
        posts?: unknown[];
        lastEvaluatedKey?: string;
      }>(`/api/social/feed?limit=20&lastKey=${encodeURIComponent(lastKey)}`, token, {
        method: 'GET',
        signal,
      });

      if (response.success && response.data) {
        // Validate feed response
        const validatedResponse = safeValidate(FeedResponseSchema, response.data);
        if (validatedResponse && validatedResponse.posts.length > 0) {
          const mappedPosts = validatedResponse.posts.map(mapValidatedPost);
          setActivityFeed(prev => [...prev, ...mappedPosts]);
          setLastKey(validatedResponse.lastEvaluatedKey || null);
          setHasMorePosts(!!validatedResponse.lastEvaluatedKey);
        } else {
          setHasMorePosts(false);
          setLastKey(null);
        }
      } else {
        setHasMorePosts(false);
        setLastKey(null);
      }
    } catch (error) {
      console.debug('Error loading more posts:', error);
      // Don't clear hasMorePosts on error - user can retry
    } finally {
      setIsLoadingMore(false);
    }
  }, [token, isAuthenticated, lastKey, hasMorePosts, isLoadingMore]);

  // Load feed on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated && token) {
      refreshActivityFeed().catch(err => console.error('Error refreshing feed:', err));
      refreshGroups().catch(err => console.error('Error refreshing groups:', err));
    }
  }, [isAuthenticated, token, refreshActivityFeed, refreshGroups]);

  const createPost = useCallback(async (params: {
    content: string;
    entityId?: number;
    entityTicker?: string;
    entityName?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
  }) => {
    if (!token || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!isBackendConfigured()) {
      return { success: false, error: 'Backend not configured. Please set EXPO_PUBLIC_API_URL.' };
    }

    try {
      // Backend returns post
      const response = await authenticatedRequest<{ post?: unknown }>('/api/social/posts', token, {
        method: 'POST',
        body: JSON.stringify(params),
      });

      if (response.success && response.data) {
        // Validate post response
        const postData = (response.data as { post?: unknown }).post || response.data;
        const validatedPost = safeValidate(PostSchema, postData);
        if (validatedPost) {
          const newPost = mapValidatedPost(validatedPost);
          setActivityFeed(prev => [newPost, ...prev]);
          return { success: true, post: newPost };
        } else {
          console.warn('Invalid post response format');
          return { success: false, error: 'Invalid response format' };
        }
      }

      return { success: false, error: response.error || 'Failed to create post' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create post';
      return { success: false, error: errorMessage };
    }
  }, [token, user]);

  const toggleLikePost = useCallback(async (postId: string) => {
    if (!token) {
      return { success: false };
    }

    try {
      const response = await authenticatedRequest<{ isLiked: boolean }>(
        `/api/social/posts/${postId}/like`,
        token,
        {
          method: 'POST',
        }
      );

      if (response.success && response.data) {
        setActivityFeed(prev =>
          prev.map(post =>
            post.id === postId
              ? {
                ...post,
                isLiked: response.data!.isLiked,
                likes: response.data!.isLiked ? post.likes + 1 : post.likes - 1,
              }
              : post
          )
        );
        return { success: true };
      }

      return { success: false };
    } catch (error) {
      return { success: false };
    }
  }, [token]);

  const toggleBookmarkPost = useCallback(async (postId: string) => {
    if (!token) {
      return { success: false };
    }

    try {
      const response = await authenticatedRequest<{ isBookmarked: boolean }>(
        `/api/social/posts/${postId}/bookmark`,
        token,
        {
          method: 'POST',
        }
      );

      if (response.success && response.data) {
        setActivityFeed(prev =>
          prev.map(post =>
            post.id === postId
              ? { ...post, isBookmarked: response.data!.isBookmarked }
              : post
          )
        );
        return { success: true };
      }

      // Fallback to local toggle if backend fails
      setActivityFeed(prev =>
        prev.map(post =>
          post.id === postId ? { ...post, isBookmarked: !post.isBookmarked } : post
        )
      );
      return { success: true };
    } catch (error) {
      // Fallback to local toggle on error
      setActivityFeed(prev =>
        prev.map(post =>
          post.id === postId ? { ...post, isBookmarked: !post.isBookmarked } : post
        )
      );
      return { success: true };
    }
  }, [token]);

  const deletePost = useCallback(async (postId: string) => {
    if (!token) {
      return { success: false };
    }

    try {
      const response = await authenticatedRequest<void>(
        `/api/social/posts/${postId}`,
        token,
        {
          method: 'DELETE',
        }
      );

      if (response.success) {
        setActivityFeed(prev => prev.filter(post => post.id !== postId));
        return { success: true };
      }

      return { success: false };
    } catch (error) {
      console.error('Error deleting post:', error);
      return { success: false };
    }
  }, [token]);

  const getComments = useCallback(async (postId: string) => {
    if (!token) return;

    try {
      const response = await authenticatedRequest<unknown[]>(
        `/api/social/posts/${postId}/comments`,
        token,
        {
          method: 'GET',
        }
      );

      if (response.success && response.data) {
        // Validate comments - filter out invalid ones
        const validatedComments = validateArrayLoose(CommentSchema, response.data);

        const mappedComments: Comment[] = validatedComments.map((c) => ({
          id: c.id,
          postId: c.postId,
          userId: c.userId,
          username: c.username,
          displayName: c.displayName,
          avatarUrl: c.avatarUrl || undefined,
          content: c.content,
          likes: c.likes,
          isLiked: c.isLiked,
          timestamp: c.timestamp,
        }));

        setPostComments(prev => ({ ...prev, [postId]: mappedComments }));
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  }, [token]);

  const addComment = useCallback(async (postId: string, content: string) => {
    if (!token || !user) {
      return { success: false };
    }

    try {
      // Backend returns comment
      const response = await authenticatedRequest<{ comment?: unknown }>(
        `/api/social/posts/${postId}/comments`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({ content }),
        }
      );

      if (response.success && response.data) {
        // Validate comment response
        const commentData = (response.data as { comment?: unknown }).comment || response.data;
        const validatedComment = safeValidate(CommentSchema, commentData);
        if (validatedComment) {
          const newComment: Comment = {
            id: validatedComment.id,
            postId: validatedComment.postId,
            userId: validatedComment.userId,
            username: validatedComment.username,
            displayName: validatedComment.displayName,
            avatarUrl: validatedComment.avatarUrl || undefined,
            content: validatedComment.content,
            likes: validatedComment.likes,
            isLiked: validatedComment.isLiked,
            timestamp: validatedComment.timestamp,
          };

          setPostComments(prev => ({
            ...prev,
            [postId]: [...(prev[postId] || []), newComment],
          }));

          setActivityFeed(prev =>
            prev.map(post => (post.id === postId ? { ...post, comments: post.comments + 1 } : post))
          );

          return { success: true, comment: newComment };
        } else {
          console.warn('Invalid comment response format');
          return { success: false };
        }
      }

      return { success: false };
    } catch (error) {
      return { success: false };
    }
  }, [token, user]);

  const toggleLikeComment = useCallback(async (postId: string, commentId: string) => {
    if (!token) {
      return { success: false };
    }

    try {
      const response = await authenticatedRequest<{ isLiked: boolean }>(
        `/api/social/comments/${commentId}/like`,
        token,
        {
          method: 'POST',
        }
      );

      if (response.success && response.data) {
        setPostComments(prev => ({
          ...prev,
          [postId]: (prev[postId] || []).map(comment =>
            comment.id === commentId
              ? {
                ...comment,
                isLiked: response.data!.isLiked,
                likes: response.data!.isLiked ? comment.likes + 1 : comment.likes - 1,
              }
              : comment
          ),
        }));
        return { success: true };
      }

      return { success: false };
    } catch (error) {
      // Fallback to local toggle on error
      setPostComments(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).map(comment =>
          comment.id === commentId
            ? {
              ...comment,
              isLiked: !comment.isLiked,
              likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
            }
            : comment
        ),
      }));
      return { success: true };
    }
  }, [token]);

  const toggleFollowUser = useCallback(async (userId: string) => {
    if (!token) {
      return { success: false };
    }

    try {
      const response = await authenticatedRequest<{ isFollowing: boolean }>(
        `/api/social/users/${userId}/follow`,
        token,
        {
          method: 'POST',
        }
      );

      if (response.success && response.data) {
        setFollowedUsers(prev => {
          const newSet = new Set(prev);
          if (response.data!.isFollowing) {
            newSet.add(userId);
          } else {
            newSet.delete(userId);
          }
          return newSet;
        });
        return { success: true };
      }

      return { success: false };
    } catch (error) {
      return { success: false };
    }
  }, [token]);

  const isFollowingUser = useCallback(
    (userId: string) => {
      return followedUsers.has(userId);
    },
    [followedUsers]
  );

  // Helper to map validated group to frontend Group type
  const mapValidatedGroup = (validatedGroup: ValidatedGroup): Group => ({
    id: validatedGroup.id,
    name: validatedGroup.name,
    description: validatedGroup.description,
    category: validatedGroup.category,
    memberCount: validatedGroup.memberCount,
    isPrivate: validatedGroup.isPrivate,
    isMember: validatedGroup.isMember,
    coverImage: validatedGroup.coverImage || undefined,
    createdAt: validatedGroup.createdAt,
  });

  const refreshGroups = useCallback(async (signal?: AbortSignal) => {
    setIsLoadingGroups(true);
    try {
      if (!isBackendConfigured() || !token || !isAuthenticated) {
        setGroups(MOCK_GROUPS);
        setIsLoadingGroups(false);
        return;
      }

      const response = await authenticatedRequest<{
        groups?: unknown[];
        lastEvaluatedKey?: string;
      }>('/api/groups?limit=50', token, {
        method: 'GET',
        signal,
      });

      if (response.success && response.data) {
        // Validate groups response
        const validatedResponse = safeValidate(GroupsResponseSchema, response.data);
        if (validatedResponse) {
          const mappedGroups = validatedResponse.groups.map(mapValidatedGroup);
          setGroups(mappedGroups);
        } else {
          console.warn('Invalid groups response format');
          setGroups([]);
        }
      } else {
        // Fallback to mock if backend fails
        setGroups(MOCK_GROUPS);
      }
    } catch (error) {
      console.error('Error refreshing groups:', error);
      setGroups(MOCK_GROUPS);
    } finally {
      setIsLoadingGroups(false);
    }
  }, [token, isAuthenticated]);

  const createGroup = useCallback(async (params: {
    name: string;
    description: string;
    category: string;
    isPrivate: boolean;
  }) => {
    if (!token || !isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      if (!isBackendConfigured()) {
        // Fallback to mock
        const newGroup: Group = {
          id: Date.now().toString(),
          name: params.name,
          description: params.description,
          category: params.category,
          memberCount: 1,
          isPrivate: params.isPrivate,
          isMember: true,
          createdAt: new Date().toISOString(),
        };
        setGroups(prev => [newGroup, ...prev]);
        return { success: true, group: newGroup };
      }

      const response = await authenticatedRequest<{ group: any }>(
        '/api/groups',
        token,
        {
          method: 'POST',
          body: JSON.stringify(params),
        }
      );

      if (response.success && response.data) {
        // Validate group response
        const validatedResponse = safeValidate(GroupResponseSchema, response.data);
        if (validatedResponse) {
          const mappedGroup = mapValidatedGroup({ ...validatedResponse.group, isMember: true });
          setGroups(prev => [mappedGroup, ...prev]);
          return { success: true, group: mappedGroup };
        } else {
          console.warn('Invalid group response format');
        }
      }

      return { success: false, error: 'Failed to create group' };
    } catch (error) {
      console.error('Error creating group:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create group';
      return { success: false, error: errorMessage };
    }
  }, [token, isAuthenticated]);

  const joinGroup = useCallback(async (groupId: string) => {
    if (!token || !isAuthenticated) {
      return { success: false };
    }

    try {
      if (!isBackendConfigured()) {
        // Fallback to mock
        setGroups(prev =>
          prev.map(group =>
            group.id === groupId
              ? { ...group, isMember: true, memberCount: group.memberCount + 1 }
              : group
          )
        );
        return { success: true };
      }

      const response = await authenticatedRequest<{ success: boolean }>(
        `/api/groups/${groupId}/join`,
        token,
        {
          method: 'POST',
        }
      );

      if (response.success) {
        setGroups(prev =>
          prev.map(group =>
            group.id === groupId
              ? { ...group, isMember: true, memberCount: group.memberCount + 1 }
              : group
          )
        );
        return { success: true };
      }

      return { success: false };
    } catch (error) {
      console.error('Error joining group:', error);
      return { success: false };
    }
  }, [token, isAuthenticated]);

  const leaveGroup = useCallback(async (groupId: string) => {
    if (!token || !isAuthenticated) {
      return { success: false };
    }

    try {
      if (!isBackendConfigured()) {
        // Fallback to mock
        setGroups(prev =>
          prev.map(group =>
            group.id === groupId
              ? { ...group, isMember: false, memberCount: Math.max(0, group.memberCount - 1) }
              : group
          )
        );
        return { success: true };
      }

      const response = await authenticatedRequest<{ success: boolean }>(
        `/api/groups/${groupId}/leave`,
        token,
        {
          method: 'POST',
        }
      );

      if (response.success) {
        setGroups(prev =>
          prev.map(group =>
            group.id === groupId
              ? { ...group, isMember: false, memberCount: Math.max(0, group.memberCount - 1) }
              : group
          )
        );
        return { success: true };
      }

      return { success: false };
    } catch (error) {
      console.error('Error leaving group:', error);
      return { success: false };
    }
  }, [token, isAuthenticated]);

  const value: SocialContextType = {
    activityFeed,
    isLoadingFeed,
    hasMorePosts,
    isLoadingMore,
    postComments,
    groups,
    isLoadingGroups,
    followedUsers,
    followers,
    following,
    createPost,
    toggleLikePost,
    toggleBookmarkPost,
    deletePost,
    refreshActivityFeed,
    loadMorePosts,
    getComments,
    addComment,
    toggleLikeComment,
    toggleFollowUser,
    isFollowingUser,
    refreshGroups,
    createGroup,
    joinGroup,
    leaveGroup,
  };

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const context = useContext(SocialContext);
  if (context === undefined) {
    throw new Error('useSocial must be used within a SocialProvider');
  }
  return context;
}
