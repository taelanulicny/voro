import Constants from 'expo-constants';

/**
 * Environment variables configuration
 *
 * Variables are loaded from app.config.js at build time.
 * For local development, set variables in .env file with EXPO_PUBLIC_ prefix.
 * For production builds with EAS, set secrets using: eas secret:create
 */

interface EnvConfig {
  googleWebClientId: string | undefined;
  newsApiKey: string | undefined;
  backendUrl: string | undefined;
}

// Access environment variables from expo-constants
const extra = Constants.expoConfig?.extra || {};

export const ENV: EnvConfig = {
  googleWebClientId: extra.googleWebClientId || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  newsApiKey: extra.newsApiKey || process.env.EXPO_PUBLIC_NEWS_API_KEY,
  backendUrl: extra.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL,
};

// Helper functions
export const isGoogleAuthConfigured = (): boolean => {
  return !!ENV.googleWebClientId;
};

export const isNewsApiConfigured = (): boolean => {
  return !!ENV.newsApiKey;
};

export const isBackendConfigured = (): boolean => {
  return !!ENV.backendUrl;
};

// Log configuration status (only in development)
if (__DEV__) {
  console.log('[ENV] Configuration status:', {
    googleAuth: isGoogleAuthConfigured() ? '✓' : '✗',
    newsApi: isNewsApiConfigured() ? '✓' : '✗',
    backend: isBackendConfigured() ? '✓' : '✗',
  });
}
