/**
 * Security utilities for mobile app
 * 
 * These utilities support both Expo managed workflow (with limitations)
 * and custom development client (with full native module support).
 * 
 * To enable full functionality:
 * 1. Install expo-dev-client: npx expo install expo-dev-client
 * 2. Install native modules: npm install react-native-ssl-pinning react-native-screenshot-prevent expo-blur
 * 3. Build custom development client: eas build --platform ios --profile development
 * 4. See SECURITY_FEATURES_IMPLEMENTATION.md for complete setup guide
 */

import { useEffect, useState } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { ReactElement } from 'react';

// Try to import native modules (will be undefined in managed workflow)
let ScreenshotPrevent: any;
let BlurView: any;

try {
  ScreenshotPrevent = require('react-native-screenshot-prevent').default;
} catch (e) {
  // Native module not available (managed workflow)
}

try {
  BlurView = require('expo-blur').BlurView;
} catch (e) {
  // expo-blur not installed
}

/**
 * Hook to prevent screenshots on sensitive screens (iOS/Android)
 * 
 * Works in two modes:
 * 1. With native modules (custom dev client): Uses react-native-screenshot-prevent
 * 2. Without native modules (managed workflow): Uses expo-blur overlay as visual protection
 * 
 * Usage: Call the hook and include BlurOverlay in your component's return JSX
 */
export function useScreenshotProtection(enabled: boolean = true): { BlurOverlay: ReactElement | null } {
  const [showBlur, setShowBlur] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Enable native screenshot prevention if available (custom dev client)
    if (ScreenshotPrevent && (Platform.OS === 'ios' || Platform.OS === 'android')) {
      try {
        ScreenshotPrevent.enabled(true);
      } catch (error) {
        console.warn('Native screenshot prevention not available:', error);
      }
    }

    // Monitor app state for blur overlay (works in both modes)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App is going to background - show blur overlay
        setShowBlur(true);
      } else if (nextAppState === 'active') {
        // App is active - hide blur overlay
        setShowBlur(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      // Disable native screenshot prevention
      if (ScreenshotPrevent) {
        try {
          ScreenshotPrevent.enabled(false);
        } catch (error) {
          // Ignore errors on cleanup
        }
      }
      subscription.remove();
    };
  }, [enabled]);

  // Return blur overlay component for screens to use
  // Works even without native modules (expo-blur provides visual protection)
  const BlurOverlay = enabled && showBlur && BlurView ? (
    <BlurView
      intensity={100}
      tint="dark"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      }}
    />
  ) : null;

  return { BlurOverlay };
}

/**
 * Certificate pinning configuration
 * 
 * To enable certificate pinning:
 * 1. Install expo-dev-client: npx expo install expo-dev-client
 * 2. Install react-native-ssl-pinning: npm install react-native-ssl-pinning
 * 3. Extract certificate from API Gateway (see SECURITY_FEATURES_IMPLEMENTATION.md)
 * 4. Add certificate pins below
 * 5. Build custom development client
 * 
 * Current security: API Gateway enforces HTTPS/TLS (good protection)
 * Certificate pinning adds defense-in-depth against sophisticated MITM attacks
 */

// Set to true after installing native modules and adding certificate pins
export const CERTIFICATE_PINNING_ENABLED = false;

// Add your certificate SHA256 fingerprints here
// Get them by running: openssl s_client -connect YOUR_API_URL:443 -showcerts
// Then: openssl x509 -in cert.pem -fingerprint -sha256 -noout
export const CERTIFICATE_PINS: string[] = [
  // 'sha256/YOUR_CERTIFICATE_FINGERPRINT_HERE',
  // Add backup pins for certificate rotation
];

/**
 * Get certificate pinning configuration
 */
export function getCertificatePinningConfig(): {
  enabled: boolean;
  pins?: string[];
} {
  return {
    enabled: CERTIFICATE_PINNING_ENABLED && CERTIFICATE_PINS.length > 0,
    pins: CERTIFICATE_PINS.length > 0 ? CERTIFICATE_PINS : undefined,
  };
}

