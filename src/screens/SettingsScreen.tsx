import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTrading } from '../context/TradingContext';
import { RootStackParamList } from '../types';

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

  // Load notification settings from backend
  useEffect(() => {
    const loadNotificationSettings = async () => {
      // Early return if no user or token
      if (!user) {
        return;
      }

      if (!isBackendConfigured() || !token) {
        // Fallback to AsyncStorage if backend not available
        try {
          const saved = await AsyncStorage.getItem('notificationSettings');
          if (saved) {
            const settings = JSON.parse(saved);
            setPushNotifications(settings.pushNotifications ?? true);
            setPriceAlerts(settings.priceAlerts ?? true);
            setTradingAlerts(settings.tradingAlerts ?? true);
            setSocialNotifications(settings.socialNotifications ?? true);
          }
        } catch (error) {
          console.error('Error loading notification settings:', error);
        }
        return;
      }

      try {
        // Load from backend using /api/auth/me endpoint
        const response = await authenticatedRequest<{ data: any }>(
          '/api/auth/me',
          token,
          { method: 'GET' }
        );

        if (response.success && response.data?.notificationSettings) {
          const settings = response.data.notificationSettings;
          setPushNotifications(settings.pushNotifications ?? true);
          setPriceAlerts(settings.priceAlerts ?? true);
          setTradingAlerts(settings.tradingAlerts ?? true);
          setSocialNotifications(settings.socialNotifications ?? true);
        } else {
          // Fallback to defaults
          setPushNotifications(true);
          setPriceAlerts(true);
          setTradingAlerts(true);
          setSocialNotifications(true);
        }
      } catch (error) {
        console.error('Error loading notification settings from backend:', error);
        // Fallback to AsyncStorage
        try {
          const saved = await AsyncStorage.getItem('notificationSettings');
          if (saved) {
            const settings = JSON.parse(saved);
            setPushNotifications(settings.pushNotifications ?? true);
            setPriceAlerts(settings.priceAlerts ?? true);
            setTradingAlerts(settings.tradingAlerts ?? true);
            setSocialNotifications(settings.socialNotifications ?? true);
          }
        } catch (e) {
          console.error('Error loading from AsyncStorage:', e);
        }
      }
    };
    
    loadNotificationSettings();
  }, [user, token]);

  // Save notification settings to backend
  const saveNotificationSettings = async (settings: {
    pushNotifications?: boolean;
    priceAlerts?: boolean;
    tradingAlerts?: boolean;
    socialNotifications?: boolean;
  }) => {
    // Save to AsyncStorage as cache
    try {
      const current = await AsyncStorage.getItem('notificationSettings');
      const currentSettings = current ? JSON.parse(current) : {};
      const updated = { ...currentSettings, ...settings };
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving to AsyncStorage:', error);
    }

    // Save to backend if available
    if (isBackendConfigured() && token && user) {
      try {
        await authenticatedRequest(
          '/api/user/preferences',
          token,
          {
            method: 'PUT',
            body: JSON.stringify({
              notificationSettings: settings,
            }),
          }
        );
      } catch (error) {
        console.error('Error saving notification settings to backend:', error);
        // Settings are still saved to AsyncStorage, so they'll persist locally
      }
    }
  };

  const handleThemeChange = (mode: 'light' | 'dark' | 'auto') => {
    setThemeMode(mode);
  };

  const handleResetPortfolio = () => {
    Alert.alert(
      'Reset Portfolio',
      'Are you sure you want to reset your portfolio? This will clear all positions and reset your balance to $10,000.',
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
            onPress={() => {
              Alert.alert(
                'Security Settings',
                'Security features like password change and 2FA will be available in a future update.',
                [{ text: 'OK' }]
              );
            }}
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
            onPress={() => {
              Linking.openURL('mailto:team@moro.support?subject=Support Request');
            }}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="mail-outline" size={20} color={theme.textSecondary} />
              <View style={styles.menuItemContent}>
                <Text style={dynamicStyles.menuItemText}>Email</Text>
                <Text style={dynamicStyles.menuItemSubtext}>team@moro.support</Text>
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
                styles.themeButton,
                { backgroundColor: theme.card, borderColor: theme.border },
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
                styles.themeButton,
                { backgroundColor: theme.card, borderColor: theme.border },
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
                styles.themeButton,
                { backgroundColor: theme.card, borderColor: theme.border },
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
                saveNotificationSettings({ pushNotifications: value });
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
                saveNotificationSettings({ priceAlerts: value });
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
                saveNotificationSettings({ tradingAlerts: value });
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
                saveNotificationSettings({ socialNotifications: value });
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
            onPress={() => navigation.navigate('TradingHistory')}
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
        </View>

        {/* Support Section */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>SUPPORT</Text>
          
          <TouchableOpacity 
            style={dynamicStyles.menuItem}
            onPress={() => {
              Alert.alert(
                'Help Center',
                'Help documentation will be available soon. For now, please contact support.',
                [{ text: 'OK' }]
              );
            }}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="help-circle-outline" size={20} color={theme.textSecondary} />
              <Text style={dynamicStyles.menuItemText}>Help Center</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={dynamicStyles.menuItem}
            onPress={() => {
              Linking.openURL('mailto:team@moro.support?subject=Support Request');
            }}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="chatbox-ellipses-outline" size={20} color={theme.textSecondary} />
              <Text style={dynamicStyles.menuItemText}>Contact Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={dynamicStyles.menuItem}
            onPress={() => {
              Alert.alert(
                'Terms & Privacy Policy',
                'Terms and Privacy Policy will be available on our website soon.',
                [{ text: 'OK' }]
              );
            }}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="document-text-outline" size={20} color={theme.textSecondary} />
              <Text style={dynamicStyles.menuItemText}>Terms & Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={dynamicStyles.menuItem}
            onPress={() => {
              Alert.alert(
                'About Moro',
                'Moro - Social Trading Platform\nVersion 1.0.2\n\nTrade confidence in people, companies, and ideas.',
                [{ text: 'OK' }]
              );
            }}
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

