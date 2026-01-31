import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Post, Comment, Group, Activity, User } from '../types';
import { useAuth } from './AuthContext';
import { authenticatedRequest, isBackendConfigured } from '../config/api';

interface SocialContextType {
  // Posts state
  activityFeed: Post[];
  isLoadingFeed: boolean;
  hasMorePosts: boolean;
  loadMorePosts: () => Promise<void>;

  // Comments state
  postComments: Record<string, Comment[]>;
  
  // Groups state
  groups: Group[];
  isLoadingGroups: boolean;
  myGroups: Group[];
  isLoadingMyGroups: boolean;
  refreshUserGroups: () => Promise<void>;

  // Follow state
  followedUsers: Set<string>;
  followers: User[];
  following: User[];

  // Post actions
  createPost: (params: {
    content: string;
    entityId?: number;
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
  checkMutualFollow: (userId: string) => Promise<{ isMutual: boolean; userFollowsOther: boolean; otherFollowsUser: boolean }>;

  // Group actions
  refreshGroups: () => Promise<void>;
  createGroup: (params: { name: string; description: string; category: string; isPrivate: boolean; location?: string; password?: string; coverImage?: string }) => Promise<{ success: boolean; group?: Group; error?: string }>;
  joinGroup: (groupId: string) => Promise<{ success: boolean }>;
  leaveGroup: (groupId: string) => Promise<{ success: boolean }>;
  deleteGroup: (groupId: string) => Promise<{ success: boolean }>;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

export function SocialProvider({ children }: { children: ReactNode }) {
  const { user, token, isAuthenticated } = useAuth();
  const [activityFeed, setActivityFeed] = useState<Post[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [feedCursor, setFeedCursor] = useState<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [postComments, setPostComments] = useState<Record<string, Comment[]>>({});
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingMyGroups, setIsLoadingMyGroups] = useState(false);
  
  // Derive myGroups from groups where isMember is true
  const myGroups = groups.filter(group => group.isMember === true);
  
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);

  // No mock posts - posts come from backend or user-created content only
  const MOCK_POSTS: Post[] = [];

  // AsyncStorage keys for social data persistence
  const SOCIAL_STORAGE_KEYS = {
    ACTIVITY_FEED: '@social:activityFeed',
    POST_COMMENTS: '@social:postComments',
  };

  // Load persisted social data on mount
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        // Load activity feed
        const feedData = await AsyncStorage.getItem(SOCIAL_STORAGE_KEYS.ACTIVITY_FEED);
        if (feedData) {
          setActivityFeed(JSON.parse(feedData));
        }

        // Load post comments
        const commentsData = await AsyncStorage.getItem(SOCIAL_STORAGE_KEYS.POST_COMMENTS);
        if (commentsData) {
          setPostComments(JSON.parse(commentsData));
        }
      } catch (error) {
        console.error('Error loading persisted social data:', error);
      }
    };

    loadPersistedData();
  }, []);

  // Save activity feed whenever it changes
  useEffect(() => {
    const saveFeed = async () => {
      try {
        // Only save last 50 posts to avoid storage bloat
        const toSave = activityFeed.slice(0, 50);
        await AsyncStorage.setItem(SOCIAL_STORAGE_KEYS.ACTIVITY_FEED, JSON.stringify(toSave));
      } catch (error) {
        console.error('Error saving activity feed:', error);
      }
    };

    if (activityFeed.length > 0) {
      saveFeed();
    }
  }, [activityFeed]);

  // Save post comments whenever they change
  useEffect(() => {
    const saveComments = async () => {
      try {
        await AsyncStorage.setItem(SOCIAL_STORAGE_KEYS.POST_COMMENTS, JSON.stringify(postComments));
      } catch (error) {
        console.error('Error saving post comments:', error);
      }
    };

    if (Object.keys(postComments).length > 0) {
      saveComments();
    }
  }, [postComments]);

  // Fetch activity feed from backend
  const refreshActivityFeed = useCallback(async (loadMore = false) => {
    if (!token || !isAuthenticated) {
      // Use mock posts if not authenticated or backend not configured
      setActivityFeed(MOCK_POSTS);
      return;
    }

    if (!isBackendConfigured()) {
      // Use mock posts as fallback when backend not configured
      setActivityFeed(MOCK_POSTS);
      return;
    }

    try {
      setIsLoadingFeed(true);

      // Build URL with pagination params
      let url = '/api/social/feed?limit=20';
      if (feedCursor && loadMore) {
        url += `&lastKey=${encodeURIComponent(feedCursor)}`;
      }

      const response = await authenticatedRequest<{
        posts: Post[];
        lastEvaluatedKey?: string;
      }>(url, token, {
        method: 'GET',
      });

      if (response.success && response.data) {
        // Map backend post format to frontend format
        const mappedPosts: Post[] = (response.data.posts || []).map((p: any) => ({
          id: p.postId || p.id,
          userId: p.userId,
          username: p.username,
          displayName: p.displayName,
          avatarUrl: p.avatarUrl,
          content: p.content,
          entityId: p.entityId,
          entityName: p.entityName,
          sentiment: p.sentiment,
          likes: p.likes || 0,
          comments: p.comments || 0,
          isLiked: p.isLiked || false,
          isBookmarked: p.isBookmarked || false,
          timestamp: p.timestamp,
        }));

        if (loadMore) {
          // Append to existing feed
          setActivityFeed(prev => [...prev, ...mappedPosts]);
        } else {
          // Replace feed
          setActivityFeed(mappedPosts);
        }

        // Update pagination state
        setFeedCursor(response.data.lastEvaluatedKey || null);
        setHasMorePosts(!!response.data.lastEvaluatedKey);
      } else if (!loadMore) {
        // Only use mock posts if this is initial load
        setActivityFeed(MOCK_POSTS);
        setHasMorePosts(false);
      }
    } catch (error) {
      // Use mock posts as fallback on error (initial load only)
      if (!loadMore) {
        console.debug('Error fetching feed (backend may not be running):', error);
        setActivityFeed(MOCK_POSTS);
        setHasMorePosts(false);
      }
    } finally {
      setIsLoadingFeed(false);
    }
  }, [token, isAuthenticated, feedCursor, loadMore]);

  // Load feed on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated && token) {
      refreshActivityFeed().catch(err => console.error('Error refreshing feed:', err));
    }
  }, [isAuthenticated, token, refreshActivityFeed]);

  // Load groups on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated && token) {
      refreshGroups().catch(err => console.error('Error refreshing groups:', err));
    }
  }, [isAuthenticated, token, refreshGroups]);

  const createPost = useCallback(async (params: {
    content: string;
    entityId?: number;
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
      const responseData = response.data as any; // Backend may return postId instead of id
      const newPost: Post = {
          id: responseData.postId || responseData.id,
          userId: responseData.userId,
          username: responseData.username,
          displayName: responseData.displayName,
          avatarUrl: responseData.avatarUrl,
          content: responseData.content,
          entityId: responseData.entityId,
          entityName: responseData.entityName,
          sentiment: responseData.sentiment,
          likes: responseData.likes || 0,
          comments: responseData.comments || 0,
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
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    // Optimistically update UI
    setActivityFeed(prev =>
      prev.map(post =>
        post.id === postId ? { ...post, isBookmarked: !post.isBookmarked } : post
      )
    );

    try {
      const response = await authenticatedRequest(`/api/social/posts/${postId}/bookmark`, token, {
        method: 'POST',
      });

      if (response.success) {
        // Update with actual state from server
        const isBookmarked = response.data?.isBookmarked ?? !activityFeed.find(p => p.id === postId)?.isBookmarked;
        setActivityFeed(prev =>
          prev.map(post =>
            post.id === postId ? { ...post, isBookmarked } : post
          )
        );
        return { success: true };
      }

      // Rollback on failure
      setActivityFeed(prev =>
        prev.map(post =>
          post.id === postId ? { ...post, isBookmarked: !post.isBookmarked } : post
        )
      );
      return { success: false, error: response.error || 'Failed to bookmark post' };
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      // Rollback on error
      setActivityFeed(prev =>
        prev.map(post =>
          post.id === postId ? { ...post, isBookmarked: !post.isBookmarked } : post
        )
      );
      return { success: false, error: 'Failed to bookmark post' };
    }
  }, [token, activityFeed]);

  const deletePost = useCallback(async (postId: string) => {
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    // Save the post for rollback
    const deletedPost = activityFeed.find(p => p.id === postId);

    // Optimistically remove from UI
    setActivityFeed(prev => prev.filter(post => post.id !== postId));

    try {
      const response = await authenticatedRequest(`/api/social/posts/${postId}`, token, {
        method: 'DELETE',
      });

      if (response.success) {
        return { success: true };
      }

      // Rollback on failure
      if (deletedPost) {
        setActivityFeed(prev => [deletedPost, ...prev]);
      }
      return { success: false, error: response.error || 'Failed to delete post' };
    } catch (error) {
      console.error('Error deleting post:', error);
      // Rollback on error
      if (deletedPost) {
        setActivityFeed(prev => [deletedPost, ...prev]);
      }
      return { success: false, error: 'Failed to delete post' };
    }
  }, [token, activityFeed]);

  const getComments = useCallback(async (postId: string | null) => {
    if (!postId || !token) {
      return;
    }
    // TypeScript: postId and token are guaranteed to be string after null checks
    const validPostId: string = postId;
    const validToken: string = token;
    // Mock comments with replies for specific posts to demonstrate the feature
    const mockCommentsWithReplies: Record<string, Comment[]> = {
      'inf-1': [
        {
          id: 'comment-1',
          postId: 'inf-1',
          userId: 'user-comment-1',
          username: 'trader_joe',
          displayName: 'Trader Joe',
          avatarUrl: undefined,
          content: 'This is huge! Alix has been on fire lately.',
          likes: 12,
          isLiked: false,
          timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
          replies: [
            {
              id: 'reply-1-1',
              postId: 'inf-1',
              userId: 'user-reply-1',
              username: 'market_analyst',
              displayName: 'Market Analyst',
              avatarUrl: undefined,
              content: 'Agreed! Her engagement rates are through the roof.',
              likes: 5,
              isLiked: false,
              timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            },
            {
              id: 'reply-1-2',
              postId: 'inf-1',
              userId: 'user-reply-2',
              username: 'social_trader',
              displayName: 'Social Trader',
              avatarUrl: undefined,
              content: 'I\'ve been watching her metrics closely. This deal makes sense.',
              likes: 3,
              isLiked: false,
              timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
            },
          ],
        },
        {
          id: 'comment-2',
          postId: 'inf-1',
          userId: 'user-comment-2',
          username: 'influencer_watcher',
          displayName: 'Influencer Watcher',
          avatarUrl: undefined,
          content: 'Skincare brands are investing heavily in creators right now.',
          likes: 8,
          isLiked: false,
          timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
        },
      ],
      'inf-1b': [
        {
          id: 'comment-3',
          postId: 'inf-1b',
          userId: 'user-comment-3',
          username: 'content_creator',
          displayName: 'Content Creator',
          avatarUrl: undefined,
          content: 'TikTok is definitely where the money is moving.',
          likes: 15,
          isLiked: false,
          timestamp: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
          replies: [
            {
              id: 'reply-3-1',
              postId: 'inf-1b',
              userId: 'user-reply-3',
              username: 'brand_manager',
              displayName: 'Brand Manager',
              avatarUrl: undefined,
              content: 'The ROI on TikTok creators is unmatched compared to other platforms.',
              likes: 7,
              isLiked: false,
              timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
            },
          ],
        },
      ],
      '1': [
        {
          id: 'comment-4',
          postId: '1',
          userId: 'user-comment-4',
          username: 'swiftie_trader',
          displayName: 'Swiftie Trader',
          avatarUrl: undefined,
          content: 'Taylor\'s tour is going to break records!',
          likes: 45,
          isLiked: false,
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
          replies: [
            {
              id: 'reply-4-1',
              postId: '1',
              userId: 'user-reply-4',
              username: 'music_analyst',
              displayName: 'Music Analyst',
              avatarUrl: undefined,
              content: 'The demand is absolutely insane. Ticket prices are already skyrocketing.',
              likes: 23,
              isLiked: false,
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
            },
          ],
        },
      ],
      'people-example-tom-brady': [
        {
          id: 'comment-tb-1',
          postId: 'people-example-tom-brady',
          userId: 'user-comment-tb-1',
          username: 'nfl_legend',
          displayName: 'NFL Legend',
          avatarUrl: undefined,
          content: 'Couldn\'t agree more! 7 Super Bowls speaks for itself.',
          likes: 8,
          isLiked: false,
          timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(), // 20 minutes ago
        },
        {
          id: 'comment-tb-2',
          postId: 'people-example-tom-brady',
          userId: 'user-comment-tb-2',
          username: 'football_fan',
          displayName: 'Football Fan',
          avatarUrl: undefined,
          content: 'The longevity alone puts him in a class of his own.',
          likes: 4,
          isLiked: false,
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
        },
        {
          id: 'comment-tb-3',
          postId: 'people-example-tom-brady',
          userId: 'user-comment-tb-3',
          username: 'sports_analyst',
          displayName: 'Sports Analyst',
          avatarUrl: undefined,
          content: 'No quarterback has ever dominated like Brady did. Period.',
          likes: 12,
          isLiked: false,
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago - most recent
        },
      ],
    };

    // Return mock comments if available, otherwise try API
    if (mockCommentsWithReplies[validPostId]) {
      setPostComments(prev => ({ ...prev, [validPostId]: mockCommentsWithReplies[validPostId] }));
      return;
    }

    try {
      const response = await authenticatedRequest<Comment[]>(
        `/api/social/posts/${validPostId}/comments`,
        validToken,
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
          replies: c.replies || [],
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
      const responseData = response.data as any; // Backend may return commentId instead of id
      const newComment: Comment = {
          id: responseData.commentId || responseData.id,
          postId: responseData.postId,
          userId: responseData.userId,
          username: responseData.username,
          displayName: responseData.displayName,
          avatarUrl: responseData.avatarUrl,
          content: responseData.content,
          likes: responseData.likes || 0,
      isLiked: false,
          timestamp: responseData.timestamp,
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
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    // Optimistically update UI
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

    try {
      const response = await authenticatedRequest(`/api/social/comments/${commentId}/like`, token, {
        method: 'POST',
      });

      if (response.success) {
        // Update with actual state from server if provided
        const isLiked = response.data?.isLiked;
        if (isLiked !== undefined) {
          setPostComments(prev => ({
            ...prev,
            [postId]: (prev[postId] || []).map(comment => {
              if (comment.id === commentId) {
                const currentLikes = comment.likes;
                const wasLiked = !isLiked; // Previous state was opposite
                return {
                  ...comment,
                  isLiked,
                  likes: isLiked ? currentLikes : currentLikes,
                };
              }
              return comment;
            }),
          }));
        }
        return { success: true };
      }

      // Rollback on failure
      setPostComments(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).map(comment =>
          comment.id === commentId
            ? {
                ...comment,
                isLiked: !comment.isLiked,
                likes: comment.isLiked ? comment.likes + 1 : comment.likes - 1,
              }
            : comment
        ),
      }));
      return { success: false, error: response.error || 'Failed to like comment' };
    } catch (error) {
      console.error('Error toggling comment like:', error);
      // Rollback on error
      setPostComments(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).map(comment =>
          comment.id === commentId
            ? {
                ...comment,
                isLiked: !comment.isLiked,
                likes: comment.isLiked ? comment.likes + 1 : comment.likes - 1,
              }
            : comment
        ),
      }));
      return { success: false, error: 'Failed to like comment' };
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

  const checkMutualFollow = useCallback(async (userId: string) => {
    if (!token || !isBackendConfigured()) {
      // Mock implementation - check if we follow them and if they follow us
      const userFollowsOther = followedUsers.has(userId);
      // In mock mode, we can't know if they follow us, so return false
      return {
        isMutual: false,
        userFollowsOther,
        otherFollowsUser: false,
      };
    }

    try {
      const response = await authenticatedRequest<{
        isMutual: boolean;
        userFollowsOther: boolean;
        otherFollowsUser: boolean;
      }>(
        `/api/social/users/${userId}/mutual-follow`,
        token,
        {
          method: 'GET',
        }
      );

      if (response.success && response.data) {
        return response.data;
      }

      // Fallback to mock
      const userFollowsOther = followedUsers.has(userId);
      return {
        isMutual: false,
        userFollowsOther,
        otherFollowsUser: false,
      };
    } catch (error) {
      console.error('Error checking mutual follow:', error);
      // Fallback to mock
      const userFollowsOther = followedUsers.has(userId);
      return {
        isMutual: false,
        userFollowsOther,
        otherFollowsUser: false,
      };
    }
  }, [token, followedUsers]);

  const refreshGroups = useCallback(async () => {
    if (!token) return;

    setIsLoadingGroups(true);
    try {
      const response = await authenticatedRequest('/api/groups', token, {
        method: 'GET',
      });

      if (response.success && response.data?.groups) {
        setGroups(response.data.groups);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setIsLoadingGroups(false);
    }
  }, [token]);

  const refreshUserGroups = useCallback(async () => {
    setIsLoadingMyGroups(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    // myGroups is derived from groups, so no separate fetch needed
    setIsLoadingMyGroups(false);
  }, []);

  const createGroup = useCallback(async (params: {
    name: string;
    description: string;
    category: string;
    isPrivate: boolean;
    location?: string;
    password?: string;
    coverImage?: string;
  }) => {
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await authenticatedRequest('/api/groups', token, {
        method: 'POST',
        body: JSON.stringify(params),
      });

      if (response.success && response.data?.group) {
        setGroups(prev => [response.data.group, ...prev]);
        return { success: true, group: response.data.group };
      }

      return { success: false, error: response.error || 'Failed to create group' };
    } catch (error) {
      console.error('Error creating group:', error);
      return { success: false, error: 'Failed to create group' };
    }
  }, [token]);

  const joinGroup = useCallback(async (groupId: string, password?: string) => {
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await authenticatedRequest(`/api/groups/${groupId}/join`, token, {
        method: 'POST',
        body: password ? JSON.stringify({ password }) : undefined,
      });

      if (response.success) {
        // Optimistically update local state
        setGroups(prev =>
          prev.map(group =>
            group.id === groupId
              ? { ...group, isMember: true, memberCount: group.memberCount + 1 }
              : group
          )
        );
        return { success: true };
      }

      return { success: false, error: response.error || 'Failed to join group' };
    } catch (error) {
      console.error('Error joining group:', error);
      return { success: false, error: 'Failed to join group' };
    }
  }, [token]);

  const leaveGroup = useCallback(async (groupId: string) => {
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await authenticatedRequest(`/api/groups/${groupId}/leave`, token, {
        method: 'POST',
      });

      if (response.success) {
        // Optimistically update local state
        setGroups(prev =>
          prev.map(group =>
            group.id === groupId
              ? { ...group, isMember: false, memberCount: Math.max(0, group.memberCount - 1) }
              : group
          )
        );
        return { success: true };
      }

      return { success: false, error: response.error || 'Failed to leave group' };
    } catch (error) {
      console.error('Error leaving group:', error);
      return { success: false, error: 'Failed to leave group' };
    }
  }, [token]);

  const deleteGroup = useCallback(async (groupId: string) => {
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await authenticatedRequest(`/api/groups/${groupId}`, token, {
        method: 'DELETE',
      });

      if (response.success) {
        // Remove from local state
        setGroups(prev => prev.filter(group => group.id !== groupId));
        return { success: true };
      }

      return { success: false, error: response.error || 'Failed to delete group' };
    } catch (error) {
      console.error('Error deleting group:', error);
      return { success: false, error: 'Failed to delete group' };
    }
  }, [token]);

  const loadMorePosts = useCallback(async () => {
    if (!hasMorePosts || isLoadingFeed) {
      return;
    }
    await refreshActivityFeed(true);
  }, [hasMorePosts, isLoadingFeed, refreshActivityFeed]);

  const value: SocialContextType = {
    activityFeed,
    isLoadingFeed,
    hasMorePosts,
    loadMorePosts,
    postComments,
    groups,
    isLoadingGroups,
    myGroups,
    isLoadingMyGroups,
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
    checkMutualFollow,
    refreshGroups,
    refreshUserGroups,
    createGroup,
    joinGroup,
    leaveGroup,
    deleteGroup,
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
