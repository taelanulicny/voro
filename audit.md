# Moro Codebase Audit Report

**Date:** December 30, 2025  
**Auditor:** Senior Full-Stack Engineer & Tech Lead  
**Version:** 1.0

---

## Executive Summary

### What's Solid ✅
1. **Architecture foundation is well-structured** - Clean separation of concerns with Context providers, typed navigation, validated schemas (Zod), error boundaries, and proper TypeScript usage
2. **Backend infrastructure exists and is deployed** - AWS-based backend with Lambda handlers, DynamoDB, Cognito auth, and API Gateway
3. **Trading system has proper backend persistence** - Full buy/sell flow with portfolio management, transaction history, idempotency keys, price slippage protection, and market hours enforcement
4. **Auth flow is complete** - Email/password and OAuth (Google/Apple) with JWT tokens, refresh tokens, and SecureStore for token storage
5. **Social features have backend endpoints** - Posts, comments, likes, bookmarks, follows, and groups are implemented with pagination
6. **Validation layer is mature** - Zod schemas for all API responses with runtime validation
7. **Security-conscious design** - Certificate pinning support, screenshot protection, no hardcoded secrets found, proper token storage

### What's Mock/Fake ⚠️
1. **News content is mock** - `generateMockNews()` provides placeholder data; backend endpoint exists but may not have real news provider
2. **Category data is partially hardcoded** - Trade volume percentages in `AllCategoriesScreen` are hardcoded
3. **Prices lack real-time source** - Backend has price update handlers but no external price feed integration
4. **"For You" recommendations** - Algorithm exists but may need training data

### What Blocks MVP 🚨
1. **No real news/sentiment provider** - Need to integrate real news API and sentiment analysis
2. **Price formula not implemented** - Backend comment states "TODO: Implement Custom Price Formula"
3. **Leaderboard/Competition** - Backend handlers exist but may need population and ranking logic
4. **Push notifications** - NotificationService exists but push token registration and delivery not connected

---

## A) Repo Map

### High-Level Structure

```
/Users/cisloaners/Desktop/moro/
├── App.tsx                    # Entry point, context providers, navigation
├── src/
│   ├── components/           # 23 reusable UI components
│   ├── config/
│   │   └── api.ts           # API client with caching, retry, SSL pinning
│   ├── context/             # 8 context providers (state management)
│   ├── hooks/
│   │   └── useCategoryData.ts
│   ├── navigation/
│   │   └── BottomTabNavigator.tsx
│   ├── screens/             # 28 screens
│   ├── services/            # 6 service files
│   ├── types/
│   │   └── index.ts         # TypeScript types
│   ├── utils/               # 8 utility files
│   └── validators/
│       ├── index.ts
│       └── schemas.ts       # Zod validation schemas
├── backend/
│   ├── src/
│   │   ├── handlers/        # 15 Lambda handlers
│   │   ├── middleware/
│   │   │   └── auth.ts      # JWT/Cognito verification
│   │   ├── models/
│   │   ├── services/        # 11 service files
│   │   └── utils/
│   └── infrastructure/      # CDK stack
└── package.json
```

### Entry Point & Navigation

**Entry:** `App.tsx`
- Wraps app in 8 context providers (Theme, Auth, Social, News, Trading, Watchlist, Notifications, SideMenu)
- Uses `@react-navigation/native-stack` for root navigation
- Conditional rendering based on `isAuthenticated` state

**Tab Structure:** `BottomTabNavigator.tsx`
- Home, News, Feeds, Groups, Portfolio, Watchlist, Categories, SeasonalCompetition, Profile
- Custom floating bottom nav component

**Stack Screens:**
- Welcome, Login, Signup (unauthenticated)
- Entity, Category, Search, Settings, GroupDetail, FollowersList, NewsDetail, NewsFeed, Notifications, DiscoverNewAdditions, AccountValue, EditProfile, UserProfile (authenticated)

### State Management Patterns

| Context | Purpose | Data Source |
|---------|---------|-------------|
| `AuthContext` | User auth, tokens | SecureStore + Backend |
| `TradingContext` | Portfolio, trades, prices | Backend API |
| `SocialContext` | Posts, comments, follows, groups | Backend API + MOCK_POSTS fallback |
| `NewsContext` | News articles | Backend API + generateMockNews() fallback |
| `WatchlistContext` | User watchlist, price alerts | Backend API |
| `NotificationsContext` | Notifications | Backend API |
| `ThemeContext` | Light/dark mode | Local state |
| `SideMenuContext` | Menu visibility | Local state |

### Mock Data Locations

| Mock Data | File | Usage |
|-----------|------|-------|
| `MOCK_ENTITIES` | `src/utils/mockEntities.ts` | 40 entities (influencers, artists, politicians, startups) |
| `MOCK_POSTS` | `src/context/SocialContext.tsx` | 12 sample posts for feed fallback |
| `generateMockNews()` | `src/context/NewsContext.tsx` | 9 news article templates |
| `categoryTradeVolumes` | `src/screens/AllCategoriesScreen.tsx` | Hardcoded category percentages |

---

## B) Feature Audit Table

| Feature | Status | Evidence | Mock vs Real | Key Risks/Bugs | Required Backend Endpoints | Effort |
|---------|--------|----------|--------------|----------------|---------------------------|--------|
| **Trading** | ✅ Implemented | `TradingContext.tsx`, `TradeModal.tsx`, `backend/handlers/trading.ts` | Real - full backend persistence with DynamoDB | Price slippage >2% blocks trades (good); `todayChange` is mock calculation | POST `/api/trade/execute`, GET `/api/portfolio`, GET `/api/transactions`, GET `/api/entities`, GET `/api/prices` - All exist | - |
| **Portfolio** | ✅ Implemented | `PortfolioScreen.tsx`, `TradingContext.tsx`, `tradingService.ts` | Real - fetches from backend | Holdings depend on entity prices updating | GET `/api/portfolio` - Exists | - |
| **Auth** | ✅ Implemented | `AuthContext.tsx`, `authService.ts`, `backend/handlers/auth.ts` | Real - Cognito + custom JWT | Token refresh logic exists; OAuth handlers exist | POST `/api/auth/login`, `/signup`, `/refresh`, GET `/api/auth/me` - All exist | - |
| **Profiles** | ⚠️ Partial | `ProfileScreen.tsx`, `UserProfileScreen.tsx`, `EditProfileScreen.tsx` | Real - backend user service | Avatar upload uses presigned URLs; followers/following counts | GET `/api/user/:userId`, PUT `/api/user/profile` - Exist | S |
| **Feed** | ✅ Implemented | `FeedsScreen.tsx`, `SocialContext.tsx`, `backend/handlers/social.ts` | Real with mock fallback | Pagination via `lastEvaluatedKey`; falls back to MOCK_POSTS if no backend | GET `/api/social/feed` - Exists | - |
| **Posts** | ✅ Implemented | `CreatePostModal.tsx`, `PostCard.tsx`, `SocialContext.tsx` | Real - backend persistence | Rate limiting (5 posts/min client-side) | POST `/api/social/posts`, DELETE `/api/social/posts/:id` - Exist | - |
| **Comments** | ✅ Implemented | `CommentSection.tsx`, `SocialContext.tsx` | Real - with nested replies | Threaded comments with `parentCommentId` | GET/POST `/api/social/posts/:id/comments`, PUT/DELETE `/api/social/comments/:id` - Exist | - |
| **Follows** | ✅ Implemented | `FollowButton.tsx`, `SocialContext.tsx`, `backend/handlers/social.ts` | Real - backend persistence | Mutual follow detection | POST `/api/social/users/:id/follow`, GET `/api/social/users/:id/mutual-follow` - Exist | - |
| **Groups** | ✅ Implemented | `GroupsScreen.tsx`, `GroupDetailScreen.tsx`, `backend/handlers/groups.ts` | Real - backend persistence | Join/leave, create group | GET `/api/groups`, POST `/api/groups`, POST `/api/groups/:id/join` - Exist | - |
| **News** | ⚠️ Partial | `NewsScreen.tsx`, `NewsContext.tsx`, `backend/handlers/news.ts` | Mock fallback - `generateMockNews()` used when backend empty | No real news provider integrated | GET `/api/news` - Exists but needs real data source | M |
| **Sentiment** | ⚠️ Partial | `NewsArticle.sentimentScore`, `PostCard.sentiment` | Mock - hardcoded in news templates | Need NLP/sentiment analysis integration | Compute from news/posts | M |
| **Watchlist** | ✅ Implemented | `WatchlistScreen.tsx`, `WatchlistContext.tsx`, `backend/handlers/watchlist.ts` | Real - backend persistence | Price alerts are local only (not persisted) | GET/POST/DELETE `/api/watchlist` - Exist | S |
| **Search** | ✅ Implemented | `SearchScreen.tsx`, `backend/handlers/search.ts` | Real - fuzzy search backend | Debounced (300ms); category filtering | GET `/api/search` - Exists | - |
| **Categories** | ⚠️ Partial | `AllCategoriesScreen.tsx`, `CategoryScreen.tsx`, `useCategoryData.ts` | Mixed - UI complete, backend handlers exist, trade volumes hardcoded | Treemap uses hardcoded `categoryTradeVolumes` | GET `/api/categories/trending`, `/movers`, `/discussed`, `/discover`, `/for-you` - Exist | S |
| **Notifications** | ⚠️ Partial | `NotificationsScreen.tsx`, `NotificationsContext.tsx`, `backend/handlers/notifications.ts` | Real - backend persistence | Missing push notification delivery; polls every 30s | GET `/api/notifications`, POST `/api/notifications/:id/read` - Exist | M |
| **Onboarding** | ✅ Implemented | `WelcomeScreen.tsx`, `LoginScreen.tsx`, `SignupScreen.tsx` | Real | Carousel with 3 spotlight images | - | - |
| **Simulator** | ✅ Implemented | `SimulatorScreen.tsx` | Local state only | Separate from real portfolio; includes screenshot protection | None needed (paper trading) | - |
| **Leaderboards** | ⚠️ Partial | `SeasonalCompetitionScreen.tsx`, `backend/handlers/leaderboard.ts` | Backend exists | Need to populate rankings | GET `/api/leaderboard` - Exists | S |

---

## C) Code-Level Findings

### 1) Trading System Correctness

**Files:** `TradingContext.tsx`, `TradeModal.tsx`, `backend/handlers/trading.ts`, `backend/services/tradingService.ts`

**Buy/Sell Flow:**
- ✅ Optimistic UI updates with rollback on failure
- ✅ Idempotency keys prevent duplicate trades
- ✅ Market hours enforcement (2am-8am EST closed)
- ✅ Price slippage protection (>2% difference rejected)
- ✅ Quantity validation (positive, max 1,000,000)
- ✅ Zod schema validation on backend

**Input Validation:**
```typescript
// TradeModal.tsx - Client-side
const handleQuantityChange = (text: string) => {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) return;
  if (parts[1] && parts[1].length > 2) return;
  setQuantity(cleaned);
};
```
- ✅ Only numbers and one decimal allowed
- ✅ Max 2 decimal places

**Insufficient Funds Check:**
```typescript
// TradingContext.tsx
const totalAmount = quantity * pricePerToken;
if (type === 'buy' && totalAmount > cashBalance) {
  // Insufficient funds handled
}
```
- ✅ Client-side check before optimistic update
- ✅ Server-side check in `tradingService.ts`

**Position Cost Basis:**
```typescript
// Correct average cost calculation
const newQuantity = existing.quantity + quantity;
const newTotalCost = existing.totalCost + totalAmount;
const newAverageCost = newTotalCost / newQuantity;
```
- ✅ Weighted average cost implemented correctly

**Price Source:**
- ⚠️ Prices fetched from backend `/api/prices` every 30 seconds
- ⚠️ Backend `priceUpdates.ts` exists but formula is TODO
- ❌ No external price feed integration

**Persistence:**
- ✅ DynamoDB transactions for atomic updates
- ✅ Pending trades saved to AsyncStorage for recovery on app restart

**Risks:**
- Price staleness warning after 60 seconds without update
- `todayChange` calculation is mock (10% of P&L)

---

### 2) Data Fetching + Caching

**File:** `src/config/api.ts`

**Implemented:**
- ✅ Request deduplication (prevents duplicate in-flight requests)
- ✅ Response caching with TTL (prices: 5s, portfolio: 30s, entities: 5min)
- ✅ Stale-while-revalidate pattern
- ✅ Retry with exponential backoff (configurable, max 3 retries)
- ✅ Timeout handling (10 seconds)
- ✅ AbortController for cancelable requests

**Cache Invalidation:**
```typescript
export { invalidateCache };
// Called after trades: invalidateCache('/portfolio'); invalidateCache('/prices');
```

**Error Handling:**
- ✅ User-friendly messages for common errors
- ✅ 401/404 handled gracefully
- ✅ Network errors detected and reported

**Navigation Safety:**
- ✅ AbortController passed to fetch calls
- ✅ Cleanup in useEffect returns

---

### 3) Auth + Session Handling

**Files:** `AuthContext.tsx`, `authService.ts`, `backend/middleware/auth.ts`

**Token Storage:**
- ✅ JWT stored in SecureStore (encrypted)
- ✅ Refresh token stored in SecureStore
- ✅ User profile in AsyncStorage (non-sensitive)

**Token Refresh:**
```typescript
const tryRefreshToken = useCallback(async (): Promise<boolean> => {
  if (refreshInProgress.current) return false; // Prevent concurrent refresh
  if (!isTokenExpiredOrNearExpiry(token, 5)) return true; // Still valid
  // ... refresh logic
}, [token]);
```
- ✅ Automatic refresh 5 minutes before expiry
- ✅ Prevents concurrent refresh attempts
- ✅ Callback registered with API client

**Logout:**
- ✅ Server logout attempted
- ✅ Local data cleared regardless of server response

**Protected Routes:**
- ✅ Conditional rendering based on `isAuthenticated`
- ✅ Auth header added via `authenticatedRequest()`

**Backend Verification:**
- ✅ Cognito JWT verifier for ID tokens
- ✅ Fallback to GetUser for access tokens
- ✅ Custom JWT verification for OAuth tokens

---

### 4) Social Objects

**Post Schema:**
```typescript
interface Post {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  content: string;
  entityId?: number;          // Tagged entity
  entityTicker?: string;
  entityName?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  images?: string[];
  likes: number;
  comments: number;
  isLiked: boolean;
  isBookmarked: boolean;
  timestamp: string;
}
```

**Comment Schema:**
```typescript
interface Comment {
  id: string;
  postId: string;
  userId: string;
  parentCommentId?: string;   // Threading support
  replyTo?: { userId, username, displayName };
  replies?: Comment[];        // Nested replies
  isEdited?: boolean;
  editedAt?: string;
  // ... other fields
}
```

**Follow Graph:**
- Stored in DynamoDB with `followerId` and `followeeId`
- Mutual follow detection: `/api/social/users/:id/mutual-follow`
- Followers/following counts on user profile

**Feed Pagination:**
- Uses DynamoDB `lastEvaluatedKey` for cursor-based pagination
- Default limit: 20 posts
- Infinite scroll via `loadMorePosts()`

---

### 5) News + Sentiment

**Files:** `NewsContext.tsx`, `backend/handlers/news.ts`, `backend/services/newsService.ts`

**Current State:**
- Backend handlers exist for CRUD operations
- Frontend falls back to `generateMockNews()` when backend returns empty
- News articles include `sentimentScore` (-100 to 100) and `sentiment` enum

**Missing:**
- ❌ No real news API integration (NewsAPI, Finnhub, etc.)
- ❌ No NLP/sentiment analysis pipeline
- ❌ Entity-to-news mapping is manual

**News Article Schema:**
```typescript
interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  source: string;
  publishedAt: string;
  category: 'Tech' | 'Politics' | 'Events' | 'People' | 'General';
  entityId?: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;  // -100 to 100
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  isBreaking: boolean;
}
```

---

### 6) Navigation UX & Screens

**Tab Structure:**
- 9 tabs defined in `MainTabParamList`
- Custom floating bottom nav with animation
- Tab switch listener updates `activeTab` state

**Deep Links:**
- Not explicitly configured (no `linking` prop on NavigationContainer)
- Would need setup for `/entity/:id`, `/post/:id`, etc.

**Screen Performance:**
- HomeScreen is large (3313 lines) - consider splitting
- FlatList used for scrollable lists (good)
- `React.memo` used on SearchScreen

**Scroll Issues:**
- Category horizontal ScrollViews in AllCategoriesScreen work properly
- Treemap in Categories has proper height calculation

---

### 7) Security + Privacy

**Secrets Check:**
- ✅ No hardcoded API keys or secrets found in `/src`
- ✅ JWT_SECRET loaded from environment variable
- ✅ Cognito credentials from environment

**Token Storage:**
- ✅ SecureStore for tokens (encrypted on device)
- ✅ AsyncStorage only for non-sensitive data

**Logging:**
- ✅ Production check in error response: `process.env.NODE_ENV !== 'production'`
- ⚠️ Some `console.log` statements in NewsContext for debugging

**TLS:**
- ✅ API Gateway enforces HTTPS
- ✅ Certificate pinning infrastructure exists (disabled by default)
- ✅ SSL pinning config in `security.tsx`

**Screenshot Protection:**
- ✅ `useScreenshotProtection()` hook with blur overlay
- ✅ Used in SimulatorScreen and financial screens

**CORS:**
- ✅ No CORS headers set (mobile-only API, correct approach)

**Recommendations:**
1. Remove debug console.logs before production
2. Enable certificate pinning for production builds
3. Add rate limiting awareness in UI for API calls

---

### 8) Type Safety + Consistency

**TypeScript Usage:**
- ✅ Full TypeScript codebase
- ✅ Types defined in `src/types/index.ts`
- ✅ Navigation types: `RootStackParamList`, `MainTabParamList`

**Zod Validation:**
- ✅ 20+ schemas in `validators/schemas.ts`
- ✅ Response validation with `safeValidate()` and `validateArrayLoose()`
- ✅ Request body validation with specific schemas

**API DTO Alignment:**
- ✅ Transform functions handle backend/frontend field differences (e.g., `postId` → `id`)
- ✅ Consistent pattern: `mapBackendPost()`, `mapBackendGroup()`, etc.

---

### 9) Testing + Build Health

**Tests:**
- ❌ No test files found (no `*.test.ts`, `*.spec.ts`)
- Recommendation: Add Jest tests for contexts and services

**Linting:**
- ⚠️ No `.eslintrc` visible in scan
- Recommendation: Add ESLint + Prettier configuration

**CI/CD:**
- ⚠️ No `.github/workflows` visible
- Recommendation: Add GitHub Actions for lint, test, build

**Error Boundaries:**
- ✅ `ErrorBoundary` component wraps all screens
- ✅ `ErrorFallback` component for graceful error UI
- ✅ `initErrorReporting()` called on app startup

**Crash Reporting:**
- ✅ `errorReporting.ts` service exists
- ⚠️ Need to integrate with service (Sentry, Bugsnag, etc.)

---

## D) "Categories Tab" Spec + Implementation Plan

### Current State
The Categories tab (`AllCategoriesScreen.tsx`) already exists with:
- Treemap view of categories
- List view with sorting
- Browse view with Trending/Movers/Discussed/For You/Discover sections
- Pull-to-refresh
- Infinite scroll via `loadMoreDiscover()`

### UX Outline (Enhanced Design)

```
┌────────────────────────────────────┐
│ Categories                    [🔍] │
├────────────────────────────────────┤
│ [Treemap] [List] [Browse] ◄── tabs │
├────────────────────────────────────┤
│                                    │
│  ┌─── Browse View ───────────────┐ │
│  │ ▼ Pull to refresh             │ │
│  │                               │ │
│  │ 🔥 TRENDING TODAY             │ │
│  │ ┌────┐ ┌────┐ ┌────┐ ──►     │ │
│  │ │ E1 │ │ E2 │ │ E3 │         │ │
│  │ └────┘ └────┘ └────┘         │ │
│  │                               │ │
│  │ 📈 BIGGEST MOVERS             │ │
│  │ ↑ Gainers                     │ │
│  │ ┌────┐ ┌────┐ ──►            │ │
│  │ └────┘ └────┘                │ │
│  │ ↓ Losers                      │ │
│  │ ┌────┐ ┌────┐ ──►            │ │
│  │ └────┘ └────┘                │ │
│  │                               │ │
│  │ 💬 MOST DISCUSSED             │ │
│  │ ┌────┐ ┌────┐ ──►            │ │
│  │ └────┘ └────┘                │ │
│  │                               │ │
│  │ ✨ FOR YOU                    │ │
│  │ ┌────┐ ┌────┐ ──►            │ │
│  │ └────┘ └────┘                │ │
│  │                               │ │
│  │ 🆕 DISCOVER                   │ │
│  │ ┌─────────────────────────┐  │ │
│  │ │ Full-width EntityCard   │  │ │
│  │ │ Sparkline │ %Chg │ Buy  │  │ │
│  │ └─────────────────────────┘  │ │
│  │ ┌─────────────────────────┐  │ │
│  │ │ EntityCard 2            │  │ │
│  │ └─────────────────────────┘  │ │
│  │ ... infinite scroll ...       │ │
│  │                               │ │
│  │ [Loading more...]             │ │
│  └───────────────────────────────┘ │
│                                    │
├────────────────────────────────────┤
│   🏠    📊    🔍    👤    💼      │  ◄── Bottom nav
└────────────────────────────────────┘
```

### Data Requirements

| Section | Endpoint | Query Params |
|---------|----------|--------------|
| Trending Today | GET `/api/categories/trending` | `limit=20` |
| Biggest Movers | GET `/api/categories/movers` | `limit=20` |
| Most Discussed | GET `/api/categories/discussed` | `limit=20` |
| For You | GET `/api/categories/for-you` | `limit=20` (auth required) |
| Discover Feed | GET `/api/categories/discover` | `limit=20&cursor=X` |

**All endpoints already exist in backend!**

### New/Modified Files

**Already Implemented:**
- `src/screens/AllCategoriesScreen.tsx` - Main screen ✅
- `src/hooks/useCategoryData.ts` - Data fetching hook ✅
- `src/components/EntityCard.tsx` - Card component ✅
- `backend/src/handlers/categories.ts` - Backend handlers ✅

**Enhancements Needed:**

1. **Add Skeleton Loaders** - Create `src/components/SkeletonCard.tsx`:
```typescript
// New file: src/components/SkeletonCard.tsx
export const SkeletonEntityCard = ({ variant }: { variant: 'compact' | 'full' }) => {
  // Animated placeholder with shimmer effect
};
```

2. **Enhance EntityCard** - Add quick trade button:
```typescript
// Modify: src/components/EntityCard.tsx
// Add "Quick Buy" button that opens TradeModal directly
```

3. **Add Sparkline to Cards** - Already have `MiniChart.tsx`:
```typescript
// Use existing MiniChart in EntityCard compact variant
```

### Navigation Changes

**No changes needed** - Categories tab already exists in `BottomTabNavigator.tsx` at index 6.

### Reusable Components

| Component | Status | Notes |
|-----------|--------|-------|
| `EntityCard` | ✅ Exists | Has `compact` and `full` variants |
| `MiniChart` | ✅ Exists | Sparkline component |
| `Treemap` | ✅ Exists | Category visualization |
| `CategoryCarousel` | ✅ Exists | Horizontal scroll |
| `SkeletonCard` | ❌ Create | Loading placeholder |

### Implementation Checklist

- [x] Browse view with sections - Done
- [x] Trending Today section - Done
- [x] Biggest Movers (gainers/losers) - Done
- [x] Most Discussed section - Done
- [x] For You section - Done
- [x] Discover infinite scroll - Done
- [x] Pull-to-refresh - Done
- [x] EntityCard component - Done
- [ ] Add skeleton loaders during loading
- [ ] Add quick trade button to EntityCard
- [ ] Replace hardcoded categoryTradeVolumes with API data
- [ ] Add sentiment indicator (colored dot) to cards

---

## E) Backend Gap Analysis

### Existing Endpoints (Verified in Code)

| Endpoint | Handler File | Status |
|----------|--------------|--------|
| POST `/api/trade/execute` | `trading.ts` | ✅ Complete |
| GET `/api/portfolio` | `trading.ts` | ✅ Complete |
| GET `/api/transactions` | `trading.ts` | ✅ Complete |
| GET `/api/entities` | `trading.ts` | ✅ Complete |
| GET `/api/prices` | `trading.ts` | ✅ Complete |
| GET `/api/social/feed` | `social.ts` | ✅ Complete |
| POST `/api/social/posts` | `social.ts` | ✅ Complete |
| POST `/api/social/posts/:id/comments` | `social.ts` | ✅ Complete |
| POST `/api/social/users/:id/follow` | `social.ts` | ✅ Complete |
| GET `/api/news` | `news.ts` | ⚠️ Needs real data |
| GET `/api/search` | `search.ts` | ✅ Complete |
| GET `/api/watchlist` | `watchlist.ts` | ✅ Complete |
| GET `/api/notifications` | `notifications.ts` | ✅ Complete |
| GET `/api/categories/*` | `categories.ts` | ✅ Complete |
| GET `/api/leaderboard` | `leaderboard.ts` | ✅ Complete |

### DynamoDB Tables (from code analysis)

| Table | Primary Key | Sort Key | Purpose |
|-------|-------------|----------|---------|
| Users | userId | - | User profiles, cash balance |
| Portfolios | userId | entityId | Holdings |
| Transactions | userId | timestamp | Trade history |
| Entities | entityId | - | Tradeable entities |
| PriceHistory | entityId | timestamp | Price time series |
| Posts | userId | timestamp | Social posts |
| Comments | postId | commentId | Post comments |
| Follows | followerId | followeeId | Follow graph |
| Groups | groupId | - | Group metadata |
| GroupMembers | groupId | userId | Group membership |
| News | category | publishedAt | News articles |
| Notifications | userId | createdAt | User notifications |
| Watchlist | userId | entityId | User watchlists |

### Missing/Needed Enhancements

#### 1. Real News Provider Integration

**Request:**
```json
GET /api/news?entityId=21&limit=10

// Internal flow:
// 1. Query NewsAPI/Finnhub for entity name
// 2. Run sentiment analysis
// 3. Store in DynamoDB
// 4. Return to client
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "news-123",
      "title": "Taylor Swift Breaks Tour Records",
      "summary": "...",
      "content": "...",
      "source": "Billboard",
      "publishedAt": "2025-01-15T10:00:00Z",
      "entityId": 21,
      "entityName": "Taylor Swift",
      "sentiment": "positive",
      "sentimentScore": 85,
      "impactLevel": "high"
    }
  ]
}
```

#### 2. Price Update Formula

**File:** `backend/src/handlers/priceUpdates.ts`

```typescript
// TODO: Implement price formula
// Factors:
// - Trade volume (buy pressure vs sell pressure)
// - News sentiment scores
// - Social buzz (post/comment counts)
// - Random walk component
// - Mean reversion

export function calculateNewPrice(
  currentPrice: number,
  buyVolume: number,
  sellVolume: number,
  sentimentScore: number,
  socialScore: number
): number {
  const volumePressure = (buyVolume - sellVolume) / (buyVolume + sellVolume + 1);
  const sentimentFactor = sentimentScore / 100 * 0.02; // Max 2% from sentiment
  const socialFactor = Math.min(socialScore / 1000, 0.01); // Max 1% from social
  const randomWalk = (Math.random() - 0.5) * 0.005; // ±0.25% random
  
  const changePercent = volumePressure * 0.03 + sentimentFactor + socialFactor + randomWalk;
  return currentPrice * (1 + changePercent);
}
```

#### 3. Push Notifications

**Needed:**
- POST `/api/notifications/register-push` - Register device token
- Integration with AWS SNS or Firebase Cloud Messaging
- Trigger notifications for: trades, follows, comments, price alerts

---

## F) Top 10 Code Improvements

### 1. **Add Real News Provider** (HIGH IMPACT)
**Current:** Falls back to mock news
**Fix:** Integrate NewsAPI, Finnhub, or Alpha Vantage
**Files:** `backend/src/services/newsApiService.ts`
**Effort:** M

### 2. **Implement Price Formula** (HIGH IMPACT)
**Current:** TODO comment in backend
**Fix:** Implement volume/sentiment-based pricing
**Files:** `backend/src/handlers/priceUpdates.ts`
**Effort:** M

### 3. **Add Unit Tests** (HIGH IMPACT)
**Current:** No tests
**Fix:** Add Jest tests for contexts, services, validators
**Files:** Create `__tests__/` folders
**Effort:** L

### 4. **Replace Hardcoded Category Data** (MEDIUM IMPACT)
**Current:** `categoryTradeVolumes` is hardcoded
**Fix:** Fetch from `/api/categories/volumes` endpoint
**Files:** `AllCategoriesScreen.tsx`, create `categories.ts` handler
**Effort:** S

### 5. **Add Skeleton Loaders** (MEDIUM IMPACT - UX)
**Current:** Loading spinners or empty states
**Fix:** Create shimmer skeletons for cards
**Files:** Create `SkeletonCard.tsx`
**Effort:** S

### 6. **Split Large Screens** (MEDIUM IMPACT - Maintainability)
**Current:** `HomeScreen.tsx` is 3313 lines
**Fix:** Extract sections into components
**Files:** `HomeScreen.tsx` → `HomeHeader.tsx`, `HomeTrending.tsx`, etc.
**Effort:** M

### 7. **Add Push Notifications** (MEDIUM IMPACT)
**Current:** Only polling every 30s
**Fix:** Integrate FCM/APNs via Expo Notifications
**Files:** `notificationService.ts`, backend SNS integration
**Effort:** M

### 8. **Enable Certificate Pinning for Production** (SECURITY)
**Current:** Disabled (`CERTIFICATE_PINNING_ENABLED = false`)
**Fix:** Generate pins and enable for release builds
**Files:** `security.tsx`
**Effort:** S

### 9. **Remove Console Logs** (SECURITY/CLEANUP)
**Current:** Debug logs in NewsContext, etc.
**Fix:** Remove or guard with `__DEV__`
**Files:** Multiple
**Effort:** S

### 10. **Add Error Analytics** (RELIABILITY)
**Current:** `errorReporting.ts` exists but not integrated
**Fix:** Connect to Sentry/Bugsnag
**Files:** `errorReporting.ts`, `App.tsx`
**Effort:** S

---
