import React, { useEffect, useRef } from 'react';
import { NavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import {
  registerForPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  removeAllNotificationListeners,
} from '../services/pushNotificationService';
import { RootStackParamList } from '../types';
import { reportError } from '../services/errorReporting';

interface PushNotificationManagerProps {
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>;
}

/**
 * Component that manages push notification registration and handling
 */
export default function PushNotificationManager({ navigationRef }: PushNotificationManagerProps) {
  const { isAuthenticated, token, user } = useAuth();
  const registeredRef = useRef(false);

  // Register for push notifications when user logs in
  useEffect(() => {
    if (isAuthenticated && token && user && !registeredRef.current) {
      registerForPushNotifications(token)
        .then((result) => {
          if (result) {
            console.log('Push notifications registered successfully');
            registeredRef.current = true;
          }
        })
        .catch((error) => {
          console.error('Failed to register push notifications:', error);
          reportError(error, { context: 'PushNotificationManager.register' });
        });
    }

    // Reset registration flag when user logs out
    if (!isAuthenticated) {
      registeredRef.current = false;
    }
  }, [isAuthenticated, token, user]);

  // Set up notification listeners
  useEffect(() => {
    // Listener for notifications received while app is in foreground
    const receivedSubscription = addNotificationReceivedListener((notification) => {
      console.log('Notification received in foreground:', notification);
      // You can show a custom in-app notification here if desired
    });

    // Listener for when user taps on a notification
    const responseSubscription = addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped:', response);
      handleNotificationTap(response);
    });

    // Clean up listeners on unmount
    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  /**
   * Handle notification tap and navigate to the appropriate screen
   */
  const handleNotificationTap = (response: Notifications.NotificationResponse) => {
    try {
      const data = response.notification.request.content.data;
      console.log('Notification data:', data);

      if (!navigationRef.current) {
        console.warn('Navigation ref not ready');
        return;
      }

      // Handle different notification types
      if (data.type) {
        switch (data.type) {
          case 'post':
            // Navigate to a specific post (via NewsFeed or Community feed)
            if (data.postId) {
              navigationRef.current.navigate('Main', { screen: 'Community' });
              // TODO: Implement direct post navigation once PostDetailScreen is available
            }
            break;

          case 'comment':
            // Navigate to comments for a post
            if (data.postId) {
              navigationRef.current.navigate('AllComments', { postId: data.postId });
            }
            break;

          case 'like':
            // Navigate to the liked post or user's profile
            if (data.postId) {
              navigationRef.current.navigate('Main', { screen: 'Community' });
            } else if (data.userId) {
              navigationRef.current.navigate('UserProfile', { userId: data.userId });
            }
            break;

          case 'follow':
            // Navigate to the follower's profile
            if (data.userId) {
              navigationRef.current.navigate('UserProfile', { userId: data.userId });
            }
            break;

          case 'entity':
            // Navigate to entity detail screen
            if (data.entityId) {
              navigationRef.current.navigate('Entity', { entityId: Number(data.entityId) });
            }
            break;

          case 'news':
            // Navigate to news detail screen
            if (data.articleId) {
              navigationRef.current.navigate('NewsDetail', { articleId: data.articleId });
            } else {
              navigationRef.current.navigate('Main', { screen: 'News' });
            }
            break;

          case 'group':
            // Navigate to group detail screen
            if (data.groupId) {
              navigationRef.current.navigate('GroupDetail', { groupId: data.groupId });
            } else {
              navigationRef.current.navigate('Main', { screen: 'Groups' });
            }
            break;

          case 'trade':
          case 'portfolio':
            // Navigate to portfolio screen
            navigationRef.current.navigate('Main', { screen: 'Portfolio' });
            break;

          case 'alert':
            // Navigate to the entity that triggered the alert
            if (data.entityId) {
              navigationRef.current.navigate('Entity', { entityId: Number(data.entityId) });
            }
            break;

          case 'competition':
            // Navigate to seasonal competition screen
            navigationRef.current.navigate('Main', { screen: 'SeasonalCompetition' });
            break;

          default:
            // Default: navigate to notifications screen
            navigationRef.current.navigate('Notifications');
            break;
        }
      } else {
        // If no type specified, navigate to notifications screen
        navigationRef.current.navigate('Notifications');
      }
    } catch (error) {
      console.error('Error handling notification tap:', error);
      reportError(error, {
        context: 'PushNotificationManager.handleNotificationTap',
        notificationData: response.notification.request.content.data,
      });
    }
  };

  // This component doesn't render anything
  return null;
}
