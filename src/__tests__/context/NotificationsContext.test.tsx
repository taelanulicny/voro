import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { NotificationsProvider, useNotifications } from '../../context/NotificationsContext';
import { AuthProvider } from '../../context/AuthContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { authenticatedRequest, isBackendConfigured } from '../../config/api';
import { createMockNotification } from '../helpers/testUtils';

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
      <NotificationsProvider>{children}</NotificationsProvider>
    </AuthProvider>
  </ThemeProvider>
);

describe('NotificationsContext', () => {
  const mockToken = 'test-token';

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsBackendConfigured.mockReturnValue(true);
    (require('../../context/AuthContext').useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-123' },
      token: mockToken,
      isAuthenticated: true,
    });
  });

  describe('Initial State', () => {
    it('should initialize with empty notifications', async () => {
      // Mock the initial fetch that happens in useEffect
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            data: [],
            count: 0,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { count: 0 },
        });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      // Wait for initial load to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe('refreshNotifications', () => {
    it('should fetch notifications successfully', async () => {
      const mockNotifications = [
        createMockNotification({ notificationId: 'notif-1', isRead: false }),
        createMockNotification({ notificationId: 'notif-2', isRead: true }),
      ];

      // Mock refreshNotifications (calls both /api/notifications and /api/notifications/count)
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            data: mockNotifications,
            count: 1,
            lastEvaluatedKey: null,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { count: 1 },
        });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      // Wait for initial load from useEffect
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshNotifications();
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2);
        expect(result.current.unreadCount).toBe(1);
      });
    });

    it('should handle empty notifications', async () => {
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            data: [],
            count: 0,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { count: 0 },
        });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await act(async () => {
        await result.current.refreshNotifications();
      });

      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockNotifications = [
        createMockNotification({ notificationId: 'notif-1', isRead: false }),
      ];

      // Mock initial load, refresh, count, and markAsRead
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            data: [],
            count: 0,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { count: 0 },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            data: mockNotifications,
            count: 1,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { count: 1 },
        })
        .mockResolvedValueOnce({
          success: true,
        });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshNotifications();
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1);
      });

      await act(async () => {
        await result.current.markAsRead('notif-1');
      });

      await waitFor(() => {
        const notification = result.current.notifications.find(n => n.notificationId === 'notif-1');
        expect(notification?.isRead).toBe(true);
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      const mockNotifications = [
        createMockNotification({ notificationId: 'notif-1', isRead: false }),
        createMockNotification({ notificationId: 'notif-2', isRead: false }),
      ];

      // Mock initial load, refresh, count, and markAllAsRead
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            data: [],
            count: 0,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { count: 0 },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            data: mockNotifications,
            count: 2,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { count: 2 },
        })
        .mockResolvedValueOnce({
          success: true,
        });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshNotifications();
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2);
      });

      await act(async () => {
        await result.current.markAllAsRead();
      });

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(0);
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      const mockNotifications = [
        createMockNotification({ notificationId: 'notif-1' }),
      ];

      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            data: mockNotifications,
            count: 0,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { count: 0 },
        })
        .mockResolvedValueOnce({
          success: true,
        });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await act(async () => {
        await result.current.refreshNotifications();
      });

      await act(async () => {
        await result.current.deleteNotification('notif-1');
      });

      await waitFor(() => {
        expect(result.current.notifications.find(n => n.notificationId === 'notif-1')).toBeUndefined();
      });
    });
  });

  describe('loadMoreNotifications', () => {
    it('should load more notifications with pagination', async () => {
      const firstPage = [
        createMockNotification({ notificationId: 'notif-1' }),
        createMockNotification({ notificationId: 'notif-2' }),
      ];
      const secondPage = [
        createMockNotification({ notificationId: 'notif-3' }),
      ];

      // Mock initial load, first page, count, second page, count
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            data: [],
            count: 0,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { count: 0 },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            data: firstPage,
            count: 0,
            lastEvaluatedKey: 'key-1',
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { count: 0 },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            data: secondPage,
            count: 0,
            lastEvaluatedKey: null,
          },
        });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshNotifications();
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2);
      });

      await act(async () => {
        await result.current.loadMoreNotifications();
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(3);
      });
    });
  });
});

