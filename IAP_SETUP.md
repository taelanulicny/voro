# In-App Purchase (IAP) Setup Guide

This app uses **RevenueCat** for handling in-app purchases on iOS and Android. RevenueCat simplifies IAP implementation and provides server-side receipt validation.

## Prerequisites

1. **Apple Developer Account** (for iOS)
2. **Google Play Console** (for Android)
3. **RevenueCat Account** (free tier available at https://app.revenuecat.com)

## Step 1: Set Up RevenueCat

1. Create a RevenueCat account at https://app.revenuecat.com
2. Create a new project
3. Add your iOS and Android apps
4. Get your API keys:
   - iOS API Key: Found in RevenueCat dashboard → Project Settings → API Keys
   - Android API Key: Found in RevenueCat dashboard → Project Settings → API Keys

## Step 2: Configure Environment Variables

Add these to your `.env` file:

```bash
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=your_ios_api_key_here
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=your_android_api_key_here
```

## Step 3: Set Up Products in App Store Connect (iOS)

1. Go to App Store Connect → Your App → Features → In-App Purchases
2. Create **Consumable** products with these IDs:
   - `tokens_100` - 100 Tokens
   - `tokens_500` - 500 Tokens
   - `tokens_1000` - 1,000 Tokens
   - `tokens_2500` - 2,500 Tokens
   - `tokens_5000` - 5,000 Tokens
   - `tokens_10000` - 10,000 Tokens

3. Set prices for each product
4. Submit for review (required before testing)

## Step 4: Set Up Products in Google Play Console (Android)

1. Go to Google Play Console → Your App → Monetize → Products → In-app products
2. Create products with the same IDs as iOS:
   - `tokens_100`
   - `tokens_500`
   - `tokens_1000`
   - `tokens_2500`
   - `tokens_5000`
   - `tokens_10000`

3. Set prices for each product
4. Activate the products

## Step 5: Configure Products in RevenueCat

1. Go to RevenueCat Dashboard → Products
2. Create products matching your App Store/Play Store product IDs
3. Create an **Offering** (e.g., "Default Offering")
4. Add all your products to the offering

## Step 6: Install Dependencies

The RevenueCat SDK is already added to `package.json`. Install it:

```bash
npm install
# or
yarn install
```

## Step 7: Test Purchases

### iOS Testing:
1. Use a **Sandbox Tester** account (create in App Store Connect → Users and Access → Sandbox Testers)
2. Sign out of your regular Apple ID on the device
3. When prompted during purchase, sign in with the sandbox tester account
4. Test purchases won't charge real money

### Android Testing:
1. Add test accounts in Google Play Console → Settings → Account details → License testing
2. Use a test account on your device
3. Test purchases won't charge real money

## Step 8: Deploy Backend

The backend includes:
- `PurchaseTransactions` DynamoDB table (for idempotency)
- `/api/purchases/process` endpoint (processes purchases)
- `/api/purchases/history` endpoint (gets purchase history)

Deploy the backend:

```bash
cd backend
npx cdk deploy
```

## How It Works

1. **User initiates purchase** → RevenueCat handles the StoreKit/Play Billing flow
2. **Purchase succeeds** → App sends transaction to backend `/api/purchases/process`
3. **Backend verifies** → Records transaction (idempotent) and credits cash to user
4. **User receives tokens** → Cash balance is updated in their account

## Security Notes

- ✅ All purchases are verified server-side
- ✅ Transaction IDs are tracked for idempotency (prevents double-crediting)
- ✅ RevenueCat handles receipt validation automatically
- ✅ Backend validates platform and product IDs

## Troubleshooting

### "RevenueCat API key not configured"
- Make sure you've set `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` or `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` in your `.env` file
- Restart your Expo dev server after adding environment variables

### "No Purchase Options Available"
- Check that products are created in App Store Connect / Google Play Console
- Verify products are added to a RevenueCat Offering
- Ensure products are approved/activated

### "Purchase Not Allowed"
- On iOS: Make sure you're signed in with a sandbox tester account
- On Android: Ensure test accounts are configured in Play Console
- Check that IAP is enabled in your app's settings

### Purchase succeeds but tokens not credited
- Check backend logs for errors
- Verify backend is deployed and accessible
- Check that transaction ID is unique (idempotency check)

## Product Configuration

The product-to-cash mapping is defined in `src/screens/PurchasesScreen.tsx`:

```typescript
const PRODUCT_CONFIG: Record<string, { cashAmount: number; label: string }> = {
  tokens_100: { cashAmount: 100, label: '100 Tokens' },
  tokens_500: { cashAmount: 500, label: '500 Tokens' },
  // ... etc
};
```

Update this mapping if you change product IDs or cash amounts.

## Next Steps

1. Set up RevenueCat account and get API keys
2. Create products in App Store Connect / Google Play Console
3. Configure products in RevenueCat dashboard
4. Add environment variables to `.env`
5. Test with sandbox/test accounts
6. Submit for App Store/Play Store review

## Resources

- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [RevenueCat React Native SDK](https://docs.revenuecat.com/docs/react-native)
- [Apple In-App Purchase Guide](https://developer.apple.com/in-app-purchase/)
- [Google Play Billing](https://developer.android.com/google/play/billing)

