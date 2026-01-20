/**
 * Push Notification Service
 * 
 * Handles push notifications for breaking news, price alerts, and social updates
 * Uses Expo Notifications API + Firebase Cloud Messaging
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { formatCurrency } from '../utils/dataGenerator';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type: 'breaking_news' | 'price_alert' | 'trade_update' | 'social_mention' | 'entity_update';
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Notifications only work on physical devices');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return false;
  }

  return true;
}

/**
 * Get push notification token for device
 */
export async function getPushToken(): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermissions();
    
    if (!hasPermission) {
      return null;
    }

    // Get the token for Firebase Cloud Messaging
    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'your-project-id',
      })
    ).data;

    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#775a96',
      });

      // Breaking news channel
      await Notifications.setNotificationChannelAsync('breaking_news', {
        name: 'Breaking News',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#DC2626',
        sound: 'default',
      });

      // Price alerts channel
      await Notifications.setNotificationChannelAsync('price_alerts', {
        name: 'Price Alerts',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });
    }

    return token;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  notification: NotificationData,
  delaySeconds: number = 0
): Promise<string> {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: { ...notification.data, type: notification.type },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: delaySeconds > 0 
        ? { seconds: delaySeconds }
        : null,
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    throw error;
  }
}

/**
 * Send breaking news notification
 */
export async function sendBreakingNewsNotification(
  title: string,
  summary: string,
  articleId: string,
  entityTicker?: string
): Promise<void> {
  await scheduleLocalNotification({
    type: 'breaking_news',
    title: `🚨 ${title}`,
    body: summary,
    data: {
      articleId,
      entityTicker,
      screen: 'News',
    },
  });
}

/**
 * Send price alert notification
 */
export async function sendPriceAlertNotification(
  entityTicker: string,
  entityName: string,
  currentPrice: number,
  changePercent: number
): Promise<void> {
  const direction = changePercent > 0 ? '📈' : '📉';
  const action = changePercent > 0 ? 'up' : 'down';
  
  await scheduleLocalNotification({
    type: 'price_alert',
    title: `${direction} ${entityTicker} Alert`,
    body: `${entityName} is ${action} ${Math.abs(changePercent).toFixed(2)}% to ${formatCurrency(currentPrice)}`,
    data: {
      entityTicker,
      screen: 'Entity',
    },
  });
}

/**
 * Send entity update notification (major news event)
 */
export async function sendEntityUpdateNotification(
  entityTicker: string,
  entityName: string,
  updateMessage: string
): Promise<void> {
  await scheduleLocalNotification({
    type: 'entity_update',
    title: `${entityTicker} Update`,
    body: updateMessage,
    data: {
      entityTicker,
      screen: 'Entity',
    },
  });
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Cancel specific notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Setup notification listeners
 */
export function setupNotificationListeners(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationResponse: (response: Notifications.NotificationResponse) => void
) {
  // Notification received while app is foregrounded
  const receivedListener = Notifications.addNotificationReceivedListener(onNotificationReceived);

  // Notification tapped/interacted with
  const responseListener = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);

  return () => {
    Notifications.removeNotificationSubscription(receivedListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}

/**
 * Handle notification tap navigation
 */
export function handleNotificationNavigation(
  response: Notifications.NotificationResponse,
  navigation: any
) {
  const data = response.notification.request.content.data;

  switch (data.type) {
    case 'breaking_news':
      if (data.screen) {
        navigation.navigate(data.screen);
      }
      break;
    
    case 'price_alert':
    case 'entity_update':
      if (data.entityTicker && data.screen) {
        // Navigate to entity detail
        // You'll need to map ticker to entityId
        navigation.navigate(data.screen, {
          ticker: data.entityTicker,
        });
      }
      break;
    
    case 'social_mention':
      navigation.navigate('Profile');
      break;
    
    default:
      // Navigate to home
      navigation.navigate('Home');
  }
}

/**
 * Register device token with backend (to be implemented)
 */
export async function registerDeviceToken(userId: string, token: string): Promise<void> {
  // TODO: Send token to backend to store for push notifications
  // This would be an API call to your backend
  console.log('Register device token:', { userId, token });
  
  // Example:
  // await fetch('https://your-api.com/users/register-device', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ userId, token, platform: Platform.OS }),
  // });
}

/**
 * Unregister device token (on logout)
 */
export async function unregisterDeviceToken(userId: string, token: string): Promise<void> {
  // TODO: Remove token from backend
  console.log('Unregister device token:', { userId, token });
}

export default {
  requestNotificationPermissions,
  getPushToken,
  scheduleLocalNotification,
  sendBreakingNewsNotification,
  sendPriceAlertNotification,
  sendEntityUpdateNotification,
  cancelAllNotifications,
  cancelNotification,
  setupNotificationListeners,
  handleNotificationNavigation,
  registerDeviceToken,
  unregisterDeviceToken,
};

