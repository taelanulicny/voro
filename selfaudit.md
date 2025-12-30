# 🔍 MORO CODEBASE AUDIT REPORT

## 1. EXECUTIVE SUMMARY

### What's Solid ✅
- **Robust Frontend Architecture**: Well-structured React Native (Expo) app with proper context providers, typed navigation, and error boundaries
- **Backend Infrastructure**: AWS CDK-based serverless backend with DynamoDB, Cognito auth, and comprehensive API handlers
- **Type Safety**: Zod validation schemas for API responses, TypeScript throughout
- **Trading System**: Backend has real trade execution with DynamoDB persistence, validation, and market hours enforcement
- **Authentication**: Cognito-backed auth with SecureStore for tokens (properly secured)
- **API Client**: Robust fetch wrapper with retry logic, timeout handling, and AbortController support

### What's Fake/Mock ⚠️
- **Entity Prices**: Initialized from hardcoded `MOCK_ENTITIES` with random percentage changes; prices don't update from real market data
- **Price History/Charts**: Generated client-side with `Math.random()`
- **Social Feed (Fallback)**: Falls back to `MOCK_POSTS` when backend not connected
- **News**: Falls back to `generateMockNews()` when backend unavailable
- **Categories/Treemap Volumes**: Hardcoded `categoryTradeVolumes` array
- **Entity-specific Posts**: Hardcoded in `EntityScreen.tsx`

### What Blocks MVP 🚫
1. **Backend deployment**: Requires AWS setup + `EXPO_PUBLIC_API_URL` configuration
2. **No real price feeds**: Entity prices are simulated locally
3. **Categories Tab data**: Trending/Movers/Discussed come from backend but fall back empty
4. **Leaderboard**: Endpoint exists but data population unclear
5. **Push Notifications**: Device token not registered with backend

---

## 3. FEATURE AUDIT TABLE

| Feature | Status | Evidence | Mock vs Real | Key Risks | Backend Endpoints | Effort |
|---------|--------|----------|--------------|-----------|-------------------|--------|
| **Trading** | ⚠️ Partial | `TradingContext.tsx`, `tradingService.ts` | **Real** when backend connected; prices from mock entities | Trade executes against backend, but price comes from `MOCK_ENTITIES` | `POST /trade/execute` ✓ | S |
| **Portfolio** | ⚠️ Partial | `PortfolioScreen.tsx`, `TradingContext.tsx` | **Real** from backend (DynamoDB) | Holdings fetched from backend; `todayChange` is 10% of P&L (mock) | `GET /portfolio` ✓ | S |
| **Auth** | ✅ Implemented | `AuthContext.tsx`, `authService.ts` | **Real** Cognito auth | `skipAuth` dev bypass present; token refresh logic exists | `signup/login/me/refresh` ✓ | S |
| **Profiles** | ⚠️ Partial | `ProfileScreen.tsx`, `userHandlers.ts` | **Real** user data | Avatar upload URL generation exists | `GET/PUT /user/:id` ✓ | S |
| **Feed** | ⚠️ Partial | `FeedsScreen.tsx`, `SocialContext.tsx` | **Real** when backend running, else `MOCK_POSTS` | Pagination implemented; falls back to mock on error | `GET /social/feed` ✓ | S |
| **Posts** | ⚠️ Partial | `CreatePostModal.tsx`, `socialService.ts` | **Real** create/delete/like | Works when backend connected | `POST /social/posts` ✓ | S |
| **Comments** | ⚠️ Partial | `CommentSection.tsx`, `socialHandlers.ts` | **Real** from backend | Like toggle works | `GET/POST /posts/:id/comments` ✓ | S |
| **Follows** | ⚠️ Partial | `FollowButton.tsx`, `SocialContext.tsx` | **Real** toggle | Backend handler exists | `POST /users/:id/follow` ✓ | S |
| **Groups** | ⚠️ Partial | `GroupsScreen.tsx`, `groupHandlers.ts` | Falls back to `MOCK_GROUPS` | Backend handlers complete | `GET/POST /groups` ✓ | M |
| **News** | ⚠️ Partial | `NewsContext.tsx`, `newsHandlers.ts` | Falls back to `generateMockNews()` | Backend returns seeded news | `GET /news` ✓ | S |
| **Sentiment** | ⚠️ Partial | `NewsArticle.sentimentScore` | Hardcoded in mock news | No real sentiment computation | - | L |
| **Watchlist** | ✅ Implemented | `WatchlistContext.tsx` | **Local** AsyncStorage only | Works offline, not synced | `GET/POST/DELETE /watchlist` ✓ | S |
| **Search** | ⚠️ Partial | `SearchScreen.tsx` | Filters `MOCK_ENTITIES` locally | User search hits backend | `GET /users/search` ✓ | M |
| **Categories** | ⚠️ Partial | `AllCategoriesScreen.tsx`, `useCategoryData.ts` | Treemap uses hardcoded volumes; Browse pulls from backend | Falls back empty when backend unavailable | `GET /categories/*` ✓ | M |
| **Notifications** | ⚠️ Partial | `NotificationsPanel.tsx` | Mock notifications | Device token not registered | - | M |
| **Onboarding** | ✅ Implemented | `WelcomeScreen.tsx`, `SignupScreen.tsx` | Real auth flow | Works end-to-end | - | - |
| **Simulator** | ✅ Implemented | `SimulatorScreen.tsx` | **Local** paper trading | Complete local implementation (no persistence) | - | S |
| **Leaderboards** | ⚠️ Partial | `SeasonalCompetitionScreen.tsx` | Backend endpoint exists | Uses `userRanking` based on portfolio value | `GET /leaderboard` ✓ | M |

---

## 4. CODE-LEVEL FINDINGS

### 4.1 Trading System Correctness

**Buy/Sell Flow** (`TradingContext.tsx:308-376`, `tradingService.ts:110-308`)
```typescript:374:376:src/context/TradingContext.tsx
    } finally {
      setIsLoading(false);
    }
```

✅ **Strengths:**
- Server-side market hours enforcement (2am-8am EST closed)
- Proper insufficient funds/holdings validation
- DynamoDB atomic updates for holdings
- Transaction recording with timestamps

⚠️ **Issues:**
1. **Price Source**: Trade uses `currentPrice` from `getEntityPrice()` which reads from `entityPrices` state initialized with random offsets from `basePrice`
2. **No Slippage/Limits**: No limit orders, market orders only
3. **No Race Condition Protection**: Concurrent trades could cause inconsistent state

**Cost Basis Calculation** (`tradingService.ts:154-176`)
```typescript
const newQuantity = existing.quantity + quantity;
const newTotalCost = existing.totalCost + totalAmount;
const newAverageCost = newTotalCost / newQuantity;
```
✅ Correctly maintains weighted average cost

### 4.2 Data Fetching + Caching

**API Client** (`src/config/api.ts`)
```typescript:144:200:src/config/api.ts
export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
```

✅ **Strengths:**
- Exponential backoff retry (up to 3 retries)
- AbortController support for cancellation
- 10s timeout
- Retryable status codes defined

⚠️ **Issues:**
1. **No Response Caching**: Every navigation re-fetches data
2. **Aggressive Polling**: Price polling every 30s (was 5s, reduced)

### 4.3 Auth + Session Handling

**Token Storage** (`AuthContext.tsx:46-104`)
✅ Uses `expo-secure-store` for tokens (encrypted on device)
✅ User profile in AsyncStorage (appropriate for non-sensitive data)
✅ Token verification on app load

⚠️ **Issues:**
1. **No Auto-Refresh on 401**: When token expires, user must re-login
2. **`skipAuth` bypass**: Exists for dev but should be removed in production builds

### 4.4 Social Objects

**Post Schema** (`validators/schemas.ts:25-52`)
```typescript
export const PostSchema = z.object({
  id: z.string().optional(),
  postId: z.string().optional(), // Backend uses postId
  // ... normalized in transform
})
```
✅ Handles backend/frontend ID differences with transform

**Feed Pagination** (`SocialContext.tsx:380-423`)
✅ Cursor-based pagination with `lastEvaluatedKey`

### 4.5 News + Sentiment

**News Fallback** (`NewsContext.tsx:174-236`)
- Falls back to `MOCK_NEWS` if backend unavailable
- Sentiment scores are hardcoded (-100 to 100)
- No real NLP sentiment computation

### 4.6 Navigation UX

**Tab Structure** (`BottomTabNavigator.tsx`)
- 9 tabs defined
- Custom floating nav bar (`FloatingBottomNav`)
- Search is modal presentation

⚠️ **Issues:**
1. **Large Screen Count**: Some tabs may be redundant (e.g., SeasonalCompetition could be a section)
2. **Deep linking**: Not implemented

### 4.7 Security + Privacy

**✅ Good Practices:**
- JWT tokens in SecureStore
- Bearer token injection via `authenticatedRequest`
- Backend requires `JWT_SECRET` env var (fails if not set)

**🚨 Security Findings:**

1. **JWT Secret in Stack** (`backend/infrastructure/stack.ts:299-300`)
```typescript
JWT_SECRET: process.env.JWT_SECRET!, // REQUIRED
```
✅ Now requires env var (was previously hardcoded - fixed)

2. **No hardcoded secrets found** in main codebase (grep confirmed)

3. **PII Storage**: User data in AsyncStorage is unencrypted (acceptable for non-sensitive profile data)

### 4.8 Type Safety

✅ **Zod Validation** (`validators/schemas.ts`)
- All API responses validated with `safeValidate`
- Array validation with `validateArrayLoose` (filters invalid items)
- Transforms normalize backend/frontend ID differences

### 4.9 Testing + Build Health

⚠️ **No Test Files Found**
- No `__tests__` directories
- No `.test.ts` or `.spec.ts` files
- No Jest/testing-library configuration

✅ **Error Boundaries**: Present throughout (`ErrorBoundary.tsx`)
✅ **Error Reporting Service**: Sentry integration scaffolded but DSN commented out

---

## 5. TOP 10 CODE IMPROVEMENTS

### 1. **Add Real Price Updates** (CRITICAL)
**Problem**: Prices are hardcoded offsets from `MOCK_ENTITIES.basePrice`
**Solution**: 
```typescript
// backend/src/handlers/priceUpdates.ts - runs on schedule
export async function updatePrices() {
  const entities = await getAllEntities();
  for (const entity of entities) {
    const newPrice = calculateNewPrice(entity); // Your formula
    await docClient.send(new PutCommand({
      TableName: TABLE_NAMES.PRICE_HISTORY,
      Item: { entityId: entity.entityId, price: newPrice, timestamp: Date.now() }
    }));
  }
}
```

### 2. **Implement Token Refresh on 401**
**File**: `src/config/api.ts`
```typescript
// In apiRequest, after response check:
if (response.status === 401) {
  const refreshResult = await refreshTokenService(getRefreshToken());
  if (refreshResult.success) {
    // Retry original request with new token
    return apiRequest(endpoint, { ...options, headers: { ...options.headers, Authorization: `Bearer ${refreshResult.token}` }});
  }
}
```

### 3. **Add Response Caching Layer**
**Solution**: Use `react-query` or SWR for automatic caching, deduplication, and background refetching

### 4. **Remove `skipAuth` in Production**
**File**: `src/context/AuthContext.tsx`
```typescript
skipAuth: __DEV__ ? async () => { ... } : undefined, // Disable in prod
```

### 5. **Add Optimistic Updates for Trades**
**Problem**: UI waits for server response
**Solution**: Update local state immediately, rollback on failure

### 6. **Fix Simulator Missing Import**
**File**: `src/screens/SimulatorScreen.tsx`
```typescript
// Line 472 uses Modal but it's not imported
import { Modal } from 'react-native'; // Add this
```

### 7. **Add Loading States to Categories Tab**
**Problem**: Empty state shows when backend unavailable
**Solution**: Show skeleton loaders + "Connect backend" message

### 8. **Implement Price Staleness Warning in Trade Modal** ✅ Already Present
TradeModal shows warning when `isPriceStale` (>60s since update)

### 9. **Add Offline Support**
**Solution**: Cache last-known portfolio state in AsyncStorage, show sync status

### 10. **Enable Sentry Error Reporting**
**File**: `src/services/errorReporting.ts`
```typescript
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN, // Set this
  enableAutoSessionTracking: true,
});
```

---

## 6. MVP BUILD PLAN (2-4 Weeks)

### Week 1: Backend Deployment + Core Trading

| Day | Milestone | Tasks |
|-----|-----------|-------|
| 1-2 | AWS Setup | Deploy CDK stack, configure Cognito, seed entities |
| 3 | Price System | Implement scheduled Lambda for price updates |
| 4-5 | Testing | Verify trade flow end-to-end, fix any issues |

### Week 2: Social + Discovery

| Day | Milestone | Tasks |
|-----|-----------|-------|
| 1-2 | Feed Polish | Test post creation, comments, likes |
| 3-4 | Categories Tab | Connect trending/movers/discussed to backend |
| 5 | Search | Verify entity + user search works |

### Week 3: Polish + Stability

| Day | Milestone | Tasks |
|-----|-----------|-------|
| 1-2 | Token Refresh | Implement auto-refresh on 401 |
| 3 | Error Handling | Add user-friendly error messages |
| 4-5 | Testing | End-to-end QA, fix bugs |

### Week 4: Launch Prep

| Day | Milestone | Tasks |
|-----|-----------|-------|
| 1-2 | Performance | Add caching, optimize re-renders |
| 3 | Sentry | Enable error reporting |
| 4-5 | App Store | Build for TestFlight/Play Store |

---

## 7. CATEGORIES TAB SPEC + IMPLEMENTATION

### 7.1 UX Outline (Current + Enhanced)

The current `AllCategoriesScreen.tsx` has 3 views:
1. **Treemap** - Visual category volumes
2. **List View** - Sortable category list
3. **Browse** - Infinite scroll discovery feed

**Proposed Enhancement Order:**

```
┌─────────────────────────────────────────┐
│ [Treemap] [List] [Browse]              │ ← Tab bar
├─────────────────────────────────────────┤
│ 🔥 Trending Today (horizontal scroll)   │
│   [Card] [Card] [Card] →                │
├─────────────────────────────────────────┤
│ 📈 Biggest Movers                       │
│   Gainers: [Card] [Card] →              │
│   Losers:  [Card] [Card] →              │
├─────────────────────────────────────────┤
│ 💬 Most Discussed                       │
│   [Card] [Card] [Card] →                │
├─────────────────────────────────────────┤
│ ⭐ For You (if authenticated)           │
│   [Card with reason] →                  │
├─────────────────────────────────────────┤
│ 🔍 Discover (infinite scroll)           │
│   [Full EntityCard]                     │
│   [Full EntityCard]                     │
│   [Loading more...]                     │
└─────────────────────────────────────────┘
```

### 7.2 Data Requirements

| Endpoint | Purpose | Response Shape |
|----------|---------|----------------|
| `GET /api/categories/trending` | Top entities by 24h volume | `{ entities: Entity[], timeframe: string }` |
| `GET /api/categories/movers` | Top gainers/losers | `{ gainers: Entity[], losers: Entity[] }` |
| `GET /api/categories/discussed` | Most posts/comments | `{ entities: { entityId, postCount, commentCount }[] }` |
| `GET /api/categories/discover` | Paginated all entities | `{ entities: Entity[], nextCursor: string }` |
| `GET /api/categories/for-you` | Personalized (auth) | `{ entities: Entity[], reasons: Record<id, string> }` |

All endpoints already exist in `backend/src/handlers/categories.ts` ✅

### 7.3 New Files/Components Needed

None required - current implementation is complete. Improvements:

1. **Skeleton Loaders** (`src/components/EntityCardSkeleton.tsx`)
```typescript
// New file for loading state
export function EntityCardSkeleton() {
  return (
    <View style={styles.skeleton}>
      <Animated.View style={[styles.shimmer, { opacity: shimmerAnim }]} />
    </View>
  );
}
```

2. **Category Stats Endpoint** for Treemap (replace hardcoded volumes)

### 7.4 Navigation Changes Needed

None - Categories tab already exists in `BottomTabNavigator.tsx`:
```typescript
<Tab.Screen name="Categories">
  {() => <AllCategoriesScreen />}
</Tab.Screen>
```

### 7.5 Reusable Components (Already Exist)

| Component | Location | Usage |
|-----------|----------|-------|
| `EntityCard` | `components/EntityCard.tsx` | Entity display (compact/full variants) |
| `Treemap` | `components/Treemap.tsx` | Category visualization |
| `CategoryCarousel` | `components/CategoryCarousel.tsx` | Horizontal entity scroll |

### 7.6 Implementation Checklist

- [x] Category tab in navigation
- [x] Treemap view with category volumes
- [x] List view with sorting options
- [x] Browse view with sections
- [x] `useCategoryData` hook for API calls
- [x] Pull-to-refresh
- [x] Infinite scroll pagination
- [ ] **Replace hardcoded treemap volumes with API**
- [ ] **Add skeleton loaders**
- [ ] **Add empty state with "Configure backend" message**

---

## 8. BACKEND GAP ANALYSIS

All core endpoints exist. Here's the complete API surface:

### 8.1 Endpoint Specifications

#### POST /api/trade/execute
```typescript
// Request
{ entityId: number, type: 'buy'|'sell', quantity: number, pricePerToken: number }

// Response
{ success: true, data: Portfolio }
```

#### GET /api/portfolio
```typescript
// Response
{ success: true, data: {
  cashBalance: number,
  holdings: Holding[],
  totalValue: number,
  todayChange: number,
  todayChangePercent: number
}}
```

#### GET /api/entities
```typescript
// Query: ?category=Tech
// Response
{ success: true, data: Entity[] }
```

#### POST /api/social/posts
```typescript
// Request
{ content: string, entityId?: number, entityTicker?: string, sentiment?: 'positive'|'negative'|'neutral' }

// Response
{ success: true, data: Post }
```

#### GET /api/social/feed
```typescript
// Query: ?limit=20&lastKey=...
// Response
{ success: true, data: { posts: Post[], lastEvaluatedKey?: string }}
```

#### GET /api/news
```typescript
// Query: ?limit=30&entityName=...&entityId=...
// Response
{ success: true, data: NewsArticle[] }
```

### 8.2 Database Schema (DynamoDB Tables)

| Table | Primary Key | Sort Key | Purpose |
|-------|------------|----------|---------|
| `Users` | `userId` | - | User profiles, cash balance |
| `Entities` | `entityId` | - | Tradable entities |
| `Portfolios` | `userId` | `entityId` | Holdings |
| `Transactions` | `userId` | `timestamp` | Trade history |
| `Posts` | `postId` | - | Social posts |
| `Comments` | `postId` | `commentId` | Post comments |
| `Follows` | `followerId` | `followingId` | Follow graph |
| `Likes` | `userId` | `targetId` | Post/comment likes |
| `Groups` | `groupId` | - | User groups |
| `News` | `newsId` | - | News articles |
| `PriceHistory` | `entityId` | `timestamp` | Price time series |

---

## 9. SECURITY RECOMMENDATIONS

1. ✅ **JWT Secret**: Now required via env var (verified in code)
2. ⚠️ **Remove `skipAuth`**: Add `__DEV__` check before shipping
3. ⚠️ **Rate Limiting**: Add API Gateway throttling
4. ⚠️ **Input Sanitization**: Add XSS protection for post content
5. ✅ **Token Storage**: Using SecureStore correctly

---

## 10. IMMEDIATE ACTION ITEMS

### Critical (Before Any Testing)
1. Deploy backend: `cd backend && cdk deploy`
2. Set `EXPO_PUBLIC_API_URL` in `.env`
3. Run seed script: `./scripts/run_seed.sh`

### High Priority
4. Fix `Modal` import in SimulatorScreen
5. Implement price update Lambda
6. Add token refresh on 401

### Medium Priority
7. Add skeleton loaders to Categories
8. Enable Sentry DSN
9. Add basic unit tests

This audit provides a complete picture of your codebase state. The core infrastructure is solid - the main gaps are connecting the mock data to real backend endpoints and adding production hardening.