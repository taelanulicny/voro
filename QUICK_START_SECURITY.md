# Quick Start: Enable Security Features

This is a condensed guide to enable certificate pinning and screenshot protection. For detailed instructions, see `SECURITY_FEATURES_IMPLEMENTATION.md`.

## Prerequisites

- Expo account (for EAS Build)
- EAS CLI installed: `npm install -g eas-cli`
- API Gateway URL (to extract certificate)

## Step 1: Install Dependencies

```bash
# Install custom dev client support
npx expo install expo-dev-client

# Install security libraries
npm install react-native-ssl-pinning react-native-screenshot-prevent expo-blur
```

## Step 2: Update app.json

Add `expo-dev-client` to plugins:

```json
{
  "expo": {
    "plugins": [
      "expo-apple-authentication",
      "expo-secure-store",
      "expo-font",
      "expo-web-browser",
      "expo-dev-client"
    ]
  }
}
```

## Step 3: Extract Certificate

```bash
# Replace YOUR_API_GATEWAY_URL with your actual API Gateway URL
openssl s_client -connect YOUR_API_GATEWAY_URL:443 -showcerts < /dev/null 2>/dev/null | openssl x509 -outform PEM > api-certificate.pem

# Get SHA256 fingerprint
openssl x509 -in api-certificate.pem -fingerprint -sha256 -noout
# Output: SHA256 Fingerprint=XX:XX:XX:...
# Remove colons and use as: sha256/XXXXXXXX...
```

## Step 4: Configure Certificate Pins

Edit `src/utils/security.ts`:

```typescript
export const CERTIFICATE_PINNING_ENABLED = true;
export const CERTIFICATE_PINS: string[] = [
  'sha256/YOUR_FINGERPRINT_HERE', // Add the fingerprint from Step 3
];
```

## Step 5: Build Custom Development Client

```bash
# Login to Expo
eas login

# Configure EAS (if not already done)
eas build:configure

# Build development client for testing
eas build --platform ios --profile development
eas build --platform android --profile development

# Install the built app on your device
```

## Step 6: Test

1. **Certificate Pinning:**
   - Set `EXPO_PUBLIC_ENABLE_SSL_PINNING=true` in your `.env` file
   - Try using a proxy (Charles Proxy, mitmproxy) - connection should fail
   - Remove proxy - connection should work

2. **Screenshot Protection:**
   - Open PortfolioScreen or SimulatorScreen
   - Put app in background (home button/swipe)
   - Check app switcher - content should be blurred
   - Try screenshot - should be blocked (iOS) or show black screen

## Step 7: Build Production Apps

```bash
# Build production iOS app
eas build --platform ios --profile production

# Build production Android app
eas build --platform android --profile production
```

## Current Status

✅ **Code is ready** - All security code is implemented and will automatically use native modules when available

✅ **Blur overlay works now** - Screenshot protection shows blur overlay in managed workflow

⏳ **Native features require custom dev client** - Certificate pinning and native screenshot blocking need custom dev client build

## What Works Now (Managed Workflow)

- ✅ Blur overlay on sensitive screens when app goes to background
- ✅ Regular HTTPS/TLS encryption (good security)
- ✅ All other security features (P0, P1, P2)

## What Requires Custom Dev Client

- 🔒 Native certificate pinning (blocks MITM attacks)
- 🔒 Native screenshot blocking (prevents screenshots entirely)

Both features will automatically activate when you build with custom dev client - no code changes needed!

