// Navigation Types
export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  Main: undefined;
  Entity: { entityId: number; categoryId: string };
  Category: { categoryId: string };
  Trade: { entityId: number; ticker: string; name: string };
  GroupDetail: { groupId: string };
  FollowersList: { userId: string; type: 'followers' | 'following'; username: string };
  UserProfile: { userId: string };
  NewsDetail: { articleId: string };
  NewsFeed: undefined;
  Search: undefined;
  Settings: undefined;
  Notifications: undefined;
  DiscoverNewAdditions: undefined;
  AccountValue: undefined;
  EditProfile: undefined;
  PrivacySettings: undefined;
  BlockedUsers: undefined;
  TradingHistory: undefined;
  TradingPreferences: undefined;
  Purchases: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  News: undefined;
  Feeds: undefined;
  Groups: undefined;
  Portfolio: undefined;
  Watchlist: undefined;
  Categories: undefined;
  SeasonalCompetition: undefined;
  Profile: undefined;
};

// User Types - Generated from Zod schemas
export type { ValidatedUser as User } from '../validators/schemas';

export interface UserProfile extends User {
  postsCount: number;
  portfolioValue?: number;
  joinedDate: string;
}

// Trading Types - Generated from Zod schemas
export type { ValidatedEntity as Entity } from '../validators/schemas';

export interface Position {
  id: string;
  entityId: number;
  ticker: string;
  name: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  totalValue: number;
  profitLoss: number;
  profitLossPercent: number;
  purchaseDate: string;
}

export interface Trade {
  id: string;
  entityId: number;
  ticker: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
}

// Social Types - Generated from Zod schemas
export type { ValidatedPost as Post } from '../validators/schemas';
export type { ValidatedComment as Comment } from '../validators/schemas';
export type { ValidatedGroup as Group } from '../validators/schemas';

export interface GroupMessage {
  id: string;
  groupId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  content: string;
  timestamp: string;
}

export interface GroupMember {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface Activity {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  type: 'trade' | 'follow' | 'post' | 'like' | 'comment';
  description: string;
  entityTicker?: string;
  timestamp: string;
}

// News Types - Generated from Zod schemas
export type { ValidatedNewsArticle as NewsArticle } from '../validators/schemas';

// Notification Types - Generated from Zod schemas
export type { ValidatedNotification as Notification } from '../validators/schemas';

export interface NewsFilter {
  category?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  entityId?: number;
  impactLevel?: 'low' | 'medium' | 'high' | 'critical';
  isBreaking?: boolean;
}

// Competition Types
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  portfolioValue: number;
  profit: number;
  profitPercent: number;
  tradesCount: number;
}

// Portfolio & Holdings Types - Generated from Zod schemas
export type { ValidatedHolding as Holding } from '../validators/schemas';
export type { ValidatedPortfolio as Portfolio } from '../validators/schemas';

// Transaction Types - Generated from Zod schemas
export type { ValidatedTransaction as UserTransaction } from '../validators/schemas';

// Chart Data Types
export interface PriceDataPoint {
  timestamp: number;
  price: number;
  volume?: number;
}

export interface EntityDetailData {
  entity: Entity;
  priceHistory: PriceDataPoint[];
  stats: {
    high24h: number;
    low24h: number;
    volume24h: number;
    marketCap: number;
    holdersCount: number;
    rank: number;
  };
}

// Watchlist Types
export interface PriceAlert {
  id: string;
  entityId: number;
  entityTicker: string;
  entityName: string;
  alertType: 'above' | 'below';
  targetPrice: number;
  currentPrice: number;
  isActive: boolean;
  createdAt: string;
  triggeredAt?: string;
}

export interface WatchlistItem {
  entityId: number;
  entityTicker: string;
  entityName: string;
  category: string;
  addedAt: string;
  currentPrice: number;
  change24h: number;
  changePercent24h: number;
}

export type WatchlistSortOption = 'name' | 'price_high' | 'price_low' | 'change_high' | 'change_low' | 'added';

