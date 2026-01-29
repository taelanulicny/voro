import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FeatureFlags, getFeatureFlags, setFeatureFlag, setFeatureFlags, resetFeatureFlags } from '../config/featureFlags';

interface FeatureFlagsContextType {
  flags: FeatureFlags;
  isFeatureEnabled: (feature: keyof FeatureFlags) => boolean;
  updateFlag: (feature: keyof FeatureFlags, enabled: boolean) => Promise<void>;
  updateFlags: (updates: Partial<FeatureFlags>) => Promise<void>;
  reset: () => Promise<void>;
  isLoading: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(undefined);

export const FeatureFlagsProvider = ({ children }: { children: ReactNode }) => {
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    try {
      const loadedFlags = await getFeatureFlags();
      setFlags(loadedFlags);
    } catch (error) {
      console.error('Error loading feature flags in context:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isFeatureEnabledFunc = (feature: keyof FeatureFlags): boolean => {
    if (!flags) return false;
    return flags[feature];
  };

  const updateFlag = async (feature: keyof FeatureFlags, enabled: boolean) => {
    await setFeatureFlag(feature, enabled);
    await loadFlags();
  };

  const updateFlags = async (updates: Partial<FeatureFlags>) => {
    await setFeatureFlags(updates);
    await loadFlags();
  };

  const reset = async () => {
    await resetFeatureFlags();
    await loadFlags();
  };

  // Provide a default flags object while loading
  const defaultFlags: FeatureFlags = {
    groups: false,
    posts: false,
    comments: false,
    followUsers: false,
    trading: false,
    simulator: false,
    portfolioHistory: false,
    news: false,
    newsFiltering: false,
    notifications: false,
    leaderboards: false,
    crashReporting: false,
    analytics: false,
    offlineMode: false,
    advancedCharts: false,
    aiInsights: false,
    socialSharing: false,
  };

  const value: FeatureFlagsContextType = {
    flags: flags || defaultFlags,
    isFeatureEnabled: isFeatureEnabledFunc,
    updateFlag,
    updateFlags,
    reset,
    isLoading,
  };

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagsContext);
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }
  return context;
};
