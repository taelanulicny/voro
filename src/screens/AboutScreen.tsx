import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as Application from 'expo-application';
import * as Device from 'expo-device';

export default function AboutScreen({ navigation }: any) {
  const { theme } = useTheme();

  // App version info
  const appVersion = Application.nativeApplicationVersion || '1.0.2';
  const buildNumber = Application.nativeBuildVersion || '1';
  const bundleId = Application.applicationId || 'com.moro.app';

  const dynamicStyles = {
    container: {
      ...styles.container,
      backgroundColor: theme.background,
    },
    header: {
      ...styles.header,
      backgroundColor: theme.background,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      ...styles.headerTitle,
      color: theme.text,
    },
    scrollView: {
      ...styles.scrollView,
      backgroundColor: theme.background,
    },
    section: {
      ...styles.section,
      backgroundColor: theme.surface,
      borderTopColor: theme.border,
      borderBottomColor: theme.border,
    },
    sectionTitle: {
      ...styles.sectionTitle,
      color: theme.textSecondary,
    },
    infoRow: {
      ...styles.infoRow,
      borderBottomColor: theme.border,
    },
    infoLabel: {
      ...styles.infoLabel,
      color: theme.textSecondary,
    },
    infoValue: {
      ...styles.infoValue,
      color: theme.text,
    },
    linkButton: {
      ...styles.linkButton,
      backgroundColor: theme.background,
      borderColor: theme.border,
    },
    linkText: {
      ...styles.linkText,
      color: theme.text,
    },
    description: {
      ...styles.description,
      color: theme.textSecondary,
    },
    creditsText: {
      ...styles.creditsText,
      color: theme.textSecondary,
    },
    legalLink: {
      ...styles.legalLink,
      color: theme.primary,
    },
  };

  const handleOpenLink = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>About</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={dynamicStyles.scrollView} showsVerticalScrollIndicator={false}>
        {/* App Logo & Name */}
        <View style={styles.logoContainer}>
          <View style={[styles.logoPlaceholder, { backgroundColor: theme.primary }]}>
            <Ionicons name="trending-up" size={48} color="#FFFFFF" />
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>Moro</Text>
          <Text style={dynamicStyles.description}>Social Trading Platform</Text>
          <Text style={[styles.versionText, { color: theme.textTertiary }]}>
            Version {appVersion} ({buildNumber})
          </Text>
        </View>

        {/* App Info */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>APP INFORMATION</Text>

          <View style={dynamicStyles.infoRow}>
            <Text style={dynamicStyles.infoLabel}>Version</Text>
            <Text style={dynamicStyles.infoValue}>{appVersion}</Text>
          </View>

          <View style={dynamicStyles.infoRow}>
            <Text style={dynamicStyles.infoLabel}>Build Number</Text>
            <Text style={dynamicStyles.infoValue}>{buildNumber}</Text>
          </View>

          <View style={dynamicStyles.infoRow}>
            <Text style={dynamicStyles.infoLabel}>Bundle ID</Text>
            <Text style={dynamicStyles.infoValue}>{bundleId}</Text>
          </View>

          <View style={[dynamicStyles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={dynamicStyles.infoLabel}>Device</Text>
            <Text style={dynamicStyles.infoValue}>
              {Device.modelName || 'Unknown'} ({Device.osName} {Device.osVersion})
            </Text>
          </View>
        </View>

        {/* Description */}
        <View style={[dynamicStyles.section, { marginTop: 24 }]}>
          <Text style={dynamicStyles.sectionTitle}>ABOUT MORO</Text>
          <Text style={dynamicStyles.description}>
            Moro is a revolutionary social trading platform where you can trade virtual shares of
            people, companies, teams, and other entities. Combine social networking with simulated
            trading to make markets engaging and fun.
          </Text>
          <Text style={[dynamicStyles.description, { marginTop: 12 }]}>
            Practice trading strategies, follow your favorite entities, connect with other traders,
            and learn about markets in a risk-free environment.
          </Text>
        </View>

        {/* Features */}
        <View style={[dynamicStyles.section, { marginTop: 24 }]}>
          <Text style={dynamicStyles.sectionTitle}>KEY FEATURES</Text>

          <View style={styles.featureItem}>
            <Ionicons name="trending-up-outline" size={20} color={theme.primary} />
            <Text style={[styles.featureText, { color: theme.text }]}>
              Virtual trading with real-time prices
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="people-outline" size={20} color={theme.primary} />
            <Text style={[styles.featureText, { color: theme.text }]}>
              Social feed and community interaction
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="newspaper-outline" size={20} color={theme.primary} />
            <Text style={[styles.featureText, { color: theme.text }]}>
              Real-time news and market insights
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="analytics-outline" size={20} color={theme.primary} />
            <Text style={[styles.featureText, { color: theme.text }]}>
              Paper trading simulator for practice
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="wallet-outline" size={20} color={theme.primary} />
            <Text style={[styles.featureText, { color: theme.text }]}>
              Portfolio tracking and history
            </Text>
          </View>
        </View>

        {/* Links */}
        <View style={[dynamicStyles.section, { marginTop: 24 }]}>
          <Text style={dynamicStyles.sectionTitle}>LINKS</Text>

          <TouchableOpacity
            style={dynamicStyles.linkButton}
            onPress={() => handleOpenLink('https://moro.app')}
          >
            <View style={styles.linkLeft}>
              <Ionicons name="globe-outline" size={20} color={theme.textSecondary} />
              <Text style={dynamicStyles.linkText}>Website</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.linkButton}
            onPress={() => handleOpenLink('https://twitter.com/moroapp')}
          >
            <View style={styles.linkLeft}>
              <Ionicons name="logo-twitter" size={20} color={theme.textSecondary} />
              <Text style={dynamicStyles.linkText}>Twitter</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.linkButton}
            onPress={() => handleOpenLink('https://instagram.com/moroapp')}
          >
            <View style={styles.linkLeft}>
              <Ionicons name="logo-instagram" size={20} color={theme.textSecondary} />
              <Text style={dynamicStyles.linkText}>Instagram</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.linkButton}
            onPress={() => handleOpenLink('https://github.com/moro/app')}
          >
            <View style={styles.linkLeft}>
              <Ionicons name="logo-github" size={20} color={theme.textSecondary} />
              <Text style={dynamicStyles.linkText}>GitHub</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <View style={[dynamicStyles.section, { marginTop: 24 }]}>
          <Text style={dynamicStyles.sectionTitle}>LEGAL</Text>

          <TouchableOpacity
            style={styles.legalItem}
            onPress={() => navigation.navigate('Legal', { documentType: 'terms' })}
          >
            <Text style={dynamicStyles.legalLink}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.legalItem}
            onPress={() => navigation.navigate('Legal', { documentType: 'privacy' })}
          >
            <Text style={dynamicStyles.legalLink}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.legalItem}
            onPress={() => navigation.navigate('Legal', { documentType: 'eula' })}
          >
            <Text style={dynamicStyles.legalLink}>EULA</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Credits */}
        <View style={styles.creditsContainer}>
          <Text style={dynamicStyles.creditsText}>
            Made with ❤️ by the Moro Team
          </Text>
          <Text style={[dynamicStyles.creditsText, { marginTop: 8 }]}>
            © 2026 Moro. All rights reserved.
          </Text>
          <Text style={[dynamicStyles.creditsText, { marginTop: 12, fontSize: 11 }]}>
            Built with React Native & Expo
          </Text>
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
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 13,
    marginTop: 4,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    maxWidth: '60%',
    textAlign: 'right',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '500',
  },
  legalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  legalLink: {
    fontSize: 15,
    fontWeight: '500',
  },
  creditsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  creditsText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
