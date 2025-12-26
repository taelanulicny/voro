<p align="center">
  <img src="./assets/icon.png" alt="Moro Logo" width="120" height="120" style="border-radius: 24px;" />
</p>

<h1 align="center">Moro</h1>

<p align="center">
  <strong>Trade Confidence in Ideas, People & Trends</strong>
</p>

<p align="center">
  A social prediction market mobile app where you trade "confidence tokens" in entities—influencers, startups, political figures, artists, and more. Watch your portfolio grow as real-world events unfold.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.81.5-61DAFB?style=flat-square&logo=react" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-54.0-000020?style=flat-square&logo=expo" alt="Expo" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/AWS-Serverless-FF9900?style=flat-square&logo=amazon-aws" alt="AWS" />
</p>

---

## 📖 Overview

**Moro** is a prediction market platform reimagined as a social experience. Instead of traditional stocks, users trade confidence tokens tied to real-world entities—from tech entrepreneurs to music artists, political figures to emerging startups.

Think of it as a stock market for reputation and cultural relevance:
- 📈 **Buy tokens** when you believe in someone's potential
- 📉 **Sell tokens** when you sense a decline
- 🏆 **Compete** in seasonal competitions for top trader status
- 💬 **Connect** with a community of like-minded traders

---

## ✨ Features

### 🎯 Trading System
- **Buy/Sell confidence tokens** with an intuitive trade modal
- **Real-time price updates** with 24h change indicators
- **Interactive price charts** powered by react-native-chart-kit
- **Quick trade buttons** (25%, 50%, 75%, 100% of max)
- **P&L tracking** with detailed profit/loss calculations

### 💼 Portfolio Management
- **Track holdings** with real-time valuations
- **Transaction history** with complete trade records
- **Performance metrics** including today's change
- **Cash balance** management ($10,000 starting balance)

### 📱 Entity Categories
| Category | Description |
|----------|-------------|
| **Influencers** | Social media personalities & content creators |
| **Music Artists** | Musicians, bands, and producers |
| **Sports** | Athletes and sports personalities |
| **Political Figures** | Politicians and government officials |
| **Startups** | Emerging companies and tech ventures |

### 📰 News Feed
- **Breaking news alerts** with impact levels
- **Sentiment analysis** (positive/neutral/negative)
- **Entity-linked articles** affecting token prices
- **Category filtering** for personalized feeds

### 👥 Social Features
- **Activity feed** with posts from followed traders
- **Comments & likes** on trading insights
- **Follow system** to track successful traders
- **Groups** for community discussions
- **User profiles** with trading statistics

### 📊 Additional Features
- **Watchlist** with price alerts
- **Seasonal competitions** with leaderboards
- **Search** across entities and users
- **Dark/Light themes** for preference
- **Push notifications** for price movements

---

## 🏗️ Architecture

```
moro/
├── 📱 Mobile App (React Native + Expo)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── screens/        # App screens
│   │   ├── context/        # React Context providers
│   │   ├── navigation/     # Navigation configuration
│   │   ├── services/       # API service layer
│   │   ├── types/          # TypeScript definitions
│   │   └── utils/          # Helper functions
│   └── assets/             # Images and static files
│
└── ☁️ Backend (AWS Serverless)
    ├── src/
    │   ├── handlers/       # Lambda function handlers
    │   ├── services/       # Business logic
    │   ├── models/         # Data models
    │   ├── middleware/     # Auth & validation
    │   └── utils/          # Utilities
    └── infrastructure/     # AWS CDK definitions
```

---

## 🛠️ Tech Stack

### Mobile App
| Technology | Purpose |
|------------|---------|
| **React Native** | Cross-platform mobile framework |
| **Expo** | Development & build toolchain |
| **TypeScript** | Type-safe JavaScript |
| **React Navigation** | Screen navigation |
| **AsyncStorage** | Local data persistence |
| **react-native-chart-kit** | Price charts |
| **react-native-svg** | Vector graphics |

### Backend
| Technology | Purpose |
|------------|---------|
| **AWS Lambda** | Serverless compute |
| **API Gateway** | REST API endpoints |
| **DynamoDB** | NoSQL database |
| **Cognito** | User authentication |
| **S3** | Asset storage |
| **EventBridge** | Scheduled price updates |
| **AWS CDK** | Infrastructure as code |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+
- **npm** or **yarn**
- **Expo CLI** (`npm install -g expo-cli`)
- **iOS Simulator** or **Android Emulator** (or physical device)
- **AWS CLI** (for backend deployment)
- **AWS CDK** (`npm install -g aws-cdk`)

### Mobile App Setup

```bash
# Clone the repository
git clone https://github.com/your-org/moro.git
cd moro

# Install dependencies
npm install

# Start the development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Build TypeScript
npm run build

# Deploy to AWS (requires configured AWS CLI)
npm run deploy

# Seed the database with entities
npm run seed
```

### Environment Configuration

Create a `.env` file in the backend directory:

```env
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=your-pool-id
COGNITO_CLIENT_ID=your-client-id
DYNAMODB_TABLE_PREFIX=moro
S3_BUCKET_NAME=moro-assets
NEWS_API_KEY=optional
```

Configure the mobile app API endpoint in `src/config/api.ts`.

---

## 📱 App Screenshots

| Home | Entity Detail | Trade Modal |
|------|---------------|-------------|
| Market overview with trending entities | Price charts & statistics | Buy/sell interface |

| Portfolio | News Feed | Profile |
|-----------|-----------|---------|
| Holdings & transaction history | Breaking news & sentiment | User stats & activity |

---

## 🔌 API Endpoints

### Authentication
```
POST /api/auth/signup     # Create new account
POST /api/auth/login      # Sign in
POST /api/auth/refresh    # Refresh token
GET  /api/auth/me         # Get current user
```

### Trading
```
POST /api/trade/execute   # Execute buy/sell
GET  /api/portfolio       # Get user portfolio
GET  /api/transactions    # Get transaction history
GET  /api/entities        # Get all entities
GET  /api/entities/:id    # Get entity details
```

### Social
```
POST /api/social/posts              # Create post
GET  /api/social/feed               # Get activity feed
POST /api/social/posts/:id/like     # Like/unlike post
POST /api/social/posts/:id/comments # Add comment
POST /api/social/users/:id/follow   # Follow/unfollow user
```

### Additional
```
GET    /api/news              # Get news articles
POST   /api/watchlist         # Add to watchlist
DELETE /api/watchlist/:id     # Remove from watchlist
GET    /api/user/:id          # Get user profile
PUT    /api/user/profile      # Update profile
```

---

## 📁 Project Structure

```
moro/
├── App.tsx                 # App entry point
├── app.json               # Expo configuration
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
│
├── src/
│   ├── components/
│   │   ├── CommentSection.tsx
│   │   ├── ConfirmationModal.tsx
│   │   ├── CreatePostModal.tsx
│   │   ├── EntityCard.tsx
│   │   ├── FloatingBottomNav.tsx
│   │   ├── FollowButton.tsx
│   │   ├── MiniChart.tsx
│   │   ├── NewsCard.tsx
│   │   ├── NotificationsPanel.tsx
│   │   ├── PostCard.tsx
│   │   ├── SideMenu.tsx
│   │   ├── TradeModal.tsx
│   │   └── Treemap.tsx
│   │
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── EntityScreen.tsx
│   │   ├── PortfolioScreen.tsx
│   │   ├── NewsScreen.tsx
│   │   ├── FeedsScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── SearchScreen.tsx
│   │   ├── WatchlistScreen.tsx
│   │   ├── GroupsScreen.tsx
│   │   ├── SeasonalCompetitionScreen.tsx
│   │   └── ... (20+ screens)
│   │
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   ├── TradingContext.tsx
│   │   ├── SocialContext.tsx
│   │   ├── NewsContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── WatchlistContext.tsx
│   │
│   ├── services/
│   │   ├── authService.ts
│   │   ├── oauthService.ts
│   │   ├── socialService.ts
│   │   └── notificationService.ts
│   │
│   └── types/
│       └── index.ts
│
└── backend/
    ├── src/
    │   ├── handlers/       # Lambda handlers
    │   ├── services/       # Business logic
    │   ├── models/         # Data types
    │   └── middleware/     # Auth middleware
    │
    ├── infrastructure/
    │   ├── stack.ts        # CDK stack definition
    │   └── app.ts          # CDK app entry
    │
    └── scripts/
        └── seed.ts         # Database seeding
```

---

## 🎨 Design System

### Colors
| Name | Hex | Usage |
|------|-----|-------|
| **Primary** | `#8B1538` | Brand color, accents |
| **Success** | `#10B981` | Buy, profits, positive |
| **Error** | `#EF4444` | Sell, losses, negative |
| **Blue** | `#3B82F6` | Links, actions |
| **Gray** | `#6B7280` | Secondary text |

### Typography
- **Hero**: 48px bold (portfolio value)
- **Title**: 28px bold (screen titles)
- **Large**: 20px bold (card headers)
- **Body**: 16px regular (content)
- **Small**: 14px (secondary info)

---

## 🧪 Testing

### Manual Testing Flow

1. **Sign up** with email/password or OAuth
2. **Browse** entities on the home screen
3. **View** entity details with price charts
4. **Execute** a buy trade
5. **Check** portfolio for new holding
6. **Execute** a sell trade
7. **Verify** transaction history
8. **Post** to the social feed
9. **Follow** other users
10. **Set up** price alerts on watchlist

### Validation Scenarios
- ✅ Insufficient funds prevents buy
- ✅ Insufficient shares prevents sell
- ✅ P&L calculations are accurate
- ✅ Average cost updates correctly

---

## 📄 Documentation

| Document | Description |
|----------|-------------|
| [TRADING_SYSTEM_GUIDE.md](./TRADING_SYSTEM_GUIDE.md) | Complete trading feature docs |
| [QUICK_START.md](./QUICK_START.md) | 5-minute testing guide |
| [backend/README.md](./backend/README.md) | Backend setup & API docs |
| [backend/AWS_SETUP_GUIDE.md](./backend/AWS_SETUP_GUIDE.md) | AWS infrastructure setup |
| [ENV_SETUP.md](./ENV_SETUP.md) | Environment configuration |
| [OAUTH_SETUP.md](./OAUTH_SETUP.md) | Google & Apple OAuth setup |

---

## 🗺️ Roadmap

### ✅ Completed
- [x] Core trading system (buy/sell)
- [x] Portfolio tracking with P&L
- [x] Real-time price updates
- [x] Social feed with posts/comments
- [x] User authentication (email + OAuth)
- [x] News feed with sentiment
- [x] Watchlist with alerts
- [x] AWS serverless backend

### 🔄 In Progress
- [ ] Push notifications
- [ ] Advanced order types (limit, stop-loss)
- [ ] Real-time WebSocket updates

### 📋 Planned
- [ ] Portfolio analytics dashboard
- [ ] Social trading (copy trades)
- [ ] Achievement system
- [ ] Premium subscription tier
- [ ] Web version

---

## 📜 License

This project is proprietary software. All rights reserved.

---

## 👥 Team

Built with ❤️ by Ryan, Taelan, and Johnny

---

<p align="center">
  <strong>Trade Confidence. Build Your Portfolio. Join the Community.</strong>
</p>

<p align="center">
  <a href="#getting-started">Get Started</a> •
  <a href="#features">Features</a> •
  <a href="#api-endpoints">API Docs</a> •
  <a href="#contributing">Contribute</a>
</p>

