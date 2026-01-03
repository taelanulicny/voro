import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { WatchlistProvider, useWatchlist } from '../../context/WatchlistContext';
import { AuthProvider } from '../../context/AuthContext';
import { TradingProvider } from '../../context/TradingContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { authenticatedRequest, isBackendConfigured } from '../../config/api';

jest.mock('../../config/api');
jest.mock('../../context/AuthContext', () => ({
  ...jest.requireActual('../../context/AuthContext'),
  useAuth: jest.fn(),
}));
jest.mock('../../context/TradingContext', () => ({
  ...jest.requireActual('../../context/TradingContext'),
  useTrading: jest.fn(),
}));

const mockAuthenticatedRequest = authenticatedRequest as jest.MockedFunction<typeof authenticatedRequest>;
const mockIsBackendConfigured = isBackendConfigured as jest.MockedFunction<typeof isBackendConfigured>;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <AuthProvider>
      <TradingProvider>
        <WatchlistProvider>{children}</WatchlistProvider>
      </TradingProvider>
    </AuthProvider>
  </ThemeProvider>
);

describe('WatchlistContext', () => {
  const mockToken = 'test-token';

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsBackendConfigured.mockReturnValue(true);
    (require('../../context/AuthContext').useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-123' },
      token: mockToken,
      isAuthenticated: true,
    });
    (require('../../context/TradingContext').useTrading as jest.Mock).mockReturnValue({
      getEntityPrice: jest.fn((entityId: number) => 100),
    });
  });

  describe('Initial State', () => {
    it('should initialize with empty watchlist', () => {
      const { result } = renderHook(() => useWatchlist(), { wrapper });

      expect(result.current.watchlist).toEqual([]);
      expect(result.current.priceAlerts).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('refreshWatchlist', () => {
    it('should fetch watchlist successfully', async () => {
      const mockWatchlist = [
        {
          entityId: 1,
          entityTicker: 'TEST',
          entityName: 'Test Entity',
          category: 'Tech',
          addedAt: new Date().toISOString(),
          currentPrice: 100,
          change24h: 5,
          changePercent24h: 5,
        },
      ];

      mockAuthenticatedRequest.mockResolvedValue({
        success: true,
        data: mockWatchlist,
      });

      const { result } = renderHook(() => useWatchlist(), { wrapper });

      await act(async () => {
        await result.current.refreshWatchlist();
      });

      await waitFor(() => {
        expect(result.current.watchlist).toHaveLength(1);
        expect(result.current.watchlist[0].entityTicker).toBe('TEST');
      });
    });

    it('should handle empty watchlist', async () => {
      mockAuthenticatedRequest.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useWatchlist(), { wrapper });

      await act(async () => {
        await result.current.refreshWatchlist();
      });

      expect(result.current.watchlist).toEqual([]);
    });
  });

  describe('addToWatchlist', () => {
    it('should add entity to watchlist', async () => {
      mockAuthenticatedRequest.mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useWatchlist(), { wrapper });

      await act(async () => {
        const addResult = await result.current.addToWatchlist(1);
        expect(addResult.success).toBe(true);
      });
    });

    it('should handle add error', async () => {
      mockAuthenticatedRequest.mockResolvedValue({
        success: false,
        error: 'Entity already in watchlist',
      });

      const { result } = renderHook(() => useWatchlist(), { wrapper });

      await act(async () => {
        const addResult = await result.current.addToWatchlist(1);
        expect(addResult.success).toBe(false);
        expect(addResult.error).toBe('Entity already in watchlist');
      });
    });
  });

  describe('removeFromWatchlist', () => {
    it('should remove entity from watchlist', async () => {
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: [
            {
              entityId: 1,
              entityTicker: 'TEST',
              entityName: 'Test Entity',
              category: 'Tech',
              addedAt: new Date().toISOString(),
              currentPrice: 100,
              change24h: 0,
              changePercent24h: 0,
            },
          ],
        })
        .mockResolvedValueOnce({
          success: true,
        });

      const { result } = renderHook(() => useWatchlist(), { wrapper });

      await act(async () => {
        await result.current.refreshWatchlist();
      });

      await act(async () => {
        const removeResult = await result.current.removeFromWatchlist(1);
        expect(removeResult.success).toBe(true);
      });
    });
  });

  describe('isInWatchlist', () => {
    it('should return true if entity is in watchlist', async () => {
      const mockWatchlist = [
        {
          entityId: 1,
          entityTicker: 'TEST',
          entityName: 'Test Entity',
          category: 'Tech',
          addedAt: new Date().toISOString(),
          currentPrice: 100,
          change24h: 0,
          changePercent24h: 0,
        },
      ];

      mockAuthenticatedRequest.mockResolvedValue({
        success: true,
        data: mockWatchlist,
      });

      const { result } = renderHook(() => useWatchlist(), { wrapper });

      await act(async () => {
        await result.current.refreshWatchlist();
      });

      expect(result.current.isInWatchlist(1)).toBe(true);
      expect(result.current.isInWatchlist(2)).toBe(false);
    });
  });

  describe('Price Alerts', () => {
    it('should add price alert', async () => {
      const { result } = renderHook(() => useWatchlist(), { wrapper });

      // First add entity to watchlist
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
        })
        .mockResolvedValueOnce({
          success: true,
          data: [
            {
              entityId: 1,
              entityTicker: 'TEST',
              entityName: 'Test Entity',
              category: 'Tech',
              addedAt: new Date().toISOString(),
              currentPrice: 100,
              change24h: 0,
              changePercent24h: 0,
            },
          ],
        });

      await act(async () => {
        await result.current.addToWatchlist(1);
      });

      await waitFor(() => {
        expect(result.current.watchlist).toHaveLength(1);
      });

      act(() => {
        result.current.addPriceAlert(1, 'above', 110);
      });

      const alerts = result.current.getAlertsForEntity(1);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].alertType).toBe('above');
      expect(alerts[0].targetPrice).toBe(110);
    });

    it('should remove price alert', async () => {
      const { result } = renderHook(() => useWatchlist(), { wrapper });

      // First add entity to watchlist
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
        })
        .mockResolvedValueOnce({
          success: true,
          data: [
            {
              entityId: 1,
              entityTicker: 'TEST',
              entityName: 'Test Entity',
              category: 'Tech',
              addedAt: new Date().toISOString(),
              currentPrice: 100,
              change24h: 0,
              changePercent24h: 0,
            },
          ],
        });

      await act(async () => {
        await result.current.addToWatchlist(1);
      });

      await waitFor(() => {
        expect(result.current.watchlist).toHaveLength(1);
      });

      act(() => {
        result.current.addPriceAlert(1, 'above', 110);
      });

      const alerts = result.current.getAlertsForEntity(1);
      expect(alerts).toHaveLength(1);
      const alertId = alerts[0].id;

      act(() => {
        result.current.removePriceAlert(alertId);
      });

      expect(result.current.getAlertsForEntity(1)).toHaveLength(0);
    });

    it('should get alerts for entity', async () => {
      const { result } = renderHook(() => useWatchlist(), { wrapper });

      // First add entities to watchlist
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
        })
        .mockResolvedValueOnce({
          success: true,
          data: [
            {
              entityId: 1,
              entityTicker: 'TEST',
              entityName: 'Test Entity',
              category: 'Tech',
              addedAt: new Date().toISOString(),
              currentPrice: 100,
              change24h: 0,
              changePercent24h: 0,
            },
            {
              entityId: 2,
              entityTicker: 'TEST2',
              entityName: 'Test Entity 2',
              category: 'Tech',
              addedAt: new Date().toISOString(),
              currentPrice: 200,
              change24h: 0,
              changePercent24h: 0,
            },
          ],
        });

      await act(async () => {
        await result.current.addToWatchlist(1);
        await result.current.addToWatchlist(2);
      });

      await waitFor(() => {
        expect(result.current.watchlist.length).toBeGreaterThanOrEqual(2);
      });

      act(() => {
        result.current.addPriceAlert(1, 'above', 110);
        result.current.addPriceAlert(1, 'below', 90);
        result.current.addPriceAlert(2, 'above', 200);
      });

      const alerts = result.current.getAlertsForEntity(1);
      expect(alerts).toHaveLength(2);
    });
  });
});

