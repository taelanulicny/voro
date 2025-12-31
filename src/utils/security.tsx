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
 * 1. With native modules (custom dev client): Uses react-native-screenshot-prevent for native blocking
 * 2. Without native modules (managed workflow): Uses expo-blur overlay as visual protection
 * 
 * IMPORTANT NOTES:
 * - Native screenshot prevention only works in custom dev client builds (not Expo Go)
 * - iOS: Native prevention blocks screenshots and app switcher previews
 * - Android: Native prevention is less reliable; blur overlay provides visual protection
 * - Blur overlay works in both modes and appears when app goes to background
 * 
 * Usage: Call the hook and include BlurOverlay in your component's return JSX
 * 
 * @example
 * ```tsx
 * function SensitiveScreen() {
 *   const { BlurOverlay } = useScreenshotProtection(true);
 *   return (
 *     <SafeAreaView>
 *       {BlurOverlay}
 *       // Your sensitive content here
 *     </SafeAreaView>
 *   );
 * }
 * ```
 */
export function useScreenshotProtection(enabled: boolean = true): { BlurOverlay: ReactElement | null } {
  const [showBlur, setShowBlur] = useState(false);

  useEffect(() => {
    if (!enabled) {
      // Ensure native prevention is disabled if hook is disabled
      if (ScreenshotPrevent) {
        try {
          ScreenshotPrevent.enabled(false);
        } catch (error) {
          // Ignore errors on cleanup
        }
      }
      return;
    }

    // Enable native screenshot prevention if available (custom dev client)
    if (ScreenshotPrevent && (Platform.OS === 'ios' || Platform.OS === 'android')) {
      try {
        ScreenshotPrevent.enabled(true);
      } catch (error: any) {
        // Native module not available or failed to enable
        // This is expected in managed workflow - fallback to blur overlay
        if (__DEV__) {
          console.warn('Native screenshot prevention not available (expected in managed workflow):', error?.message || error);
        }
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
      // Disable native screenshot prevention on cleanup
      if (ScreenshotPrevent) {
        try {
          ScreenshotPrevent.enabled(false);
        } catch (error) {
          // Ignore errors on cleanup - module might not be available
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
 * Certificate pinning adds defense-in-depth against sophisticated MITM attacks.
 * Your API Gateway already enforces HTTPS/TLS, but pinning validates the exact certificate.
 * 
 * SETUP INSTRUCTIONS:
 * 
 * 1. Extract certificate from your API Gateway:
 *    Run: ./scripts/extract-certificate.sh https://your-api-gateway-url.execute-api.region.amazonaws.com/prod
 *    Or manually:
 *    openssl s_client -connect YOUR_API_URL:443 -showcerts < /dev/null 2>/dev/null | \
 *      openssl x509 -outform PEM > cert.pem
 *    openssl x509 -in cert.pem -fingerprint -sha256 -noout
 * 
 * 2. Add the SHA256 fingerprints to CERTIFICATE_PINS array below (format: 'sha256/XXXXX')
 * 
 * 3. Set CERTIFICATE_PINNING_ENABLED = true
 * 
 * 4. Build custom development client: eas build --platform ios --profile development
 * 
 * 5. Test the app to ensure pinning works correctly
 * 
 * IMPORTANT NOTES:
 * - Certificate pinning only works in custom dev client builds (not Expo Go)
 * - Keep backup pins for smooth certificate rotation
 * - When your certificate rotates, extract new pins and update the array
 * - Pinning will block requests if certificate doesn't match (prevents MITM)
 * 
 * See CUSTOM_DEV_CLIENT_SETUP.md for complete setup guide
 */

// Set to true after adding certificate pins below
export const CERTIFICATE_PINNING_ENABLED = false;

/**
 * Certificate pins for API Gateway
 * 
 * Format: 'sha256/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
 * 
 * Add your certificate SHA256 fingerprints here. You can extract them using:
 * - ./scripts/extract-certificate.sh <API_URL> (recommended)
 * - Or manually with openssl commands (see instructions above)
 * 
 * Include backup pins from intermediate certificates for smooth rotation.
 */
export const CERTIFICATE_PINS: string[] = [
  // Example format (replace with your actual pins):
  // 'sha256/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  // 'sha256/YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
  // Add backup pins for certificate rotation
];

/**
 * Validate certificate pin format
 * @param pin Certificate pin string
 * @returns true if pin format is valid
 */
export function validateCertificatePin(pin: string): boolean {
  // Pin should start with 'sha256/' followed by 64 hex characters
  const pinRegex = /^sha256\/[A-Fa-f0-9]{64}$/;
  return pinRegex.test(pin);
}

/**
 * Get certificate pinning configuration
 * 
 * @returns Configuration object with enabled status and pins array
 */
export function getCertificatePinningConfig(): {
  enabled: boolean;
  pins?: string[];
} {
  // Validate all pins before enabling
  const validPins = CERTIFICATE_PINS.filter(pin => {
    const isValid = validateCertificatePin(pin);
    if (!isValid) {
      console.warn(`Invalid certificate pin format: ${pin}. Pins must be in format 'sha256/XXXXXXXXXXXXXXXX...'`);
    }
    return isValid;
  });

  return {
    enabled: CERTIFICATE_PINNING_ENABLED && validPins.length > 0,
    pins: validPins.length > 0 ? validPins : undefined,
  };
}

