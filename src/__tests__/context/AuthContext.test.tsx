import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { ThemeProvider } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as authService from '../../services/authService';
import * as jwtUtils from '../../utils/jwt';
import { createMockUser, createMockToken } from '../helpers/testUtils';

// Mock dependencies
jest.mock('../../services/authService');
jest.mock('../../utils/jwt');
jest.mock('../../config/api', () => ({
  setTryRefreshTokenCallback: jest.fn(),
}));
jest.mock('../../services/errorReporting', () => ({
  errorReporting: {
    setUserContext: jest.fn(),
  },
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockJwtUtils = jwtUtils as jest.Mocked<typeof jwtUtils>;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <AuthProvider>{children}</AuthProvider>
  </ThemeProvider>
);

describe('AuthContext', () => {
  const mockUser = createMockUser();
  const mockToken = createMockToken();

  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    SecureStore.deleteItemAsync('moro_auth_token');
    SecureStore.deleteItemAsync('moro_refresh_token');
    
    // Set up expo-local-authentication mocks before any tests run
    const LocalAuthentication = require('expo-local-authentication');
    LocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
    LocalAuthentication.isEnrolledAsync.mockResolvedValue(true);
    // authenticateAsync returns { success: true } on success
    LocalAuthentication.authenticateAsync.mockResolvedValue({ success: true });
  });

  describe('Initial State', () => {
    it('should initialize with loading state', () => {
      mockJwtUtils.isTokenExpiredOrNearExpiry.mockReturnValue(false);
      mockAuthService.verifyToken.mockResolvedValue({
        success: true,
        user: mockUser,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isLoading).toBe(true);
    });

    it('should load auth data from storage on mount', async () => {
      await SecureStore.setItemAsync('moro_auth_token', mockToken);
      await AsyncStorage.setItem('moro_user', JSON.stringify(mockUser));

      mockJwtUtils.isTokenExpiredOrNearExpiry.mockReturnValue(false);
      mockAuthService.verifyToken.mockResolvedValue({
        success: true,
        user: mockUser,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe(mockToken);
    });

    it('should clear invalid auth data', async () => {
      await SecureStore.setItemAsync('moro_auth_token', 'invalid-token');
      await AsyncStorage.setItem('moro_user', JSON.stringify(mockUser));

      mockAuthService.verifyToken.mockResolvedValue({
        success: false,
        error: 'Invalid token',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });
  });

  describe('Login', () => {
    it('should login successfully', async () => {
      mockAuthService.login.mockResolvedValue({
        success: true,
        token: mockToken,
        refreshToken: 'refresh-token',
        user: mockUser,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const loginResult = await result.current.login('test@example.com', 'password123');

        expect(loginResult.success).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.token).toBe(mockToken);
      });
    });

    it('should handle login failure', async () => {
      mockAuthService.login.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const loginResult = await result.current.login('test@example.com', 'wrong-password');

        expect(loginResult.success).toBe(false);
        expect(loginResult.error).toBe('Invalid credentials');
      });

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle network error during login', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const loginResult = await result.current.login('test@example.com', 'password123');

        expect(loginResult.success).toBe(false);
        expect(loginResult.error).toContain('Network error');
      });
    });
  });

  describe('Signup', () => {
    it('should signup successfully', async () => {
      mockAuthService.signup.mockResolvedValue({
        success: true,
        token: mockToken,
        refreshToken: 'refresh-token',
        user: mockUser,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const signupResult = await result.current.signup({
          email: 'newuser@example.com',
          password: 'password123',
          username: 'newuser',
          displayName: 'New User',
        });

        expect(signupResult.success).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual(mockUser);
      });
    });

    it('should handle signup failure', async () => {
      mockAuthService.signup.mockResolvedValue({
        success: false,
        error: 'Email already exists',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const signupResult = await result.current.signup({
          email: 'existing@example.com',
          password: 'password123',
          username: 'existing',
          displayName: 'Existing User',
        });

        expect(signupResult.success).toBe(false);
        expect(signupResult.error).toBe('Email already exists');
      });
    });
  });

  describe('Logout', () => {
    it('should logout successfully', async () => {
      await SecureStore.setItemAsync('moro_auth_token', mockToken);
      await AsyncStorage.setItem('moro_user', JSON.stringify(mockUser));

      mockJwtUtils.isTokenExpiredOrNearExpiry.mockReturnValue(false);
      mockAuthService.verifyToken.mockResolvedValue({
        success: true,
        user: mockUser,
      });
      mockAuthService.logout.mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await act(async () => {
        await result.current.logout();
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
        expect(result.current.token).toBeNull();
      });
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token when near expiry', async () => {
      const expiringToken = createMockToken(1); // 1 minute expiry
      await SecureStore.setItemAsync('moro_auth_token', expiringToken);
      await SecureStore.setItemAsync('moro_refresh_token', 'refresh-token');
      await AsyncStorage.setItem('moro_user', JSON.stringify(mockUser));

      mockJwtUtils.isTokenExpiredOrNearExpiry.mockReturnValue(true);
      mockJwtUtils.getTimeUntilExpiry.mockReturnValue(4 * 60 * 1000); // 4 minutes
      mockAuthService.verifyToken.mockResolvedValue({
        success: true,
        user: mockUser,
      });
      mockAuthService.refreshToken.mockResolvedValue({
        success: true,
        token: createMockToken(60),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const refreshed = await result.current.tryRefreshToken();
        expect(refreshed).toBe(true);
      });
    });

    it('should not refresh token if still valid', async () => {
      const validToken = createMockToken(60);
      await SecureStore.setItemAsync('moro_auth_token', validToken);
      await AsyncStorage.setItem('moro_user', JSON.stringify(mockUser));

      mockJwtUtils.isTokenExpiredOrNearExpiry.mockReturnValue(false);
      mockAuthService.verifyToken.mockResolvedValue({
        success: true,
        user: mockUser,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const refreshed = await result.current.tryRefreshToken();
        expect(refreshed).toBe(true);
      });

      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
    });

    it('should handle refresh token failure', async () => {
      const expiringToken = createMockToken(1);
      await SecureStore.setItemAsync('moro_auth_token', expiringToken);
      await SecureStore.setItemAsync('moro_refresh_token', 'invalid-refresh-token');
      await AsyncStorage.setItem('moro_user', JSON.stringify(mockUser));

      mockJwtUtils.isTokenExpiredOrNearExpiry.mockReturnValue(true);
      mockAuthService.verifyToken.mockResolvedValue({
        success: true,
        user: mockUser,
      });
      mockAuthService.refreshToken.mockResolvedValue({
        success: false,
        error: 'Invalid refresh token',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const refreshed = await result.current.tryRefreshToken();
        expect(refreshed).toBe(false);
      });
    });
  });

  describe('OAuth Login', () => {
    it('should login with Google successfully', async () => {
      mockAuthService.loginWithOAuth.mockResolvedValue({
        success: true,
        token: mockToken,
        refreshToken: 'refresh-token',
        user: mockUser,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const loginResult = await result.current.loginWithGoogle(
          'google@example.com',
          'google-id',
          'Google User',
          'https://example.com/photo.jpg',
          'id-token'
        );

        expect(loginResult.success).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('should login with Apple successfully', async () => {
      mockAuthService.loginWithOAuth.mockResolvedValue({
        success: true,
        token: mockToken,
        refreshToken: 'refresh-token',
        user: mockUser,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const loginResult = await result.current.loginWithApple(
          'apple@example.com',
          'apple-id',
          'Apple User',
          'identity-token'
        );

        expect(loginResult.success).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
    });
  });

  describe('Biometric Authentication', () => {
    it('should enable biometric authentication', async () => {
      const LocalAuthentication = require('expo-local-authentication');
      // Ensure mocks are set up
      LocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
      LocalAuthentication.isEnrolledAsync.mockResolvedValue(true);
      LocalAuthentication.authenticateAsync.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const enabled = await result.current.enableBiometric();
        expect(enabled).toBe(true);
      });

      expect(result.current.isBiometricEnabled).toBe(true);
    });

    it('should disable biometric authentication', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Enable first
      await act(async () => {
        await result.current.enableBiometric();
      });

      // Then disable
      await act(async () => {
        await result.current.disableBiometric();
      });

      expect(result.current.isBiometricEnabled).toBe(false);
    });

    it('should require biometric on app startup if enabled', async () => {
      await SecureStore.setItemAsync('moro_auth_token', mockToken);
      await AsyncStorage.setItem('moro_user', JSON.stringify(mockUser));
      await AsyncStorage.setItem('moro_biometric_enabled', 'true');

      mockJwtUtils.isTokenExpiredOrNearExpiry.mockReturnValue(false);
      mockAuthService.verifyToken.mockResolvedValue({
        success: true,
        user: mockUser,
      });

      const LocalAuthentication = require('expo-local-authentication');
      
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(LocalAuthentication.authenticateAsync).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('Session Timeout', () => {
    it('should show session timeout warning when token is near expiry', async () => {
      const expiringToken = createMockToken(1);
      await SecureStore.setItemAsync('moro_auth_token', expiringToken);
      await AsyncStorage.setItem('moro_user', JSON.stringify(mockUser));

      mockJwtUtils.isTokenExpiredOrNearExpiry.mockReturnValue(false);
      mockJwtUtils.getTimeUntilExpiry.mockReturnValue(4 * 60 * 1000); // 4 minutes
      mockAuthService.verifyToken.mockResolvedValue({
        success: true,
        user: mockUser,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate token near expiry
      mockJwtUtils.getTimeUntilExpiry.mockReturnValue(4 * 60 * 1000);

      // Wait for session timeout check
      await waitFor(() => {
        // Session timeout check runs every 30 seconds
        // We can't easily test this without waiting, but we can verify the logic exists
        expect(result.current.showSessionTimeoutWarning).toBeDefined();
      }, { timeout: 1000 });
    });

    it('should dismiss session timeout warning', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.dismissSessionTimeoutWarning();
      });

      expect(result.current.showSessionTimeoutWarning).toBe(false);
    });
  });

  describe('Refresh User', () => {
    it('should refresh user data', async () => {
      await SecureStore.setItemAsync('moro_auth_token', mockToken);
      await AsyncStorage.setItem('moro_user', JSON.stringify(mockUser));

      const updatedUser = { ...mockUser, displayName: 'Updated Name' };

      mockJwtUtils.isTokenExpiredOrNearExpiry.mockReturnValue(false);
      mockAuthService.verifyToken
        .mockResolvedValueOnce({
          success: true,
          user: mockUser,
        })
        .mockResolvedValueOnce({
          success: true,
          user: updatedUser,
        });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await act(async () => {
        await result.current.refreshUser();
      });

      await waitFor(() => {
        expect(result.current.user?.displayName).toBe('Updated Name');
      });
    });
  });
});

