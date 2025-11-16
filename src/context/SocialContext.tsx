import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Post, Comment, Group, Activity } from '../types';

interface SocialContextType {
  // Posts state
  activityFeed: Post[];
  isLoadingFeed: boolean;

  // Comments state
  postComments: Record<string, Comment[]>;
  
  // Groups state
  groups: Group[];
  isLoadingGroups: boolean;

  // Post actions
  createPost: (params: {
    content: string;
    entityId?: number;
    entityTicker?: string;
    sentiment?: 'bullish' | 'bearish' | 'neutral';
  }) => Promise<{ success: boolean; error?: string }>;
  toggleLikePost: (postId: string) => Promise<{ success: boolean }>;
  deletePost: (postId: string) => Promise<{ success: boolean }>;

  // Feed actions
  refreshActivityFeed: () => Promise<void>;
  
  // Comment actions
  getComments: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<{ success: boolean }>;

  // Group actions
  refreshGroups: () => Promise<void>;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

export function SocialProvider({ children }: { children: ReactNode }) {
  const [activityFeed, setActivityFeed] = useState<Post[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [postComments, setPostComments] = useState<Record<string, Comment[]>>({});
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  const createPost = useCallback(async (params: {
    content: string;
    entityId?: number;
    entityTicker?: string;
    sentiment?: 'bullish' | 'bearish' | 'neutral';
  }) => {
    try {
      // Mock - replace with actual API call
      const newPost: Post = {
        id: Date.now().toString(),
        userId: '1',
        username: 'currentuser',
        displayName: 'Current User',
        content: params.content,
        entityId: params.entityId,
        entityTicker: params.entityTicker,
        sentiment: params.sentiment,
        likes: 0,
        comments: 0,
        isLiked: false,
        isBookmarked: false,
        timestamp: new Date().toISOString(),
      };
      
      setActivityFeed(prev => [newPost, ...prev]);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to create post' };
    }
  }, []);

  const toggleLikePost = useCallback(async (postId: string) => {
    setActivityFeed(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
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
    // Mock - replace with actual API call
    setTimeout(() => {
      setActivityFeed([]);
      setIsLoadingFeed(false);
    }, 1000);
  }, []);

  const getComments = useCallback(async (postId: string) => {
    // Mock - replace with actual API call
    setPostComments(prev => ({ ...prev, [postId]: [] }));
  }, []);

  const addComment = useCallback(async (postId: string, content: string) => {
    const newComment: Comment = {
      id: Date.now().toString(),
      postId,
      userId: '1',
      username: 'currentuser',
      displayName: 'Current User',
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
    
    return { success: true };
  }, []);

  const refreshGroups = useCallback(async () => {
    setIsLoadingGroups(true);
    // Mock - replace with actual API call
    setTimeout(() => {
      setGroups([]);
      setIsLoadingGroups(false);
    }, 1000);
  }, []);

  const value: SocialContextType = {
    activityFeed,
    isLoadingFeed,
    postComments,
    groups,
    isLoadingGroups,
    createPost,
    toggleLikePost,
    deletePost,
    refreshActivityFeed,
    getComments,
    addComment,
    refreshGroups,
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

