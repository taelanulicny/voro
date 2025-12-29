import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { login as apiLogin, signup as apiSignup, loginWithOAuth, verifyToken, logout as apiLogout } from '../services/authService';

// Keys for secure storage (tokens) and async storage (non-sensitive data)
const SECURE_AUTH_TOKEN_KEY = 'moro_auth_token';
const SECURE_REFRESH_TOKEN_KEY = 'moro_refresh_token';
const ASYNC_USER_KEY = 'moro_user'; // User profile data (not sensitive)

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
  skipAuth: () => Promise<void>; // DEV ONLY
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  useEffect(() => {
    loadAuthData();
  }, []);

  const loadAuthData = async () => {
    try {
      // Get token from secure storage, user from async storage
      const savedToken = await SecureStore.getItemAsync(SECURE_AUTH_TOKEN_KEY);
      const savedUser = await AsyncStorage.getItem(ASYNC_USER_KEY);
      
      if (savedToken && savedUser) {
        // Verify token is still valid
        const verification = await verifyToken(savedToken);
        
        if (verification.success && verification.user) {
          // Token is valid, use verified user data
          setToken(savedToken);
          setUser(verification.user);
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
      // Clear tokens from secure storage
      await SecureStore.deleteItemAsync(SECURE_AUTH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(SECURE_REFRESH_TOKEN_KEY);
      // Clear user from async storage
      await AsyncStorage.removeItem(ASYNC_USER_KEY);
      
      setToken(null);
      setUser(null);
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

  // DEV ONLY - Skip authentication for development
  const skipAuth = async () => {
    const mockUser: User = {
      id: 'dev-user-' + Date.now(),
      email: 'dev@moro.app',
      username: 'devuser',
      displayName: 'Dev User',
      avatarUrl: undefined,
      bio: 'Development mode user',
    };
    const mockToken = 'dev-token-' + Date.now();
    
    await saveAuthData(mockToken, mockUser);
  };

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
    skipAuth,
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
