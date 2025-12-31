import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { authenticatedRequest, isBackendConfigured } from '../config/api';

export default function TradingPreferencesScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user, token } = useAuth();

  const [requireConfirmation, setRequireConfirmation] = useState(true);
  const [showTradePreview, setShowTradePreview] = useState(true);
  const [enableSlippageWarning, setEnableSlippageWarning] = useState(true);

  useEffect(() => {
    const loadTradingPreferences = async () => {
      if (!isBackendConfigured() || !token || !user) {
        // Fallback to AsyncStorage
        try {
          const saved = await AsyncStorage.getItem('tradingPreferences');
          if (saved) {
            const prefs = JSON.parse(saved);
            setRequireConfirmation(prefs.requireConfirmation ?? true);
            setShowTradePreview(prefs.showTradePreview ?? true);
            setEnableSlippageWarning(prefs.enableSlippageWarning ?? true);
          }
        } catch (error) {
          console.error('Error loading trading preferences:', error);
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

        if (response.success && response.data?.tradingPreferences) {
          const prefs = response.data.tradingPreferences;
          setRequireConfirmation(prefs.requireConfirmation ?? true);
          setShowTradePreview(prefs.showTradePreview ?? true);
          setEnableSlippageWarning(prefs.enableSlippageWarning ?? true);
        }
      } catch (error) {
        console.error('Error loading trading preferences from backend:', error);
        // Fallback to AsyncStorage
        try {
          const saved = await AsyncStorage.getItem('tradingPreferences');
          if (saved) {
            const prefs = JSON.parse(saved);
            setRequireConfirmation(prefs.requireConfirmation ?? true);
            setShowTradePreview(prefs.showTradePreview ?? true);
            setEnableSlippageWarning(prefs.enableSlippageWarning ?? true);
          }
        } catch (e) {
          console.error('Error loading from AsyncStorage:', e);
        }
      }
    };
    if (user) {
      loadTradingPreferences();
    }
  }, [user, token]);

  const saveTradingPreferences = async (prefs: {
    requireConfirmation?: boolean;
    showTradePreview?: boolean;
    enableSlippageWarning?: boolean;
  }) => {
    // Save to AsyncStorage as cache
    try {
      const current = await AsyncStorage.getItem('tradingPreferences');
      const currentPrefs = current ? JSON.parse(current) : {};
      const updated = { ...currentPrefs, ...prefs };
      await AsyncStorage.setItem('tradingPreferences', JSON.stringify(updated));
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
              tradingPreferences: prefs,
            }),
          }
        );
      } catch (error) {
        console.error('Error saving trading preferences to backend:', error);
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Trading Preferences</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Confirmation Settings */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, backgroundColor: theme.backgroundSecondary }]}>
            CONFIRMATION
          </Text>
          
          <View style={[styles.menuItem, { borderTopColor: theme.borderLight }]}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="checkmark-circle-outline" size={20} color={theme.textSecondary} />
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemText, { color: theme.text }]}>Require Confirmation</Text>
                <Text style={[styles.menuItemSubtext, { color: theme.textSecondary }]}>
                  Show confirmation dialog before executing trades
                </Text>
              </View>
            </View>
            <Switch
              value={requireConfirmation}
              onValueChange={(value) => {
                setRequireConfirmation(value);
                saveTradingPreferences({ requireConfirmation: value });
              }}
              trackColor={{ false: '#D1D5DB', true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.menuItem, { borderTopColor: theme.borderLight }]}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="eye-outline" size={20} color={theme.textSecondary} />
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemText, { color: theme.text }]}>Show Trade Preview</Text>
                <Text style={[styles.menuItemSubtext, { color: theme.textSecondary }]}>
                  Display trade details before confirmation
                </Text>
              </View>
            </View>
            <Switch
              value={showTradePreview}
              onValueChange={(value) => {
                setShowTradePreview(value);
                saveTradingPreferences({ showTradePreview: value });
              }}
              trackColor={{ false: '#D1D5DB', true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Safety Settings */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, backgroundColor: theme.backgroundSecondary }]}>
            SAFETY
          </Text>
          
          <View style={[styles.menuItem, { borderTopColor: theme.borderLight }]}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="warning-outline" size={20} color={theme.textSecondary} />
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemText, { color: theme.text }]}>Slippage Warning</Text>
                <Text style={[styles.menuItemSubtext, { color: theme.textSecondary }]}>
                  Warn when price differs significantly from expected
                </Text>
              </View>
            </View>
            <Switch
              value={enableSlippageWarning}
              onValueChange={(value) => {
                setEnableSlippageWarning(value);
                saveTradingPreferences({ enableSlippageWarning: value });
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

