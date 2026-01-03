import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { SocialProvider, useSocial } from '../../context/SocialContext';
import { AuthProvider } from '../../context/AuthContext';
import { ThemeProvider } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authenticatedRequest, isBackendConfigured } from '../../config/api';
import { createMockUser, createMockPost } from '../helpers/testUtils';

jest.mock('../../config/api');
jest.mock('../../context/AuthContext', () => ({
  ...jest.requireActual('../../context/AuthContext'),
  useAuth: jest.fn(),
}));

const mockAuthenticatedRequest = authenticatedRequest as jest.MockedFunction<typeof authenticatedRequest>;
const mockIsBackendConfigured = isBackendConfigured as jest.MockedFunction<typeof isBackendConfigured>;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <AuthProvider>
      <SocialProvider>{children}</SocialProvider>
    </AuthProvider>
  </ThemeProvider>
);

describe('SocialContext', () => {
  const mockUser = createMockUser();
  const mockToken = 'test-token';

  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    mockIsBackendConfigured.mockReturnValue(true);
    (require('../../context/AuthContext').useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      token: mockToken,
      isAuthenticated: true,
    });
  });

  describe('Initial State', () => {
    it('should initialize with empty state', async () => {
      // Mock the initial fetch that might happen
      mockAuthenticatedRequest.mockResolvedValue({
        success: true,
        data: {
          posts: [],
          lastEvaluatedKey: null,
        },
      });

      const { result } = renderHook(() => useSocial(), { wrapper });

      // Wait for any initial loading to complete
      await waitFor(() => {
        expect(result.current.isLoadingFeed).toBe(false);
      });

      expect(result.current.activityFeed).toEqual([]);
      expect(result.current.groups).toEqual([]);
      expect(result.current.drafts).toEqual([]);
    });
  });

  describe('refreshActivityFeed', () => {
    it('should fetch activity feed successfully', async () => {
      const mockPosts = [
        createMockPost({ id: 'post-1', content: 'First post' }),
        createMockPost({ id: 'post-2', content: 'Second post' }),
      ];

      // Mock initial feed fetch (from useEffect) and the explicit refresh
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            posts: [],
            lastEvaluatedKey: null,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            posts: [],
            lastEvaluatedKey: null,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            posts: mockPosts,
            lastEvaluatedKey: null,
          },
        });

      const { result } = renderHook(() => useSocial(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoadingFeed).toBe(false);
      });

      await act(async () => {
        await result.current.refreshActivityFeed();
      });

      await waitFor(() => {
        expect(result.current.activityFeed).toHaveLength(2);
        expect(result.current.activityFeed[0].content).toBe('First post');
      });
    });

    it('should handle empty feed', async () => {
      mockAuthenticatedRequest.mockResolvedValue({
        success: true,
        data: {
          posts: [],
          lastEvaluatedKey: null,
        },
      });

      const { result } = renderHook(() => useSocial(), { wrapper });

      await act(async () => {
        await result.current.refreshActivityFeed();
      });

      expect(result.current.activityFeed).toEqual([]);
    });

    it('should handle backend not configured', async () => {
      mockIsBackendConfigured.mockReturnValue(false);

      const { result } = renderHook(() => useSocial(), { wrapper });

      await act(async () => {
        await result.current.refreshActivityFeed();
      });

      expect(mockAuthenticatedRequest).not.toHaveBeenCalled();
      expect(result.current.activityFeed).toEqual([]);
    });
  });

  describe('createPost', () => {
    it('should create post successfully', async () => {
      const newPost = createMockPost({ 
        id: 'new-post', 
        postId: 'new-post',
        content: 'New post content',
        userId: mockUser.id,
        username: mockUser.username,
        displayName: mockUser.displayName,
      });

      // Mock the initial feed fetch (from useEffect) and the create post call
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            posts: [],
            lastEvaluatedKey: null,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            groups: [],
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: newPost,
        });

      const { result } = renderHook(() => useSocial(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoadingFeed).toBe(false);
      });

      await act(async () => {
        const createResult = await result.current.createPost({
          content: 'New post content',
          entityId: 1,
          entityTicker: 'TEST',
          entityName: 'Test Entity',
          sentiment: 'positive',
        });

        expect(createResult.success).toBe(true);
        expect(createResult.post).toBeDefined();
      });
    });

    it('should handle post creation error', async () => {
      mockAuthenticatedRequest.mockResolvedValue({
        success: false,
        error: 'Rate limit exceeded',
      });

      const { result } = renderHook(() => useSocial(), { wrapper });

      await act(async () => {
        const createResult = await result.current.createPost({
          content: 'Test post',
        });

        expect(createResult.success).toBe(false);
        expect(createResult.error).toBe('Rate limit exceeded');
      });
    });
  });

  describe('toggleLikePost', () => {
    it('should toggle like on post', async () => {
      const mockPost = createMockPost({ id: 'post-1', isLiked: false, likes: 0 });

      // Mock initial feed fetch and toggle like
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            posts: [mockPost],
            lastEvaluatedKey: null,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { isLiked: true, likes: 1 },
        });

      const { result } = renderHook(() => useSocial(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoadingFeed).toBe(false);
      });

      await act(async () => {
        const likeResult = await result.current.toggleLikePost('post-1');
        expect(likeResult.success).toBe(true);
      });
    });
  });

  describe('toggleBookmarkPost', () => {
    it('should toggle bookmark on post', async () => {
      const mockPost = createMockPost({ id: 'post-1', isBookmarked: false });

      // Mock initial feed fetch and toggle bookmark
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            posts: [mockPost],
            lastEvaluatedKey: null,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { isBookmarked: true },
        });

      const { result } = renderHook(() => useSocial(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoadingFeed).toBe(false);
      });

      await act(async () => {
        const bookmarkResult = await result.current.toggleBookmarkPost('post-1');
        expect(bookmarkResult.success).toBe(true);
      });
    });
  });

  describe('deletePost', () => {
    it('should delete post successfully', async () => {
      const mockPosts = [createMockPost({ id: 'post-1' })];

      // Mock initial feed fetch, explicit refresh, and delete
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            posts: [],
            lastEvaluatedKey: null,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            posts: mockPosts,
            lastEvaluatedKey: null,
          },
        })
        .mockResolvedValueOnce({
          success: true,
        });

      const { result } = renderHook(() => useSocial(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoadingFeed).toBe(false);
      });

      await act(async () => {
        await result.current.refreshActivityFeed();
      });

      await waitFor(() => {
        expect(result.current.activityFeed).toHaveLength(1);
      });

      await act(async () => {
        const deleteResult = await result.current.deletePost('post-1');
        expect(deleteResult.success).toBe(true);
      });
    });
  });

  describe('addComment', () => {
    it('should add comment to post', async () => {
      const timestamp = new Date().toISOString();
      const mockComment = {
        id: 'comment-1',
        commentId: 'comment-1',
        postId: 'post-1',
        userId: 'user-123',
        username: 'testuser',
        displayName: 'Test User',
        content: 'Test comment',
        timestamp,
        likes: 0,
        isLiked: false,
      };

      // Mock initial feed fetch (from useEffect), add comment, and get comments calls
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            posts: [],
            lastEvaluatedKey: null,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockComment,
        })
        .mockResolvedValueOnce({
          success: true,
          data: [mockComment],
        });

      const { result } = renderHook(() => useSocial(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoadingFeed).toBe(false);
      });

      await act(async () => {
        const commentResult = await result.current.addComment('post-1', 'Test comment');
        expect(commentResult.success).toBe(true);
        expect(commentResult.comment).toBeDefined();
      });
    });

    it('should add nested comment', async () => {
      const timestamp = new Date().toISOString();
      const mockComment = {
        id: 'comment-2',
        commentId: 'comment-2',
        postId: 'post-1',
        userId: 'user-123',
        username: 'testuser',
        displayName: 'Test User',
        content: 'Reply comment',
        parentCommentId: 'comment-1',
        timestamp,
        likes: 0,
        isLiked: false,
      };

      // Mock initial feed fetch (from useEffect), add nested comment, and get comments calls
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            posts: [],
            lastEvaluatedKey: null,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockComment,
        })
        .mockResolvedValueOnce({
          success: true,
          data: [mockComment],
        });

      const { result } = renderHook(() => useSocial(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoadingFeed).toBe(false);
      });

      await act(async () => {
        const commentResult = await result.current.addComment('post-1', 'Reply comment', 'comment-1');
        expect(commentResult.success).toBe(true);
      });
    });
  });

  describe('getComments', () => {
    it('should fetch comments for post', async () => {
      const timestamp = new Date().toISOString();
      const mockComments = [
        {
          id: 'comment-1',
          commentId: 'comment-1',
          postId: 'post-1',
          userId: 'user-123',
          username: 'testuser',
          displayName: 'Test User',
          content: 'First comment',
          timestamp,
          likes: 0,
          isLiked: false,
        },
      ];

      // Mock initial feed fetch and get comments
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            posts: [],
            lastEvaluatedKey: null,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockComments,
        });

      const { result } = renderHook(() => useSocial(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoadingFeed).toBe(false);
      });

      await act(async () => {
        await result.current.getComments('post-1');
      });

      await waitFor(() => {
        expect(result.current.postComments['post-1']).toHaveLength(1);
      });
    });
  });

  describe('toggleFollowUser', () => {
    it('should follow user successfully', async () => {
      mockAuthenticatedRequest.mockResolvedValue({
        success: true,
        data: { isFollowing: true, isMutual: false },
      });

      const { result } = renderHook(() => useSocial(), { wrapper });

      await act(async () => {
        const followResult = await result.current.toggleFollowUser('user-456');
        expect(followResult.success).toBe(true);
      });

      expect(result.current.isFollowingUser('user-456')).toBe(true);
    });

    it('should unfollow user successfully', async () => {
      // Mock initial feed fetch
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            posts: [],
            lastEvaluatedKey: null,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { isFollowing: true, isMutual: false },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { isFollowing: false, isMutual: false },
        });

      const { result } = renderHook(() => useSocial(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoadingFeed).toBe(false);
      });

      // Follow first
      await act(async () => {
        await result.current.toggleFollowUser('user-456');
      });

      expect(result.current.isFollowingUser('user-456')).toBe(true);

      // Then unfollow
      await act(async () => {
        const unfollowResult = await result.current.toggleFollowUser('user-456');
        expect(unfollowResult.success).toBe(true);
      });

      expect(result.current.isFollowingUser('user-456')).toBe(false);
    });
  });

  describe('Post Drafts', () => {
    it('should save draft', async () => {
      const { result } = renderHook(() => useSocial(), { wrapper });

      await act(async () => {
        const draftId = await result.current.saveDraft({
          content: 'Draft content',
          entityId: 1,
          sentiment: 'positive',
        });

        expect(draftId).toBeDefined();
      });

      await waitFor(() => {
        expect(result.current.drafts.length).toBeGreaterThan(0);
      });
    });

    it('should load drafts', async () => {
      const { result } = renderHook(() => useSocial(), { wrapper });

      // Save a draft first
      await act(async () => {
        await result.current.saveDraft({
          content: 'Draft content',
        });
      });

      // Load drafts
      await act(async () => {
        await result.current.loadDrafts();
      });

      expect(result.current.drafts.length).toBeGreaterThan(0);
    });

    it('should get draft by id', async () => {
      const { result } = renderHook(() => useSocial(), { wrapper });

      let draftId: string;

      await act(async () => {
        draftId = await result.current.saveDraft({
          content: 'Draft content',
        });
      });

      await act(async () => {
        await result.current.loadDrafts();
      });

      const draft = result.current.getDraft(draftId!);
      expect(draft).toBeDefined();
      expect(draft?.content).toBe('Draft content');
    });

    it('should delete draft', async () => {
      const { result } = renderHook(() => useSocial(), { wrapper });

      let draftId: string;

      await act(async () => {
        draftId = await result.current.saveDraft({
          content: 'Draft content',
        });
      });

      await act(async () => {
        await result.current.deleteDraft(draftId!);
      });

      await waitFor(() => {
        expect(result.current.getDraft(draftId!)).toBeUndefined();
      });
    });
  });

  describe('searchPosts', () => {
    it('should search posts successfully', async () => {
      const mockPosts = [
        createMockPost({ id: 'post-1', content: 'Searchable content' }),
      ];

      // Mock initial feed fetch and search posts
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            posts: [],
            lastEvaluatedKey: null,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            posts: mockPosts,
          },
        });

      const { result } = renderHook(() => useSocial(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoadingFeed).toBe(false);
      });

      await act(async () => {
        const posts = await result.current.searchPosts('searchable');
        expect(posts).toHaveLength(1);
        expect(posts[0].content).toContain('Searchable');
      });
    });
  });

  describe('Groups', () => {
    it('should fetch groups', async () => {
      const timestamp = new Date().toISOString();
      const mockGroups = [
        {
          id: 'group-1',
          groupId: 'group-1',
          name: 'Test Group',
          description: 'Test description',
          category: 'Tech',
          isPrivate: false,
          isMember: false,
          memberCount: 10,
          membersCount: 10,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ];

      // Mock initial feed fetch and groups fetch
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            posts: [],
            lastEvaluatedKey: null,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            groups: mockGroups,
          },
        });

      const { result } = renderHook(() => useSocial(), { wrapper });

      await act(async () => {
        await result.current.refreshGroups();
      });

      await waitFor(() => {
        expect(result.current.groups).toHaveLength(1);
      });
    });

    it('should create group', async () => {
      const timestamp = new Date().toISOString();
      const mockGroup = {
        id: 'new-group',
        groupId: 'new-group',
        name: 'New Group',
        description: 'New description',
        category: 'Tech',
        isPrivate: false,
        isMember: true,
        memberCount: 1,
        membersCount: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      // Mock initial feed fetch, groups fetch, and create group
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            posts: [],
            lastEvaluatedKey: null,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            groups: [],
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            group: mockGroup,
          },
        });

      const { result } = renderHook(() => useSocial(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingFeed).toBe(false);
      });

      await act(async () => {
        const createResult = await result.current.createGroup({
          name: 'New Group',
          description: 'New description',
          category: 'Tech',
          isPrivate: false,
        });

        expect(createResult.success).toBe(true);
        expect(createResult.group).toBeDefined();
      });
    });

    it('should join group', async () => {
      mockAuthenticatedRequest.mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useSocial(), { wrapper });

      await act(async () => {
        const joinResult = await result.current.joinGroup('group-1');
        expect(joinResult.success).toBe(true);
      });
    });

    it('should leave group', async () => {
      mockAuthenticatedRequest.mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useSocial(), { wrapper });

      await act(async () => {
        const leaveResult = await result.current.leaveGroup('group-1');
        expect(leaveResult.success).toBe(true);
      });
    });
  });

  describe('loadMorePosts', () => {
    it('should load more posts with pagination', async () => {
      const firstPage = [
        createMockPost({ id: 'post-1' }),
        createMockPost({ id: 'post-2' }),
      ];
      const secondPage = [
        createMockPost({ id: 'post-3' }),
        createMockPost({ id: 'post-4' }),
      ];

      // Mock initial feed fetch (from useEffect), explicit refresh, and loadMore
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            posts: [],
            lastEvaluatedKey: null,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            posts: firstPage,
            lastEvaluatedKey: 'key-1',
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            posts: secondPage,
            lastEvaluatedKey: null,
          },
        });

      const { result } = renderHook(() => useSocial(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoadingFeed).toBe(false);
      });

      await act(async () => {
        await result.current.refreshActivityFeed();
      });

      await waitFor(() => {
        expect(result.current.activityFeed).toHaveLength(2);
      });

      await act(async () => {
        await result.current.loadMorePosts();
      });

      await waitFor(() => {
        expect(result.current.activityFeed).toHaveLength(4);
      });
    });
  });
});

