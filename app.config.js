// Load environment variables from .env file
require('dotenv').config();

export default {
  expo: {
    owner: 'moro-systems-llc',
    name: 'Moro',
    slug: 'moro-mobile',
    version: '10.1.9',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/icon.png',
      resizeMode: 'contain',
      backgroundColor: '#423352',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.moro.mobile',
      buildNumber: '34',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      associatedDomains: ['applinks:moro.app', 'applinks:www.moro.app'],
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#423352',
      },
      package: 'com.moro.mobile',
      versionCode: 34,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host: 'moro.app',
            },
            {
              scheme: 'https',
              host: 'www.moro.app',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: ['expo-apple-authentication'],
    scheme: 'moro',
    extra: {
      eas: {
        projectId: '708bec65-057b-4d09-af4e-c6360b12450e',
      },
      // Environment variables accessible via expo-constants
      // These will be embedded in the app at build time
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      newsApiKey: process.env.EXPO_PUBLIC_NEWS_API_KEY,
      backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL,
      // Add other environment variables as needed
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
  },
};
