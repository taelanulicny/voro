import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authenticatedRequest, isBackendConfigured } from '../config/api';
import { useAuth } from './AuthContext';
import { Notification } from '../types';
import { NotificationSchema, validateArrayLoose } from '../validators';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  refreshNotifications: () => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastEvaluatedKey, setLastEvaluatedKey] = useState<string | undefined>();
  const { token, isAuthenticated } = useAuth();

  // Map backend notification to frontend format
  const mapBackendNotification = (n: any): Notification => ({
    notificationId: n.notificationId || n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    message: n.message,
    isRead: n.isRead || false,
    createdAt: n.createdAt,
    actorUserId: n.actorUserId,
    actorUsername: n.actorUsername,
    actorDisplayName: n.actorDisplayName,
    actorAvatarUrl: n.actorAvatarUrl,
    postId: n.postId,
    commentId: n.commentId,
    entityId: n.entityId,
    entityTicker: n.entityTicker,
    entityName: n.entityName,
    groupId: n.groupId,
    groupName: n.groupName,
    targetPrice: n.targetPrice,
    currentPrice: n.currentPrice,
    actionUrl: n.actionUrl,
    metadata: n.metadata,
  });

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    if (!isBackendConfigured() || !token || !isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setIsLoading(true);
    try {
      const response = await authenticatedRequest<{
        data: any[];
        count: number;
        lastEvaluatedKey?: string;
      }>('/api/notifications?limit=50', token, {
        method: 'GET',
      });

      if (response.success && response.data) {
        // Handle both array and object response structures
        const notificationsArray = Array.isArray(response.data) 
          ? response.data 
          : (response.data as any).data || [];
        const lastKey = Array.isArray(response.data) 
          ? undefined 
          : (response.data as any).lastEvaluatedKey;
        
        const validatedNotifications = validateArrayLoose(NotificationSchema, notificationsArray);
        const mappedNotifications = validatedNotifications.map(mapBackendNotification);
        setNotifications(mappedNotifications);
        setLastEvaluatedKey(lastKey);
        setHasMore(!!lastKey);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error refreshing notifications:', error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [token, isAuthenticated]);

  // Load more notifications
  const loadMoreNotifications = useCallback(async () => {
    if (!isBackendConfigured() || !token || !isAuthenticated || !hasMore || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const queryParams = new URLSearchParams({
        limit: '50',
      });
      if (lastEvaluatedKey) {
        queryParams.append('lastEvaluatedKey', lastEvaluatedKey);
      }

      const response = await authenticatedRequest<{
        data: any[];
        count: number;
        lastEvaluatedKey?: string;
      }>(`/api/notifications?${queryParams.toString()}`, token, {
        method: 'GET',
      });

      if (response.success && response.data) {
        // Handle both array and object response structures
        const notificationsArray = Array.isArray(response.data) 
          ? response.data 
          : (response.data as any).data || [];
        const lastKey = Array.isArray(response.data) 
          ? undefined 
          : (response.data as any).lastEvaluatedKey;
        
        const validatedNotifications = validateArrayLoose(NotificationSchema, notificationsArray);
        const mappedNotifications = validatedNotifications.map(mapBackendNotification);
        setNotifications(prev => [...prev, ...mappedNotifications]);
        setLastEvaluatedKey(lastKey);
        setHasMore(!!lastKey);
      }
    } catch (error) {
      console.error('Error loading more notifications:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [token, isAuthenticated, hasMore, isLoadingMore, lastEvaluatedKey]);

  // Refresh unread count
  const refreshUnreadCount = useCallback(async () => {
    if (!isBackendConfigured() || !token || !isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await authenticatedRequest<{ count: number }>('/api/notifications/count', token, {
        method: 'GET',
      });

      if (response.success && response.data) {
        setUnreadCount(response.data.count || 0);
      }
    } catch (error) {
      console.error('Error refreshing unread count:', error);
    }
  }, [token, isAuthenticated]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!isBackendConfigured() || !token || !isAuthenticated) {
      return;
    }

    try {
      const response = await authenticatedRequest(
        `/api/notifications/${notificationId}/read`,
        token,
        {
          method: 'POST',
        }
      );

      if (response.success) {
        setNotifications(prev =>
          prev.map(n =>
            n.notificationId === notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [token, isAuthenticated]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!isBackendConfigured() || !token || !isAuthenticated) {
      return;
    }

    try {
      const response = await authenticatedRequest('/api/notifications/read-all', token, {
        method: 'POST',
      });

      if (response.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [token, isAuthenticated]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!isBackendConfigured() || !token || !isAuthenticated) {
      return;
    }

    try {
      const response = await authenticatedRequest(`/api/notifications/${notificationId}`, token, {
        method: 'DELETE',
      });

      if (response.success) {
        setNotifications(prev => {
          const deleted = prev.find(n => n.notificationId === notificationId);
          const newNotifications = prev.filter(n => n.notificationId !== notificationId);
          // Update unread count if deleted notification was unread
          if (deleted && !deleted.isRead) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
          return newNotifications;
        });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [token, isAuthenticated]);

  // Delete all notifications
  const deleteAllNotifications = useCallback(async () => {
    if (!isBackendConfigured() || !token || !isAuthenticated) {
      return;
    }

    try {
      const response = await authenticatedRequest('/api/notifications/delete-all', token, {
        method: 'DELETE',
      });

      if (response.success) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  }, [token, isAuthenticated]);

  // Load notifications on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated && token) {
      refreshNotifications();
      refreshUnreadCount();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, token, refreshNotifications, refreshUnreadCount]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!isAuthenticated || !token || !isBackendConfigured()) {
      return;
    }

    const interval = setInterval(() => {
      refreshUnreadCount();
      // Optionally refresh notifications if user is on notifications screen
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, token, refreshUnreadCount]);

  const value: NotificationsContextType = {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    hasMore,
    refreshNotifications,
    loadMoreNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refreshUnreadCount,
  };

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};

