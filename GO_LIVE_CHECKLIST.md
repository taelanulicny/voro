# 🚀 Go-Live Checklist

This checklist covers everything needed to make your app live and fully functional.

## ✅ Current Status

### Working Without Backend (Standalone Mode)
- ✅ App works completely in standalone mode (mock data)
- ✅ Trading system functional (frontend-only)
- ✅ All screens and navigation working
- ✅ Price updates in real-time when trading
- ✅ User can open/close positions, add to positions
- ✅ Tranche-based position tracking prevents phantom losses

---

## 📋 To Make It Fully Live

### 1. **Backend Deployment** (AWS) ⚠️ **REQUIRED FOR PERSISTENCE**

#### Prerequisites:
- [ ] AWS account created and configured
- [ ] AWS CLI installed and configured (`aws configure`)
- [ ] AWS CDK installed globally (`npm install -g aws-cdk`)

#### Deploy Backend:
```bash
cd backend

# Option 1: Use deployment script (Recommended)
./deploy.sh

# Option 2: Manual deployment
export JWT_SECRET=$(openssl rand -hex 32)  # Required!
export GEMINI_API_KEY=your-key  # Optional (for AI features)
export NEWS_API_KEY=your-key    # Optional (for news feed)
npm run build
npm run deploy
```

**After deployment, save these values from CDK outputs:**
- `ApiUrl` - Your API Gateway URL (e.g., `https://abc123.execute-api.us-east-1.amazonaws.com/prod`)
- `UserPoolId` - Cognito User Pool ID
- `UserPoolClientId` - Cognito Client ID

#### Seed Database:
```bash
cd backend

# Set environment variables (from deployment outputs)
export AWS_REGION=us-east-1
export DYNAMODB_TABLE_PREFIX=moro
export COGNITO_USER_POOL_ID=<from-outputs>
export COGNITO_CLIENT_ID=<from-outputs>

# Seed entities with initial data
npm run seed
```

---

### 2. **Frontend Configuration** ⚠️ **REQUIRED TO CONNECT TO BACKEND**

Create `.env` file in project root:

```env
# Backend API URL (required for backend features)
EXPO_PUBLIC_API_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod/api

# Google OAuth (required for Google Sign-In)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Apple OAuth (optional - already configured in app.json)
# Apple Sign-In works automatically with bundle identifier
```

**Get Google Client ID:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Set authorized redirect URI: `exp://localhost:8081` (development) or your production URL
4. Copy Client ID (ends with `.apps.googleusercontent.com`)

**Then restart Expo:**
```bash
npm start -- --clear
```

---

### 3. **App Build & Submission** (For Production Release)

#### iOS (TestFlight/App Store):
```bash
# Build for TestFlight
eas build --platform ios --profile preview

# Or build for production
eas build --platform ios --profile production

# Submit to TestFlight/App Store
eas submit --platform ios
```

**Current Config:**
- ✅ Version: 10.1.2
- ✅ Build: 26
- ✅ Bundle ID: com.moro.mobile
- ✅ Apple ID configured in `eas.json`

#### Android (Google Play):
```bash
# Build for internal testing
eas build --platform android --profile preview

# Or build for production
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android
```

---

### 4. **Backend Integration Testing** 🧪

After backend is deployed and `.env` is configured:

#### Test Authentication:
- [ ] Sign up with email/password works
- [ ] Login with email/password works
- [ ] Google Sign-In works (if configured)
- [ ] Apple Sign-In works
- [ ] Token refresh works
- [ ] Logout works

#### Test Trading:
- [ ] Opening position saves to backend
- [ ] Adding to position updates backend
- [ ] Closing position updates backend
- [ ] Portfolio syncs with backend
- [ ] Transactions saved to backend
- [ ] Price updates reflect in backend

#### Test Data Persistence:
- [ ] Close and reopen app - portfolio persists
- [ ] Logout and login - portfolio persists
- [ ] Switch devices - portfolio syncs

---

### 5. **Optional Enhancements**

#### OAuth Setup:
- [ ] Google OAuth configured
- [ ] Apple Sign-In configured (already in `app.json`)
- [ ] OAuth redirect URIs configured correctly

#### News Feed (Optional):
- [ ] News API key obtained (optional)
- [ ] News feed fetching from backend works
- [ ] Sentiment analysis working (requires Gemini API key)

#### Push Notifications (Future):
- [ ] Expo Push Notification service configured
- [ ] Backend notification service working
- [ ] Users can receive price alerts

---

### 6. **Production Checklist**

#### Security:
- [ ] All API keys stored in environment variables (not hardcoded)
- [ ] `.env` file in `.gitignore` (already done)
- [ ] JWT_SECRET is secure (randomly generated)
- [ ] API Gateway has rate limiting configured
- [ ] HTTPS enforced (API Gateway does this automatically)

#### Performance:
- [ ] App loads quickly (< 3 seconds)
- [ ] API responses are fast (< 500ms average)
- [ ] Images/assets optimized
- [ ] Bundle size reasonable (< 50MB for iOS, < 100MB for Android)

#### Monitoring:
- [ ] CloudWatch logs configured for Lambda functions
- [ ] Error tracking setup (consider Sentry or similar)
- [ ] Analytics setup (optional - Firebase Analytics, Mixpanel, etc.)

#### Legal/Compliance:
- [ ] Privacy policy added to app
- [ ] Terms of service added to app
- [ ] App Store metadata complete (description, screenshots, etc.)
- [ ] App Store guidelines compliance checked

---

## 🎯 Minimal Setup (App Works Without Backend)

**Good news:** Your app already works in standalone mode! You can:

1. **Test locally immediately:**
   ```bash
   npm start
   # Press 'i' for iOS or 'a' for Android
   ```

2. **Build and distribute to TestFlight (without backend):**
   ```bash
   eas build --platform ios --profile preview
   eas submit --platform ios
   ```

3. **Use the app:** All features work with local/mock data!

---

## ⚠️ What Doesn't Work Without Backend

- ❌ User accounts (can't sign up/login with real accounts)
- ❌ Data persistence across devices/sessions
- ❌ Social features (posts, follows, comments)
- ❌ News feed (requires backend API)
- ❌ Real-time price updates from other users' trades
- ❌ Multi-user interactions (leaderboards, groups)

**However:** Trading, portfolio tracking, price calculations, and all core features work perfectly in standalone mode!

---

## 🚀 Recommended Deployment Order

### Phase 1: Backend Setup (1-2 hours)
1. Deploy backend to AWS
2. Seed database with entities
3. Configure `.env` file with API URL
4. Test basic API endpoints

### Phase 2: Frontend Connection (30 mins)
1. Update `.env` with backend URL
2. Test authentication flows
3. Test trading with backend
4. Verify data persistence

### Phase 3: Production Build (1 hour)
1. Build iOS app with EAS
2. Submit to TestFlight
3. Test with beta testers
4. Build Android app
5. Submit to Google Play

### Phase 4: Polish (Ongoing)
1. Monitor errors and crashes
2. Optimize performance
3. Add missing features
4. Gather user feedback

---

## 🆘 Troubleshooting

### Backend deployment fails?
- Check AWS credentials: `aws sts get-caller-identity`
- Verify JWT_SECRET is set: `echo $JWT_SECRET`
- Check CDK bootstrap: `cdk bootstrap`
- Review CloudFormation errors in AWS Console

### App can't connect to backend?
- Verify `.env` file exists in root directory
- Check `EXPO_PUBLIC_API_URL` is set correctly
- Restart Expo with `--clear` flag
- Check API Gateway URL is correct
- Test API endpoint in browser/Postman

### Authentication not working?
- Verify Cognito User Pool ID is correct
- Check Google/Apple client IDs are correct
- Ensure redirect URIs are configured
- Check Lambda logs in CloudWatch

---

## ✅ Quick Start (Minimum to Get Live)

If you want to go live quickly, do this:

1. **Deploy backend** (30 mins):
   ```bash
   cd backend
   export JWT_SECRET=$(openssl rand -hex 32)
   ./deploy.sh
   ```

2. **Get API URL from outputs** and add to `.env`:
   ```env
   EXPO_PUBLIC_API_URL=https://your-api-url.execute-api.us-east-1.amazonaws.com/prod/api
   ```

3. **Seed database**:
   ```bash
   cd backend
   npm run seed
   ```

4. **Build and submit app**:
   ```bash
   eas build --platform ios --profile preview
   eas submit --platform ios
   ```

That's it! Your app is live with backend support. 🎉

---

## 📚 Documentation References

- Backend Setup: `backend/README.md`
- AWS Setup: `backend/AWS_SETUP_GUIDE.md`
- Deployment: `backend/DEPLOYMENT_GUIDE.md`
- Environment Setup: `ENV_SETUP.md`
- OAuth Setup: `OAUTH_SETUP.md`
- Quick Start: `QUICK_START.md`

---

**Last Updated:** Based on current codebase state
**App Version:** 10.1.2
**Build Number:** 26
