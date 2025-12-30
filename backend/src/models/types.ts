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
  joinedDate: string;
  eulaAccepted?: boolean;
  eulaAcceptedAt?: string;
  privacyPolicyAccepted?: boolean;
  privacyPolicyAcceptedAt?: string;
  onboardingCompleted?: boolean;
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
  createdAt: string;
}

export interface Portfolio {
  userId: string;
  entityId: number;
  quantity: number;
  averageCost: number;
  totalCost: number;
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
  type: 'buy' | 'sell';
  quantity: number;
  pricePerToken: number;
  totalAmount: number;
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

