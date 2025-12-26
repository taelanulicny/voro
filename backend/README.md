# Moro Backend

AWS Serverless backend for the Moro mobile app.

## Architecture

- **API Gateway**: REST API endpoints
- **Lambda Functions**: Business logic (Node.js/TypeScript)
- **DynamoDB**: NoSQL database
- **AWS Cognito**: User authentication
- **S3**: Static assets (avatars, images)
- **EventBridge**: Scheduled tasks (price updates)

## Setup

### Prerequisites

- Node.js 20+
- AWS CLI configured
- AWS CDK CLI installed (`npm install -g aws-cdk`)

### Installation

```bash
cd backend
npm install
npm run build
```

### Environment Variables

Create a `.env` file:

```
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=your-pool-id
COGNITO_CLIENT_ID=your-client-id
DYNAMODB_TABLE_PREFIX=moro
S3_BUCKET_NAME=moro-assets
NEWS_API_KEY=optional
```

### Deployment

```bash
# Synthesize CloudFormation template
npm run synth

# Deploy to AWS
npm run deploy

# Or use CDK directly
cdk deploy
```

### Seeding Database

After deployment, seed the entities table:

```bash
npm run seed
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Sign up new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user

### Trading
- `POST /api/trade/execute` - Execute buy/sell trade
- `GET /api/portfolio` - Get user portfolio
- `GET /api/transactions` - Get transaction history
- `GET /api/entities` - Get all entities
- `GET /api/entities/:entityId/price` - Get entity price

### Social
- `POST /api/social/posts` - Create post
- `GET /api/social/feed` - Get activity feed
- `POST /api/social/posts/:postId/like` - Like/unlike post
- `POST /api/social/posts/:postId/comments` - Add comment
- `GET /api/social/posts/:postId/comments` - Get comments
- `POST /api/social/users/:userId/follow` - Follow user
- `GET /api/social/users/search` - Search users

### User
- `GET /api/user/:userId` - Get user profile
- `PUT /api/user/profile` - Update profile
- `GET /api/user/avatar/upload-url` - Get avatar upload URL

### News
- `GET /api/news` - Get news articles

### Watchlist
- `POST /api/watchlist` - Add to watchlist
- `DELETE /api/watchlist/:entityId` - Remove from watchlist
- `GET /api/watchlist` - Get watchlist

### Account
- `DELETE /api/user/account` - Delete account
- `POST /api/social/users/:userId/block` - Block user
- `POST /api/social/users/:userId/report` - Report user

## Project Structure

```
backend/
├── src/
│   ├── handlers/          # Lambda handlers
│   │   ├── auth.ts
│   │   ├── trading.ts
│   │   ├── social.ts
│   │   ├── user.ts
│   │   ├── news.ts
│   │   ├── watchlist.ts
│   │   ├── account.ts
│   │   └── priceUpdates.ts
│   ├── services/          # Business logic
│   │   ├── authService.ts
│   │   ├── tradingService.ts
│   │   ├── socialService.ts
│   │   ├── userService.ts
│   │   └── newsService.ts
│   ├── models/            # Data models
│   │   └── types.ts
│   ├── utils/             # Utilities
│   │   └── dynamodb.ts
│   └── middleware/        # Auth, validation
│       └── auth.ts
├── infrastructure/        # CDK infrastructure
│   ├── stack.ts
│   └── app.ts
├── scripts/              # Seed data, migrations
│   └── seed.ts
└── package.json
```

## Development

### Local Testing

Use AWS SAM CLI for local testing:

```bash
sam local start-api
```

### Building

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

## Database Schema

### DynamoDB Tables

- `Users` - User profiles
- `Entities` - Trading entities (people, companies, etc.)
- `Portfolios` - User holdings
- `Transactions` - Trade history
- `Posts` - Social posts
- `Comments` - Post comments
- `Follows` - User follow relationships
- `Likes` - Post likes
- `Watchlists` - User watchlists
- `NewsArticles` - News articles
- `PriceHistory` - Entity price history
- `Blocks` - Blocked users
- `Reports` - User reports

## Scheduled Tasks

- **Price Updates**: Runs every 5 minutes via EventBridge to update entity prices

## Security

- All API endpoints (except public ones) require JWT authentication
- Cognito ID tokens are used for authentication
- S3 presigned URLs for secure file uploads
- CORS configured for mobile app origins

