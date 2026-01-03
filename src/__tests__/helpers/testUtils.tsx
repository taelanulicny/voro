import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { AuthProvider } from '../../context/AuthContext';
import { TradingProvider } from '../../context/TradingContext';
import { SocialProvider } from '../../context/SocialContext';
import { NewsProvider } from '../../context/NewsContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { WatchlistProvider } from '../../context/WatchlistContext';
import { NotificationsProvider } from '../../context/NotificationsContext';
import { SideMenuProvider } from '../../context/SideMenuContext';

// Custom render function that includes all providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TradingProvider>
          <SocialProvider>
            <NewsProvider>
              <WatchlistProvider>
                <NotificationsProvider>
                  <SideMenuProvider>{children}</SideMenuProvider>
                </NotificationsProvider>
              </WatchlistProvider>
            </NewsProvider>
          </SocialProvider>
        </TradingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react-native';
export { customRender as render };

// Test data factories
export const createMockUser = (overrides?: Partial<any>) => ({
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  avatarUrl: 'https://example.com/avatar.jpg',
  bio: 'Test bio',
  ...overrides,
});

export const createMockToken = (expiresInMinutes: number = 60) => {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresInMinutes * 60;
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: 'user-123', exp, iat: now }));
  const signature = 'mock-signature';
  return `${header}.${payload}.${signature}`;
};

export const createMockEntity = (overrides?: Partial<any>) => ({
  entityId: 1,
  ticker: 'TEST',
  name: 'Test Entity',
  category: 'Tech',
  basePrice: 100,
  currentPrice: 105,
  change24h: 5,
  changePercent24h: 5,
  volume24h: 1000000,
  marketCap: 10000000,
  ...overrides,
});

export const createMockHolding = (overrides?: Partial<any>) => ({
  entityId: 1,
  entityName: 'Test Entity',
  entityTicker: 'TEST',
  quantity: 10,
  averageCost: 100,
  averagePrice: 100,
  currentPrice: 105,
  totalValue: 1050,
  totalCost: 1000,
  profitLoss: 50,
  profitLossPercent: 5,
  category: 'Tech',
  ...overrides,
});

export const createMockPost = (overrides?: Partial<any>) => {
  const timestamp = new Date().toISOString();
  return {
    id: 'post-123',
    postId: 'post-123',
    userId: 'user-123',
    username: 'testuser',
    displayName: 'Test User',
    content: 'Test post content',
    timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    likes: 0,
    comments: 0,
    likesCount: 0,
    commentsCount: 0,
    isLiked: false,
    isBookmarked: false,
    ...overrides,
  };
};

export const createMockNewsArticle = (overrides?: Partial<any>) => ({
  id: 'news-123',
  title: 'Test News Article',
  summary: 'Test summary',
  content: 'Test content',
  source: 'Test Source',
  url: 'https://example.com/news',
  publishedAt: new Date().toISOString(),
  category: 'Tech',
  sentiment: 'positive' as const,
  impactLevel: 'medium' as const,
  isBreaking: false,
  entities: [],
  ...overrides,
});

export const createMockNotification = (overrides?: Partial<any>) => ({
  notificationId: 'notif-123',
  userId: 'user-123',
  type: 'like' as const,
  title: 'Test Notification',
  message: 'Test message',
  isRead: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

