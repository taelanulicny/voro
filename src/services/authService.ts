import { apiRequest, authenticatedRequest, AuthResponse } from '../config/api';

/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

export interface OAuthLoginData {
  email: string;
  id: string;
  name: string;
  photo?: string;
  provider: 'google' | 'apple';
  idToken?: string; // For Google
  identityToken?: string; // For Apple
}

/**
 * Login with email and password
 */
export async function login(credentials: LoginCredentials): Promise<{
  success: boolean;
  error?: string;
  token?: string;
  user?: AuthResponse['user'];
}> {
  try {
    const response = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || 'Login failed',
      };
    }

    return {
      success: true,
      token: response.data.token,
      user: response.data.user,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Login failed',
    };
  }
}

/**
 * Sign up with email and password
 */
export async function signup(data: SignupData): Promise<{
  success: boolean;
  error?: string;
  token?: string;
  user?: AuthResponse['user'];
}> {
  try {
    const response = await apiRequest<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || 'Signup failed',
      };
    }

    return {
      success: true,
      token: response.data.token,
      user: response.data.user,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Signup failed',
    };
  }
}

/**
 * Login with OAuth (Google or Apple)
 */
export async function loginWithOAuth(data: OAuthLoginData): Promise<{
  success: boolean;
  error?: string;
  token?: string;
  user?: AuthResponse['user'];
}> {
  try {
    const endpoint = data.provider === 'google' ? '/auth/google' : '/auth/apple';
    
    const response = await apiRequest<AuthResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        providerId: data.id,
        name: data.name,
        photo: data.photo,
        idToken: data.idToken,
        identityToken: data.identityToken,
      }),
    });

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || `${data.provider} login failed`,
      };
    }

    return {
      success: true,
      token: response.data.token,
      user: response.data.user,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || `${data.provider} login failed`,
    };
  }
}

/**
 * Verify token and get current user
 */
export async function verifyToken(token: string): Promise<{
  success: boolean;
  error?: string;
  user?: AuthResponse['user'];
}> {
  try {
    const response = await authenticatedRequest<AuthResponse['user']>('/auth/me', token, {
      method: 'GET',
    });

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || 'Token verification failed',
      };
    }

    return {
      success: true,
      user: response.data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Token verification failed',
    };
  }
}

/**
 * Refresh access token
 */
export async function refreshToken(refreshToken: string): Promise<{
  success: boolean;
  error?: string;
  token?: string;
}> {
  try {
    const response = await apiRequest<{ token: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || 'Token refresh failed',
      };
    }

    return {
      success: true,
      token: response.data.token,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Token refresh failed',
    };
  }
}

/**
 * Logout (optional - can be handled client-side)
 */
export async function logout(token: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const response = await authenticatedRequest('/auth/logout', token, {
      method: 'POST',
    });

    return {
      success: response.success,
      error: response.error,
    };
  } catch (error: any) {
    // Even if logout fails on server, we can still clear local data
    return {
      success: true,
    };
  }
}

