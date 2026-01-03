import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { ThemeProvider } from '../../context/ThemeContext';
import * as authService from '../../services/authService';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMockUser, createMockToken } from '../helpers/testUtils';

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

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <AuthProvider>{children}</ThemeProvider>
  </ThemeProvider>
);

describe('Auth Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    SecureStore.deleteItemAsync('moro_auth_token');
    SecureStore.deleteItemAsync('moro_refresh_token');
  });

  describe('Complete Signup Flow', () => {
    it('should complete signup and auto-login flow', async () => {
      const mockUser = createMockUser();
      const mockToken = createMockToken();

      mockAuthService.signup.mockResolvedValue({
        success: true,
        token: mockToken,
        refreshToken: 'refresh-token',
        user: mockUser,
      });

      mockAuthService.verifyToken.mockResolvedValue({
        success: true,
        user: mockUser,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Signup
      await act(async () => {
        const signupResult = await result.current.signup({
          email: 'newuser@example.com',
          password: 'password123',
          username: 'newuser',
          displayName: 'New User',
        });

        expect(signupResult.success).toBe(true);
      });

      // Verify authentication state
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.token).toBe(mockToken);
      });

      // Verify data persisted
      const savedToken = await SecureStore.getItemAsync('moro_auth_token');
      const savedUser = await AsyncStorage.getItem('moro_user');

      expect(savedToken).toBe(mockToken);
      expect(JSON.parse(savedUser!)).toEqual(mockUser);
    });
  });

  describe('Complete Login Flow', () => {
    it('should complete login flow and persist session', async () => {
      const mockUser = createMockUser();
      const mockToken = createMockToken();

      mockAuthService.login.mockResolvedValue({
        success: true,
        token: mockToken,
        refreshToken: 'refresh-token',
        user: mockUser,
      });

      mockAuthService.verifyToken.mockResolvedValue({
        success: true,
        user: mockUser,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Login
      await act(async () => {
        const loginResult = await result.current.login('test@example.com', 'password123');

        expect(loginResult.success).toBe(true);
      });

      // Verify authentication state
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual(mockUser);
      });

      // Verify session persistence
      const savedToken = await SecureStore.getItemAsync('moro_auth_token');
      expect(savedToken).toBe(mockToken);
    });
  });

  describe('Session Persistence Flow', () => {
    it('should restore session on app restart', async () => {
      const mockUser = createMockUser();
      const mockToken = createMockToken();

      // Simulate saved session
      await SecureStore.setItemAsync('moro_auth_token', mockToken);
      await AsyncStorage.setItem('moro_user', JSON.stringify(mockUser));

      mockAuthService.verifyToken.mockResolvedValue({
        success: true,
        user: mockUser,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Should load saved session
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual(mockUser);
      });
    });

    it('should clear invalid session on app restart', async () => {
      const invalidToken = 'invalid-token';
      const mockUser = createMockUser();

      // Simulate invalid saved session
      await SecureStore.setItemAsync('moro_auth_token', invalidToken);
      await AsyncStorage.setItem('moro_user', JSON.stringify(mockUser));

      mockAuthService.verifyToken.mockResolvedValue({
        success: false,
        error: 'Invalid token',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should clear invalid session
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
      });
    });
  });

  describe('Logout Flow', () => {
    it('should complete logout and clear session', async () => {
      const mockUser = createMockUser();
      const mockToken = createMockToken();

      // Set up authenticated state
      await SecureStore.setItemAsync('moro_auth_token', mockToken);
      await AsyncStorage.setItem('moro_user', JSON.stringify(mockUser));

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

      // Logout
      await act(async () => {
        await result.current.logout();
      });

      // Verify logout
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
        expect(result.current.token).toBeNull();
      });

      // Verify data cleared
      const savedToken = await SecureStore.getItemAsync('moro_auth_token');
      expect(savedToken).toBeNull();
    });
  });
});

