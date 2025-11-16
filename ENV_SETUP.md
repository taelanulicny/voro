# Environment Variables Setup

## Quick Setup

### Step 1: Create `.env` file

In the root of `moro-mobile/`, create a file named `.env` (not `.env.example`):

```bash
# From the project root
touch .env
```

### Step 2: Add Your Configuration

Open `.env` and add your configuration:

```env
# Backend API URL
EXPO_PUBLIC_API_URL=https://your-api.com/api

# Google OAuth Client ID
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
```

**Important**: 
- Replace `https://your-api.com/api` with your actual backend API URL
- Replace `your-actual-client-id.apps.googleusercontent.com` with your actual Google client ID
- The client ID should end with `.apps.googleusercontent.com`
- Make sure there are no quotes around the values
- No spaces before or after the `=` sign

### Step 3: Restart Expo

After creating/updating `.env`, you need to restart Expo:

```bash
# Stop the current Expo server (Ctrl+C)
# Then restart
npm start -- --clear
# or
npx expo start -c
```

The `-c` flag clears the cache to ensure environment variables are loaded.

### Step 4: Verify It's Working

1. Open the app
2. Go to Login screen
3. Tap "Continue with Google"
4. You should see the Google sign-in flow (instead of an error)

---

## Security Notes

✅ **DO:**
- Keep `.env` in `.gitignore` (already done)
- Use `.env.example` as a template (without real values)
- Share `.env.example` in your repo
- Never commit `.env` to git

❌ **DON'T:**
- Commit `.env` to version control
- Share your actual client ID in chat/email
- Hardcode credentials in source code

---

## Troubleshooting

### Environment variable not loading?

1. **Check file name**: Must be exactly `.env` (not `.env.local` or `.env.development`)
2. **Check location**: Must be in `moro-mobile/` root (same level as `package.json`)
3. **Check variable name**: Must start with `EXPO_PUBLIC_` for Expo
4. **Restart Expo**: Always restart after changing `.env`
5. **Clear cache**: Use `expo start -c` to clear cache

### Still not working?

Check if the variable is being read:

```typescript
// Temporarily add this to oauthService.ts to debug
console.log('Google Client ID:', process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
```

---

## Example `.env` file

```env
# Backend API URL (required for email/password login)
EXPO_PUBLIC_API_URL=https://api.moro.com/api

# Google OAuth Client ID (required for Google Sign-In)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
```

## Backend API Endpoints Required

Your backend needs to implement these endpoints:

### 1. POST `/api/auth/login`
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "username": "username",
      "displayName": "Display Name",
      "avatarUrl": "https://...",
      "bio": "..."
    }
  }
}
```

### 2. POST `/api/auth/signup`
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "username",
  "displayName": "Display Name"
}
```

**Response:** Same as login

### 3. POST `/api/auth/google`
**Request:**
```json
{
  "email": "user@gmail.com",
  "providerId": "google-user-id",
  "name": "User Name",
  "photo": "https://...",
  "idToken": "google-id-token"
}
```

**Response:** Same as login

### 4. POST `/api/auth/apple`
**Request:**
```json
{
  "email": "user@privaterelay.appleid.com",
  "providerId": "apple-user-id",
  "name": "User Name",
  "identityToken": "apple-identity-token"
}
```

**Response:** Same as login

### 5. GET `/api/auth/me`
**Headers:**
```
Authorization: Bearer jwt-token-here
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "username": "username",
    "displayName": "Display Name",
    "avatarUrl": "https://...",
    "bio": "..."
  }
}
```

### 6. POST `/api/auth/logout` (optional)
**Headers:**
```
Authorization: Bearer jwt-token-here
```

**Response:**
```json
{
  "success": true
}
```

---

## Next Steps

Once you've added your Google Client ID:

1. ✅ Create `.env` file with your client ID
2. ✅ Restart Expo with `npm start -- --clear`
3. ✅ Test Google Sign-In in the app
4. 🔜 Configure Apple Sign-In (if needed)
5. 🔜 Connect to backend API

---

**Your `.env` file is already in `.gitignore`, so it won't be committed to git!** 🔒

