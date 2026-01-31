# Environment Variables Setup Guide

This guide explains how to properly configure environment variables for the Moro mobile app across different environments.

## Overview

The app uses environment variables for:
- **Google OAuth** (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`)
- **News API** (`EXPO_PUBLIC_NEWS_API_KEY`)
- **Backend API** (`EXPO_PUBLIC_BACKEND_URL`)

## Local Development

### 1. Create a `.env` file

Create a `.env` file in the project root (this file is git-ignored):

```bash
# .env file
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
EXPO_PUBLIC_NEWS_API_KEY=your-newsapi-key
EXPO_PUBLIC_BACKEND_URL=https://your-backend-url.com
```

**Important**: Use the `EXPO_PUBLIC_` prefix for variables that need to be accessible in the app.

### 2. Restart the development server

After creating or updating `.env`, restart Expo:

```bash
# Stop the current server (Ctrl+C)
# Clear cache and restart
npx expo start --clear
```

### 3. Access variables in code

Use the centralized env config:

```typescript
import { ENV } from '../config/env';

// Access variables
const apiKey = ENV.newsApiKey;
const clientId = ENV.googleWebClientId;
```

## Production Builds (EAS)

For production builds with EAS (Expo Application Services), use EAS Secrets instead of `.env` files:

### 1. Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### 2. Create secrets

Store sensitive values as EAS secrets:

```bash
# Add Google Web Client ID
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "your-google-client-id.apps.googleusercontent.com"

# Add News API Key
eas secret:create --scope project --name EXPO_PUBLIC_NEWS_API_KEY --value "your-newsapi-key"

# Add Backend URL
eas secret:create --scope project --name EXPO_PUBLIC_BACKEND_URL --value "https://your-backend-url.com"
```

### 3. List secrets

View all configured secrets:

```bash
eas secret:list
```

### 4. Update secrets

To update an existing secret:

```bash
eas secret:delete --name EXPO_PUBLIC_NEWS_API_KEY
eas secret:create --scope project --name EXPO_PUBLIC_NEWS_API_KEY --value "new-api-key"
```

### 5. Build the app

EAS will automatically inject these secrets during the build:

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Build for both
eas build --platform all
```

## CI/CD (GitHub Actions, etc.)

If using CI/CD pipelines:

### 1. Set repository secrets

Add environment variables as repository secrets in your CI/CD platform:
- GitHub Actions: Settings → Secrets and variables → Actions
- GitLab CI: Settings → CI/CD → Variables
- CircleCI: Project Settings → Environment Variables

### 2. Pass to EAS build

In your CI/CD workflow, pass secrets to EAS:

```yaml
# GitHub Actions example
- name: Build with EAS
  env:
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
    EXPO_PUBLIC_NEWS_API_KEY: ${{ secrets.NEWS_API_KEY }}
    EXPO_PUBLIC_BACKEND_URL: ${{ secrets.BACKEND_URL }}
  run: eas build --platform all --non-interactive
```

## Team Setup

### For new team members:

1. **Request environment variables** from the team lead
2. **Create local `.env` file** with provided values
3. **Never commit `.env`** to the repository (it's in `.gitignore`)
4. **For production access**, team lead adds you to the EAS project

### For team leads:

1. **Share `.env.example`** file (without actual secrets):
   ```bash
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-client-id-here
   EXPO_PUBLIC_NEWS_API_KEY=your-newsapi-key-here
   EXPO_PUBLIC_BACKEND_URL=https://your-backend-url
   ```

2. **Share actual secrets** through secure channels (1Password, Vault, etc.)

3. **Grant EAS access** to team members:
   ```bash
   eas project:info
   # Add collaborators through Expo dashboard
   ```

## Troubleshooting

### Variables not updating?

1. **Clear Expo cache**:
   ```bash
   npx expo start --clear
   ```

2. **Clear Metro bundler cache**:
   ```bash
   rm -rf node_modules/.cache
   npx expo start
   ```

3. **Verify variables are loaded**:
   - Check console logs when app starts (development mode)
   - Look for "[ENV] Configuration status" log

### Variables undefined in production build?

1. **Check EAS secrets are set**:
   ```bash
   eas secret:list
   ```

2. **Verify `app.config.js` includes the variable**:
   - Variables must be in the `extra` object
   - Must use `process.env.VARIABLE_NAME` syntax

3. **Rebuild the app**:
   - Changes to `app.config.js` require a new build
   - Cannot be updated via OTA updates

### Google OAuth not working?

1. **Verify the client ID** matches your OAuth consent screen
2. **Check the redirect URI** is configured in Google Cloud Console
3. **iOS**: Ensure bundle identifier matches
4. **Android**: Ensure package name and SHA-1 certificate match

### News API not working?

1. **Verify API key** is valid at https://newsapi.org/account
2. **Check rate limits** (free tier: 100 requests/day)
3. **Verify domain restrictions** (if set in NewsAPI dashboard)

## Security Best Practices

✅ **DO**:
- Use `EXPO_PUBLIC_` prefix for client-side variables
- Store secrets in EAS Secrets for production
- Use `.env` only for local development
- Add `.env` to `.gitignore`
- Rotate keys periodically
- Use different keys for dev/staging/production

❌ **DON'T**:
- Commit `.env` files to git
- Share secrets in Slack/Discord/Email
- Use production keys in development
- Hardcode API keys in source code
- Share the same keys across team members

## Resources

- [Expo Environment Variables Docs](https://docs.expo.dev/guides/environment-variables/)
- [EAS Secrets Documentation](https://docs.expo.dev/build-reference/variables/)
- [Google OAuth Setup](https://docs.expo.dev/guides/authentication/#google)
- [News API Documentation](https://newsapi.org/docs)
