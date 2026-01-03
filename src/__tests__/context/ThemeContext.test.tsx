import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('ThemeContext', () => {
  beforeEach(() => {
    AsyncStorage.clear();
  });

  describe('Initial State', () => {
    it('should initialize with light theme by default', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.themeMode).toBe('light');
      expect(result.current.isDark).toBe(false);
      expect(result.current.theme.background).toBe('#FFFFFF');
    });
  });

  describe('setThemeMode', () => {
    it('should set theme to dark', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await result.current.setThemeMode('dark');
      });

      expect(result.current.themeMode).toBe('dark');
      expect(result.current.isDark).toBe(true);
      expect(result.current.theme.background).toBe('#000000');
    });

    it('should set theme to light', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      // Set to dark first
      await act(async () => {
        await result.current.setThemeMode('dark');
      });

      // Then set to light
      await act(async () => {
        await result.current.setThemeMode('light');
      });

      expect(result.current.themeMode).toBe('light');
      expect(result.current.isDark).toBe(false);
    });

    it('should set theme to auto', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await result.current.setThemeMode('auto');
      });

      expect(result.current.themeMode).toBe('auto');
    });

    it('should persist theme preference', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await result.current.setThemeMode('dark');
      });

      // Check if saved to AsyncStorage
      const saved = await AsyncStorage.getItem('@moro_theme_mode');
      expect(saved).toBe('dark');
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from light to dark', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await result.current.toggleTheme();
      });

      expect(result.current.themeMode).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });

    it('should toggle from dark to light', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      // Set to dark first
      await act(async () => {
        await result.current.setThemeMode('dark');
      });

      // Then toggle
      await act(async () => {
        await result.current.toggleTheme();
      });

      expect(result.current.themeMode).toBe('light');
      expect(result.current.isDark).toBe(false);
    });
  });

  describe('Theme Colors', () => {
    it('should have correct light theme colors', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme.background).toBe('#FFFFFF');
      expect(result.current.theme.text).toBe('#111827');
      expect(result.current.theme.success).toBe('#10B981');
      expect(result.current.theme.error).toBe('#EF4444');
    });

    it('should have correct dark theme colors when set to dark', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await result.current.setThemeMode('dark');
      });

      expect(result.current.theme.background).toBe('#000000');
      expect(result.current.theme.text).toBe('#FFFFFF');
      expect(result.current.theme.success).toBe('#10B981');
      expect(result.current.theme.error).toBe('#EF4444');
    });
  });
});

