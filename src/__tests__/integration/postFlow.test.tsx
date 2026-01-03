import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { SocialProvider, useSocial } from '../../context/SocialContext';
import { AuthProvider } from '../../context/AuthContext';
import { ThemeProvider } from '../../context/ThemeContext';
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

describe('Post Flow Integration Tests', () => {
  const mockUser = createMockUser();
  const mockToken = 'test-token';

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsBackendConfigured.mockReturnValue(true);
    (require('../../context/AuthContext').useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      token: mockToken,
      isAuthenticated: true,
    });
  });

  describe('Complete Post Creation Flow', () => {
    it('should create post and add to feed', async () => {
      const newPost = createMockPost({
        id: 'new-post',
        content: 'New post content',
        userId: mockUser.id,
      });

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
          data: newPost,
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            posts: [newPost],
            lastEvaluatedKey: null,
          },
        });

      const { result } = renderHook(() => useSocial(), { wrapper });

      // Initial feed load
      await act(async () => {
        await result.current.refreshActivityFeed();
      });

      // Create post
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

      // Refresh feed to see new post
      await act(async () => {
        await result.current.refreshActivityFeed();
      });

      await waitFor(() => {
        expect(result.current.activityFeed.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Complete Post Interaction Flow', () => {
    it('should like and unlike post', async () => {
      const mockPost = createMockPost({
        id: 'post-1',
        isLiked: false,
        likesCount: 0,
      });

      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            data: [mockPost],
            lastEvaluatedKey: null,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { ...mockPost, isLiked: true, likesCount: 1 },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { ...mockPost, isLiked: false, likesCount: 0 },
        });

      const { result } = renderHook(() => useSocial(), { wrapper });

      // Load feed
      await act(async () => {
        await result.current.refreshActivityFeed();
      });

      // Like post
      await act(async () => {
        const likeResult = await result.current.toggleLikePost('post-1');
        expect(likeResult.success).toBe(true);
      });

      // Unlike post
      await act(async () => {
        const unlikeResult = await result.current.toggleLikePost('post-1');
        expect(unlikeResult.success).toBe(true);
      });
    });
  });

  describe('Complete Comment Flow', () => {
    it('should add comment to post', async () => {
      const mockPost = createMockPost({ id: 'post-1' });
      const mockComment = {
        id: 'comment-1',
        postId: 'post-1',
        userId: mockUser.id,
        content: 'Test comment',
        createdAt: new Date().toISOString(),
        likesCount: 0,
        isLiked: false,
      };

      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            data: [mockPost],
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

      // Load feed
      await act(async () => {
        await result.current.refreshActivityFeed();
      });

      // Add comment
      await act(async () => {
        const commentResult = await result.current.addComment('post-1', 'Test comment');
        expect(commentResult.success).toBe(true);
        expect(commentResult.comment).toBeDefined();
      });

      // Get comments
      await act(async () => {
        await result.current.getComments('post-1');
      });

      await waitFor(() => {
        expect(result.current.postComments['post-1']).toHaveLength(1);
      });
    });
  });
});

