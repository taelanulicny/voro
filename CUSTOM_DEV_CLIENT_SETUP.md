# Custom Development Client Setup Guide

This guide walks you through setting up Expo Custom Development Client to enable certificate pinning and native screenshot protection in your Moro app.

## Overview

Expo Custom Development Client allows you to use native modules (like `react-native-ssl-pinning` and `react-native-screenshot-prevent`) while still using most Expo features. This is required for production-grade security features.

## Prerequisites

- ✅ All dependencies are already installed:
  - `expo-dev-client`
  - `react-native-ssl-pinning`
  - `react-native-screenshot-prevent`
  - `expo-blur`
- ✅ `app.json` is configured with `expo-dev-client` plugin
- ✅ `eas.json` has build profiles configured

## Step 1: Extract Certificate from API Gateway

Before enabling certificate pinning, you need to extract the SSL certificate from your API Gateway endpoint.

### Option A: Using the Extraction Script (Recommended)

```bash
# Make the script executable (if not already)
chmod +x scripts/extract-certificate.sh

# Run the script with your API Gateway URL
./scripts/extract-certificate.sh https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod
```

The script will:
- Connect to your API Gateway
- Extract the SSL certificate
- Generate SHA256 fingerprints
- Output formatted pins ready to paste into `src/utils/security.tsx`

### Option B: Manual Extraction

If you prefer to extract manually:

```bash
# Extract certificate
openssl s_client -connect your-api-gateway-url.execute-api.us-east-1.amazonaws.com:443 -showcerts < /dev/null 2>/dev/null | \
  openssl x509 -outform PEM > cert.pem

# Generate SHA256 fingerprint
openssl x509 -in cert.pem -fingerprint -sha256 -noout
```

The output will look like:
```
SHA256 Fingerprint=XX:XX:XX:XX:...
```

Convert it to pin format: `sha256/XXXXXXXXXXXXXXXX...` (remove colons, add `sha256/` prefix)

## Step 2: Add Certificate Pins to Security Config

1. Open `src/utils/security.tsx`

2. Find the `CERTIFICATE_PINS` array (around line 126)

3. Add your certificate pins:

```typescript
export const CERTIFICATE_PINS: string[] = [
  'sha256/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', // Main certificate
  'sha256/YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY', // Backup pin (intermediate cert)
];
```

**Important:**
- Include backup pins from intermediate certificates for smooth rotation
- Pins must be in format: `sha256/` followed by 64 hex characters
- The extraction script provides properly formatted pins

4. Enable certificate pinning:

```typescript
export const CERTIFICATE_PINNING_ENABLED = true;
```

## Step 3: Build Custom Development Client

### Install EAS CLI (if not already installed)

```bash
npm install -g eas-cli
```

### Login to Expo

```bash
eas login
```

### Build Development Client for iOS

```bash
# For iOS Simulator (faster, good for testing)
eas build --platform ios --profile development

# For physical iOS device
eas build --platform ios --profile development --local
```

### Build Development Client for Android

```bash
# For Android device
eas build --platform android --profile development
```

**Note:** Development builds can take 10-20 minutes. You'll receive a download link via email or in the terminal.

### Install Development Client on Device

- **iOS:** Download the `.ipa` file and install via TestFlight or direct install
- **Android:** Download the `.apk` file and install on your device

## Step 4: Test Certificate Pinning

1. Start your development server:

```bash
npm start
```

2. Open the custom development client on your device

3. Scan the QR code or enter the URL manually

4. Test API requests - they should work normally

5. **Test pinning failure** (optional, for verification):
   - Use a proxy tool (Charles Proxy, mitmproxy) to intercept traffic
   - App should fail to connect when certificate doesn't match
   - This confirms pinning is working

## Step 5: Test Screenshot Protection

1. Navigate to a sensitive screen (Portfolio, Simulator, Account Value)

2. **Test on iOS:**
   - Try to take a screenshot (Home + Power button)
   - Screenshot should be blocked or show black screen
   - Open app switcher - sensitive content should be blurred

3. **Test on Android:**
   - Try to take a screenshot
   - Native prevention may not work on all devices
   - Blur overlay should appear when app goes to background

4. **Test blur overlay:**
   - Navigate to sensitive screen
   - Press home button or switch apps
   - Blur overlay should appear immediately
   - Return to app - blur should disappear

## Step 6: Build Production Apps

Once testing is complete, build production apps:

### iOS Production Build

```bash
eas build --platform ios --profile production
```

### Android Production Build

```bash
eas build --platform android --profile production
```

**Note:** Production builds include all security features and are ready for App Store/Play Store submission.

## Troubleshooting

### Certificate Pinning Issues

**Problem:** App fails to connect after enabling pinning

**Solutions:**
- Verify certificate pins are correct (check format: `sha256/...`)
- Ensure pins match the actual API Gateway certificate
- Check that `CERTIFICATE_PINNING_ENABLED = true` is set
- Verify you're using custom dev client (not Expo Go)

**Problem:** Certificate validation fails

**Solutions:**
- Extract certificate again (may have rotated)
- Add backup pins from intermediate certificates
- Check API Gateway URL is correct

### Screenshot Protection Issues

**Problem:** Screenshots still work on Android

**Solution:** This is expected - Android screenshot prevention is less reliable. The blur overlay provides visual protection when app goes to background.

**Problem:** Native module not available

**Solution:** Ensure you're using custom dev client build, not Expo Go. Native modules don't work in managed workflow.

**Problem:** Blur overlay doesn't appear

**Solutions:**
- Check `expo-blur` is installed: `npx expo install expo-blur`
- Verify hook is called: `const { BlurOverlay } = useScreenshotProtection(true);`
- Ensure `BlurOverlay` is rendered in JSX

### Build Issues

**Problem:** Build fails with native module errors

**Solutions:**
- Ensure all dependencies are installed: `npm install`
- Clear build cache: `eas build --clear-cache`
- Check `app.json` has `expo-dev-client` in plugins
- Verify native modules are compatible with your React Native version

**Problem:** Development client doesn't connect to dev server

**Solutions:**
- Ensure dev server is running: `npm start`
- Check network connection (device and computer on same network)
- Try entering URL manually in development client
- Check firewall isn't blocking connection

## Certificate Rotation

When your API Gateway certificate rotates:

1. Extract new certificate using the script:
   ```bash
   ./scripts/extract-certificate.sh https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod
   ```

2. Update `CERTIFICATE_PINS` array in `src/utils/security.tsx`

3. Keep old pins temporarily for smooth transition

4. Test the app to ensure it still works

5. Remove old pins after confirming new ones work

## Environment Variables

**Important:** Certificate pinning does NOT use environment variables. It uses the configuration in `src/utils/security.tsx`.

- `EXPO_PUBLIC_API_URL` - Your API Gateway URL (already configured)
- No other environment variables needed for security features

## Development vs Production

- **Development:** Certificate pinning is disabled by default (`CERTIFICATE_PINNING_ENABLED = false`)
- **Production:** Enable pinning after adding certificate pins
- **Screenshot Protection:** Works in both development and production builds
- **Native Modules:** Only work in custom dev client builds, not Expo Go

## Next Steps

1. ✅ Extract certificate from API Gateway
2. ✅ Add pins to `src/utils/security.tsx`
3. ✅ Enable certificate pinning
4. ✅ Build custom development client
5. ✅ Test on physical devices
6. ✅ Build production apps
7. ✅ Submit to App Store/Play Store

## Additional Resources

- [Expo Custom Development Client Docs](https://docs.expo.dev/development/introduction/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Certificate Pinning Best Practices](https://owasp.org/www-community/controls/Certificate_and_Public_Key_Pinning)
- See `SECURITY_FEATURES_IMPLEMENTATION.md` for detailed technical information

## Support

If you encounter issues:
1. Check this troubleshooting section
2. Review `SECURITY_FEATURES_IMPLEMENTATION.md` for technical details
3. Check Expo/EAS documentation
4. Verify all dependencies are correctly installed

