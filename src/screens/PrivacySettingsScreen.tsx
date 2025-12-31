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
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { authenticatedRequest, isBackendConfigured } from '../config/api';

export default function PrivacySettingsScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user, token } = useAuth();

  const [profileVisibility, setProfileVisibility] = useState<'public' | 'private'>('public');
  const [showPortfolioValue, setShowPortfolioValue] = useState(false);
  const [allowDataSharing, setAllowDataSharing] = useState(false);

  useEffect(() => {
    const loadPrivacySettings = async () => {
      if (!isBackendConfigured() || !token || !user) {
        // Fallback to AsyncStorage
        try {
          const saved = await AsyncStorage.getItem('privacySettings');
          if (saved) {
            const settings = JSON.parse(saved);
            setProfileVisibility(settings.profileVisibility || 'public');
            setShowPortfolioValue(settings.showPortfolioValue ?? false);
            setAllowDataSharing(settings.allowDataSharing ?? false);
          }
        } catch (error) {
          console.error('Error loading privacy settings:', error);
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

        if (response.success && response.data?.privacySettings) {
          const settings = response.data.privacySettings;
          setProfileVisibility(settings.profileVisibility || 'public');
          setShowPortfolioValue(settings.showPortfolioValue ?? true);
          setAllowDataSharing(settings.allowDataSharing ?? false);
        }
      } catch (error) {
        console.error('Error loading privacy settings from backend:', error);
        // Fallback to AsyncStorage
        try {
          const saved = await AsyncStorage.getItem('privacySettings');
          if (saved) {
            const settings = JSON.parse(saved);
            setProfileVisibility(settings.profileVisibility || 'public');
            setShowPortfolioValue(settings.showPortfolioValue ?? false);
            setAllowDataSharing(settings.allowDataSharing ?? false);
          }
        } catch (e) {
          console.error('Error loading from AsyncStorage:', e);
        }
      }
    };
    if (user) {
      loadPrivacySettings();
    }
  }, [user, token]);

  const savePrivacySettings = async (settings: {
    profileVisibility?: 'public' | 'private';
    showPortfolioValue?: boolean;
    allowDataSharing?: boolean;
  }) => {
    // Save to AsyncStorage as cache
    try {
      const current = await AsyncStorage.getItem('privacySettings');
      const currentSettings = current ? JSON.parse(current) : {};
      const updated = { ...currentSettings, ...settings };
      await AsyncStorage.setItem('privacySettings', JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving to AsyncStorage:', error);
    }

    // Save to backend if available
    if (isBackendConfigured() && token) {
      try {
        await authenticatedRequest(
          '/api/user/preferences',
          token,
          {
            method: 'PUT',
            body: JSON.stringify({
              privacySettings: settings,
            }),
          }
        );
      } catch (error) {
        console.error('Error saving privacy settings to backend:', error);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Visibility */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, backgroundColor: theme.backgroundSecondary }]}>
            PROFILE VISIBILITY
          </Text>
          
          <View style={[styles.menuItem, { borderTopColor: theme.borderLight }]}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="globe-outline" size={20} color={theme.textSecondary} />
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemText, { color: theme.text }]}>Public Profile</Text>
                <Text style={[styles.menuItemSubtext, { color: theme.textSecondary }]}>
                  Anyone can view your profile
                </Text>
              </View>
            </View>
            <Switch
              value={profileVisibility === 'public'}
              onValueChange={(value) => {
                const newVisibility = value ? 'public' : 'private';
                setProfileVisibility(newVisibility);
                savePrivacySettings({ profileVisibility: newVisibility });
              }}
              trackColor={{ false: '#D1D5DB', true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Portfolio Settings */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, backgroundColor: theme.backgroundSecondary }]}>
            PORTFOLIO
          </Text>
          
          <View style={[styles.menuItem, { borderTopColor: theme.borderLight }]}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="eye-outline" size={20} color={theme.textSecondary} />
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemText, { color: theme.text }]}>Show Portfolio Value</Text>
                <Text style={[styles.menuItemSubtext, { color: theme.textSecondary }]}>
                  Display your total portfolio value on your profile
                </Text>
              </View>
            </View>
            <Switch
              value={showPortfolioValue}
              onValueChange={(value) => {
                setShowPortfolioValue(value);
                savePrivacySettings({ showPortfolioValue: value });
              }}
              trackColor={{ false: '#D1D5DB', true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Data Sharing */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, backgroundColor: theme.backgroundSecondary }]}>
            DATA & ANALYTICS
          </Text>
          
          <View style={[styles.menuItem, { borderTopColor: theme.borderLight }]}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="analytics-outline" size={20} color={theme.textSecondary} />
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemText, { color: theme.text }]}>Allow Data Sharing</Text>
                <Text style={[styles.menuItemSubtext, { color: theme.textSecondary }]}>
                  Help improve Moro by sharing anonymous usage data
                </Text>
              </View>
            </View>
            <Switch
              value={allowDataSharing}
              onValueChange={(value) => {
                setAllowDataSharing(value);
                savePrivacySettings({ allowDataSharing: value });
              }}
              trackColor={{ false: '#D1D5DB', true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

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
});

