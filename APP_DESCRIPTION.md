# Moro Mobile App - Complete Technical Documentation

## Overview

**Moro** is a React Native mobile application built with Expo that functions as a social prediction market platform. Users trade "confidence tokens" in real-world entities (influencers, startups, political figures, artists, etc.) rather than traditional stocks. The app combines trading mechanics with social features, allowing users to follow traders, post insights, join groups, and compete in seasonal competitions.

**Tech Stack:**
- React Native 0.81.5 with Expo ~54.0
- TypeScript 5.9
- React Navigation (Stack + Bottom Tabs)
- Context API for state management
- AsyncStorage for local persistence
- Optional AWS serverless backend (app works standalone)

---

## Core Architecture

### App Entry Point (`App.tsx`)

The app uses a nested provider structure wrapping the entire application:
1. **SafeAreaProvider** - Handles safe area insets
2. **ThemeProvider** - Manages dark/light theme
3. **AuthProvider** - Handles authentication state
4. **SocialProvider** - Manages posts, comments, groups, follows
5. **NewsProvider** - Manages news articles and sentiment
6. **TradingProvider** - Core trading logic and portfolio management
7. **WatchlistProvider** - User watchlists and price alerts
8. **SideMenuProvider** - Side menu visibility state

**Navigation Structure:**
- **Unauthenticated Stack**: Welcome → Login → Signup
- **Authenticated Stack**: Main (Bottom Tabs) + Modal Screens (Entity, Search, Settings, etc.)

The bottom tab navigator contains 9 tabs: Home, News, Community, Groups, Portfolio, Watchlist, Categories, SeasonalCompetition, Profile. The default tab bar is hidden and replaced with a custom `FloatingBottomNav` component.

---

## Trading System

### Price Calculation Algorithm (`src/utils/sentimentTrading.ts`)

The app uses a sentiment-based pricing model:

**Formula:**
```
Price = BASE_PRICE × (P + EPSILON) / (N + EPSILON)
```

Where:
- `BASE_PRICE = 100` (starting price for all entities)
- `EPSILON = 10,000` (prevents division by zero and provides price stability)
- `P = positiveTokens` (tokens committed to positive direction)
- `N = negativeTokens` (tokens committed to negative direction)

**How it works:**
- All entities start at price 100 (when P=0, N=0, ratio = 1.0)
- Users commit tokens to either "positive" or "negative" pools
- Adding tokens to positive pool increases price (more positive sentiment)
- Adding tokens to negative pool decreases price (more negative sentiment)
- The ratio `(P + EPSILON) / (N + EPSILON)` determines the price multiplier
- Prices update in real-time as trades occur

### Trading Context (`src/context/TradingContext.tsx`)

**State Management:**
- `entityPools`: Tracks positive/negative token pools for each entity
- `entityPrices`: Current calculated price for each entity
- `userPositions`: User's open positions (direction + tranches)
- `cashBalance`: User's available tokens (starts at $10,000)
- `holdings`: Legacy holdings array (for compatibility)
- `transactions`: All trade history
- `entityHighLow`: Daily high/low prices (resets at midnight)

**Key Functions:**

1. **`openPosition()`** - Opens a new position or adds to existing:
   - Calculates `entryRatio` BEFORE adding tokens (current sentiment ratio)
   - Adds tokens to appropriate pool (positive or negative)
   - Creates/updates position with tranche tracking
   - Each "add" creates a new tranche with its own entry ratio
   - Updates price immediately using new pool values
   - Deducts tokens from cash balance

2. **`closePosition()`** - Closes entire position:
   - Removes ALL user tokens from pools FIRST
   - Calculates `exitRatio` AFTER removal (pool state without user's tokens)
   - Uses reverse simulation to calculate P&L per tranche:
     - Works backwards from exit state
     - Determines effective exit ratio for each tranche
     - Ensures total P&L = 0 when no external trades occur
   - Returns tokens + P&L to cash balance
   - Deletes position from state

3. **`getPositionOpenPnL()`** - Calculates unrealized P&L for open position:
   - Uses same reverse simulation logic as closing
   - Updates in real-time as prices change
   - Returns current profit/loss without closing

4. **`getEntityPrice()`** - Gets current price for entity:
   - Calculates from current pools in real-time
   - Always returns fresh price (not cached)

5. **`getAllEntityPrices()`** - Returns all entity prices as record

**Multi-Tranche Position Logic:**
- Users can add to positions multiple times
- Each addition is a separate "tranche" with its own entry ratio
- When closing, P&L is calculated per tranche and summed
- Critical rule: `exitRatio` is ALWAYS calculated AFTER removing all user tokens
- This ensures users get back exactly what they put in when no external trades occur

**Price Updates:**
- Prices recalculate automatically when pools change
- High/low prices track daily extremes (reset at midnight)
- Volume = sum of positiveTokens + negativeTokens

---

## Screen-by-Screen Breakdown

### 1. WelcomeScreen (`src/screens/WelcomeScreen.tsx`)
**Purpose:** First screen shown to unauthenticated users
**Features:**
- App branding and logo
- "Get Started" button → navigates to Login
- "Skip Auth" button (dev only) → creates mock user
**Why:** Introduces the app and provides entry point

### 2. LoginScreen (`src/screens/LoginScreen.tsx`)
**Purpose:** User authentication
**Features:**
- Email/password login
- Google OAuth button
- Apple Sign-In button
- "Sign Up" link → navigates to SignupScreen
**How:** Uses `AuthContext.login()`, `loginWithGoogle()`, `loginWithApple()`

### 3. SignupScreen (`src/screens/SignupScreen.tsx`)
**Purpose:** New user registration
**Features:**
- Email, password, username, display name fields
- Validation and error handling
- OAuth options (Google/Apple)
**How:** Uses `AuthContext.signup()`

### 4. HomeScreen (`src/screens/HomeScreen.tsx`)
**Purpose:** Main dashboard showing market overview
**Features:**
- **Portfolio Summary Card**: Total value, today's change, cash balance
- **Swipeable Sections** (6 pages):
  1. **For You**: Personalized trending entities
  2. **Category Carousels**: Influencers, Political Figures, Startups, etc.
  3. **Trending Entities**: Top gainers/losers
  4. **Open Positions Module**: Shows user's open positions with current price and P&L
  5. **Watchlist Module**: Entities user is watching
  6. **Recent Activity**: Social feed posts
- **Category Filtering**: Users can customize which categories appear
- **Trade Modal**: Opens when user taps "Predict" on any entity
**How:** 
- Uses `useTrading()` for portfolio and prices
- Uses `useWatchlist()` for watchlist items
- Uses `useSocial()` for activity feed
- Calculates top movers from `getAllEntityPrices()`
- Real-time price updates via `useEffect` watching `entityPrices`

### 5. EntityScreen (`src/screens/EntityScreen.tsx`)
**Purpose:** Detailed view of a single entity
**Features:**
- **Price Chart**: Interactive SVG chart showing price history (currently static at 100)
- **Price Stats**: Current price, 24h change, high/low, volume
- **Trade Button**: Opens TradeModal
- **Briefcase Button**: Opens modal showing user's position details:
  - Direction (positive/negative)
  - Total tokens committed
  - Current price
  - Open P&L (real-time)
- **News Section**: News articles related to entity
- **Social Feed**: Posts about this entity
- **Create Post Button**: Allows posting about entity
**How:**
- Receives `entityId` and `categoryId` from navigation params
- Uses `getEntityById()` to fetch entity data
- Uses `getPosition()` and `getPositionOpenPnL()` for position info
- Uses `useNews()` for entity-specific news
- Uses `useSocial()` for entity posts

### 6. TradeModal (`src/components/TradeModal.tsx`)
**Purpose:** Interface for opening/closing positions
**Features:**
- **Two Tabs**: "Open/Add" and "Close"
- **Default Tab Logic**: If position exists, defaults to "Add to Position" tab
- **Direction Buttons**: Green (positive) / Red (negative) - only these are colored
- **Tab Buttons**: Grey background (not green/red)
- **Token Input**: User enters amount to commit
- **Quick Buttons**: 25%, 50%, 75%, 100% of max
- **Current Price Display**: Shows live price
- **Open P&L Display** (Close tab): Shows unrealized P&L, updates every second
- **Summary Section**: Shows trade details before execution
**How:**
- Uses `openPosition()` or `closePosition()` from TradingContext
- Validates sufficient funds before opening
- Shows success/error alerts
- Closes modal on successful trade

### 7. PortfolioScreen (`src/screens/PortfolioScreen.tsx`)
**Purpose:** View holdings and transaction history
**Features:**
- **Portfolio Value Card**: Total value, today's change
- **Cash Balance Card**: Available cash, invested amount
- **Two Tabs**: Holdings / History
- **Holdings List**: Shows all open positions with:
  - Entity name/ticker
  - Current price
  - P&L (color-coded)
  - Total value
- **Transaction History**: Chronological list of all trades:
  - Type (open/close)
  - Direction (positive/negative) for opens
  - Tokens committed
  - Price per token (entry/exit ratio)
  - P&L for closes
  - Timestamp
- **Screenshot Protection**: Blurs screen when screenshot detected
**How:**
- Uses `portfolio` and `transactions` from TradingContext
- Formats currency using `formatCurrency()`
- Navigates to EntityScreen when holding is tapped

### 8. WatchlistScreen (`src/screens/WatchlistScreen.tsx`)
**Purpose:** Manage watched entities and price alerts
**Features:**
- **Watchlist Items**: List of entities user is watching
- **Price Display**: Current price, 24h change (starts at 0%, updates with real prices)
- **Add/Remove**: Add entities to watchlist
- **Price Alerts**: Set alerts for price thresholds
- **Sorting Options**: By name, price, change, date added
**How:**
- Uses `WatchlistContext` for watchlist state
- Updates prices every 5 seconds via `useEffect`
- Stores watchlist in AsyncStorage
- Calculates change from `BASE_PRICE` (100) for consistency

### 9. SearchScreen (`src/screens/SearchScreen.tsx`)
**Purpose:** Search and filter entities
**Features:**
- **Search Bar**: Filter entities by name/ticker
- **Category Filters**: Filter by category
- **Entity Cards**: Show price, change, volume
- **Price Movement**: All entities start at 0% change, update with real prices
**How:**
- Uses `MOCK_ENTITIES` as data source
- Calculates `change24h` and `changePercent24h` from `BASE_PRICE`
- Uses `getEntityPrice()` for current prices
- Navigates to EntityScreen on tap

### 10. NewsScreen (`src/screens/NewsScreen.tsx`)
**Purpose:** Browse news articles
**Features:**
- **Breaking News Banner**: Top breaking stories
- **Category Filters**: Tech, Politics, Events, People, General
- **Sentiment Filters**: Positive, Negative, Neutral
- **Article Cards**: Title, summary, source, sentiment, impact level
- **Entity Links**: Articles linked to entities
**How:**
- Uses `NewsContext` for news data
- Mock news generated in `NewsContext.tsx`
- Filters by category, sentiment, entity
- Navigates to NewsDetailScreen on tap

### 11. CommunityScreen (`src/screens/CommunityScreen.tsx`)
**Purpose:** Social feed with posts and comments
**Features:**
- **Feed Tabs**: Trending, Following, Category, Entity
- **Post Cards**: User avatar, content, entity mentions, sentiment, likes, comments
- **Clickable Users**: Tap user avatar/name → navigates to UserProfileScreen
- **Comment Section**: Expandable comments with replies
- **Create Post Button**: Opens CreatePostModal
- **Like/Bookmark**: Toggle interactions
**How:**
- Uses `SocialContext` for feed data
- `refreshActivityFeed()` fetches posts
- `PostCard` component handles rendering
- `CommentSection` component handles comments
- Clickable user profiles via `TouchableOpacity` → `navigation.navigate('UserProfile', { userId })`

### 12. GroupsScreen (`src/screens/GroupsScreen.tsx`)
**Purpose:** Browse and manage groups
**Features:**
- **My Groups**: Groups user has joined
- **Recommended Groups**: Suggested groups
- **Group Cards**: Name, description, member count, location
- **Create Group Button**: Opens CreateGroupScreen
- **Join/Leave**: Toggle membership
**How:**
- Uses `SocialContext.groups` and `myGroups`
- `joinGroup()` and `leaveGroup()` update membership
- Navigates to GroupDetailScreen on tap

### 13. GroupDetailScreen (`src/screens/GroupDetailScreen.tsx`)
**Purpose:** View group details and members
**Features:**
- **Group Info**: Name, description, member count, location
- **Join Group Button**: Visible if user hasn't joined (at top)
- **Members List**: Shows all group members
- **Clickable Members**: Tap member → navigates to UserProfileScreen
- **Posts Feed**: Posts from group members
**How:**
- Uses `SocialContext` for group data
- `joinGroup()` adds user to members list immediately
- Member avatars/names are `TouchableOpacity` → `navigation.navigate('UserProfile', { userId })`

### 14. ProfileScreen (`src/screens/ProfileScreen.tsx`)
**Purpose:** User's own profile
**Features:**
- **Profile Header**: Avatar, display name, username, bio
- **Stats**: Posts count, followers, following, groups, account value
- **Account Value Toggle**: Show/hide account value
- **Edit Profile Button**: Navigates to EditProfileScreen
- **Settings Button**: Navigates to SettingsScreen
- **Posts Feed**: User's own posts
- **Create Post Button**: Opens CreatePostModal
**How:**
- Uses `useAuth()` for user data
- Uses `useSocial()` for posts and stats
- Uses `useTrading()` for portfolio value
- Stores account value visibility in AsyncStorage

### 15. UserProfileScreen (`src/screens/UserProfileScreen.tsx`)
**Purpose:** View another user's profile (read-only)
**Features:**
- **Profile Header**: Avatar, display name, username, bio
- **Stats**: Posts count, followers, following, groups, account value (if visible)
- **Follow Button**: Toggle follow/unfollow
- **Posts Feed**: User's posts
- **Back Button**: Returns to previous screen
**How:**
- Receives `userId` from navigation params
- Uses `useSocial()` to fetch user data
- Uses `checkMutualFollow()` for follow status
- Read-only (no edit buttons)

### 16. SettingsScreen (`src/screens/SettingsScreen.tsx`)
**Purpose:** App settings and preferences
**Features:**
- **Account Settings**: Edit profile, privacy settings
- **Trading Preferences**: Trading-related settings
- **Notifications**: Notification preferences
- **Theme Toggle**: Dark/light mode
- **Logout Button**: Signs user out
**How:**
- Uses `ThemeContext` for theme switching
- Uses `AuthContext.logout()` for sign out
- Navigates to various settings sub-screens

### 17. CreateAlertScreen (`src/screens/CreateAlertScreen.tsx`)
**Purpose:** Set price alerts for entities
**Features:**
- **Entity Info**: Shows entity name, ticker, current price, 24h change
- **Alert Type**: Above/Below target price
- **Target Price Input**: User sets threshold
- **Active Toggle**: Enable/disable alert
**How:**
- Receives entity data from navigation params
- Uses `WatchlistContext.addPriceAlert()`
- Removed fake toggle button (was hardcoded, non-functional)

### 18. TradeHistoryScreen (`src/screens/TradeHistoryScreen.tsx`)
**Purpose:** Detailed transaction history
**Features:**
- **Filter Options**: By entity, date range, type
- **Transaction List**: Detailed view of all trades
- **Export Option**: Export history (future feature)
**How:**
- Uses `transactions` from TradingContext
- Filters and sorts transactions
- Shows full trade details

### 19. CategoryScreen (`src/screens/CategoryScreen.tsx`)
**Purpose:** Browse entities by category
**Features:**
- **Category Header**: Category name and description
- **Entity List**: All entities in category
- **Entity Cards**: Price, change, volume
- **Sort/Filter**: Sort by price, change, volume
**How:**
- Receives `categoryId` from navigation params
- Uses `getEntitiesByCategory()` from mockEntities
- Uses `getEntityPrice()` for current prices
- Navigates to EntityScreen on tap

### 20. AllCategoriesScreen (`src/screens/AllCategoriesScreen.tsx`)
**Purpose:** Browse all categories with treemap visualization
**Features:**
- **Treemap Chart**: Visual representation of category volumes
- **Category Cards**: Each category with entity count
- **Navigation**: Tap category → CategoryScreen
**How:**
- Uses `getCategoryVolumes()` from TradingContext
- Calculates category percentages from transaction volumes
- Renders treemap using SVG

---

## Context Providers Deep Dive

### AuthContext (`src/context/AuthContext.tsx`)
**Purpose:** Manage user authentication state
**State:**
- `user`: Current user object (id, email, username, displayName, avatarUrl, bio)
- `token`: JWT access token
- `isAuthenticated`: Boolean derived from user && token
- `isLoading`: Initial auth check in progress

**Key Functions:**
- `login()`: Email/password login
- `signup()`: Create new account
- `logout()`: Clear auth data
- `loginWithGoogle()`: OAuth with Google
- `loginWithApple()`: OAuth with Apple
- `tryRefreshToken()`: Refresh JWT before expiry
- `skipAuth()`: Dev mode - create mock user

**Storage:**
- Tokens stored in `expo-secure-store` (encrypted)
- User profile in `AsyncStorage` (not sensitive)

### SocialContext (`src/context/SocialContext.tsx`)
**Purpose:** Manage social features (posts, comments, groups, follows)
**State:**
- `activityFeed`: Array of posts
- `postComments`: Record of postId → comments[]
- `groups`: Array of groups
- `followedUsers`: Set of followed user IDs
- `followers`: Array of follower users
- `following`: Array of following users

**Key Functions:**
- `createPost()`: Create new post
- `toggleLikePost()`: Like/unlike post
- `addComment()`: Add comment to post
- `toggleFollowUser()`: Follow/unfollow user
- `createGroup()`: Create new group
- `joinGroup()`: Join group
- `refreshActivityFeed()`: Fetch latest posts

**Backend Integration:**
- Falls back to mock data if backend not configured
- Uses `authenticatedRequest()` for API calls
- Mock posts defined in context for offline use

### NewsContext (`src/context/NewsContext.tsx`)
**Purpose:** Manage news articles and sentiment
**State:**
- `news`: Array of news articles
- `breakingNews`: Filtered breaking news
- `isLoadingNews`: Loading state

**Key Functions:**
- `refreshNews()`: Fetch latest news
- `getNewsByEntity()`: Filter news by entity
- `getNewsByFilter()`: Filter by category, sentiment, impact

**Mock Data:**
- Generates mock news articles for entities
- Includes sentiment scores (-100 to 100)
- Impact levels: low, medium, high, critical

### WatchlistContext (`src/context/WatchlistContext.tsx`)
**Purpose:** Manage watchlist and price alerts
**State:**
- `watchlist`: Array of watched entities
- `priceAlerts`: Array of price alerts

**Key Functions:**
- `addToWatchlist()`: Add entity to watchlist
- `removeFromWatchlist()`: Remove entity
- `addPriceAlert()`: Create price alert
- `checkPriceAlerts()`: Check if alerts triggered

**Storage:**
- Watchlist stored in AsyncStorage
- Price alerts stored in AsyncStorage
- Updates prices every 5 seconds
- Calculates change from `BASE_PRICE` (100)

### ThemeContext (`src/context/ThemeContext.tsx`)
**Purpose:** Manage app theme (dark/light mode)
**State:**
- `theme`: Theme object with colors
- `isDarkMode`: Boolean

**Key Functions:**
- `toggleTheme()`: Switch dark/light mode

**Theme Colors:**
- `background`: Main background
- `backgroundSecondary`: Secondary background
- `card`: Card background
- `text`: Primary text
- `textSecondary`: Secondary text
- `primary`: Brand color
- `success`: Green (positive)
- `error`: Red (negative)

---

## Key Components

### TradeModal (`src/components/TradeModal.tsx`)
**Purpose:** Trading interface
**Features:**
- Two tabs: Open/Add and Close
- Direction buttons (positive/negative)
- Token input with quick percentage buttons
- Real-time price display
- Open P&L display (close tab)
- Summary before execution

### PostCard (`src/components/PostCard.tsx`)
**Purpose:** Render individual post
**Features:**
- User avatar and name (clickable → UserProfileScreen)
- Post content with entity mentions
- Sentiment indicator
- Like/comment counts
- Like and bookmark buttons
- Expandable comments

### CommentSection (`src/components/CommentSection.tsx`)
**Purpose:** Display and manage comments
**Features:**
- Comment list with avatars
- Clickable usernames (→ UserProfileScreen)
- Reply-to functionality
- Like comments
- Add new comment

### FloatingBottomNav (`src/components/FloatingBottomNav.tsx`)
**Purpose:** Custom bottom navigation bar
**Features:**
- 9 tab buttons: Search, Home, Portfolio, Watchlist, Categories, Community, SeasonalCompetition, Profile
- Active tab highlighting
- Navigates to appropriate screen
- Replaces default React Navigation tab bar

### SideMenu (`src/components/SideMenu.tsx`)
**Purpose:** Slide-out side menu
**Features:**
- User profile summary
- Quick navigation links
- Settings access
- Logout button

---

## Data Flow

### Trading Flow:
1. User opens TradeModal from EntityScreen or HomeScreen
2. User selects direction (positive/negative) and enters tokens
3. TradeModal calls `openPosition()` or `closePosition()`
4. TradingContext updates `entityPools` (adds/removes tokens)
5. TradingContext recalculates `entityPrices` from pools
6. Price updates propagate to all screens via `getEntityPrice()`
7. UI updates automatically (React reactivity)

### Social Flow:
1. User creates post via CreatePostModal
2. `createPost()` called in SocialContext
3. Post added to `activityFeed` state
4. Post appears in CommunityScreen feed
5. Other users can like/comment
6. Comments stored in `postComments` record

### Price Update Flow:
1. Trade executed → `entityPools` updated
2. `useEffect` in TradingContext recalculates prices
3. `entityPrices` state updated
4. All screens using `getEntityPrice()` receive new price
5. WatchlistContext updates watchlist item prices every 5 seconds
6. HomeScreen recalculates top movers
7. EntityScreen updates chart and stats

---

## Backend Integration

**Optional Backend:**
- App works fully standalone (no backend required)
- Backend configured via `EXPO_PUBLIC_API_URL` environment variable
- `isBackendConfigured()` checks if URL is set and not localhost

**API Endpoints Used:**
- `/api/auth/*` - Authentication
- `/api/trade/execute` - Execute trades
- `/api/portfolio` - Get portfolio
- `/api/transactions` - Get transaction history
- `/api/entities` - Get entity data
- `/api/social/*` - Social features
- `/api/news` - News articles

**Error Handling:**
- Graceful fallback to mock data if backend unavailable
- Silent error handling (doesn't crash app)
- User-friendly error messages

---

## Key Algorithms

### P&L Calculation (Multi-Tranche):
1. Remove ALL user tokens from pools (restore original state)
2. Calculate `exitRatio` from pools without user tokens
3. Reverse simulate: Work backwards from exit state
4. For each tranche (last to first):
   - Calculate effective exit ratio (pool state when this tranche exits)
   - P&L = tokensCommitted × (effectiveExitRatio - entryRatio)
   - Adjust for direction (flip if negative)
   - Re-add tranche tokens to simulated pool
5. Sum all tranche P&L values
6. Return tokens + total P&L

**Why Reverse Simulation:**
- Ensures each tranche's P&L is calculated from correct pool state
- Accounts for impact of previous tranches
- Guarantees total P&L = 0 when no external trades occur

### Price Calculation:
1. Get current pools: `P` (positiveTokens), `N` (negativeTokens)
2. Calculate ratio: `R = (P + EPSILON) / (N + EPSILON)`
3. Calculate price: `Price = BASE_PRICE × R`
4. Update `entityPrices` state
5. All screens reactively update

---

## State Management Patterns

**Context API:**
- Global state in Context providers
- Local state in components (useState)
- Derived state via useMemo/useCallback

**Data Flow:**
- Unidirectional: Context → Components
- Updates via Context functions
- Reactive via React hooks

**Caching:**
- AsyncStorage for watchlist, alerts
- SecureStore for tokens
- In-memory state for prices, portfolio

---

## Navigation Structure

**Stack Navigator (Root):**
- Welcome, Login, Signup (unauthenticated)
- Main (Bottom Tabs) + Modal Screens (authenticated)

**Bottom Tab Navigator:**
- Home, News, Community, Groups, Portfolio, Watchlist, Categories, SeasonalCompetition, Profile

**Modal Screens:**
- Entity, Search, Settings, GroupDetail, UserProfile, NewsDetail, Notifications, CreateAlert, TradeHistory, etc.

**Navigation Params:**
- Type-safe via `RootStackParamList` and `MainTabParamList`
- EntityScreen: `{ entityId: number, categoryId: string }`
- UserProfileScreen: `{ userId: string }`
- GroupDetailScreen: `{ groupId: string }`

---

## Mock Data

**Entities (`src/utils/mockEntities.ts`):**
- Centralized list of all entities
- Includes: id, ticker, name, category, basePrice, description
- Categories: Influencers, Political Figures, Startups, Music Artists, Sports, etc.

**Why Mock Data:**
- App works without backend
- Consistent data across screens
- Easy to test and develop

---

## Security Features

**Authentication:**
- JWT tokens stored in SecureStore (encrypted)
- Token refresh before expiry
- OAuth support (Google, Apple)

**API Security:**
- Optional certificate pinning (requires custom dev client)
- HTTPS/TLS enforced
- Token-based authentication

**Screenshot Protection:**
- Blurs sensitive screens (PortfolioScreen)
- Uses `react-native-screenshot-prevent`

---

## Real-Time Updates

**Price Updates:**
- Recalculate on every pool change
- Update every 5 seconds (watchlist)
- Update on trade execution
- Reactive via React hooks

**P&L Updates:**
- Recalculate on price change
- Update every second in TradeModal (close tab)
- Update in EntityScreen position modal

**Feed Updates:**
- Pull-to-refresh in CommunityScreen
- Auto-refresh on post creation
- Background refresh (future: WebSocket)

---

## Key Design Decisions

1. **Sentiment-Based Pricing**: Uses positive/negative pools instead of traditional order book
2. **Multi-Tranche Positions**: Users can add to positions multiple times, each tracked separately
3. **Exit Ratio After Removal**: Critical for accurate P&L - exit ratio calculated after removing user tokens
4. **Standalone Mode**: App works without backend using mock data
5. **Real-Time Price Updates**: Prices update immediately on trade, no polling delay
6. **Clickable User Profiles**: All user avatars/names navigate to UserProfileScreen
7. **Consistent Price Movement**: All entities start at 0% change from BASE_PRICE (100)

---

## Future Enhancements (Not Yet Implemented)

- WebSocket for real-time price updates
- Push notifications for price alerts
- Advanced order types (limit, stop-loss)
- Portfolio analytics dashboard
- Social trading (copy trades)
- Achievement system
- Premium subscription tier
- Web version

---

This documentation provides a complete understanding of the Moro mobile app architecture, features, and implementation details. Each screen, context, and component is explained with its purpose, features, and how it works within the overall system.
