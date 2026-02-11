import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName, View } from 'react-native';

export interface Theme {
  // Background colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  
  // UI elements
  border: string;
  borderLight: string;
  card: string;
  
  // Status colors
  success: string;
  error: string;
  warning: string;
  info: string;
  
  // Brand
  primary: string;
  primaryLight: string;
  primaryDark: string;
}

export const lightTheme: Theme = {
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',
  backgroundTertiary: '#F3F4F6',
  
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  card: '#FFFFFF',
  
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#775a96',
  
  primary: '#775a96',
  primaryLight: '#E6DFF0',
  primaryDark: '#5f4978',
};

export const darkTheme: Theme = {
  background: '#121212',
  backgroundSecondary: '#1C1C1E',
  backgroundTertiary: '#2C2C2E',
  
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#636366',
  
  border: '#38383A',
  borderLight: '#2C2C2E',
  card: '#1C1C1E',
  
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#775a96',
  
  primary: '#775a96',
  primaryLight: '#9778bd',
  primaryDark: '#5f4978',
};

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@moro_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  // Determine if we should use dark theme
  const isDark =
    themeMode === 'dark' ||
    (themeMode === 'auto' && systemColorScheme === 'dark');

  const theme = isDark ? darkTheme : lightTheme;

  // Load saved theme preference
  useEffect(() => {
    loadThemePreference();

    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription.remove();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedMode) {
        setThemeModeState(savedMode as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsThemeLoaded(true);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTheme = async () => {
    const newMode = isDark ? 'light' : 'dark';
    await setThemeMode(newMode);
  };

  const value: ThemeContextType = {
    theme,
    themeMode,
    isDark,
    setThemeMode,
    toggleTheme,
  };

  if (!isThemeLoaded) {
    return <View style={{ flex: 1, backgroundColor: theme.background }} />;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

