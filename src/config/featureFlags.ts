/**
 * Feature Flags System
 *
 * Centralized feature flag management for beta testing and gradual rollout.
 * Allows enabling/disabling features without code changes.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FeatureFlags {
  // Social Features
  groups: boolean;
  posts: boolean;
  comments: boolean;
  followUsers: boolean;

  // Trading Features
  trading: boolean;
  simulator: boolean;
  portfolioHistory: boolean;

  // Content Features
  news: boolean;
  newsFiltering: boolean;
  notifications: boolean;
  leaderboards: boolean;

  // System Features
  crashReporting: boolean;
  analytics: boolean;
  offlineMode: boolean;

  // Beta Features (experimental)
  advancedCharts: boolean;
  aiInsights: boolean;
  socialSharing: boolean;
}

// Default flags for beta release
const DEFAULT_FLAGS: FeatureFlags = {
  // Social Features - Posts enabled, Groups disabled for beta
  groups: false,              // ❌ Too incomplete for beta
  posts: true,                // ✅ Basic functionality works
  comments: true,             // ✅ Works well
  followUsers: true,          // ✅ Basic follow works

  // Trading Features - All enabled
  trading: true,              // ✅ Core feature
  simulator: true,            // ✅ Fully implemented
  portfolioHistory: true,     // ✅ Works

  // Content Features
  news: true,                 // ✅ Mock news available (labeled)
  newsFiltering: true,        // ✅ Filtering works
  notifications: false,       // ❌ Not implemented yet
  leaderboards: false,        // ❌ Not implemented yet

  // System Features
  crashReporting: true,       // ✅ Should be enabled for beta
  analytics: true,            // ✅ Should track usage
  offlineMode: true,          // ✅ Good UX

  // Beta Features (experimental) - All disabled
  advancedCharts: false,      // ❌ Future feature
  aiInsights: false,          // ❌ Future feature
  socialSharing: false,       // ❌ Future feature
};

// Production flags (for full release)
const PRODUCTION_FLAGS: FeatureFlags = {
  groups: true,
  posts: true,
  comments: true,
  followUsers: true,
  trading: true,
  simulator: true,
  portfolioHistory: true,
  news: true,
  newsFiltering: true,
  notifications: true,
  leaderboards: true,
  crashReporting: true,
  analytics: true,
  offlineMode: true,
  advancedCharts: false,
  aiInsights: false,
  socialSharing: false,
};

// Development flags (everything enabled for testing)
const DEVELOPMENT_FLAGS: FeatureFlags = {
  groups: true,
  posts: true,
  comments: true,
  followUsers: true,
  trading: true,
  simulator: true,
  portfolioHistory: true,
  news: true,
  newsFiltering: true,
  notifications: true,
  leaderboards: true,
  crashReporting: false,  // Disabled in dev to avoid noise
  analytics: false,       // Disabled in dev to avoid test data
  offlineMode: true,
  advancedCharts: true,
  aiInsights: true,
  socialSharing: true,
};

// Environment detection
const getEnvironment = (): 'development' | 'beta' | 'production' => {
  // In a real app, this would check __DEV__ or environment variables
  // For now, default to beta
  if (__DEV__) {
    return 'development';
  }
  // Check if beta build (you can set this via EAS build profiles)
  // For now, assume beta for all production builds
  return 'beta';
};

// Get flags based on environment
const getDefaultFlagsForEnvironment = (): FeatureFlags => {
  const env = getEnvironment();
  switch (env) {
    case 'development':
      return DEVELOPMENT_FLAGS;
    case 'beta':
      return DEFAULT_FLAGS;
    case 'production':
      return PRODUCTION_FLAGS;
    default:
      return DEFAULT_FLAGS;
  }
};

// Storage key
const STORAGE_KEY = '@featureFlags';

// In-memory cache
let cachedFlags: FeatureFlags | null = null;

/**
 * Get feature flags
 * Returns cached flags or loads from storage
 */
export const getFeatureFlags = async (): Promise<FeatureFlags> => {
  if (cachedFlags) {
    return cachedFlags;
  }

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as FeatureFlags;
      // Merge with defaults to ensure new flags are present
      cachedFlags = { ...getDefaultFlagsForEnvironment(), ...parsed };
    } else {
      cachedFlags = getDefaultFlagsForEnvironment();
    }
  } catch (error) {
    console.error('Error loading feature flags:', error);
    cachedFlags = getDefaultFlagsForEnvironment();
  }

  return cachedFlags;
};

/**
 * Get a specific feature flag synchronously
 * Returns the cached value or default
 */
export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  if (cachedFlags) {
    return cachedFlags[feature];
  }
  // Return default if not loaded yet
  return getDefaultFlagsForEnvironment()[feature];
};

/**
 * Update a feature flag
 * Useful for A/B testing or remote configuration
 */
export const setFeatureFlag = async (
  feature: keyof FeatureFlags,
  enabled: boolean
): Promise<void> => {
  const flags = await getFeatureFlags();
  flags[feature] = enabled;
  cachedFlags = flags;

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
  } catch (error) {
    console.error('Error saving feature flag:', error);
  }
};

/**
 * Update multiple feature flags at once
 */
export const setFeatureFlags = async (
  updates: Partial<FeatureFlags>
): Promise<void> => {
  const flags = await getFeatureFlags();
  cachedFlags = { ...flags, ...updates };

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cachedFlags));
  } catch (error) {
    console.error('Error saving feature flags:', error);
  }
};

/**
 * Reset feature flags to default for current environment
 */
export const resetFeatureFlags = async (): Promise<void> => {
  cachedFlags = getDefaultFlagsForEnvironment();

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cachedFlags));
  } catch (error) {
    console.error('Error resetting feature flags:', error);
  }
};

/**
 * Initialize feature flags (call on app start)
 */
export const initializeFeatureFlags = async (): Promise<void> => {
  await getFeatureFlags();
  console.log('Feature flags initialized:', cachedFlags);
};

/**
 * Get all flags (for debug/settings screen)
 */
export const getAllFlags = async (): Promise<FeatureFlags> => {
  return await getFeatureFlags();
};

// Export default flags for reference
export const DEFAULT_FEATURE_FLAGS = DEFAULT_FLAGS;
