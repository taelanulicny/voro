import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTrading } from '../context/TradingContext';
import { authenticatedRequest, isBackendConfigured } from '../config/api';
import { RootStackParamList } from '../types';

const NOTIFICATION_SETTINGS_KEY = '@settings:notifications';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout, token } = useAuth();
  const { theme, themeMode, isDark, setThemeMode } = useTheme();
  const { resetPortfolio } = useTrading();

  // Settings state
  const [pushNotifications, setPushNotifications] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [tradingAlerts, setTradingAlerts] = useState(true);
  const [socialNotifications, setSocialNotifications] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Load notification settings on mount
  useEffect(() => {
    loadNotificationSettings();
  }, [user, token]);

  const loadNotificationSettings = async () => {
    try {
      // Try to load from AsyncStorage first
      const cached = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (cached) {
        const settings = JSON.parse(cached);
        setPushNotifications(settings.pushNotifications ?? true);
        setPriceAlerts(settings.priceAlerts ?? true);
        setTradingAlerts(settings.tradingAlerts ?? true);
        setSocialNotifications(settings.socialNotifications ?? true);
      }

      // Try to load from backend if configured
      if (isBackendConfigured() && token && user) {
        const response = await authenticatedRequest('/api/auth/me', token, {
          method: 'GET',
        });

        if (response.success && response.data?.user?.notificationSettings) {
          const settings = response.data.user.notificationSettings;
          setPushNotifications(settings.pushNotifications ?? true);
          setPriceAlerts(settings.priceAlerts ?? true);
          setTradingAlerts(settings.tradingAlerts ?? true);
          setSocialNotifications(settings.socialNotifications ?? true);

          // Update cache
          await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
        }
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const saveNotificationSetting = async (key: string, value: boolean) => {
    const settings = {
      pushNotifications,
      priceAlerts,
      tradingAlerts,
      socialNotifications,
      [key]: value,
    };

    try {
      // Save to AsyncStorage immediately
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));

      // Save to backend if configured
      if (isBackendConfigured() && token && user) {
        await authenticatedRequest('/api/user/preferences', token, {
          method: 'PUT',
          body: JSON.stringify({
            notificationSettings: settings,
          }),
        });
      }
    } catch (error) {
      console.error('Error saving notification setting:', error);
      Alert.alert('Error', 'Failed to save notification settings. Please try again.');
    }
  };

  const handleThemeChange = (mode: 'light' | 'dark' | 'auto') => {
    setThemeMode(mode);
  };

  const handleResetPortfolio = () => {
    Alert.alert(
      'Reset Portfolio',
      'Are you sure you want to reset your portfolio? This will clear all positions and reset your balance to $1,000.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetPortfolio();
            Alert.alert('Success', 'Portfolio has been reset');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const handleResetAppData = () => {
    Alert.alert(
      'Reset All App Data',
      'This will delete ALL app data including:\n\n• Trading positions and history\n• Social posts and comments\n• Watchlist\n• Settings\n• Cached data\n\nYou will be logged out and need to sign in again. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear AsyncStorage
              await AsyncStorage.clear();

              // Clear SecureStore tokens
              try {
                await SecureStore.deleteItemAsync('userToken');
                await SecureStore.deleteItemAsync('refreshToken');
              } catch (error) {
                console.log('SecureStore clear error (may not exist):', error);
              }

              // Show success message
              Alert.alert(
                'Data Cleared',
                'All app data has been deleted. The app will restart.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Logout will clear auth state and navigate to welcome
                      logout();
                    },
                  },
                ]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to reset app data. Please try again.');
              console.error('Reset app data error:', error);
            }
          },
        },
      ]
    );
  };

  const dynamicStyles = {
    container: {
      ...styles.container,
      backgroundColor: theme.card,
    },
    section: {
      ...styles.section,
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
    sectionTitle: {
      ...styles.sectionTitle,
      color: theme.textSecondary,
      backgroundColor: theme.backgroundSecondary,
    },
    menuItem: {
      ...styles.menuItem,
      backgroundColor: theme.card,
      borderTopColor: theme.borderLight,
    },
    menuItemText: {
      ...styles.menuItemText,
      color: theme.text,
    },
    menuItemSubtext: {
      ...styles.menuItemSubtext,
      color: theme.textSecondary,
    },
    themeButton: {
      ...styles.themeButton,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
  };

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>ACCOUNT</Text>
          
          <TouchableOpacity
            style={dynamicStyles.menuItem}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="person-outline" size={20} color={theme.textSecondary} />
              <View style={styles.menuItemContent}>
                <Text style={dynamicStyles.menuItemText}>Edit Profile</Text>
                <Text style={dynamicStyles.menuItemSubtext}>Name, bio, avatar</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.menuItem}
            onPress={() => navigation.navigate('Security')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.textSecondary} />
              <View style={styles.menuItemContent}>
                <Text style={dynamicStyles.menuItemText}>Security</Text>
                <Text style={dynamicStyles.menuItemSubtext}>Password, 2FA</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.menuItem}
            onPress={() => navigation.navigate('Email')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="mail-outline" size={20} color={theme.textSecondary} />
              <View style={styles.menuItemContent}>
                <Text style={dynamicStyles.menuItemText}>Email</Text>
                <Text style={dynamicStyles.menuItemSubtext}>{user?.email || 'team@moro.support'}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Appearance Section */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>APPEARANCE</Text>
          
          <View style={dynamicStyles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="moon-outline" size={20} color={theme.textSecondary} />
              <Text style={dynamicStyles.menuItemText}>Theme</Text>
            </View>
          </View>

          <View style={[styles.themeOptions, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={[
                dynamicStyles.themeButton,
                themeMode === 'light' && styles.themeButtonActive,
                themeMode === 'light' && { backgroundColor: theme.primaryLight, borderColor: theme.primary },
              ]}
              onPress={() => handleThemeChange('light')}
            >
              <Ionicons
                name="sunny"
                size={20}
                color={themeMode === 'light' ? theme.primary : theme.textSecondary}
              />
              <Text
                style={[
                  styles.themeButtonText,
                  { color: themeMode === 'light' ? theme.primary : theme.textSecondary },
                ]}
              >
                Light
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                dynamicStyles.themeButton,
                themeMode === 'dark' && styles.themeButtonActive,
                themeMode === 'dark' && { backgroundColor: theme.primaryLight, borderColor: theme.primary },
              ]}
              onPress={() => handleThemeChange('dark')}
            >
              <Ionicons
                name="moon"
                size={20}
                color={themeMode === 'dark' ? theme.primary : theme.textSecondary}
              />
              <Text
                style={[
                  styles.themeButtonText,
                  { color: themeMode === 'dark' ? theme.primary : theme.textSecondary },
                ]}
              >
                Dark
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                dynamicStyles.themeButton,
                themeMode === 'auto' && styles.themeButtonActive,
                themeMode === 'auto' && { backgroundColor: theme.primaryLight, borderColor: theme.primary },
              ]}
              onPress={() => handleThemeChange('auto')}
            >
              <Ionicons
                name="phone-portrait-outline"
                size={20}
                color={themeMode === 'auto' ? theme.primary : theme.textSecondary}
              />
              <Text
                style={[
                  styles.themeButtonText,
                  { color: themeMode === 'auto' ? theme.primary : theme.textSecondary },
                ]}
              >
                Auto
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>NOTIFICATIONS</Text>
          
          <View style={dynamicStyles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="notifications-outline" size={20} color={theme.textSecondary} />
              <Text style={dynamicStyles.menuItemText}>Push Notifications</Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={(value) => {
                setPushNotifications(value);
                saveNotificationSetting('pushNotifications', value);
              }}
              trackColor={{ false: '#D1D5DB', true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={dynamicStyles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="trending-up-outline" size={20} color={theme.textSecondary} />
              <View style={styles.menuItemContent}>
                <Text style={dynamicStyles.menuItemText}>Price Alerts</Text>
                <Text style={dynamicStyles.menuItemSubtext}>Get notified of major price moves</Text>
              </View>
            </View>
            <Switch
              value={priceAlerts}
              onValueChange={(value) => {
                setPriceAlerts(value);
                saveNotificationSetting('priceAlerts', value);
              }}
              trackColor={{ false: '#D1D5DB', true: theme.primary }}
              thumbColor="#FFFFFF"
              disabled={!pushNotifications}
            />
          </View>

          <View style={dynamicStyles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="wallet-outline" size={20} color={theme.textSecondary} />
              <View style={styles.menuItemContent}>
                <Text style={dynamicStyles.menuItemText}>Trading Alerts</Text>
                <Text style={dynamicStyles.menuItemSubtext}>Trade confirmations & updates</Text>
              </View>
            </View>
            <Switch
              value={tradingAlerts}
              onValueChange={(value) => {
                setTradingAlerts(value);
                saveNotificationSetting('tradingAlerts', value);
              }}
              trackColor={{ false: '#D1D5DB', true: theme.primary }}
              thumbColor="#FFFFFF"
              disabled={!pushNotifications}
            />
          </View>

          <View style={dynamicStyles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="chatbubbles-outline" size={20} color={theme.textSecondary} />
              <View style={styles.menuItemContent}>
                <Text style={dynamicStyles.menuItemText}>Social Activity</Text>
                <Text style={dynamicStyles.menuItemSubtext}>Mentions, comments, likes</Text>
              </View>
            </View>
            <Switch
              value={socialNotifications}
              onValueChange={(value) => {
                setSocialNotifications(value);
                saveNotificationSetting('socialNotifications', value);
              }}
              trackColor={{ false: '#D1D5DB', true: theme.primary }}
              thumbColor="#FFFFFF"
              disabled={!pushNotifications}
            />
          </View>
        </View>

        {/* Privacy Section */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>PRIVACY & SAFETY</Text>
          
          <TouchableOpacity
            style={dynamicStyles.menuItem}
            onPress={() => navigation.navigate('PrivacySettings')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} />
              <View style={styles.menuItemContent}>
                <Text style={dynamicStyles.menuItemText}>Privacy Settings</Text>
                <Text style={dynamicStyles.menuItemSubtext}>Profile visibility, data sharing</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.menuItem}
            onPress={() => navigation.navigate('BlockedUsers')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="eye-off-outline" size={20} color={theme.textSecondary} />
              <View style={styles.menuItemContent}>
                <Text style={dynamicStyles.menuItemText}>Blocked Users</Text>
                <Text style={dynamicStyles.menuItemSubtext}>Manage blocked accounts</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Trading Section */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>TRADING</Text>
          
          <TouchableOpacity
            style={dynamicStyles.menuItem}
            onPress={() => navigation.navigate('TradeHistory')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="time-outline" size={20} color={theme.textSecondary} />
              <View style={styles.menuItemContent}>
                <Text style={dynamicStyles.menuItemText}>Trading History</Text>
                <Text style={dynamicStyles.menuItemSubtext}>View past transactions</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.menuItem}
            onPress={() => navigation.navigate('TradingPreferences')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="settings-outline" size={20} color={theme.textSecondary} />
              <View style={styles.menuItemContent}>
                <Text style={dynamicStyles.menuItemText}>Trading Preferences</Text>
                <Text style={dynamicStyles.menuItemSubtext}>Confirmation settings</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.menuItem}
            onPress={() => navigation.navigate('Simulator')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="analytics-outline" size={20} color={theme.accent} />
              <View style={styles.menuItemContent}>
                <Text style={[dynamicStyles.menuItemText, { color: theme.accent }]}>
                  Paper Trading Simulator
                </Text>
                <Text style={dynamicStyles.menuItemSubtext}>Practice trading with virtual money</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.menuItem}
            onPress={handleResetPortfolio}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="refresh-outline" size={20} color="#F59E0B" />
              <View style={styles.menuItemContent}>
                <Text style={[dynamicStyles.menuItemText, { color: '#F59E0B' }]}>
                  Reset Portfolio
                </Text>
                <Text style={dynamicStyles.menuItemSubtext}>Clear all positions (Dev Only)</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.menuItem}
            onPress={handleResetAppData}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <View style={styles.menuItemContent}>
                <Text style={[dynamicStyles.menuItemText, { color: '#EF4444' }]}>
                  Reset All App Data
                </Text>
                <Text style={dynamicStyles.menuItemSubtext}>Clear everything and logout</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>SUPPORT</Text>
          
          <TouchableOpacity
            style={dynamicStyles.menuItem}
            onPress={() => navigation.navigate('HelpCenter')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="help-circle-outline" size={20} color={theme.textSecondary} />
              <Text style={dynamicStyles.menuItemText}>Help Center</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.menuItem}
            onPress={() => navigation.navigate('ContactSupport')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="chatbox-ellipses-outline" size={20} color={theme.textSecondary} />
              <Text style={dynamicStyles.menuItemText}>Contact Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.menuItem}
            onPress={() => navigation.navigate('Legal', { documentType: 'terms' })}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="document-text-outline" size={20} color={theme.textSecondary} />
              <Text style={dynamicStyles.menuItemText}>Terms & Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.menuItem}
            onPress={() => navigation.navigate('About')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
              <View style={styles.menuItemContent}>
                <Text style={dynamicStyles.menuItemText}>About Moro</Text>
                <Text style={dynamicStyles.menuItemSubtext}>Version 1.0.2</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.error }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    padding: 16,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
  },
  menuItemSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  themeOptions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  themeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  themeButtonActive: {
    // Active styles applied dynamically
  },
  themeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 16,
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

