# OAuth Setup Guide - Google & Apple Sign-In

## Overview

The login system now supports three authentication methods:
1. **Email/Password** - Traditional username and password
2. **Google Sign-In** - OAuth with Google
3. **Apple Sign-In** - OAuth with Apple (iOS only)

---

## Google Sign-In Setup

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable **Google Sign-In API**
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Create credentials for:
   - **Web application** (for React Native)
   - **iOS** (if deploying to iOS)
   - **Android** (if deploying to Android)

### 2. Configure for React Native

#### For Android:
1. Get your **SHA-1 certificate fingerprint**:
   ```bash
   # Debug keystore
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   
   # Release keystore (if you have one)
   keytool -list -v -keystore your-release-key.keystore -alias your-key-alias
   ```
2. Add the SHA-1 to your Android OAuth client in Google Cloud Console

#### For iOS:
1. Get your **Bundle ID** from `app.json` or Xcode
2. Add the Bundle ID to your iOS OAuth client in Google Cloud Console

### 3. Add Environment Variable

Create a `.env` file in your project root:

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

Or add to `app.json`:

```json
{
  "expo": {
    "extra": {
      "googleWebClientId": "your-web-client-id.apps.googleusercontent.com"
    }
  }
}
```

### 4. Update oauthService.ts

The Google Sign-In is already configured in `src/services/oauthService.ts`. Make sure the `webClientId` matches your credentials:

```typescript
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
  // ... other config
});
```

---

## Apple Sign-In Setup

### 1. Apple Developer Account

1. You need an **Apple Developer Account** ($99/year)
2. Go to [Apple Developer Portal](https://developer.apple.com/)

### 2. Configure App ID

1. Go to **Certificates, Identifiers & Profiles**
2. Select your **App ID**
3. Enable **Sign In with Apple** capability
4. Save the configuration

### 3. Configure in Xcode

1. Open your project in Xcode
2. Select your target
3. Go to **Signing & Capabilities**
4. Click **+ Capability**
5. Add **Sign In with Apple**

### 4. For Expo Managed Workflow

If using Expo, the `expo-apple-authentication` package handles most of this automatically. Just make sure:

1. Your `app.json` has the correct bundle identifier
2. You've configured Sign In with Apple in Apple Developer Portal
3. The app is built with EAS Build or Expo Development Build (not Expo Go)

### 5. Testing

- Apple Sign-In only works on **real iOS devices** or **iOS Simulator with iOS 13+**
- It won't work in Expo Go - you need a development build

---

## Current Implementation Status

### ✅ What's Working

- **UI/UX**: Complete login screen with all three options
- **Email/Password**: Fully functional (mock implementation)
- **Google Sign-In**: UI ready, needs OAuth credentials
- **Apple Sign-In**: UI ready, needs Apple Developer setup
- **Error Handling**: Comprehensive error messages
- **Loading States**: Visual feedback during authentication

### 🔧 What Needs Configuration

1. **Google OAuth Credentials**: Add your `webClientId` to environment variables
2. **Apple Developer Setup**: Configure Sign In with Apple capability
3. **Backend Integration**: Connect to your authentication API (currently using mock data)

---

## Testing Without OAuth Setup

### Email/Password Login

You can test email/password login immediately - it uses mock authentication:

```
Email: any@email.com
Password: any password
```

### Google Sign-In

Without credentials configured, you'll get an error. To test:
1. Set up Google OAuth credentials
2. Add `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to `.env`
3. Rebuild the app

### Apple Sign-In

Without Apple Developer setup:
1. Configure Sign In with Apple in Apple Developer Portal
2. Build with EAS Build or development build
3. Test on iOS device or simulator

---

## Backend Integration

Currently, all authentication uses **mock data**. To connect to your backend:

### 1. Update AuthContext

In `src/context/AuthContext.tsx`, replace mock implementations with API calls:

```typescript
const login = async (email: string, password: string) => {
  try {
    const response = await fetch('https://your-api.com/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      await saveAuthData(data.token, data.user);
      return { success: true };
    } else {
      return { success: false, error: data.message };
    }
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
};
```

### 2. Update OAuth Services

For Google and Apple, send the OAuth tokens to your backend:

```typescript
// In oauthService.ts, after getting the token
const response = await fetch('https://your-api.com/auth/google', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ idToken }),
});

const data = await response.json();
// Handle response...
```

---

## Environment Variables

Create a `.env` file (and add to `.gitignore`):

```env
# Google OAuth
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-client-id.apps.googleusercontent.com

# API
EXPO_PUBLIC_API_URL=https://your-api.com
```

Access in code:

```typescript
const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
```

---

## Troubleshooting

### Google Sign-In Issues

**Error: "DEVELOPER_ERROR"**
- Check that your SHA-1 fingerprint is correct
- Verify the package name matches your app
- Make sure OAuth client is configured correctly

**Error: "SIGN_IN_REQUIRED"**
- User cancelled the sign-in
- This is expected behavior

### Apple Sign-In Issues

**Error: "Not available"**
- Only works on iOS 13+
- Requires development build (not Expo Go)
- Must be configured in Apple Developer Portal

**Error: "User cancelled"**
- User cancelled the sign-in
- This is expected behavior

---

## Security Notes

1. **Never commit OAuth credentials** to version control
2. **Use environment variables** for sensitive data
3. **Validate tokens on backend** - don't trust client-side tokens
4. **Use HTTPS** for all API calls
5. **Implement token refresh** for long-lived sessions

---

## Next Steps

1. ✅ UI is complete and ready
2. 🔧 Configure Google OAuth credentials
3. 🔧 Set up Apple Developer account and capabilities
4. 🔧 Connect to backend API
5. 🧪 Test all three authentication methods

---

## Resources

- [Google Sign-In for React Native](https://github.com/react-native-google-signin/google-signin)
- [Expo Apple Authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Apple Developer Portal](https://developer.apple.com/)

---

**The login system is ready! Just add your OAuth credentials and backend API endpoints.** 🚀

