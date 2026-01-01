import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

export interface OAuthResult {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    photo?: string;
  };
  idToken?: string; // For Google - to send to backend
  identityToken?: string; // For Apple - to send to backend
}

/**
 * Sign in with Google using Expo Auth Session
 */
// loginWithGoogle removed - moved to LoginScreen.tsx using expo-auth-session/providers/google

/**
 * Sign in with Apple
 */
export const loginWithApple = async (): Promise<OAuthResult> => {
  try {
    // Check if Apple Authentication is available
    const isAvailable = await AppleAuthentication.isAvailableAsync();

    if (!isAvailable) {
      return {
        success: false,
        error: 'Apple Sign In is not available on this device',
      };
    }

    // Request Apple authentication
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return {
        success: false,
        error: 'Failed to get identity token from Apple',
      };
    }

    // Extract user information
    const userData = {
      id: credential.user,
      email: credential.email || '',
      name: credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : 'Apple User',
      photo: undefined, // Apple doesn't provide photos
    };

    return {
      success: true,
      user: userData,
      identityToken: credential.identityToken, // Include identity token for backend verification
    };
  } catch (error: any) {
    console.error('Apple Sign-In Error:', error);

    if (error.code === 'ERR_CANCELED') {
      return {
        success: false,
        error: 'Sign in was cancelled',
      };
    } else {
      return {
        success: false,
        error: error.message || 'Failed to sign in with Apple',
      };
    }
  }
};

/**
 * Sign out from Google (if needed)
 * Note: With expo-auth-session, tokens are managed by the system
 */
export const signOutGoogle = async (): Promise<void> => {
  // expo-auth-session manages tokens automatically
  // No explicit sign-out needed unless you're storing tokens manually
  console.log('Google sign-out handled by system');
};
