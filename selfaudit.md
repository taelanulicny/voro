<<<<<<< Current (Your changes)
=======
# Moro App - Deep Code Audit Report

**Audit Date:** December 30, 2024  
**Auditor Role:** Senior Full-Stack Engineer + Product Tech Lead  
**Codebase:** React Native (Expo) + AWS CDK Backend

---

## 1. Executive Summary

### What's Solid
- **Architecture Foundation**: Clean context-based state management with proper provider hierarchy
- **Type Safety**: Comprehensive TypeScript types with Zod runtime validation schemas
- **Backend Infrastructure**: AWS CDK stack with DynamoDB, Lambda handlers, and Cognito auth
- **Trading System**: Full buy/sell flow with backend persistence, market hours enforcement, and portfolio tracking
- **Social Features**: Backend-integrated posts, comments, likes, follows with pagination support
- **Error Handling**: Error boundaries, error reporting service scaffold, graceful fallbacks to mock data
- **Navigation**: Well-structured bottom tab + stack navigation with protected routes

### What's Mock/Fake
- **News**: `generateMockNews()` provides static mock data; backend news endpoints exist but may not have live data
- **Groups**: `MOCK_GROUPS` array used as fallback; backend group endpoints exist but limited real data
- **Entity Feed Posts**: Hardcoded mock posts per entity (in `EntityScreen.tsx`)
- **Price Simulation**: Prices stored in backend but no real-time price formula/algorithm implemented
- **Watchlist**: Device-local via AsyncStorage, uses `MOCK_ENTITIES` for entity lookup

### What Blocks MVP
1. **Backend Configuration**: App requires `EXPO_PUBLIC_API_URL` environment variable to connect to backend
2. **OAuth Setup**: Google/Apple OAuth endpoints exist but require provider configuration
3. **News Pipeline**: Need real news aggregation or content moderation workflow
4. **Price Updates**: Need scheduled Lambda or WebSocket for live price simulation
5. **Push Notifications**: Service exists but not implemented end-to-end

---

## 2. Repo Map

### Directory Structure
```
/nzr
├── App.tsx                    # Entry point, context providers, navigation
├── src/
│   ├── components/           # 20 reusable components
│   │   ├── TradeModal.tsx    # Buy/sell modal with validation
│   │   ├── PostCard.tsx      # Social post display
│   │   ├── EntityCard.tsx    # Entity display card
│   │   ├── EntityList.tsx    # Entity list with sorting
│   │   ├── NewsCard.tsx      # News article card
│   │   ├── CategoryCarousel.tsx
│   │   ├── Treemap.tsx       # Category visualization
│   │   └── ...
│   ├── context/              # 7 React contexts
│   │   ├── AuthContext.tsx   # Authentication state + session
│   │   ├── TradingContext.tsx # Portfolio, trades, prices
│   │   ├── SocialContext.tsx  # Posts, comments, follows, groups
│   │   ├── NewsContext.tsx    # News articles + filtering
│   │   ├── WatchlistContext.tsx # Device-local watchlist
│   │   ├── ThemeContext.tsx   # Dark/light theme
│   │   └── SideMenuContext.tsx
│   ├── screens/              # 27 screens
│   │   ├── HomeScreen.tsx    # Main feed + categories
│   │   ├── PortfolioScreen.tsx
│   │   ├── EntityScreen.tsx  # Entity detail + trade
│   │   ├── FeedsScreen.tsx   # Social feed + news
│   │   ├── AllCategoriesScreen.tsx # Categories tab
│   │   ├── SeasonalCompetitionScreen.tsx # Leaderboard
│   │   └── ...
│   ├── services/             # API services
│   │   ├── authService.ts    # Auth API calls
│   │   ├── socialService.ts  # (exists but mostly inline in context)
│   │   ├── errorReporting.ts # Error reporting scaffold
│   │   └── ...
│   ├── config/
│   │   └── api.ts            # API configuration + request helpers
│   ├── validators/
│   │   └── schemas.ts        # Zod schemas for runtime validation
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   ├── utils/
│   │   ├── mockEntities.ts   # MOCK_ENTITIES source of truth
│   │   └── dataGenerator.ts  # Utility functions
│   ├── hooks/
│   │   └── useCategoryData.ts
│   └── navigation/
│       └── BottomTabNavigator.tsx
├── backend/                  # AWS CDK Backend
│   ├── src/
│   │   ├── handlers/         # 13 Lambda handlers
│   │   │   ├── trading.ts    # Trade execution, portfolio, entities
│   │   │   ├── auth.ts       # Login, signup, token verification
│   │   │   ├── social.ts     # Posts, comments, likes, follows
│   │   │   ├── groups.ts     # Group CRUD
│   │   │   ├── news.ts       # News retrieval
│   │   │   ├── leaderboard.ts
│   │   │   └── ...
│   │   ├── services/         # Business logic services
│   │   │   ├── tradingService.ts
│   │   │   ├── socialService.ts
│   │   │   └── ...
│   │   ├── models/
│   │   │   └── types.ts      # DynamoDB model types
│   │   └── middleware/
│   │       └── auth.ts       # JWT authentication middleware
│   └── infrastructure/
│       └── stack.ts          # CDK stack definition
└── package.json
```

### Navigation Structure
```
RootNavigator (Stack)
├── Unauthenticated:
│   ├── Welcome
│   ├── Login
│   └── Signup
└── Authenticated:
    ├── Main (BottomTabNavigator)
    │   ├── Home
    │   ├── News
    │   ├── Feeds
    │   ├── Groups
    │   ├── Portfolio
    │   ├── Watchlist
    │   ├── Categories
    │   ├── SeasonalCompetition
    │   └── Profile
    └── Modal Screens:
        ├── Entity (detail)
        ├── Category
        ├── Search (modal)
        ├── Settings (modal)
        ├── GroupDetail
        ├── FollowersList
        ├── NewsDetail
        ├── Notifications
        └── AccountValue
```

### State Management Pattern
- **React Context**: All global state uses Context + useState/useCallback
- **No Redux/Zustand**: Simpler approach, but no middleware for async actions
- **Backend Sync**: Contexts fetch from backend on mount/auth change, poll periodically
- **Mock Fallbacks**: All contexts gracefully fall back to mock data when backend unavailable

---

## 3. Feature Audit Table

| Feature | Status | Evidence | Mock vs Real | Key Risks | Required Backend | Effort |
|---------|--------|----------|--------------|-----------|------------------|--------|
| **Trading** | ✅ Implemented | `TradingContext.tsx`, `TradeModal.tsx`, `trading.ts` handler | Real - DynamoDB persistence | Market hours only client-enforced (also server-side now), no price slippage | POST `/api/trade/execute` ✓ | - |
| **Portfolio** | ✅ Implemented | `PortfolioScreen.tsx`, `TradingContext.fetchPortfolio()` | Real - fetched from backend | Holdings not synced on app kill mid-trade | GET `/api/portfolio` ✓ | - |
| **Auth** | ✅ Implemented | `AuthContext.tsx`, `authService.ts`, Cognito integration | Real - Cognito + JWT tokens | No token refresh retry logic on 401 | `/api/auth/*` endpoints ✓ | - |
| **Profiles** | ⚠️ Partial | `ProfileScreen.tsx`, `user.ts` handler | Real structure, limited data | No profile edit, no avatar upload | GET `/api/user/:userId` ✓ | M |
| **Feed** | ✅ Implemented | `FeedsScreen.tsx`, `SocialContext.refreshActivityFeed()` | Real with pagination | Falls back to MOCK_POSTS if empty | GET `/api/social/feed` ✓ | - |
| **Posts** | ✅ Implemented | `CreatePostModal.tsx`, `SocialContext.createPost()` | Real - DynamoDB | No image upload, no content moderation | POST `/api/social/posts` ✓ | M |
| **Comments** | ✅ Implemented | `CommentSection.tsx`, `SocialContext` | Real - DynamoDB | No deep threading, no edit | `POST /api/social/posts/:id/comments` ✓ | S |
| **Follows** | ✅ Implemented | `FollowButton.tsx`, `SocialContext.toggleFollowUser()` | Real - DynamoDB | No mutual follow detection | POST `/api/social/users/:id/follow` ✓ | - |
| **Groups** | ⚠️ Partial | `GroupsScreen.tsx`, `groups.ts` handler | Mock fallback, backend exists | No group posts, no invites | `/api/groups/*` ✓ | M |
| **News** | ⚠️ Partial | `NewsContext.tsx`, `news.ts` handler | Mock with `generateMockNews()` | No real news source | GET `/api/news` ✓ | L |
| **Sentiment** | ⚠️ Partial | Types exist, UI shows sentiment | Mock - hardcoded in mock data | No sentiment analysis pipeline | Need sentiment service | L |
| **Watchlist** | ⚠️ Partial | `WatchlistContext.tsx` | Device-local AsyncStorage only | Lost on app reinstall, no sync | Need GET/POST `/api/watchlist` | M |
| **Search** | ⚠️ Partial | `SearchScreen.tsx` | Filters MOCK_ENTITIES locally | No backend search, no fuzzy match | Need GET `/api/search` | M |
| **Categories** | ✅ Implemented | `AllCategoriesScreen.tsx`, `CategoryScreen.tsx` | Uses MOCK_ENTITIES + backend prices | Treemap uses hardcoded volumes | Enhance `/api/entities` | S |
| **Notifications** | ❌ Missing | `NotificationsScreen.tsx`, `NotificationsPanel.tsx` exist | UI only, no backend | No push notifications | Need full notification system | L |
| **Onboarding** | ⚠️ Partial | `WelcomeScreen.tsx`, skip auth for dev | Basic signup flow | No EULA flow in app, no tutorial | Enhance signup flow | S |
| **Simulator** | ✅ Implemented | `SimulatorScreen.tsx` (509 lines) | Local state only (paper trading) | Separate from real portfolio | None (intentionally local) | - |
| **Leaderboards** | ✅ Implemented | `SeasonalCompetitionScreen.tsx`, `leaderboard.ts` | Real - backend endpoint | Ranking calculation simplistic | GET `/api/leaderboard` ✓ | - |

---

## 4. Code-Level Findings

### 4.1 Trading System Correctness

**Location:** `src/context/TradingContext.tsx`, `src/components/TradeModal.tsx`, `backend/src/handlers/trading.ts`

**Strengths:**
- ✅ Buy/sell flow validates quantity > 0, checks sufficient funds/shares
- ✅ Market hours enforced server-side (2am-8am EST closed)
- ✅ Cost basis calculation correct (weighted average on buys)
- ✅ Backend persists to DynamoDB with proper transactions

**Issues:**
```typescript
// TradeModal.tsx:98-139
const handleExecuteTrade = () => {
  if (!canExecute) return;
  setIsProcessing(true);
  setTimeout(async () => {  // ISSUE: setTimeout creates race condition
    const success = await executeTrade(...);
    // User could navigate away during this delay
```

**Risks:**
1. **No optimistic UI update** - trade shows as pending until backend confirms
2. **No retry on network failure** - trade fails silently
3. **Price staleness warning** exists but no auto-refresh trigger
4. **No transaction idempotency** - double-tap could cause duplicate trades

**Recommendations:**
```typescript
// Add idempotency key to trades
const handleExecuteTrade = async () => {
  const idempotencyKey = `${userId}-${entityId}-${Date.now()}`;
  const success = await executeTrade({...}, idempotencyKey);
};
```

### 4.2 Data Fetching + Caching

**Location:** `src/config/api.ts`, all context files

**Strengths:**
- ✅ Centralized `apiRequest()` and `authenticatedRequest()` helpers
- ✅ AbortController support for request cancellation
- ✅ Timeout handling (10 seconds)
- ✅ Graceful backend unavailable detection

**Issues:**
```typescript
// TradingContext.tsx:244-270 - Polling every 30s
useEffect(() => {
  const interval = setInterval(() => {
    fetchEntityPrices(); // No deduplication
    if (isAuthenticated) fetchPortfolio(); // Multiple requests
  }, 30000);
```

**Recommendations:**
1. Add request deduplication (abort in-flight before new request)
2. Implement exponential backoff on errors
3. Add stale-while-revalidate pattern
4. Consider React Query or SWR for automatic caching

### 4.3 Auth + Session Handling

**Location:** `src/context/AuthContext.tsx`, `src/services/authService.ts`

**Strengths:**
- ✅ SecureStore for tokens (encrypted on iOS)
- ✅ AsyncStorage for non-sensitive user data
- ✅ Token verification on app load
- ✅ OAuth scaffolding for Google/Apple

**Issues:**
```typescript
// AuthContext.tsx:46-71
const loadAuthData = async () => {
  const savedToken = await SecureStore.getItemAsync(SECURE_AUTH_TOKEN_KEY);
  if (savedToken) {
    const verification = await verifyToken(savedToken);
    if (!verification.success) {
      await clearAuthData(); // ISSUE: No refresh token attempt
    }
  }
};
```

**Missing:**
- No automatic token refresh when expired
- No refresh token rotation
- No logout on 401 from API calls
- `skipAuth()` function exposes dev bypass (remove for production)

**Recommendations:**
```typescript
// Add to api.ts
export async function authenticatedRequest<T>(...) {
  const response = await fetch(...);
  if (response.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) return authenticatedRequest(...); // Retry
    else await forceLogout();
  }
}
```

### 4.4 Social Objects

**Location:** `src/context/SocialContext.tsx`, `src/validators/schemas.ts`

**Strengths:**
- ✅ Full CRUD for posts, comments
- ✅ Like/unlike/bookmark toggles with optimistic updates
- ✅ Zod validation for API responses
- ✅ Pagination with lastEvaluatedKey

**Schema Example:**
```typescript
// validators/schemas.ts - properly handles backend/frontend ID mismatch
export const PostSchema = z.object({
  id: z.string().optional(),
  postId: z.string().optional(), // Backend uses postId
  // ...
}).transform((data) => ({
  ...data,
  id: data.postId || data.id || '', // Normalize
}));
```

**Issues:**
- Feed pagination loads 20 items but no virtualization in FlatList
- No content length validation (could post very long text)
- No spam/rate limiting on createPost

### 4.5 News + Sentiment

**Location:** `src/context/NewsContext.tsx`, `backend/src/handlers/news.ts`

**Current State:**
```typescript
// NewsContext.tsx:21-163
const generateMockNews = (): NewsArticle[] => {
  const newsTemplates = [
    // Hardcoded 9 articles with sentiment scores
  ];
  // ...
};
```

**Issues:**
- All news is mock-generated on frontend
- Backend news handler exists but may have no data source
- Sentiment scores are hardcoded, no analysis pipeline
- Entity-news mapping is approximate

**Recommendations:**
1. Integrate news API (NewsAPI.org, GNews, etc.)
2. Add sentiment analysis service (AWS Comprehend or similar)
3. Create entity-news association in DynamoDB

### 4.6 Navigation UX & Screens

**Location:** `src/navigation/BottomTabNavigator.tsx`, `App.tsx`

**Strengths:**
- ✅ 9 tabs with custom FloatingBottomNav
- ✅ Modal presentations for Search/Settings
- ✅ Error boundaries on every screen
- ✅ RefreshControl on all scrollable screens

**Issues:**
```typescript
// BottomTabNavigator.tsx:120-131
<Tab.Screen name="Home">
  {() => {
    const nav = useNavigation(); // ISSUE: Hook in render function
    React.useEffect(() => {
      setTabNavigation(nav);
    }, [nav]);
    return <HomeScreen />;
  }}
</Tab.Screen>
```

**Performance Concerns:**
- HomeScreen is 3312 lines (too large, should split)
- Multiple horizontal ScrollViews with snap could cause jank
- No screen-level memoization

### 4.7 Security + Privacy

**Findings:**

| Issue | Severity | Location | Recommendation |
|-------|----------|----------|----------------|
| Dev skip auth | Medium | `AuthContext.skipAuth()` | Remove or gate behind `__DEV__` build flag |
| Console logging | Low | Throughout codebase | Use proper log levels, strip in production |
| No TLS pinning | Medium | `api.ts` | Add certificate pinning for production |
| AsyncStorage for user data | Low | `AuthContext` | Already using SecureStore for tokens ✅ |
| No input sanitization | Medium | Post creation | Add content filtering before submit |

**No hardcoded secrets found in the codebase.** ✅

### 4.8 Type Safety + Consistency

**Strengths:**
- ✅ Comprehensive type definitions in `src/types/index.ts`
- ✅ Zod schemas for runtime validation in `src/validators/schemas.ts`
- ✅ Backend types align with frontend in `backend/src/models/types.ts`

**Pattern:**
```typescript
// Validation helper that filters invalid items
export function validateArrayLoose<T>(schema: z.ZodSchema<T>, data: unknown[]): T[] {
  return data
    .filter(item => item !== undefined && item !== null)
    .map(item => safeValidate(schema, item))
    .filter((item): item is T => item !== null);
}
```

**Gaps:**
- No validation on outgoing request bodies (could send malformed data)
- Some handlers accept `any` types rather than validated inputs

### 4.9 Testing + Build Health

**Current State:**
- ❌ No test files found
- ❌ No Jest/Testing Library configuration
- ⚠️ No lint configuration visible (may be in package.json)
- ✅ ErrorBoundary components present
- ✅ Error reporting service scaffold exists

**Recommendations:**
1. Add Jest + React Native Testing Library
2. Start with critical path tests: Auth flow, Trade execution
3. Add ESLint + Prettier configuration
4. Set up GitHub Actions for CI

---

## 5. Top 10 Code Improvements

### 1. **Add Token Refresh Logic** (High Impact)
**Problem:** 401 errors from backend don't trigger token refresh
**File:** `src/config/api.ts`
```typescript
export async function authenticatedRequest<T>(...) {
  const response = await apiRequest<T>(...);
  if (response.error?.includes('401') || response.error?.includes('Unauthorized')) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return authenticatedRequest<T>(...); // Retry with new token
    }
  }
  return response;
}
```

### 2. **Add Trade Idempotency** (High Impact)
**Problem:** Double-tap could create duplicate trades
**File:** `backend/src/handlers/trading.ts`
```typescript
// Add idempotency key check
const existingTrade = await getTradeByIdempotencyKey(idempotencyKey);
if (existingTrade) return createResponse(200, { data: existingTrade });
```

### 3. **Split HomeScreen** (Medium Impact)
**Problem:** 3312 lines is unmaintainable
**Action:** Extract into components:
- `HomePortfolioCard.tsx`
- `HomeTrendingSection.tsx`
- `HomeSwipeablePages.tsx`
- `HomeEntityList.tsx`

### 4. **Add Request Deduplication** (Medium Impact)
**Problem:** Multiple identical requests during polling
**File:** `src/config/api.ts`
```typescript
const inFlightRequests = new Map<string, Promise<any>>();

export async function deduplicatedRequest<T>(key: string, request: () => Promise<T>): Promise<T> {
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key)!;
  }
  const promise = request().finally(() => inFlightRequests.delete(key));
  inFlightRequests.set(key, promise);
  return promise;
}
```

### 5. **Backend Watchlist Sync** (Medium Impact)
**Problem:** Watchlist lost on reinstall
**Action:** Add `GET/POST /api/watchlist` endpoints, sync on app launch

### 6. **Remove Dev Skip Auth** (High Impact for Production)
**Problem:** Security bypass in production
**File:** `src/context/AuthContext.tsx`
```typescript
// Remove or guard:
const skipAuth = async () => {
  if (!__DEV__) return; // Only allow in development
  // ...
};
```

### 7. **Add Content Validation** (Medium Impact)
**Problem:** Users could post very long or malicious content
**File:** `src/context/SocialContext.tsx`
```typescript
const createPost = async (params: {...}) => {
  if (params.content.length > 1000) {
    return { success: false, error: 'Post too long (max 1000 characters)' };
  }
  // Sanitize content...
};
```

### 8. **Implement Pull-to-Refresh Price Update** (Low-Medium Impact)
**Problem:** Users don't know prices are updating
**Action:** Show last update timestamp, trigger price fetch on pull

### 9. **Add Offline Detection** (Medium Impact)
**Problem:** App shows stale data without indicating offline
**Action:** Use NetInfo to detect connectivity, show banner when offline

### 10. **Add Basic Analytics** (Medium Impact for Product)
**Problem:** No visibility into user behavior
**Action:** Add event tracking for: trades, posts created, screen views

---

## 6. Backend Gap Analysis

### Existing Endpoints (in backend/src/handlers/)

| Endpoint | Handler | Status |
|----------|---------|--------|
| POST `/api/auth/signup` | auth.ts | ✅ Working |
| POST `/api/auth/login` | auth.ts | ✅ Working |
| GET `/api/auth/me` | auth.ts | ✅ Working |
| POST `/api/trade/execute` | trading.ts | ✅ Working |
| GET `/api/portfolio` | trading.ts | ✅ Working |
| GET `/api/transactions` | trading.ts | ✅ Working |
| GET `/api/entities` | trading.ts | ✅ Working |
| GET `/api/entities/:id/price` | trading.ts | ✅ Working |
| GET `/api/entities/:id/price-history` | trading.ts | ✅ Working |
| GET `/api/social/feed` | social.ts | ✅ Working |
| POST `/api/social/posts` | social.ts | ✅ Working |
| POST `/api/social/posts/:id/comments` | social.ts | ✅ Working |
| POST `/api/social/posts/:id/like` | social.ts | ✅ Working |
| POST `/api/social/users/:id/follow` | social.ts | ✅ Working |
| GET `/api/groups` | groups.ts | ✅ Working |
| GET `/api/news` | news.ts | ⚠️ Needs data source |
| GET `/api/leaderboard` | leaderboard.ts | ✅ Working |

### Missing Endpoints

#### 1. Watchlist Sync
```typescript
// GET /api/watchlist
// Request: Authorization header
// Response:
{
  "success": true,
  "data": [
    {
      "entityId": 21,
      "addedAt": "2024-12-30T00:00:00Z"
    }
  ]
}

// POST /api/watchlist
// Request:
{ "entityId": 21 }
// Response:
{ "success": true }

// DELETE /api/watchlist/:entityId
```

#### 2. Search
```typescript
// GET /api/search?q=taylor&type=entities
// Response:
{
  "success": true,
  "data": {
    "entities": [...],
    "users": [...],
    "posts": [...]
  }
}
```

#### 3. Notifications
```typescript
// GET /api/notifications
// Response:
{
  "success": true,
  "data": [
    {
      "id": "...",
      "type": "trade" | "follow" | "like" | "comment" | "price_alert",
      "message": "User X followed you",
      "read": false,
      "createdAt": "..."
    }
  ]
}

// POST /api/notifications/:id/read
```

### Database Tables (from backend/src/utils/dynamodb.ts)

| Table | Primary Key | Sort Key | Purpose |
|-------|-------------|----------|---------|
| Users | userId | - | User profiles |
| Entities | entityId | - | Tradeable entities |
| Portfolios | userId | entityId | User holdings |
| Transactions | userId | timestamp | Trade history |
| Posts | postId | - | Social posts |
| Comments | postId | commentId | Post comments |
| Follows | userId | followingUserId | Follow relationships |
| Likes | postId | likeId | Post likes |
| PriceHistory | entityId | timestamp | Price over time |
| Groups | groupId | - | Social groups |
| GroupMembers | groupId | userId | Group membership |
| News | articleId | - | News articles |
| Watchlist | userId | entityId | User watchlists |

---

## 7. Categories Tab Spec + Implementation Plan

### 7.1 UX Outline

The Categories tab (`AllCategoriesScreen.tsx`) already exists with three views:

1. **Treemap View** (default)
   - Visual representation of category trade volume
   - Tap category → navigate to CategoryScreen

2. **List View**
   - Sorted list of categories with stats
   - Each row shows: name, entity count, volume trend

3. **Browse View** (NEW FOCUS - needs enhancement)
   - Infinite scroll discovery feed
   - Modules in order:
     - "For You" (personalized recommendations)
     - "Trending Today" (highest volume last 24h)
     - "Biggest Movers" (largest price change)
     - "Most Discussed" (most posts/comments)
     - "New Additions" (recently added entities)

### 7.2 Data Requirements

Current data comes from `useCategoryData.ts` hook. Needs:

```typescript
// New endpoints needed:
GET /api/discover/trending?limit=10
GET /api/discover/movers?limit=10
GET /api/discover/discussed?limit=10
GET /api/discover/new?limit=10
GET /api/discover/foryou?limit=10  // Requires user context

// Response shape:
{
  "success": true,
  "data": {
    "entities": [...],
    "hasMore": true,
    "lastKey": "..."
  }
}
```

### 7.3 New Files/Components to Create

```
src/components/
├── DiscoverSection.tsx      # Generic section with title + horizontal scroll
├── EntityCardCompact.tsx    # Smaller card for browse feed (sparkline, quick buy)
├── SkeletonLoader.tsx       # Placeholder while loading
└── CategoryChipBar.tsx      # Horizontal filter chips

src/hooks/
└── useDiscoverData.ts       # Hook for discovery endpoints

src/screens/
└── BrowseScreen.tsx         # (Optional) Dedicated browse tab
```

### 7.4 Navigation Changes

Current `AllCategoriesScreen` already shows in Categories tab. Enhancements:

```typescript
// BottomTabNavigator.tsx - already has Categories tab
<Tab.Screen name="Categories">
  {() => <AllCategoriesScreen />}  // Already exists
</Tab.Screen>
```

No navigation changes needed - enhance existing screen.

### 7.5 Implementation Checklist

- [ ] **Backend: Discovery Endpoints**
  - [ ] Add `GET /api/discover/trending` - query entities by 24h volume
  - [ ] Add `GET /api/discover/movers` - query by price change %
  - [ ] Add `GET /api/discover/discussed` - query by post/comment count
  - [ ] Add `GET /api/discover/foryou` - based on user's holdings/follows

- [ ] **Frontend: Components**
  - [ ] Create `EntityCardCompact.tsx` with sparkline + quick trade button
  - [ ] Create `SkeletonLoader.tsx` for loading states
  - [ ] Create `DiscoverSection.tsx` for each module

- [ ] **Frontend: Data Layer**
  - [ ] Enhance `useCategoryData.ts` to call discovery endpoints
  - [ ] Add pagination support for infinite scroll
  - [ ] Add pull-to-refresh

- [ ] **Frontend: Browse View Enhancement**
  - [ ] Add "For You" section at top
  - [ ] Add "Trending Today" horizontal scroll
  - [ ] Add "Biggest Movers" section
  - [ ] Add "Most Discussed" section
  - [ ] Implement infinite scroll pagination
  - [ ] Add category filter chips

---

## 8. MVP Build Plan (2-4 Weeks)

### Week 1: Core Stability
| Day | Task | Files |
|-----|------|-------|
| 1-2 | Add token refresh logic | `api.ts`, `AuthContext.tsx` |
| 2-3 | Add trade idempotency | `trading.ts`, `TradeModal.tsx` |
| 3-4 | Implement backend watchlist sync | New handler, `WatchlistContext.tsx` |
| 4-5 | Remove dev auth bypass, add proper gating | `AuthContext.tsx` |

### Week 2: Feature Completion
| Day | Task | Files |
|-----|------|-------|
| 1-2 | Add search endpoint + UI enhancement | New handler, `SearchScreen.tsx` |
| 2-3 | Add notification backend + basic UI | New handler, `NotificationsScreen.tsx` |
| 3-4 | Integrate news API or create content pipeline | `newsService.ts`, `NewsContext.tsx` |
| 4-5 | Add offline detection + error states | New `useNetworkStatus` hook |

### Week 3: Categories & Discovery
| Day | Task | Files |
|-----|------|-------|
| 1-2 | Add discovery endpoints | `categories.ts` handler |
| 2-3 | Create EntityCardCompact + SkeletonLoader | New components |
| 3-4 | Enhance Browse view with all sections | `AllCategoriesScreen.tsx` |
| 4-5 | Add infinite scroll + pagination | `useCategoryData.ts` |

### Week 4: Polish & Testing
| Day | Task | Files |
|-----|------|-------|
| 1-2 | Split HomeScreen into smaller components | New component files |
| 2-3 | Add Jest + critical path tests | New `__tests__/` folder |
| 3-4 | Performance audit + fixes | Various screens |
| 4-5 | Final QA + bug fixes | Throughout |

### Milestones
- **M1 (End Week 1):** Auth and trading are production-ready
- **M2 (End Week 2):** All core features complete, no mock fallbacks needed
- **M3 (End Week 3):** Categories tab fully functional with discovery
- **M4 (End Week 4):** App ready for TestFlight/internal testing

---

## Appendix: File-by-File Notes

### Contexts

| File | Lines | Notes |
|------|-------|-------|
| `AuthContext.tsx` | 259 | Clean, needs token refresh |
| `TradingContext.tsx` | 460 | Well-structured, 30s polling |
| `SocialContext.tsx` | 970 | Large, could split groups out |
| `NewsContext.tsx` | 352 | Mostly mock, needs real data |
| `WatchlistContext.tsx` | 258 | Device-local only, needs sync |
| `ThemeContext.tsx` | - | Simple, works well |
| `SideMenuContext.tsx` | - | Simple state for menu |

### Key Screens

| File | Lines | Notes |
|------|-------|-------|
| `HomeScreen.tsx` | 3312 | Too large, needs splitting |
| `EntityScreen.tsx` | 1067 | Complex, has mock feed posts |
| `PortfolioScreen.tsx` | 434 | Clean, functional |
| `FeedsScreen.tsx` | 800 | Dual tab (feed/news), works |
| `AllCategoriesScreen.tsx` | 734 | Treemap/list/browse views |
| `SimulatorScreen.tsx` | 819 | Fully functional paper trading |
| `SeasonalCompetitionScreen.tsx` | 392 | Backend-integrated leaderboard |

### Backend Handlers

| File | Notes |
|------|-------|
| `trading.ts` | Complete, market hours enforced |
| `auth.ts` | Cognito integration, needs OAuth setup |
| `social.ts` | Full CRUD, pagination |
| `groups.ts` | CRUD exists, limited frontend integration |
| `news.ts` | Handler exists, needs data source |
| `leaderboard.ts` | Functional, basic ranking |

---

*End of Audit Report*

>>>>>>> Incoming (Background Agent changes)
