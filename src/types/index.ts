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
  ChartDevelopment: undefined;
<<<<<<< HEAD
<<<<<<< HEAD
  TradeHistory: undefined;
  CreateAlert: { entityId: number; entityName: string; entityTicker: string; currentPrice: number; change24h: number; changePercent24h: number };
=======
  EditProfile: undefined;
  PrivacySettings: undefined;
  BlockedUsers: undefined;
  TradingHistory: undefined;
  TradingPreferences: undefined;
  Purchases: undefined;
  UserProfile: { userId: string };
>>>>>>> parent of ec2acad (Update token symbol to ⓜ, add page 6 with top trades, update entity screen buttons and category display, add skipAuth function)
=======
>>>>>>> parent of 2e5d44d (Merge remote backend changes with local frontend updates)
};

export type MainTabParamList = {
  Home: undefined;
  News: undefined;
  Community: undefined;
  Groups: undefined;
  Portfolio: undefined;
  Watchlist: undefined;
  Categories: undefined;
  SeasonalCompetition: undefined;
  Profile: undefined;
};

// User Types
export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
}

export interface UserProfile extends User {
  postsCount: number;
  portfolioValue?: number;
  joinedDate: string;
}

// Trading Types
export interface Entity {
  id: number;
  ticker: string;
  name: string;
  type: 'stock' | 'crypto' | 'commodity' | 'forex';
  currentPrice: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap: number;
  description?: string;
  logoUrl?: string;
}

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

// Social Types
export interface Post {
  id: string;
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
  isLiked: boolean;
  isBookmarked: boolean;
  timestamp: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  content: string;
  likes: number;
  isLiked: boolean;
  timestamp: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  category: string;
  memberCount: number;
  isPrivate: boolean;
  isMember: boolean;
  coverImage?: string;
  createdAt: string;
}

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

// News Types
export interface NewsArticle {
  id: string;
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
  sentimentScore: number; // -100 to 100
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  viewCount: number;
  isBreaking: boolean;
}

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

// Portfolio & Holdings Types
export interface Holding {
  entityId: number;
  entityName: string;
  entityTicker: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  totalValue: number;
  totalCost: number;
  profitLoss: number;
  profitLossPercent: number;
  category: string;
}

export interface Portfolio {
  cashBalance: number;
  totalValue: number;
  holdings: Holding[];
  todayChange: number;
  todayChangePercent: number;
}

export interface UserTransaction {
  id: string;
  entityId: number;
  entityName: string;
  entityTicker: string;
  type: 'buy' | 'sell';
  quantity: number;
  pricePerToken: number;
  totalAmount: number;
  timestamp: string;
  category: string;
}

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

