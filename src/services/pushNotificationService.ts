import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { authenticatedRequest, isBackendConfigured } from '../config/api';
import { reportError } from './errorReporting';

// Configure how notifications should be displayed when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationToken {
  token: string;
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
}

/**
 * Request push notification permissions from the user
 */
export async function requestPushPermissions(): Promise<boolean> {
  try {
    // Only request permissions on physical devices
    if (!Device.isDevice) {
      console.log('Push notifications are only available on physical devices');
      return false;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permissions not granted');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting push permissions:', error);
    reportError(error, { context: 'requestPushPermissions' });
    return false;
  }
}

/**
 * Get the Expo push token for this device
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log('Push tokens are only available on physical devices');
      return null;
    }

    // Get the Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      console.error('No Expo project ID found in app config');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return tokenData.data;
  } catch (error) {
    console.error('Error getting Expo push token:', error);
    reportError(error, { context: 'getExpoPushToken' });
    return null;
  }
}

/**
 * Get a unique device identifier
 */
async function getDeviceId(): Promise<string> {
  // Use a combination of device properties to create a unique ID
  const deviceName = Device.deviceName || 'unknown';
  const osVersion = Device.osVersion || 'unknown';
  const modelName = Device.modelName || 'unknown';

  // Create a simple hash-like identifier
  const deviceString = `${deviceName}-${modelName}-${osVersion}`;
  return deviceString.replace(/\s+/g, '-').toLowerCase();
}

/**
 * Register for push notifications and store the token with the backend
 */
export async function registerForPushNotifications(token: string): Promise<PushNotificationToken | null> {
  try {
    if (!isBackendConfigured() || !token) {
      console.log('Backend not configured or no token provided');
      return null;
    }

    // Request permissions
    const hasPermission = await requestPushPermissions();
    if (!hasPermission) {
      return null;
    }

    // Get Expo push token
    const expoPushToken = await getExpoPushToken();
    if (!expoPushToken) {
      return null;
    }

    // Get device info
    const deviceId = await getDeviceId();
    const platform = Platform.OS as 'ios' | 'android' | 'web';

    // Store token with backend
    const response = await authenticatedRequest(
      '/api/notifications/token',
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          token: expoPushToken,
          deviceId,
          platform,
        }),
      }
    );

    if (response.success) {
      console.log('Push token registered successfully');
      return {
        token: expoPushToken,
        deviceId,
        platform,
      };
    } else {
      console.error('Failed to register push token:', response.error);
      return null;
    }
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    reportError(error, { context: 'registerForPushNotifications' });
    return null;
  }
}

/**
 * Unregister push notifications for this device
 */
export async function unregisterPushNotifications(
  authToken: string,
  deviceId?: string
): Promise<boolean> {
  try {
    if (!isBackendConfigured() || !authToken) {
      return false;
    }

    // Use provided deviceId or get current device ID
    const targetDeviceId = deviceId || (await getDeviceId());

    const response = await authenticatedRequest(
      `/api/notifications/token/${encodeURIComponent(targetDeviceId)}`,
      authToken,
      { method: 'DELETE' }
    );

    if (response.success) {
      console.log('Push token unregistered successfully');
      return true;
    } else {
      console.error('Failed to unregister push token:', response.error);
      return false;
    }
  } catch (error) {
    console.error('Error unregistering push notifications:', error);
    reportError(error, { context: 'unregisterPushNotifications' });
    return false;
  }
}

/**
 * Get all push tokens for the current user
 */
export async function getUserPushTokens(authToken: string): Promise<PushNotificationToken[]> {
  try {
    if (!isBackendConfigured() || !authToken) {
      return [];
    }

    const response = await authenticatedRequest<{ tokens: PushNotificationToken[] }>(
      '/api/notifications/tokens',
      authToken,
      { method: 'GET' }
    );

    if (response.success && response.data?.tokens) {
      return response.data.tokens;
    }

    return [];
  } catch (error) {
    console.error('Error getting push tokens:', error);
    reportError(error, { context: 'getUserPushTokens' });
    return [];
  }
}

/**
 * Send a test push notification to the current device
 */
export async function sendTestNotification(authToken: string): Promise<boolean> {
  try {
    if (!isBackendConfigured() || !authToken) {
      return false;
    }

    const response = await authenticatedRequest(
      '/api/notifications/test',
      authToken,
      { method: 'POST' }
    );

    if (response.success) {
      console.log('Test notification sent successfully');
      return true;
    } else {
      console.error('Failed to send test notification:', response.error);
      return false;
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    reportError(error, { context: 'sendTestNotification' });
    return false;
  }
}

/**
 * Add a listener for when notifications are received while the app is in the foreground
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add a listener for when a user taps on a notification
 */
export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Remove all notification listeners
 */
export function removeAllNotificationListeners() {
  Notifications.removeAllNotificationListeners();
}

/**
 * Schedule a local notification (for testing purposes)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  delaySeconds: number = 0
): Promise<string | null> {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: delaySeconds > 0 ? { seconds: delaySeconds } : null,
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling local notification:', error);
    reportError(error, { context: 'scheduleLocalNotification' });
    return null;
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error canceling notification:', error);
    reportError(error, { context: 'cancelNotification' });
  }
}

/**
 * Get the notification badge count
 */
export async function getBadgeCount(): Promise<number> {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    console.error('Error getting badge count:', error);
    return 0;
  }
}

/**
 * Set the notification badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('Error setting badge count:', error);
    reportError(error, { context: 'setBadgeCount' });
  }
}
