import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { login as apiLogin, signup as apiSignup, loginWithOAuth, verifyToken, logout as apiLogout, refreshToken as apiRefreshToken } from '../services/authService';
import { isTokenExpiredOrNearExpiry } from '../utils/jwt';
import { setTryRefreshTokenCallback, invalidateCache } from '../config/api';

// Keys for secure storage (tokens) and async storage (non-sensitive data)
const SECURE_AUTH_TOKEN_KEY = 'moro_auth_token';
const SECURE_REFRESH_TOKEN_KEY = 'moro_refresh_token';
const ASYNC_USER_KEY = 'moro_user'; // User profile data (not sensitive)
const NEEDS_PROFILE_COMPLETION_KEY = 'moro_needs_profile_completion';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  /** True when Apple-only user has not yet set a password (must complete account before changing password) */
  needsCompleteAccount?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: { email: string; password: string; username: string; displayName: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loginWithGoogle: (email: string, id: string, name: string, photo?: string, idToken?: string) => Promise<{ success: boolean; error?: string; isNewUser?: boolean }>;
  loginWithApple: (email: string, id: string, name: string, identityToken?: string) => Promise<{ success: boolean; error?: string; isNewUser?: boolean }>;
  refreshUser: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>; // Update user state directly (e.g. after profile edit)
  tryRefreshToken: () => Promise<boolean>; // Try to refresh token if near expiry
  getToken: () => string | null; // Get current token (for authenticatedRequest)
  skipAuth: () => Promise<void>; // Skip authentication (dev only)
  needsProfileCompletion: boolean;
  setProfileComplete: () => void;
  /** True when Apple-only user must add email + set password before they can change password */
  needsCompleteAccount: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsProfileCompletion, setNeedsProfileCompletionState] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now());
  const [sessionWarningShown, setSessionWarningShown] = useState(false);

  const isAuthenticated = !!user && !!token;

  const setProfileComplete = useCallback(async () => {
    setNeedsProfileCompletionState(false);
    try {
      await AsyncStorage.removeItem(NEEDS_PROFILE_COMPLETION_KEY);
    } catch (e) {
      console.error('Error clearing profile completion flag', e);
    }
  }, []);

  // Session timeout configuration (30 minutes of inactivity)
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const WARNING_TIME = 5 * 60 * 1000; // Warn 5 minutes before timeout

  useEffect(() => {
    loadAuthData();
  }, []);

  // Track user activity
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkSession = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityTime;

      // Show warning 5 minutes before timeout
      if (timeSinceLastActivity >= (SESSION_TIMEOUT - WARNING_TIME) && !sessionWarningShown) {
        setSessionWarningShown(true);
        Alert.alert(
          'Session Expiring Soon',
          'Your session will expire in 5 minutes due to inactivity. Continue using the app to stay logged in.',
          [
            {
              text: 'Stay Logged In',
              onPress: () => {
                setLastActivityTime(Date.now());
                setSessionWarningShown(false);
              },
            },
          ]
        );
      }

      // Auto-logout after timeout
      if (timeSinceLastActivity >= SESSION_TIMEOUT) {
        Alert.alert(
          'Session Expired',
          'You have been logged out due to inactivity.',
          [
            {
              text: 'OK',
              onPress: () => logout(),
            },
          ]
        );
      }
    };

    const interval = setInterval(checkSession, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isAuthenticated, lastActivityTime, sessionWarningShown]);

  // Reset activity timer on app state change
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated) {
        setLastActivityTime(Date.now());
        setSessionWarningShown(false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  const loadAuthData = async () => {
    try {
      // Get token from secure storage, user from async storage
      const savedToken = await SecureStore.getItemAsync(SECURE_AUTH_TOKEN_KEY);
      const savedUser = await AsyncStorage.getItem(ASYNC_USER_KEY);
      
      if (savedToken && savedUser) {
        // Verify token is still valid
        const verification = await verifyToken(savedToken);
        
        if (verification.success && verification.user) {
          setToken(savedToken);
          setUser(verification.user);
          const savedNeedsCompletion = await AsyncStorage.getItem(NEEDS_PROFILE_COMPLETION_KEY);
          const userNeedsCompletion = !(verification.user as any).username?.trim() || !(verification.user as any).displayName?.trim();
          if (savedNeedsCompletion === 'true' || userNeedsCompletion) {
            setNeedsProfileCompletionState(true);
            if (userNeedsCompletion && savedNeedsCompletion !== 'true') {
              await AsyncStorage.setItem(NEEDS_PROFILE_COMPLETION_KEY, 'true');
            }
          }
        } else {
          // Token is invalid, clear stored data
          await clearAuthData();
        }
      }
    } catch (error) {
      console.error('Error loading auth data:', error);
      // On error, clear potentially invalid data
      await clearAuthData();
    } finally {
      setIsLoading(false);
    }
  };

  const saveAuthData = async (newToken: string, newUser: User, refreshToken?: string) => {
    try {
      // Store tokens in secure storage (encrypted)
      await SecureStore.setItemAsync(SECURE_AUTH_TOKEN_KEY, newToken);
      if (refreshToken) {
        await SecureStore.setItemAsync(SECURE_REFRESH_TOKEN_KEY, refreshToken);
      }
      // Store user profile in async storage (not sensitive, larger data)
      await AsyncStorage.setItem(ASYNC_USER_KEY, JSON.stringify(newUser));
      
      setToken(newToken);
      setUser(newUser);
    } catch (error) {
      console.error('Error saving auth data:', error);
    }
  };

  const clearAuthData = async () => {
    try {
      await SecureStore.deleteItemAsync(SECURE_AUTH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(SECURE_REFRESH_TOKEN_KEY);
      await AsyncStorage.removeItem(ASYNC_USER_KEY);
      await AsyncStorage.removeItem(NEEDS_PROFILE_COMPLETION_KEY);
      setToken(null);
      setUser(null);
      setNeedsProfileCompletionState(false);
      // Clear all API cache so next user does not see previous user's data
      invalidateCache();
      // Clear known user-scoped storage keys so no data leaks between accounts
      const userScopedKeys = [
        '@api:cache',
        '@social:activityFeed',
        '@social:postComments',
        '@trading:entityPools',
        '@trading:userPositions',
        '@trading:cashBalance',
        '@trading:transactions',
      ];
      await Promise.all(userScopedKeys.map((k) => AsyncStorage.removeItem(k).catch(() => {})));
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const result = await apiLogin({ email, password });
      
      if (result.success && result.token && result.user) {
        await saveAuthData(result.token, result.user);
        return { success: true };
      }
      
      return { 
        success: false, 
        error: result.error || 'Login failed. Please check your credentials.' 
      };
    } catch (error: any) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.message || 'Network error. Please check your connection.' 
      };
    }
  };

  const signup = async (data: { email: string; password: string; username: string; displayName: string }) => {
    try {
      const result = await apiSignup(data);
      
      if (result.success && result.token && result.user) {
        await saveAuthData(result.token, result.user, result.refreshToken);
        return { success: true };
      }
      
      return { 
        success: false, 
        error: result.error || 'Signup failed. Please try again.' 
      };
    } catch (error: any) {
      console.error('Signup error:', error);
      return { 
        success: false, 
        error: error.message || 'Network error. Please check your connection.' 
      };
    }
  };

  const logout = async () => {
    try {
      // Try to logout on server if we have a token
      if (token) {
        await apiLogout(token);
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with local logout even if server logout fails
    } finally {
      await clearAuthData();
    }
  };

  const loginWithGoogle = async (email: string, id: string, name: string, photo?: string, idToken?: string) => {
    try {
      const result = await loginWithOAuth({
        email,
        id,
        name,
        photo,
        provider: 'google',
        idToken,
      });
      
      if (result.success && result.token && result.user) {
        await saveAuthData(result.token, result.user, result.refreshToken);
        const isNew = !!(result as { isNewUser?: boolean }).isNewUser;
        if (isNew) {
          setNeedsProfileCompletionState(true);
          try {
            await AsyncStorage.setItem(NEEDS_PROFILE_COMPLETION_KEY, 'true');
          } catch (e) {
            console.error('Error saving profile completion flag', e);
          }
        }
        return { success: true, isNewUser: isNew };
      }
      
      return { 
        success: false, 
        error: result.error || 'Google login failed' 
      };
    } catch (error: any) {
      console.error('Google login error:', error);
      return { 
        success: false, 
        error: error.message || 'Google login failed' 
      };
    }
  };

  const loginWithApple = async (email: string, id: string, name: string, identityToken?: string) => {
    try {
      const result = await loginWithOAuth({
        email: email || `apple_${id}@privaterelay.appleid.com`,
        id,
        name: name || 'Apple User',
        provider: 'apple',
        identityToken,
      });
      
      if (result.success && result.token && result.user) {
        await saveAuthData(result.token, result.user, result.refreshToken);
        const isNew = !!(result as { isNewUser?: boolean }).isNewUser;
        if (isNew) {
          setNeedsProfileCompletionState(true);
          try {
            await AsyncStorage.setItem(NEEDS_PROFILE_COMPLETION_KEY, 'true');
          } catch (e) {
            console.error('Error saving profile completion flag', e);
          }
        }
        return { success: true, isNewUser: isNew };
      }
      
      return { 
        success: false, 
        error: result.error || 'Apple login failed' 
      };
    } catch (error: any) {
      console.error('Apple login error:', error);
      return { 
        success: false, 
        error: error.message || 'Apple login failed' 
      };
    }
  };

  const refreshInProgress = useRef(false);

  const tryRefreshToken = useCallback(async (): Promise<boolean> => {
    // Prevent concurrent refresh attempts
    if (refreshInProgress.current) {
      return false;
    }

    if (!token) {
      return false;
    }

    // Check if token is near expiry
    if (!isTokenExpiredOrNearExpiry(token, 5)) {
      return true; // Token is still valid
    }

    try {
      refreshInProgress.current = true;
      
      // Get refresh token from secure storage
      const savedRefreshToken = await SecureStore.getItemAsync(SECURE_REFRESH_TOKEN_KEY);
      if (!savedRefreshToken) {
        return false;
      }

      // Attempt to refresh
      const result = await apiRefreshToken(savedRefreshToken);
      
      if (result.success && result.token) {
        // Update access token in secure storage
        await SecureStore.setItemAsync(SECURE_AUTH_TOKEN_KEY, result.token);
        
        // Update refresh token if rotation is enabled (new refresh token provided)
        if (result.refreshToken) {
          await SecureStore.setItemAsync(SECURE_REFRESH_TOKEN_KEY, result.refreshToken);
        }
        
        setToken(result.token);
        
        // Verify new token and update user
        const verification = await verifyToken(result.token);
        if (verification.success && verification.user) {
          setUser(verification.user);
          await AsyncStorage.setItem(ASYNC_USER_KEY, JSON.stringify(verification.user));
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    } finally {
      refreshInProgress.current = false;
    }
  }, [token]);

  // Register tryRefreshToken callback with API config
  useEffect(() => {
    setTryRefreshTokenCallback(tryRefreshToken);
  }, [tryRefreshToken]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    
    try {
      const verification = await verifyToken(token);
      if (verification.success && verification.user) {
        // Update user data
        setUser(verification.user);
        // Also update async storage
        await AsyncStorage.setItem(ASYNC_USER_KEY, JSON.stringify(verification.user));
      } else {
        // If token is invalid, try to refresh it
        const refreshed = await tryRefreshToken();
        if (!refreshed) {
          await clearAuthData();
        }
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      // Try to refresh token on error
      const refreshed = await tryRefreshToken();
      if (!refreshed) {
        await clearAuthData();
      }
    }
  }, [token, tryRefreshToken]);

  const updateUser = useCallback(async (userData: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...userData };
      AsyncStorage.setItem(ASYNC_USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Expose getToken function for authenticatedRequest
  const getToken = useCallback(() => token, [token]);

  // Skip authentication (dev only) - creates a mock user
  const skipAuth = async () => {
    if (!__DEV__) {
      console.warn('skipAuth is disabled in production');
      return;
    }

    const mockUser: User = {
      id: 'guest_user',
      email: 'guest@moro.app',
      username: 'guest',
      displayName: 'Guest User',
    };
    const mockToken = 'guest_token_' + Date.now();
    await saveAuthData(mockToken, mockUser);
  };

  const needsCompleteAccount = !!user?.needsCompleteAccount;

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    signup,
    logout,
    loginWithGoogle,
    loginWithApple,
    refreshUser,
    updateUser,
    tryRefreshToken,
    getToken,
    skipAuth,
    needsProfileCompletion,
    setProfileComplete,
    needsCompleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
