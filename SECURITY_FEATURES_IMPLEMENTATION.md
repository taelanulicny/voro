# Security Features Implementation Guide

This guide explains how to implement certificate pinning and screenshot protection so they work on all user devices in production.

## Overview

Both features require **Expo Custom Development Client** (not managed workflow) because they need native modules. The good news is that Expo's custom dev client still allows you to use most Expo features while adding native modules.

## Option 1: Expo Custom Development Client (Recommended)

This approach keeps you in the Expo ecosystem while adding native modules.

### Step 1: Install Required Dependencies

```bash
# Install certificate pinning library
npm install react-native-ssl-pinning

# Install screenshot protection (iOS)
npm install react-native-screenshot-prevent

# Install expo-blur for visual protection
npx expo install expo-blur

# Install expo-dev-client (required for custom dev client)
npx expo install expo-dev-client
```

### Step 2: Configure app.json

Update `app.json` to use custom development client:

```json
{
  "expo": {
    "plugins": [
      "expo-apple-authentication",
      "expo-secure-store",
      "expo-font",
      "expo-web-browser",
      "expo-dev-client"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.moro.mobile",
      "buildNumber": "15",
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#8B1538"
      },
      "package": "com.moro.mobile"
    }
  }
}
```

### Step 3: Implement Certificate Pinning

#### 3a. Extract Certificate from API Gateway

First, extract the certificate from your API Gateway endpoint:

```bash
# Get certificate from your API Gateway URL
openssl s_client -connect YOUR_API_GATEWAY_URL:443 -showcerts < /dev/null 2>/dev/null | openssl x509 -outform PEM > api-certificate.pem

# Extract SHA256 fingerprint
openssl x509 -in api-certificate.pem -fingerprint -sha256 -noout
```

#### 3b. Update src/config/api.ts

```typescript
import { fetch } from 'react-native-ssl-pinning';

// Certificate pinning configuration
const CERTIFICATE_PINS = [
  'sha256/YOUR_CERTIFICATE_FINGERPRINT_HERE', // Replace with actual fingerprint
  // Add backup pins for certificate rotation
];

/**
 * Make API request with certificate pinning
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_URL}${endpoint}`;
  
  try {
    // Use SSL pinning for production, regular fetch for development
    const usePinning = !__DEV__ && CERTIFICATE_PINS.length > 0;
    
    if (usePinning) {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          ...API_CONFIG.headers,
          ...(options.headers as Record<string, string>),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        sslPinning: {
          certs: CERTIFICATE_PINS,
        },
        timeoutInterval: API_CONFIG.timeout,
      });
      
      const data = await response.json();
      return {
        success: response.status >= 200 && response.status < 300,
        data,
      };
    } else {
      // Fallback to regular fetch in development
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          ...API_CONFIG.headers,
          ...(options.headers as Record<string, string>),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      
      const data = await response.json();
      return {
        success: response.status >= 200 && response.status < 300,
        data,
      };
    }
  } catch (error: any) {
    // Handle pinning failures gracefully
    if (error.message?.includes('SSL') || error.message?.includes('certificate')) {
      console.error('Certificate pinning failed:', error);
      // In production, you might want to block the request
      // For now, we'll log and continue (you can make this stricter)
      return {
        success: false,
        error: 'Certificate validation failed',
      };
    }
    throw error;
  }
}
```

#### 3c. Update src/utils/security.ts

```typescript
/**
 * Certificate pinning configuration
 * Set to true when certificate pins are configured
 */
export const CERTIFICATE_PINNING_ENABLED = true; // Enable when pins are added

export function getCertificatePinningConfig(): {
  enabled: boolean;
  pins?: string[];
} {
  return {
    enabled: CERTIFICATE_PINNING_ENABLED,
    pins: [
      'sha256/YOUR_CERTIFICATE_FINGERPRINT_HERE', // Add actual pins
    ],
  };
}
```

### Step 4: Implement Screenshot Protection

#### 4a. Update src/utils/security.ts

```typescript
import { useEffect, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { BlurView } from 'expo-blur';
import ScreenshotPrevent from 'react-native-screenshot-prevent';

/**
 * Hook to prevent screenshots on sensitive screens (iOS/Android)
 * 
 * Uses native screenshot prevention when available, with blur overlay as fallback
 */
export function useScreenshotProtection(enabled: boolean = true) {
  const blurViewRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Enable native screenshot prevention (iOS/Android)
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        ScreenshotPrevent.enabled(true);
      } catch (error) {
        console.warn('Native screenshot prevention not available:', error);
      }
    }

    // Monitor app state for blur overlay
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App is going to background - show blur overlay
        if (blurViewRef.current) {
          blurViewRef.current.setNativeProps({ style: { opacity: 1 } });
        }
      } else if (nextAppState === 'active') {
        // App is active - hide blur overlay
        if (blurViewRef.current) {
          blurViewRef.current.setNativeProps({ style: { opacity: 0 } });
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      ScreenshotPrevent.enabled(false);
      subscription.remove();
    };
  }, [enabled]);

  // Return blur view component for screens to use
  return {
    BlurOverlay: enabled ? (
      <BlurView
        ref={blurViewRef}
        intensity={100}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          opacity: 0, // Hidden by default, shown when app goes to background
        }}
      />
    ) : null,
  };
}
```

#### 4b. Update Screens to Use Blur Overlay

Update sensitive screens to include the blur overlay:

```typescript
// In PortfolioScreen.tsx, SimulatorScreen.tsx, AccountValueScreen.tsx
import { useScreenshotProtection } from '../utils/security';

function PortfolioScreen() {
  const { BlurOverlay } = useScreenshotProtection(true);
  
  return (
    <SafeAreaView style={styles.container}>
      {BlurOverlay}
      {/* Rest of your screen content */}
    </SafeAreaView>
  );
}
```

### Step 5: Build Custom Development Client

```bash
# Install EAS CLI if not already installed
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS Build
eas build:configure

# Build custom development client for iOS
eas build --platform ios --profile development

# Build custom development client for Android
eas build --platform android --profile development
```

### Step 6: Build Production Apps

```bash
# Build production iOS app
eas build --platform ios --profile production

# Build production Android app
eas build --platform android --profile production
```

## Option 2: Eject from Expo (Not Recommended)

If you need more control, you can eject from Expo, but this loses many Expo benefits:

```bash
npx expo eject
```

**Note:** This is a one-way operation and makes it harder to use Expo services.

## Implementation Checklist

- [ ] Install `expo-dev-client`
- [ ] Install `react-native-ssl-pinning`
- [ ] Install `react-native-screenshot-prevent`
- [ ] Install `expo-blur`
- [ ] Extract certificate from API Gateway
- [ ] Configure certificate pins in `src/config/api.ts`
- [ ] Update `useScreenshotProtection` hook with native modules
- [ ] Add blur overlays to sensitive screens
- [ ] Update `app.json` with `expo-dev-client` plugin
- [ ] Build custom development client
- [ ] Test on physical devices (simulators may not support all features)
- [ ] Build production apps with EAS

## Testing

1. **Certificate Pinning Test:**
   - Use a proxy tool (Charles Proxy, mitmproxy) to intercept traffic
   - App should fail to connect when certificate doesn't match
   - App should work normally with correct certificate

2. **Screenshot Protection Test:**
   - On iOS device, try to take screenshot (home + power button)
   - Screenshot should be blocked or show black screen
   - Test app switcher - sensitive content should be blurred

## Important Notes

1. **Certificate Rotation:** When your API Gateway certificate rotates, you'll need to update the pins. Keep backup pins for smooth transitions.

2. **Development vs Production:** Certificate pinning should be disabled in development to avoid issues with local proxies. Use `__DEV__` flag.

3. **Android Screenshot Protection:** Android screenshot prevention is less reliable than iOS. Consider using blur overlay as primary protection on Android.

4. **App Store Review:** Screenshot protection may trigger App Store review questions. Be prepared to explain the security rationale.

5. **Performance:** Native screenshot prevention has minimal performance impact. Blur overlays may have slight performance cost when transitioning.

## Alternative: expo-blur Only (Simpler, Less Secure)

If you want a simpler solution without native modules, you can use only `expo-blur`:

```typescript
import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export function useScreenshotProtection(enabled: boolean = true) {
  const [showBlur, setShowBlur] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setShowBlur(nextAppState !== 'active');
    });

    return () => subscription.remove();
  }, [enabled]);

  return {
    BlurOverlay: enabled && showBlur ? (
      <BlurView
        intensity={100}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
        }}
      />
    ) : null,
  };
}
```

This provides visual protection but doesn't prevent screenshots natively.

