# Fixing RevenueCat Preview Mode

RevenueCat requires native modules that aren't available in Expo Go. You need to use a **development build** instead.

## Quick Fix

### Option 1: Local Development Build (Recommended for Testing)

1. **Build and run on iOS Simulator:**
   ```bash
   npx expo run:ios
   ```
   This will build a development client with native modules and launch it in the simulator.

2. **Build and run on Android:**
   ```bash
   npx expo run:android
   ```
   This will build a development client and launch it on your connected Android device/emulator.

### Option 2: EAS Development Build (For Physical Devices)

If you need to test on a physical device:

1. **Build for iOS:**
   ```bash
   eas build --profile development --platform ios
   ```
   Then install the build on your device via TestFlight or direct install.

2. **Build for Android:**
   ```bash
   eas build --profile development --platform android
   ```
   Then install the APK on your device.

## What's Already Set Up

✅ `expo-dev-client` is installed in `package.json`  
✅ `expo-dev-client` plugin is configured in `app.json`  
✅ EAS build profile for development exists in `eas.json`

## Important Notes

- **Expo Go won't work** - You must use a development build
- The first build takes longer (compiles native code)
- Subsequent builds are faster (incremental)
- Development builds support hot reload just like Expo Go

## After Building

Once you run `npx expo run:ios` or `npx expo run:android`, the app will:
1. Build the native code (first time takes 5-10 minutes)
2. Launch the development client
3. Connect to Metro bundler
4. RevenueCat will work properly (no more Preview mode warnings)

## Troubleshooting

If you see build errors:
- Make sure you have Xcode installed (for iOS)
- Make sure Android Studio is set up (for Android)
- Run `npx expo prebuild --clean` to regenerate native folders
- Check that all dependencies are installed: `npm install`

