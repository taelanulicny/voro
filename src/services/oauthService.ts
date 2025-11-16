import * as AuthSession from 'expo-auth-session';
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
export const loginWithGoogle = async (): Promise<OAuthResult> => {
  try {
    // Get Google OAuth client ID from environment
    const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

    if (!clientId) {
      return {
        success: false,
        error: 'Google OAuth client ID not configured. Please add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to your .env file.',
      };
    }

    // Create a redirect URI
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'moro', // Match the scheme in app.json
    });

    console.log('Redirect URI:', redirectUri);

    // Create the auth request with Code flow (more reliable)
    const request = new AuthSession.AuthRequest({
      clientId: clientId,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Code,
      redirectUri: redirectUri,
      extraParams: {
        access_type: 'offline',
      },
    });

    // Get the discovery document
    const discovery = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    };

    // Start the authentication flow
    const result = await request.promptAsync(discovery);

    if (result.type === 'cancel') {
      return {
        success: false,
        error: 'Sign in was cancelled',
      };
    }

    if (result.type !== 'success') {
      return {
        success: false,
        error: `Authentication failed: ${result.type}`,
      };
    }

    // Exchange authorization code for tokens
    if (!result.params.code) {
      return {
        success: false,
        error: 'No authorization code received',
      };
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        code: result.params.code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange error:', errorText);
      return {
        success: false,
        error: 'Failed to exchange authorization code for token',
      };
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return {
        success: false,
        error: 'No access token received',
      };
    }

    // Get user info from Google
    const userInfoResponse = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`
    );

    if (!userInfoResponse.ok) {
      return {
        success: false,
        error: 'Failed to fetch user information from Google',
      };
    }

    const userInfo = await userInfoResponse.json();

    // Extract user data
    const userData = {
      id: userInfo.id || '',
      email: userInfo.email || '',
      name: userInfo.name || '',
      photo: userInfo.picture || undefined,
    };

    return {
      success: true,
      user: userData,
      idToken: tokenData.id_token, // Include ID token for backend verification
    };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to sign in with Google',
    };
  }
};

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
