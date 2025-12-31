import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Post, Comment, Group, Activity, User } from '../types';
import { useAuth } from './AuthContext';
import { authenticatedRequest, isBackendConfigured } from '../config/api';
import { PostSchema, CommentSchema, validateArrayLoose, safeValidate, FeedResponseSchema, CreatePostRequestSchema, CreateCommentRequestSchema, CreateGroupRequestSchema } from '../validators';

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
  deletePost: (postId: string) => Promise<{ success: boolean; error?: string }>;

  // Feed actions
  refreshActivityFeed: () => Promise<void>;
  loadMorePosts: () => Promise<void>;

  // Comment actions
  getComments: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string, parentCommentId?: string) => Promise<{ success: boolean; comment?: Comment }>;
  editComment: (postId: string, commentId: string, content: string) => Promise<{ success: boolean; error?: string }>;
  toggleLikeComment: (postId: string, commentId: string) => Promise<{ success: boolean }>;

  // Follow actions
  toggleFollowUser: (userId: string) => Promise<{ success: boolean; isMutual?: boolean; otherFollowsUser?: boolean }>;
  isFollowingUser: (userId: string) => boolean;
  checkMutualFollow: (userId: string) => Promise<{ isMutual: boolean; userFollowsOther: boolean; otherFollowsUser: boolean }>;

  // Group actions
  refreshGroups: () => Promise<void>;
  refreshUserGroups: () => Promise<void>;
  myGroups: Group[];
  isLoadingMyGroups: boolean;
  createGroup: (params: { name: string; description: string; category: string; isPrivate: boolean }) => Promise<{ success: boolean; group?: Group }>;
  joinGroup: (groupId: string) => Promise<{ success: boolean }>;
  leaveGroup: (groupId: string) => Promise<{ success: boolean }>;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

export function SocialProvider({ children }: { children: ReactNode }) {
  const { user, token, isAuthenticated } = useAuth();
  const [activityFeed, setActivityFeed] = useState<Post[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [postComments, setPostComments] = useState<Record<string, Comment[]>>({});
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [isLoadingMyGroups, setIsLoadingMyGroups] = useState(false);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);

  // Pagination state
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Rate limiting for post creation (5 posts per minute)
  const postCreationTimestamps = React.useRef<number[]>([]);
  const RATE_LIMIT_POSTS = 5;
  const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

  // Mock posts for trending feed (fallback when backend not available)
  const MOCK_POSTS: Post[] = [
    {
      id: '1',
      userId: 'user1',
      username: 'sarah_trader',
      displayName: 'Sarah Chen',
      avatarUrl: undefined,
      content: '@TaylorSwift just announced her new tour dates and the demand is absolutely insane. Ticket prices are through the roof but fans are still buying. This is a no-brainer investment right now.',
      entityId: 21,
      entityName: 'Taylor Swift',
      entityTicker: 'TSWFT',
      sentiment: 'positive',
      likes: 823,
      comments: 156,
      isLiked: false,
      isBookmarked: false,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    },
    {
      id: '2',
      userId: 'user2',
      username: 'mike_investor',
      displayName: 'Mike Johnson',
      avatarUrl: undefined,
      content: '@MrBeast and @KaiCenat just did a massive collab stream. Both of their engagement metrics are exploding. This is what smart creators do - cross-pollinate audiences.',
      entityId: 12,
      entityName: 'MrBeast',
      entityTicker: 'MRBST',
      sentiment: 'positive',
      likes: 542,
      comments: 89,
      isLiked: false,
      isBookmarked: false,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    },
    {
      id: '3',
      userId: 'user3',
      username: 'trading_pro',
      displayName: 'Alex Rivera',
      avatarUrl: undefined,
      content: '@TomBrady coming out of retirement again? The man is a machine. His brand value just keeps climbing. Smart move for any investor watching the sports market.',
      sentiment: 'positive',
      likes: 1204,
      comments: 234,
      isLiked: false,
      isBookmarked: false,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    },
    {
      id: '4',
      userId: 'user4',
      username: 'crypto_analyst',
      displayName: 'Jordan Kim',
      avatarUrl: undefined,
      content: '@ElonMusk latest tweet about @Tesla production numbers is concerning. Supply chain issues are real and investors should be cautious.',
      sentiment: 'negative',
      likes: 678,
      comments: 145,
      isLiked: false,
      isBookmarked: false,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 15).toISOString(),
    },
    {
      id: '5',
      userId: 'user5',
      username: 'market_watch',
      displayName: 'Emma Davis',
      avatarUrl: undefined,
      content: '@KanyeWest new album drop is generating massive buzz. Streaming numbers are through the roof. This could be a major comeback moment.',
      entityId: 23,
      entityName: 'Kanye West',
      entityTicker: 'KANYE',
      sentiment: 'positive',
      likes: 945,
      comments: 201,
      isLiked: false,
      isBookmarked: false,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    },
    {
      id: '6',
      userId: 'user6',
      username: 'sports_insider',
      displayName: 'Chris Martinez',
      avatarUrl: undefined,
      content: '@LeBronJames breaking another record. The longevity of his career is unmatched. His brand partnerships are worth watching.',
      sentiment: 'positive',
      likes: 1102,
      comments: 267,
      isLiked: false,
      isBookmarked: false,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    },
    {
      id: '7',
      userId: 'user7',
      username: 'tech_guru',
      displayName: 'Sam Wilson',
      avatarUrl: undefined,
      content: '@OpenAI latest model release is game-changing. The AI space is moving so fast, investors need to stay on top of these developments.',
      sentiment: 'positive',
      likes: 1567,
      comments: 312,
      isLiked: false,
      isBookmarked: false,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    },
    {
      id: '8',
      userId: 'user8',
      username: 'entertainment_buzz',
      displayName: 'Taylor Brown',
      avatarUrl: undefined,
      content: '@Drake new single is climbing the charts fast. His streaming numbers are insane. Music industry is watching closely.',
      entityId: 22,
      entityName: 'Drake',
      entityTicker: 'DRAKE',
      sentiment: 'positive',
      likes: 834,
      comments: 178,
      isLiked: false,
      isBookmarked: false,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      id: '9',
      userId: 'user9',
      username: 'political_analyst',
      displayName: 'Morgan Lee',
      avatarUrl: undefined,
      content: '@TuckerCarlson latest segment is generating controversy. His influence on certain demographics remains strong despite recent changes.',
      entityId: 38,
      entityName: 'Tucker Carlson',
      entityTicker: 'TCARS',
      sentiment: 'neutral',
      likes: 456,
      comments: 123,
      isLiked: false,
      isBookmarked: false,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    },
    {
      id: '10',
      userId: 'user10',
      username: 'startup_watcher',
      displayName: 'Casey Park',
      avatarUrl: undefined,
      content: '@OpenAI valuation keeps climbing. The AI revolution is real and early investors are seeing massive returns.',
      sentiment: 'positive',
      likes: 1890,
      comments: 445,
      isLiked: false,
      isBookmarked: false,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    },
    {
      id: '11',
      userId: 'user11',
      username: 'music_insider',
      displayName: 'Riley Chen',
      avatarUrl: undefined,
      content: '@TheWeekend new tour announcement is huge. Ticket sales are breaking records. Live music is back in a big way.',
      entityId: 29,
      entityName: 'The Weeknd',
      entityTicker: 'WKEND',
      sentiment: 'positive',
      likes: 723,
      comments: 156,
      isLiked: false,
      isBookmarked: false,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    },
    {
      id: '12',
      userId: 'user12',
      username: 'sports_business',
      displayName: 'Drew Anderson',
      avatarUrl: undefined,
      content: '@PatrickMahomes contract extension is massive. Quarterback market is resetting. This affects the entire NFL economy.',
      sentiment: 'positive',
      likes: 1023,
      comments: 234,
      isLiked: false,
      isBookmarked: false,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 32).toISOString(),
    },
  ];

  // Helper to map backend post format to frontend format
  const mapBackendPost = (p: any): Post => ({
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
  });

  // Fetch activity feed from backend (resets pagination)
  const refreshActivityFeed = useCallback(async () => {
    if (!token || !isAuthenticated) {
      // Use mock posts if not authenticated or backend not configured
      setActivityFeed(MOCK_POSTS);
      setHasMorePosts(false);
      setLastKey(null);
      return;
    }

    if (!isBackendConfigured()) {
      // Use mock posts as fallback when backend not configured
      setActivityFeed(MOCK_POSTS);
      setHasMorePosts(false);
      setLastKey(null);
      return;
    }

    try {
      setIsLoadingFeed(true);
      const response = await authenticatedRequest<{
        posts: any[];
        lastEvaluatedKey?: string;
      }>('/api/social/feed?limit=20', token, {
        method: 'GET',
      });

      if (response.success && response.data && response.data.posts.length > 0) {
        // Validate posts - filter out invalid ones instead of failing completely
        const validatedPosts = validateArrayLoose(PostSchema, response.data.posts);

        if (validatedPosts.length > 0) {
          const mappedPosts: Post[] = validatedPosts.map(mapBackendPost);
          setActivityFeed(mappedPosts);
          setLastKey(response.data.lastEvaluatedKey || null);
          setHasMorePosts(!!response.data.lastEvaluatedKey);
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
      // Use mock posts as fallback on error
      console.debug('Error fetching feed (backend may not be running):', error);
      setActivityFeed(MOCK_POSTS);
      setHasMorePosts(false);
      setLastKey(null);
    } finally {
      setIsLoadingFeed(false);
    }
  }, [token, isAuthenticated]);

  // Load more posts (pagination)
  const loadMorePosts = useCallback(async () => {
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
        posts: any[];
        lastEvaluatedKey?: string;
      }>(`/api/social/feed?limit=20&lastKey=${encodeURIComponent(lastKey)}`, token, {
        method: 'GET',
      });

      if (response.success && response.data && response.data.posts.length > 0) {
        // Validate posts - filter out invalid ones
        const validatedPosts = validateArrayLoose(PostSchema, response.data.posts);

        if (validatedPosts.length > 0) {
          const mappedPosts: Post[] = validatedPosts.map(mapBackendPost);
          setActivityFeed(prev => [...prev, ...mappedPosts]);
          setLastKey(response.data.lastEvaluatedKey || null);
          setHasMorePosts(!!response.data.lastEvaluatedKey);
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

  // Load feed on mount and when auth changes - will be added after refreshGroups is defined

  const createPost = useCallback(async (params: {
    content: string;
    entityId?: number;
    entityTicker?: string;
    entityName?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    images?: string[];
  }) => {
    if (!token || !user || !user.id) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!isBackendConfigured()) {
      return { success: false, error: 'This feature requires a backend connection.' };
    }

    try {
      // Backend returns postId, but frontend uses id - use any for flexibility
      const response = await authenticatedRequest<any>('/api/social/posts', token, {
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
          images: response.data.images,
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
        // Remove post from activity feed
        setActivityFeed(prev => prev.filter(post => post.id !== postId));
        
        // Remove comments associated with this post
        setPostComments(prev => {
          const updated = { ...prev };
          delete updated[postId];
          return updated;
        });
        
        return { success: true };
      }

      return { success: false, error: response.error || 'Failed to delete post' };
    } catch (error) {
      console.error('Error deleting post:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete post' };
    }
  }, [token]);

  const getComments = useCallback(async (postId: string) => {
    if (!token) return;

    try {
      const response = await authenticatedRequest<any[]>(
        `/api/social/posts/${postId}/comments`,
        token,
        {
          method: 'GET',
        }
      );

      if (response.success && response.data) {
        // Recursively map comments and their replies
        const mapComment = (c: any): Comment => ({
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
          parentCommentId: c.parentCommentId,
          replyTo: c.replyTo || (c.replyToUserId ? {
            userId: c.replyToUserId,
            username: c.replyToUsername || '',
            displayName: c.replyToDisplayName || '',
          } : undefined),
          replies: c.replies ? c.replies.map(mapComment) : undefined,
          editedAt: c.editedAt,
          isEdited: c.isEdited || false,
        });

        const mappedComments: Comment[] = response.data.map(mapComment);
        setPostComments(prev => ({ ...prev, [postId]: mappedComments }));
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  }, [token]);

  const addComment = useCallback(async (postId: string, content: string, parentCommentId?: string) => {
    if (!token || !user) {
      return { success: false };
    }

    try {
      // Backend returns commentId, but frontend uses id - use any for flexibility
      const response = await authenticatedRequest<any>(
        `/api/social/posts/${postId}/comments`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({ content, parentCommentId }),
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
          parentCommentId: response.data.parentCommentId,
          replyTo: response.data.replyTo || (response.data.replyToUserId ? {
            userId: response.data.replyToUserId,
            username: response.data.replyToUsername || '',
            displayName: response.data.replyToDisplayName || '',
          } : undefined),
          isEdited: false,
        };

        // Refresh comments to get the proper nested structure
        await getComments(postId);

        // Update comment count only for top-level comments
        if (!parentCommentId) {
          setActivityFeed(prev =>
            prev.map(post => (post.id === postId ? { ...post, comments: post.comments + 1 } : post))
          );
        }

        return { success: true, comment: newComment };
      }

      return { success: false };
    } catch (error) {
      return { success: false };
    }
  }, [token, user, getComments]);

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
        // Recursively update comment like status (including in replies)
        const updateCommentLike = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment.id === commentId) {
              return {
                ...comment,
                isLiked: response.data!.isLiked,
                likes: response.data!.isLiked ? comment.likes + 1 : comment.likes - 1,
              };
            }
            if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: updateCommentLike(comment.replies),
              };
            }
            return comment;
          });
        };

        setPostComments(prev => ({
          ...prev,
          [postId]: updateCommentLike(prev[postId] || []),
        }));
        return { success: true };
      }

      return { success: false };
    } catch (error) {
      // Fallback to local toggle on error (recursively)
      const updateCommentLike = (comments: Comment[]): Comment[] => {
        return comments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              isLiked: !comment.isLiked,
              likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
            };
          }
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: updateCommentLike(comment.replies),
            };
          }
          return comment;
        });
      };

      setPostComments(prev => ({
        ...prev,
        [postId]: updateCommentLike(prev[postId] || []),
      }));
      return { success: true };
    }
  }, [token]);

  const toggleFollowUser = useCallback(async (userId: string) => {
    if (!token) {
      return { success: false };
    }

    try {
      const response = await authenticatedRequest<{ 
        isFollowing: boolean;
        isMutual?: boolean;
        otherFollowsUser?: boolean;
      }>(
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
        return { 
          success: true,
          isMutual: response.data.isMutual,
          otherFollowsUser: response.data.otherFollowsUser,
        };
      }

      return { success: false };
    } catch (error) {
      return { success: false };
    }
  }, [token]);

  const editComment = useCallback(async (postId: string, commentId: string, content: string) => {
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await authenticatedRequest<any>(
        `/api/social/comments/${commentId}`,
        token,
        {
          method: 'PUT',
          body: JSON.stringify({ content }),
        }
      );

      if (response.success && response.data) {
        // Refresh comments to get updated structure
        await getComments(postId);
        return { success: true };
      }

      return { success: false, error: response.error || 'Failed to edit comment' };
    } catch (error) {
      return { success: false, error: 'Failed to edit comment' };
    }
  }, [token, getComments]);

  const checkMutualFollow = useCallback(async (userId: string) => {
    if (!token) {
      return { isMutual: false, userFollowsOther: false, otherFollowsUser: false };
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

      return { isMutual: false, userFollowsOther: false, otherFollowsUser: false };
    } catch (error) {
      return { isMutual: false, userFollowsOther: false, otherFollowsUser: false };
    }
  }, [token]);

  const isFollowingUser = useCallback(
    (userId: string) => {
      return followedUsers.has(userId);
    },
    [followedUsers]
  );

  // Helper to map backend group to frontend Group type
  const mapBackendGroup = (backendGroup: any): Group => ({
    id: backendGroup.groupId,
    name: backendGroup.name,
    description: backendGroup.description,
    category: backendGroup.category,
    memberCount: backendGroup.memberCount || 0,
    isPrivate: backendGroup.isPrivate || false,
    isMember: backendGroup.isMember || false,
    coverImage: backendGroup.coverImage,
    createdAt: backendGroup.createdAt,
  });

  const refreshGroups = useCallback(async () => {
    setIsLoadingGroups(true);
    try {
      if (!isBackendConfigured() || !token || !isAuthenticated) {
        setGroups([]);
        setIsLoadingGroups(false);
        return;
      }

      const response = await authenticatedRequest<{
        groups: any[];
        lastEvaluatedKey?: string;
      }>('/api/groups?limit=50', token, {
        method: 'GET',
      });

      if (response.success && response.data && response.data.groups) {
        const mappedGroups = response.data.groups.map(mapBackendGroup);
        setGroups(mappedGroups);
      } else {
        // No groups from backend - set empty array
        setGroups([]);
      }
    } catch (error) {
      console.error('Error refreshing groups:', error);
      // On error, keep existing groups or set to empty
      setGroups([]);
    } finally {
      setIsLoadingGroups(false);
    }
  }, [token, isAuthenticated]);

  // Load feed and groups on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated && token) {
      refreshActivityFeed().catch(err => console.error('Error refreshing feed:', err));
      refreshGroups().catch(err => console.error('Error refreshing groups:', err));
    }
  }, [isAuthenticated, token, refreshActivityFeed, refreshGroups]);

  const refreshUserGroups = useCallback(async () => {
    setIsLoadingMyGroups(true);
    try {
      if (!isBackendConfigured() || !token || !isAuthenticated) {
        setMyGroups([]);
        setIsLoadingMyGroups(false);
        return;
      }

      const response = await authenticatedRequest<{
        groups: any[];
      }>('/api/groups/user', token, {
        method: 'GET',
      });

      if (response.success && response.data && response.data.groups) {
        const mappedGroups = response.data.groups.map(mapBackendGroup);
        setMyGroups(mappedGroups);
      } else {
        setMyGroups([]);
      }
    } catch (error) {
      console.error('Error refreshing user groups:', error);
      setMyGroups([]);
    } finally {
      setIsLoadingMyGroups(false);
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

    if (!isBackendConfigured()) {
      return { success: false, error: 'This feature requires a backend connection.' };
    }

    try {
      const response = await authenticatedRequest<{ group: any }>(
        '/api/groups',
        token,
        {
          method: 'POST',
          body: JSON.stringify(params),
        }
      );

      if (response.success && response.data && response.data.group) {
        const mappedGroup = mapBackendGroup({ ...response.data.group, isMember: true });
        setGroups(prev => [mappedGroup, ...prev]);
        return { success: true, group: mappedGroup };
      }

      return { success: false, error: response.error || 'Failed to create group' };
    } catch (error: any) {
      console.error('Error creating group:', error);
      return { success: false, error: error.message || 'Failed to create group' };
    }
  }, [token, isAuthenticated]);

  const joinGroup = useCallback(async (groupId: string) => {
    if (!token || !isAuthenticated) {
      return { success: false };
    }

    if (!isBackendConfigured()) {
      return { success: false };
    }

    try {
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
        // Refresh user groups to include the newly joined group
        await refreshUserGroups();
        return { success: true };
      }

      return { success: false };
    } catch (error) {
      console.error('Error joining group:', error);
      return { success: false };
    }
  }, [token, isAuthenticated, refreshUserGroups]);

  const leaveGroup = useCallback(async (groupId: string) => {
    if (!token || !isAuthenticated) {
      return { success: false };
    }

    if (!isBackendConfigured()) {
      return { success: false };
    }

    try {
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
        // Refresh user groups to remove the left group
        await refreshUserGroups();
        return { success: true };
      }

      return { success: false };
    } catch (error) {
      console.error('Error leaving group:', error);
      return { success: false };
    }
  }, [token, isAuthenticated, refreshUserGroups]);

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
    editComment,
    toggleLikeComment,
    toggleFollowUser,
    isFollowingUser,
    checkMutualFollow,
    refreshGroups,
    refreshUserGroups,
    myGroups,
    isLoadingMyGroups,
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
