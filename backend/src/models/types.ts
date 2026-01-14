// Database model types for DynamoDB

export interface User {
  userId: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  portfolioValue?: number;
  cashBalance?: number;
  // Portfolio tracking for todayChange calculation
  openingPortfolioValue?: number; // Portfolio value at start of day
  openingPortfolioDate?: string; // Date (YYYY-MM-DD) when opening value was set
  joinedDate: string;
  eulaAccepted?: boolean;
  eulaAcceptedAt?: string;
  privacyPolicyAccepted?: boolean;
  privacyPolicyAcceptedAt?: string;
  onboardingCompleted?: boolean;
  // User preferences
  privacySettings?: {
    profileVisibility?: 'public' | 'private';
    showPortfolioValue?: boolean;
    allowDataSharing?: boolean;
  };
  notificationSettings?: {
    pushNotifications?: boolean;
    priceAlerts?: boolean;
    tradingAlerts?: boolean;
    socialNotifications?: boolean;
  };
  tradingPreferences?: {
    requireConfirmation?: boolean;
    showTradePreview?: boolean;
    enableSlippageWarning?: boolean;
  };
  // OAuth provider IDs
  googleId?: string;
  appleId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Entity {
  entityId: number;
  ticker: string;
  name: string;
  category: string;
  basePrice: number;
  description: string;
  logoUrl?: string;
  // Sentiment-based trading pools
  positiveTokens: number; // P pool - starts at 0
  negativeTokens: number; // N pool - starts at 0
  createdAt: string;
  updatedAt: string;
}

export interface Portfolio {
  userId: string;
  entityId: number;
  // New sentiment-based position fields
  tokensCommitted: number; // Tokens staked in this position
  entryRatio: number; // Ratio when position was opened: (P + EPSILON) / (N + EPSILON)
  direction: 'positive' | 'negative'; // Position direction
  status: 'open' | 'closed'; // Position status
  // Legacy fields (kept for backwards compatibility during migration)
  quantity?: number;
  averageCost?: number;
  totalCost?: number;
  // PnL fields (set when position is closed)
  exitRatio?: number;
  deltaR?: number;
  profitLoss?: number;
  tokensReturned?: number;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  transactionId: string;
  userId: string;
  timestamp: string;
  entityId: number;
  entityName: string;
  entityTicker: string;
  type: 'open' | 'close'; // 'open' = open position, 'close' = close position
  direction?: 'positive' | 'negative'; // Only present for 'open' type
  tokensCommitted: number; // Tokens staked
  entryRatio?: number; // Ratio when position opened (for 'open' type)
  exitRatio?: number; // Ratio when position closed (for 'close' type)
  deltaR?: number; // Ratio change (for 'close' type)
  profitLoss?: number; // PnL (for 'close' type)
  tokensReturned?: number; // Tokens returned on close (for 'close' type)
  currentPrice: number; // Price at time of transaction
  category: string;
  idempotencyKey?: string; // Optional idempotency key to prevent duplicate trades
}

export interface Post {
  postId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  content: string;
  entityId?: number;
  entityTicker?: string;
  entityName?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  images?: string[];
  likes: number;
  comments: number;
  timestamp: string;
  createdAt: string;
}

export interface Comment {
  commentId: string;
  postId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  content: string;
  likes: number;
  timestamp: string;
  createdAt: string;
  parentCommentId?: string; // For nested replies/threading
  replyToUserId?: string; // User ID being replied to (for notification purposes)
  replyToUsername?: string; // Username being replied to
  replyToDisplayName?: string; // Display name being replied to
  editedAt?: string; // When comment was last edited
  isEdited?: boolean; // Whether comment has been edited
}

export interface Follow {
  userId: string;
  followingUserId: string;
  createdAt: string;
}

export interface Like {
  likeId: string;
  postId: string;
  userId: string;
  createdAt: string;
}

export interface CommentLike {
  likeId: string;
  commentId: string;
  userId: string;
  createdAt: string;
}

export interface Bookmark {
  bookmarkId: string;
  postId: string;
  userId: string;
  createdAt: string;
}

export interface Watchlist {
  userId: string;
  entityId: number;
  addedAt: string;
}

export interface NewsArticle {
  articleId: string;
  title: string;
  summary: string;
  content: string;
  source: string;
  sourceUrl?: string;
  imageUrl?: string;
  author?: string;
  publishedAt: string;
  category: 'Tech' | 'Politics' | 'Events' | 'People' | 'General';
  entityId?: number;
  entityTicker?: string;
  entityName?: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  viewCount: number;
  isBreaking: boolean;
  createdAt: string;
  // Optional Gemini AI analysis results
  geminiAnalysis?: {
    priceImpact: {
      tokensUp: number;
      tokensDown: number;
    };
    reasoning?: string;
  };
}

export interface PriceHistory {
  entityId: number;
  timestamp: string;
  price: number;
  volume?: number;
}

export interface Block {
  userId: string;
  blockedUserId: string;
  createdAt: string;
}

export interface Report {
  reportId: string;
  reporterUserId: string;
  reportedUserId: string;
  reason: string;
  details?: string;
  createdAt: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
}

export interface Group {
  groupId: string;
  name: string;
  description: string;
  category: string;
  ownerId: string;
  isPrivate: boolean;
  memberCount: number;
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  groupId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface Notification {
  notificationId: string;
  userId: string; // Recipient user ID
  type: 'like' | 'comment' | 'reply' | 'follow' | 'mention' | 'trade' | 'price_alert' | 'group_invite' | 'group_post' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  // Context data (varies by type)
  actorUserId?: string; // User who triggered the notification
  actorUsername?: string;
  actorDisplayName?: string;
  actorAvatarUrl?: string;
  // For post/comment notifications
  postId?: string;
  commentId?: string;
  // For entity/trade notifications
  entityId?: number;
  entityTicker?: string;
  entityName?: string;
  // For group notifications
  groupId?: string;
  groupName?: string;
  // For price alerts
  targetPrice?: number;
  currentPrice?: number;
  // For system notifications
  actionUrl?: string; // Deep link URL
  metadata?: Record<string, any>; // Additional flexible data
}

