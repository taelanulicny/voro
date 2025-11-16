import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  loginWithGoogle: (idToken: string) => Promise<{ success: boolean; error?: string }>;
  loginWithApple: (identityToken: string, user?: any) => Promise<{ success: boolean; error?: string }>;
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
      const savedToken = await AsyncStorage.getItem('authToken');
      const savedUser = await AsyncStorage.getItem('user');
      
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error('Error loading auth data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAuthData = async (newToken: string, newUser: User) => {
    try {
      await AsyncStorage.setItem('authToken', newToken);
      await AsyncStorage.setItem('user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    } catch (error) {
      console.error('Error saving auth data:', error);
    }
  };

  const clearAuthData = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Mock login - replace with actual API call
      const mockUser: User = {
        id: '1',
        email,
        username: email.split('@')[0],
        displayName: email.split('@')[0],
      };
      const mockToken = 'mock-jwt-token';
      
      await saveAuthData(mockToken, mockUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Login failed' };
    }
  };

  const signup = async (data: { email: string; password: string; username: string; displayName: string }) => {
    try {
      // Mock signup - replace with actual API call
      const mockUser: User = {
        id: '1',
        email: data.email,
        username: data.username,
        displayName: data.displayName,
      };
      const mockToken = 'mock-jwt-token';
      
      await saveAuthData(mockToken, mockUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Signup failed' };
    }
  };

  const logout = async () => {
    await clearAuthData();
  };

  const loginWithGoogle = async (idToken: string) => {
    try {
      // Mock Google login - replace with actual API call
      const mockUser: User = {
        id: '1',
        email: 'google.user@gmail.com',
        username: 'googleuser',
        displayName: 'Google User',
      };
      const mockToken = 'mock-jwt-token';
      
      await saveAuthData(mockToken, mockUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Google login failed' };
    }
  };

  const loginWithApple = async (identityToken: string, user?: any) => {
    try {
      // Mock Apple login - replace with actual API call
      const mockUser: User = {
        id: '1',
        email: user?.email || 'apple.user@icloud.com',
        username: 'appleuser',
        displayName: user?.fullName?.givenName || 'Apple User',
      };
      const mockToken = 'mock-jwt-token';
      
      await saveAuthData(mockToken, mockUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Apple login failed' };
    }
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
