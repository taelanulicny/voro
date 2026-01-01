# OAuth Setup Guide for Moro App

The backend is now configured to handle Google and Apple OAuth. Here's how to set up each provider.

## Google Sign-In Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** (or People API)

### Step 2: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Fill in the required fields:
   - App name: `Moro`
   - User support email: your email
   - Developer contact email: your email
4. Add scopes: `email`, `profile`, `openid`
5. Add test users if in testing mode

### Step 3: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application** (yes, even for mobile - Expo uses web flow)
4. Add authorized redirect URIs:
   - For development: `https://auth.expo.io/@your-expo-username/moro`
   - For Expo Go: `exp://localhost:8081/--/`
   - For standalone builds: `moro://` (your app scheme)
5. Copy the **Client ID**

### Step 4: Add to .env

Add this line to your `.env` file:

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## Apple Sign-In Setup

Apple Sign-In requires an Apple Developer account ($99/year).

### Step 1: Configure App ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Go to **Certificates, Identifiers & Profiles** → **Identifiers**
3. Select your App ID (or create one)
4. Enable **Sign In with Apple** capability
5. Configure it as **Enable as a primary App ID**

### Step 2: Create Service ID (for web flow)

1. Go to **Identifiers** → Click **+**
2. Choose **Services IDs**
3. Register a new Service ID
4. Configure Sign In with Apple:
   - Add domains: your API domain
   - Add return URLs

### Step 3: Generate Key

1. Go to **Keys** → Click **+**
2. Enable **Sign in with Apple**
3. Configure and download the key file

### Step 4: Update app.json

Make sure your `app.json` has:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.moro",
      "usesAppleSignIn": true
    }
  }
}
```

### Step 5: Enable in Xcode (for native builds)

1. Open the iOS project in Xcode
2. Go to **Signing & Capabilities**
3. Add **Sign in with Apple** capability

---

## Testing OAuth

### Google Sign-In
1. Make sure `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is set in `.env`
2. Run the app with `npm start`
3. Click "Continue with Google" on the login screen
4. Complete the Google sign-in flow

### Apple Sign-In
1. Apple Sign-In only works on:
   - Real iOS devices (iOS 13+)
   - iOS Simulator (with limitations)
2. Does NOT work in Expo Go on Android
3. Click "Continue with Apple" on the login screen

---

## Current .env Configuration

Your `.env` should look like this when complete:

```
EXPO_PUBLIC_API_URL=https://nrv9m5dpr1.execute-api.us-east-1.amazonaws.com/prod
EXPO_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_irqEbJUrt
EXPO_PUBLIC_COGNITO_CLIENT_ID=1cgsver1gisjq7fs3cou41dh65
EXPO_PUBLIC_REGION=us-east-1
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## Backend Status

✅ Google OAuth endpoint: `POST /api/auth/google`
✅ Apple OAuth endpoint: `POST /api/auth/apple`
✅ Token verification for OAuth users
✅ User creation/linking on first OAuth login

The backend is fully configured and deployed. You just need to add the Google Client ID to enable the frontend flow.
