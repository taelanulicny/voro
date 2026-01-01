import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { login as apiLogin, signup as apiSignup, loginWithOAuth, verifyToken, logout as apiLogout, refreshToken as apiRefreshToken } from '../services/authService';
import { isTokenExpiredOrNearExpiry, getTimeUntilExpiry } from '../utils/jwt';
import { setTryRefreshTokenCallback } from '../config/api';
import { errorReporting } from '../services/errorReporting';

// Keys for secure storage (tokens) and async storage (non-sensitive data)
const SECURE_AUTH_TOKEN_KEY = 'moro_auth_token';
const SECURE_REFRESH_TOKEN_KEY = 'moro_refresh_token';
const ASYNC_USER_KEY = 'moro_user'; // User profile data (not sensitive)
const ASYNC_BIOMETRIC_ENABLED_KEY = 'moro_biometric_enabled'; // Biometric authentication preference
const ASYNC_LAST_ACTIVE_KEY = 'moro_last_active'; // Last active timestamp for session timeout

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: { email: string; password: string; username: string; displayName: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loginWithGoogle: (email: string, id: string, name: string, photo?: string, idToken?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithApple: (email: string, id: string, name: string, identityToken?: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  tryRefreshToken: () => Promise<boolean>; // Try to refresh token if near expiry
  getToken: () => string | null; // Get current token (for authenticatedRequest)
  isBiometricEnabled: boolean;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;
  showSessionTimeoutWarning: boolean;
  dismissSessionTimeoutWarning: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [showSessionTimeoutWarning, setShowSessionTimeoutWarning] = useState(false);
  const sessionTimeoutCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isAuthenticated = !!user && !!token;

  useEffect(() => {
    loadAuthData();
    loadBiometricPreference();
  }, []);

  const updateLastActiveTime = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ASYNC_LAST_ACTIVE_KEY, Date.now().toString());
    } catch (error) {
      console.error('Error updating last active time:', error);
    }
  }, []);

  const checkSessionTimeout = useCallback(async () => {
    if (!token) return;

    const timeUntilExpiry = getTimeUntilExpiry(token);
    if (!timeUntilExpiry) return;

    // Show warning when 5 minutes or less remain
    const warningThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
    if (timeUntilExpiry <= warningThreshold && timeUntilExpiry > 0) {
      setShowSessionTimeoutWarning(true);
      
      // Try to auto-refresh token
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        setShowSessionTimeoutWarning(false);
      }
    } else if (timeUntilExpiry <= 0) {
      // Token expired, logout
      await logout();
    }
  }, [token, tryRefreshToken, logout]);

  // Check for session timeout and show warning
  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (sessionTimeoutCheckIntervalRef.current) {
        clearInterval(sessionTimeoutCheckIntervalRef.current);
        sessionTimeoutCheckIntervalRef.current = null;
      }
      return;
    }

    // Check every 30 seconds for session timeout
    sessionTimeoutCheckIntervalRef.current = setInterval(() => {
      checkSessionTimeout();
    }, 30000);

    // Check immediately
    checkSessionTimeout();

    // Update last active time when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated) {
        updateLastActiveTime();
        checkSessionTimeout();
      }
    });

    return () => {
      if (sessionTimeoutCheckIntervalRef.current) {
        clearInterval(sessionTimeoutCheckIntervalRef.current);
      }
      subscription.remove();
    };
  }, [isAuthenticated, token, checkSessionTimeout, updateLastActiveTime]);

  const loadBiometricPreference = async () => {
    try {
      const enabled = await AsyncStorage.getItem(ASYNC_BIOMETRIC_ENABLED_KEY);
      setIsBiometricEnabled(enabled === 'true');
    } catch (error) {
      console.error('Error loading biometric preference:', error);
    }
  };

  // Biometric authentication function (defined early for use in loadAuthData)
  const authenticateWithBiometric = useCallback(async (): Promise<boolean> => {
    try {
      // Dynamically import expo-local-authentication
      const LocalAuthentication = await import('expo-local-authentication');
      
      // Check if biometric authentication is available
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        return false;
      }

      // Check if biometrics are enrolled
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        return false;
      }

      // Authenticate with biometrics
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your account',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.error('Error with biometric authentication:', error);
      return false;
    }
  }, []);

  const loadAuthData = async () => {
    try {
      // Get token from secure storage, user from async storage
      const savedToken = await SecureStore.getItemAsync(SECURE_AUTH_TOKEN_KEY);
      const savedUser = await AsyncStorage.getItem(ASYNC_USER_KEY);
      
      if (savedToken && savedUser) {
        // Check if biometric is enabled and app is returning from background
        const biometricEnabled = await AsyncStorage.getItem(ASYNC_BIOMETRIC_ENABLED_KEY);
        if (biometricEnabled === 'true') {
          // Require biometric authentication before loading user data
          const authenticated = await authenticateWithBiometric();
          if (!authenticated) {
            // User cancelled or failed biometric auth, clear data
            await clearAuthData();
            setIsLoading(false);
            return;
          }
        }

        // Verify token is still valid
        const verification = await verifyToken(savedToken);
        
        if (verification.success && verification.user) {
          // Token is valid, use verified user data
          setToken(savedToken);
          setUser(verification.user);
          updateLastActiveTime();
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
      updateLastActiveTime();
      
      // Set user context in error reporting
      errorReporting.setUserContext(newUser.id, {
        username: newUser.username,
        email: newUser.email,
      });
    } catch (error) {
      console.error('Error saving auth data:', error);
    }
  };

  const clearAuthData = async () => {
    try {
      // Clear tokens from secure storage
      await SecureStore.deleteItemAsync(SECURE_AUTH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(SECURE_REFRESH_TOKEN_KEY);
      // Clear user from async storage
      await AsyncStorage.removeItem(ASYNC_USER_KEY);
      
      setToken(null);
      setUser(null);
      
      // Clear user context in error reporting
      errorReporting.setUserContext(undefined);
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

  const logout = useCallback(async () => {
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
  }, [token]);

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
        return { success: true };
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
        return { success: true };
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

  // Cache refresh promise to prevent duplicate refresh calls
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);
  const refreshInProgress = useRef(false);

  const tryRefreshToken = useCallback(async (): Promise<boolean> => {
    if (!token) {
      return false;
    }

    // Check if token is near expiry
    if (!isTokenExpiredOrNearExpiry(token, 5)) {
      return true; // Token is still valid
    }

    // If refresh is already in progress, return the existing promise
    if (refreshInProgress.current && refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    // Prevent concurrent refresh attempts
    if (refreshInProgress.current) {
      return false;
    }

    // Create and cache the refresh promise
    const refreshPromise = (async (): Promise<boolean> => {
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
        refreshPromiseRef.current = null; // Clear cached promise
      }
    })();

    // Cache the promise
    refreshPromiseRef.current = refreshPromise;
    
    return refreshPromise;
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

  // Expose getToken function for authenticatedRequest
  const getToken = useCallback(() => token, [token]);

  const enableBiometric = useCallback(async (): Promise<boolean> => {
    try {
      // Check if biometric authentication is available
      const LocalAuthentication = await import('expo-local-authentication');
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        return false;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        return false;
      }

      // Test authentication before enabling
      const authenticated = await authenticateWithBiometric();
      if (!authenticated) {
        return false;
      }

      // Enable biometric authentication
      await AsyncStorage.setItem(ASYNC_BIOMETRIC_ENABLED_KEY, 'true');
      setIsBiometricEnabled(true);
      return true;
    } catch (error) {
      console.error('Error enabling biometric authentication:', error);
      return false;
    }
  }, [authenticateWithBiometric]);

  const disableBiometric = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(ASYNC_BIOMETRIC_ENABLED_KEY);
      setIsBiometricEnabled(false);
    } catch (error) {
      console.error('Error disabling biometric authentication:', error);
    }
  }, []);

  const dismissSessionTimeoutWarning = useCallback(() => {
    setShowSessionTimeoutWarning(false);
  }, []);

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
    tryRefreshToken,
    getToken,
    isBiometricEnabled,
    enableBiometric,
    disableBiometric,
    authenticateWithBiometric,
    showSessionTimeoutWarning,
    dismissSessionTimeoutWarning,
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
