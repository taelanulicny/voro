import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Post, Comment, Group, Activity, User } from '../types';
import { useAuth } from './AuthContext';
import { authenticatedRequest, isBackendConfigured } from '../config/api';

interface SocialContextType {
  // Posts state
  activityFeed: Post[];
  isLoadingFeed: boolean;

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

  // Fetch activity feed from backend
  const refreshActivityFeed = useCallback(async () => {
    if (!token || !isAuthenticated || !isBackendConfigured()) return;

    try {
      setIsLoadingFeed(true);
      const response = await authenticatedRequest<{
        posts: Post[];
        lastEvaluatedKey?: string;
      }>('/api/social/feed', token, {
        method: 'GET',
      });

      if (response.success && response.data) {
        // Map backend post format to frontend format
        const mappedPosts: Post[] = response.data.posts.map((p: any) => ({
          id: p.postId || p.id,
          userId: p.userId,
          username: p.username,
          displayName: p.displayName,
          avatarUrl: p.avatarUrl,
          content: p.content,
          entityId: p.entityId,
          entityTicker: p.entityTicker,
          entityName: p.entityName,
          sentiment: p.sentiment,
          likes: p.likes || 0,
          comments: p.comments || 0,
          isLiked: p.isLiked || false,
          isBookmarked: p.isBookmarked || false,
          timestamp: p.timestamp,
        }));
        setActivityFeed(mappedPosts);
      }
    } catch (error) {
      // Silently handle errors - don't crash the app
      console.debug('Error fetching feed (backend may not be running):', error);
    } finally {
      setIsLoadingFeed(false);
    }
  }, [token, isAuthenticated]);

  // Load feed on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated && token) {
      refreshActivityFeed().catch(err => console.error('Error refreshing feed:', err));
    }
  }, [isAuthenticated, token, refreshActivityFeed]);

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
      const response = await authenticatedRequest<Post>('/api/social/posts', token, {
        method: 'POST',
        body: JSON.stringify(params),
      });

      if (response.success && response.data) {
        const newPost: Post = {
          id: response.data.postId || response.data.id,
          userId: response.data.userId,
          username: response.data.username,
          displayName: response.data.displayName,
          avatarUrl: response.data.avatarUrl,
          content: response.data.content,
          entityId: response.data.entityId,
          entityTicker: response.data.entityTicker,
          entityName: response.data.entityName,
          sentiment: response.data.sentiment,
          likes: response.data.likes || 0,
          comments: response.data.comments || 0,
          isLiked: false,
          isBookmarked: false,
          timestamp: response.data.timestamp,
        };
        
        setActivityFeed(prev => [newPost, ...prev]);
        return { success: true, post: newPost };
      }

      return { success: false, error: response.error || 'Failed to create post' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create post' };
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
    // TODO: Implement bookmark functionality in backend
    setActivityFeed(prev =>
      prev.map(post =>
        post.id === postId ? { ...post, isBookmarked: !post.isBookmarked } : post
      )
    );
    return { success: true };
  }, []);

  const deletePost = useCallback(async (postId: string) => {
    // TODO: Implement delete post in backend
    setActivityFeed(prev => prev.filter(post => post.id !== postId));
    return { success: true };
  }, []);

  const getComments = useCallback(async (postId: string) => {
    if (!token) return;

    try {
      const response = await authenticatedRequest<Comment[]>(
        `/api/social/posts/${postId}/comments`,
        token,
        {
          method: 'GET',
        }
      );

      if (response.success && response.data) {
        const mappedComments: Comment[] = response.data.map((c: any) => ({
          id: c.commentId || c.id,
          postId: c.postId,
          userId: c.userId,
          username: c.username,
          displayName: c.displayName,
          avatarUrl: c.avatarUrl,
          content: c.content,
          likes: c.likes || 0,
          isLiked: c.isLiked || false,
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
      const response = await authenticatedRequest<Comment>(
        `/api/social/posts/${postId}/comments`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({ content }),
        }
      );

      if (response.success && response.data) {
        const newComment: Comment = {
          id: response.data.commentId || response.data.id,
          postId: response.data.postId,
          userId: response.data.userId,
          username: response.data.username,
          displayName: response.data.displayName,
          avatarUrl: response.data.avatarUrl,
          content: response.data.content,
          likes: response.data.likes || 0,
          isLiked: false,
          timestamp: response.data.timestamp,
        };

        setPostComments(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), newComment],
        }));

        setActivityFeed(prev =>
          prev.map(post => (post.id === postId ? { ...post, comments: post.comments + 1 } : post))
        );

        return { success: true, comment: newComment };
      }

      return { success: false };
    } catch (error) {
      return { success: false };
    }
  }, [token, user]);

  const toggleLikeComment = useCallback(async (postId: string, commentId: string) => {
    // TODO: Implement like comment in backend
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
  }, []);

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

  const refreshGroups = useCallback(async () => {
    setIsLoadingGroups(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setGroups(MOCK_GROUPS);
    setIsLoadingGroups(false);
  }, []);

  const createGroup = useCallback(async (params: {
    name: string;
    description: string;
    category: string;
    isPrivate: boolean;
  }) => {
    // TODO: Implement groups in backend
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
  }, []);

  const joinGroup = useCallback(async (groupId: string) => {
    // TODO: Implement groups in backend
    setGroups(prev =>
      prev.map(group =>
        group.id === groupId
          ? { ...group, isMember: true, memberCount: group.memberCount + 1 }
          : group
      )
    );
    return { success: true };
  }, []);

  const leaveGroup = useCallback(async (groupId: string) => {
    // TODO: Implement groups in backend
    setGroups(prev =>
      prev.map(group =>
        group.id === groupId
          ? { ...group, isMember: false, memberCount: Math.max(0, group.memberCount - 1) }
          : group
      )
    );
    return { success: true };
  }, []);

  const value: SocialContextType = {
    activityFeed,
    isLoadingFeed,
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
