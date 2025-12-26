import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Post, Comment, Group, Activity, User } from '../types';
import { useAuth } from './AuthContext';

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

// Mock data for development
const MOCK_USERS = [
  { id: '2', username: 'sarah_trader', displayName: 'Sarah Chen', avatarUrl: undefined, followersCount: 1250, followingCount: 340 },
  { id: '3', username: 'mike_investor', displayName: 'Mike Johnson', avatarUrl: undefined, followersCount: 890, followingCount: 210 },
  { id: '4', username: 'crypto_king', displayName: 'Alex Rivera', avatarUrl: undefined, followersCount: 3400, followingCount: 120 },
  { id: '5', username: 'jane_doe', displayName: 'Jane Williams', avatarUrl: undefined, followersCount: 560, followingCount: 445 },
];

const MOCK_POSTS: Post[] = [
  {
    id: '1',
    userId: '2',
    username: 'sarah_trader',
    displayName: 'Sarah Chen',
    content: '@TaylorSwift just announced her new tour dates and the demand is absolutely insane. Ticket prices are through the roof but fans are still buying. This is a no-brainer investment right now.',
    entityId: 21,
    entityTicker: 'TSWFT',
    entityName: 'Taylor Swift',
    sentiment: 'positive',
    likes: 823,
    comments: 156,
    isLiked: false,
    isBookmarked: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(), // 25 min ago
  },
  {
    id: '2',
    userId: '3',
    username: 'mike_investor',
    displayName: 'Mike Johnson',
    content: '@MrBeast and @KaiCenat just did a massive collab stream. Both of their engagement metrics are exploding. This is what smart creators do - cross-pollinate audiences.',
    entityId: 12,
    entityTicker: 'MRBST',
    entityName: 'MrBeast',
    sentiment: 'positive',
    likes: 445,
    comments: 89,
    isLiked: true,
    isBookmarked: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 min ago
  },
  {
    id: '3',
    userId: '4',
    username: 'crypto_king',
    displayName: 'Alex Rivera',
    content: '@Drake\'s new album is getting mixed reviews but the streaming numbers don\'t lie. First week was solid but week 2 drop-off is concerning. Might be time to take profits.',
    entityId: 22,
    entityTicker: 'DRAKE',
    entityName: 'Drake',
    sentiment: 'negative',
    likes: 612,
    comments: 142,
    isLiked: false,
    isBookmarked: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(), // 1 hour ago
  },
  {
    id: '4',
    userId: '5',
    username: 'jane_doe',
    displayName: 'Jane Williams',
    content: 'The influencer marketing landscape is completely shifting. TikTok creators like @AlixEarle are commanding brand deals that were unheard of just two years ago.',
    entityId: 11,
    entityTicker: 'ALIX',
    entityName: 'Alix Earle',
    sentiment: 'positive',
    likes: 356,
    comments: 67,
    isLiked: true,
    isBookmarked: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
  {
    id: '5',
    userId: '6',
    username: 'trend_watcher',
    displayName: 'Trend Watcher',
    content: '@KansasCityChiefs are back in championship form. The narrative is strong and the fan engagement is through the roof. Perfect time to get in before the playoffs.',
    entityId: 33,
    entityTicker: 'KC',
    entityName: 'Kansas City Chiefs',
    sentiment: 'positive',
    likes: 523,
    comments: 98,
    isLiked: false,
    isBookmarked: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
  },
  {
    id: '6',
    userId: '7',
    username: 'tech_analyst',
    displayName: 'Tech Analyst',
    content: '@Cursor just hit 100k paying customers. Developers literally can\'t work without it now. The productivity gains are insane and the network effects are real.',
    entityId: 47,
    entityTicker: 'CURSO',
    entityName: 'Cursor',
    sentiment: 'positive',
    likes: 712,
    comments: 134,
    isLiked: false,
    isBookmarked: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
  },
  {
    id: '7',
    userId: '8',
    username: 'sports_fan',
    displayName: 'Sports Fan',
    content: '@GoldenStateWarriors can\'t catch a break with injuries. Curry being out is crushing their playoff chances. This season might be a wash.',
    entityId: 32,
    entityTicker: 'GSW',
    entityName: 'Golden State Warriors',
    sentiment: 'negative',
    likes: 289,
    comments: 56,
    isLiked: true,
    isBookmarked: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
  },
  {
    id: '8',
    userId: '9',
    username: 'music_lover',
    displayName: 'Music Lover',
    content: 'The streaming data this quarter is wild. @TaylorSwift and @BadBunny are dominating globally. The gap between them and everyone else is huge.',
    entityId: 21,
    entityTicker: 'TSWFT',
    entityName: 'Taylor Swift',
    sentiment: 'positive',
    likes: 567,
    comments: 112,
    isLiked: false,
    isBookmarked: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
  },
  {
    id: '9',
    userId: '10',
    username: 'political_insider',
    displayName: 'Political Insider',
    content: '@DonaldTrump\'s rally turnout numbers are absolutely massive. The base enthusiasm is off the charts compared to previous cycles. The data doesn\'t lie.',
    entityId: 10,
    entityTicker: 'TRUMP',
    entityName: 'Donald Trump',
    sentiment: 'positive',
    likes: 892,
    comments: 201,
    isLiked: false,
    isBookmarked: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(), // 7 hours ago
  },
  {
    id: '10',
    userId: '11',
    username: 'content_creator',
    displayName: 'Content Creator',
    content: 'Not feeling great about @LoganPaul lately. The recent drama is affecting his brand partnerships and the engagement metrics are showing it.',
    entityId: 15,
    entityTicker: 'LPAUL',
    entityName: 'Logan Paul',
    sentiment: 'negative',
    likes: 334,
    comments: 78,
    isLiked: true,
    isBookmarked: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
  },
  {
    id: '11',
    userId: '12',
    username: 'startup_founder',
    displayName: 'Startup Founder',
    content: '@Perplexity just closed another huge funding round. Their AI search is legitimately better than Google for research. This is the future.',
    entityId: 41,
    entityTicker: 'PERP',
    entityName: 'Perplexity',
    sentiment: 'positive',
    likes: 678,
    comments: 145,
    isLiked: false,
    isBookmarked: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(), // 9 hours ago
  },
  {
    id: '12',
    userId: '13',
    username: 'market_watcher',
    displayName: 'Market Watcher',
    content: 'Interesting cross-category movement today. @TaylorSwift\'s tour announcement boosted engagement across music, and @MrBeast\'s collab with @KaiCenat is creating ripple effects in the influencer space.',
    entityId: undefined,
    entityTicker: undefined,
    entityName: undefined,
    sentiment: undefined,
    likes: 456,
    comments: 89,
    isLiked: false,
    isBookmarked: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(), // 10 hours ago
  },
];

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
  {
    id: '3',
    name: 'Day Trading Strategies',
    description: 'Share and discuss day trading strategies',
    category: 'Trading',
    memberCount: 892,
    isPrivate: true,
    isMember: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
  },
];

export function SocialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activityFeed, setActivityFeed] = useState<Post[]>(MOCK_POSTS);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [postComments, setPostComments] = useState<Record<string, Comment[]>>({});
  const [groups, setGroups] = useState<Group[]>(MOCK_GROUPS);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set()); // Start with no followed users
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);

  const createPost = useCallback(async (params: {
    content: string;
    entityId?: number;
    entityTicker?: string;
    entityName?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
  }) => {
    try {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const newPost: Post = {
        id: Date.now().toString(),
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        content: params.content,
        entityId: params.entityId,
        entityTicker: params.entityTicker,
        entityName: params.entityName,
        sentiment: params.sentiment,
        likes: 0,
        comments: 0,
        isLiked: false,
        isBookmarked: false,
        timestamp: new Date().toISOString(),
      };
      
      setActivityFeed(prev => [newPost, ...prev]);
      return { success: true, post: newPost };
    } catch (error) {
      return { success: false, error: 'Failed to create post' };
    }
  }, [user]);

  const toggleLikePost = useCallback(async (postId: string) => {
    setActivityFeed(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
        : post
    ));
    return { success: true };
  }, []);

  const toggleBookmarkPost = useCallback(async (postId: string) => {
    setActivityFeed(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, isBookmarked: !post.isBookmarked }
        : post
    ));
    return { success: true };
  }, []);

  const deletePost = useCallback(async (postId: string) => {
    setActivityFeed(prev => prev.filter(post => post.id !== postId));
    return { success: true };
  }, []);

  const refreshActivityFeed = useCallback(async () => {
    setIsLoadingFeed(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setActivityFeed(MOCK_POSTS);
    setIsLoadingFeed(false);
  }, []);

  const getComments = useCallback(async (postId: string) => {
    // Generate mock comments if they don't exist
    if (!postComments[postId]) {
      const mockComments: Comment[] = [
        {
          id: `${postId}-c1`,
          postId,
          userId: '2',
          username: 'sarah_trader',
          displayName: 'Sarah Chen',
          content: 'Great analysis! I agree with your perspective.',
          likes: 3,
          isLiked: false,
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        },
        {
          id: `${postId}-c2`,
          postId,
          userId: '4',
          username: 'crypto_king',
          displayName: 'Alex Rivera',
          content: 'Interesting point. What about the regulatory concerns?',
          likes: 1,
          isLiked: false,
          timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        },
      ];
      setPostComments(prev => ({ ...prev, [postId]: mockComments }));
    }
  }, [postComments]);

  const addComment = useCallback(async (postId: string, content: string) => {
    if (!user) {
      return { success: false };
    }

    const newComment: Comment = {
      id: `${postId}-c${Date.now()}`,
      postId,
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      content,
      likes: 0,
      isLiked: false,
      timestamp: new Date().toISOString(),
    };
    
    setPostComments(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), newComment],
    }));
    
    setActivityFeed(prev => prev.map(post =>
      post.id === postId ? { ...post, comments: post.comments + 1 } : post
    ));
    
    return { success: true, comment: newComment };
  }, [user]);

  const toggleLikeComment = useCallback(async (postId: string, commentId: string) => {
    setPostComments(prev => ({
      ...prev,
      [postId]: (prev[postId] || []).map(comment =>
        comment.id === commentId
          ? { ...comment, isLiked: !comment.isLiked, likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1 }
          : comment
      ),
    }));
    return { success: true };
  }, []);

  const toggleFollowUser = useCallback(async (userId: string) => {
    setFollowedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
    return { success: true };
  }, []);

  const isFollowingUser = useCallback((userId: string) => {
    return followedUsers.has(userId);
  }, [followedUsers]);

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
    setGroups(prev => prev.map(group =>
      group.id === groupId
        ? { ...group, isMember: true, memberCount: group.memberCount + 1 }
        : group
    ));
    return { success: true };
  }, []);

  const leaveGroup = useCallback(async (groupId: string) => {
    setGroups(prev => prev.map(group =>
      group.id === groupId
        ? { ...group, isMember: false, memberCount: Math.max(0, group.memberCount - 1) }
        : group
    ));
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
