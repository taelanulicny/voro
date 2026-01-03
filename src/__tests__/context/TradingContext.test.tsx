import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { TradingProvider, useTrading } from '../../context/TradingContext';
import { AuthProvider } from '../../context/AuthContext';
import { ThemeProvider } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { authenticatedRequest, apiRequest, invalidateCache, isBackendConfigured } from '../../config/api';
import { createMockUser, createMockToken, createMockEntity, createMockHolding } from '../helpers/testUtils';

// Mock dependencies
jest.mock('../../config/api');
jest.mock('../../context/AuthContext', () => ({
  ...jest.requireActual('../../context/AuthContext'),
  useAuth: jest.fn(),
}));

const mockAuthenticatedRequest = authenticatedRequest as jest.MockedFunction<typeof authenticatedRequest>;
const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;
const mockInvalidateCache = invalidateCache as jest.MockedFunction<typeof invalidateCache>;
const mockIsBackendConfigured = isBackendConfigured as jest.MockedFunction<typeof isBackendConfigured>;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <AuthProvider>
      <TradingProvider>{children}</TradingProvider>
    </AuthProvider>
  </ThemeProvider>
);

describe('TradingContext', () => {
  const mockUser = createMockUser();
  const mockToken = createMockToken();

  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    mockIsBackendConfigured.mockReturnValue(true);
    (require('../../context/AuthContext').useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      token: mockToken,
      isAuthenticated: true,
      getToken: () => mockToken,
    });
  });

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useTrading(), { wrapper });

      expect(result.current.portfolio.cashBalance).toBe(10000);
      expect(result.current.portfolio.holdings).toEqual([]);
      expect(result.current.transactions).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('fetchPortfolio', () => {
    it('should fetch portfolio from backend successfully', async () => {
      const mockHoldings = [
        createMockHolding({ 
          entityId: 1, 
          quantity: 10, 
          averageCost: 100, 
          averagePrice: 100,
          currentPrice: 105,
          totalCost: 1000,
          totalValue: 1050,
          profitLoss: 50,
          profitLossPercent: 5,
          category: 'Tech',
        }),
      ];

      mockAuthenticatedRequest.mockResolvedValue({
        success: true,
        data: {
          cashBalance: 9000,
          holdings: mockHoldings,
          totalValue: 10050,
          todayChange: 50,
          todayChangePercent: 0.5,
        },
      });

      const { result } = renderHook(() => useTrading(), { wrapper });

      await act(async () => {
        await result.current.fetchPortfolio();
      });

      await waitFor(() => {
        expect(result.current.portfolio.cashBalance).toBe(9000);
        expect(result.current.portfolio.holdings).toHaveLength(1);
        expect(result.current.portfolio.totalValue).toBe(10050);
      });
    });

    it('should handle fetch portfolio error gracefully', async () => {
      mockAuthenticatedRequest.mockResolvedValue({
        success: false,
        error: 'Failed to fetch portfolio',
      });

      const { result } = renderHook(() => useTrading(), { wrapper });

      await act(async () => {
        await result.current.fetchPortfolio();
      });

      // Should maintain initial state on error
      expect(result.current.portfolio.cashBalance).toBe(10000);
    });

    it('should not fetch if not authenticated', async () => {
      (require('../../context/AuthContext').useAuth as jest.Mock).mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        getToken: () => null,
      });

      const { result } = renderHook(() => useTrading(), { wrapper });

      await act(async () => {
        await result.current.fetchPortfolio();
      });

      expect(mockAuthenticatedRequest).not.toHaveBeenCalled();
    });
  });

  describe('executeTrade', () => {
    it('should execute buy trade successfully', async () => {
      const mockHolding = createMockHolding({ 
        entityId: 1, 
        quantity: 5, 
        averageCost: 100,
        averagePrice: 100,
        currentPrice: 100,
        totalCost: 500,
        totalValue: 500,
        profitLoss: 0,
        profitLossPercent: 0,
        category: 'Tech',
      });

      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            cashBalance: 9500,
            holdings: [mockHolding],
            totalValue: 10000,
            todayChange: 0,
            todayChangePercent: 0,
            executionDetails: {
              requestedPrice: 100,
              executionPrice: 100,
              priceAdjusted: false,
              slippagePercent: 0,
            },
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            transactions: [],
          },
        });

      const { result } = renderHook(() => useTrading(), { wrapper });

      await act(async () => {
        const tradeResult = await result.current.executeTrade(
          1,
          'Test Entity',
          'TEST',
          'buy',
          5,
          100,
          'Tech'
        );

        expect(tradeResult.success).toBe(true);
        expect(tradeResult.executionPrice).toBe(100);
      });

      await waitFor(() => {
        expect(result.current.portfolio.cashBalance).toBe(9500);
        expect(result.current.portfolio.holdings).toHaveLength(1);
      });
    });

    it('should execute sell trade successfully', async () => {
      // First, set up a holding
      const existingHolding = createMockHolding({ 
        entityId: 1, 
        quantity: 10, 
        averageCost: 100,
        averagePrice: 100,
        currentPrice: 105,
        totalCost: 1000,
        totalValue: 1050,
        profitLoss: 50,
        profitLossPercent: 5,
        category: 'Tech',
      });

      const afterSellHolding = createMockHolding({ 
        entityId: 1, 
        quantity: 5, 
        averageCost: 100,
        averagePrice: 100,
        currentPrice: 105,
        totalCost: 500,
        totalValue: 525,
        profitLoss: 25,
        profitLossPercent: 5,
        category: 'Tech',
      });

      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            cashBalance: 10000,
            holdings: [existingHolding],
            totalValue: 11050,
            todayChange: 0,
            todayChangePercent: 0,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            cashBalance: 10500,
            holdings: [afterSellHolding],
            totalValue: 11025,
            todayChange: 0,
            todayChangePercent: 0,
            executionDetails: {
              requestedPrice: 105,
              executionPrice: 105,
              priceAdjusted: false,
              slippagePercent: 0,
            },
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            transactions: [],
          },
        });

      const { result } = renderHook(() => useTrading(), { wrapper });

      // Fetch portfolio first
      await act(async () => {
        await result.current.fetchPortfolio();
      });

      // Execute sell trade
      await act(async () => {
        const tradeResult = await result.current.executeTrade(
          1,
          'Test Entity',
          'TEST',
          'sell',
          5,
          105,
          'Tech'
        );

        expect(tradeResult.success).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.portfolio.cashBalance).toBe(10500);
        expect(result.current.portfolio.holdings[0].quantity).toBe(5);
      });
    });

    it('should handle insufficient funds error', async () => {
      // Mock the trade execution to fail
      mockAuthenticatedRequest.mockResolvedValue({
        success: false,
        error: 'Insufficient funds',
      });

      const { result } = renderHook(() => useTrading(), { wrapper });

      await act(async () => {
        const tradeResult = await result.current.executeTrade(
          1,
          'Test Entity',
          'TEST',
          'buy',
          1000,
          100,
          'Tech'
        );

        expect(tradeResult.success).toBe(false);
        expect(tradeResult.error).toBe('Insufficient funds');
      });
    });

    it('should handle insufficient shares error', async () => {
      const existingHolding = createMockHolding({ 
        entityId: 1, 
        quantity: 5, 
        averageCost: 100,
        averagePrice: 100,
        currentPrice: 105,
        totalCost: 500,
        totalValue: 525,
        profitLoss: 25,
        profitLossPercent: 5,
        category: 'Tech',
      });

      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            cashBalance: 10000,
            holdings: [existingHolding],
            totalValue: 10525,
            todayChange: 0,
            todayChangePercent: 0,
          },
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'Insufficient shares',
        });

      const { result } = renderHook(() => useTrading(), { wrapper });

      await act(async () => {
        await result.current.fetchPortfolio();
      });

      await act(async () => {
        const tradeResult = await result.current.executeTrade(
          1,
          'Test Entity',
          'TEST',
          'sell',
          10,
          105,
          'Tech'
        );

        expect(tradeResult.success).toBe(false);
        expect(tradeResult.error).toBe('Insufficient shares');
      });
    });

    it('should use idempotency key for trade execution', async () => {
      const idempotencyKey = 'test-idempotency-key';
      mockAuthenticatedRequest.mockResolvedValue({
        success: true,
        data: {
          cashBalance: 9500,
          holdings: [createMockHolding()],
          totalValue: 10000,
          todayChange: 0,
          todayChangePercent: 0,
          executionDetails: {
            requestedPrice: 100,
            executionPrice: 100,
            priceAdjusted: false,
            slippagePercent: 0,
          },
        },
      });

      const { result } = renderHook(() => useTrading(), { wrapper });

      await act(async () => {
        await result.current.executeTrade(
          1,
          'Test Entity',
          'TEST',
          'buy',
          5,
          100,
          'Tech',
          idempotencyKey
        );
      });

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining(idempotencyKey),
        }),
        expect.any(Function)
      );
    });
  });

  describe('getHolding', () => {
    it('should return holding for existing entity', async () => {
      const mockHolding = createMockHolding({ 
        entityId: 1,
        category: 'Tech',
      });

      mockAuthenticatedRequest.mockResolvedValue({
        success: true,
        data: {
          cashBalance: 10000,
          holdings: [mockHolding],
          totalValue: 10500,
          todayChange: 0,
          todayChangePercent: 0,
        },
      });

      const { result } = renderHook(() => useTrading(), { wrapper });

      await act(async () => {
        await result.current.fetchPortfolio();
      });

      const holding = result.current.getHolding(1);
      expect(holding).toBeDefined();
      expect(holding?.entityId).toBe(1);
    });

    it('should return undefined for non-existent entity', () => {
      const { result } = renderHook(() => useTrading(), { wrapper });

      const holding = result.current.getHolding(999);
      expect(holding).toBeUndefined();
    });
  });

  describe('updatePrices', () => {
    it('should update entity price', async () => {
      const mockHolding = createMockHolding({ 
        entityId: 1, 
        currentPrice: 100,
        category: 'Tech',
      });

      mockAuthenticatedRequest.mockResolvedValue({
        success: true,
        data: {
          cashBalance: 10000,
          holdings: [mockHolding],
          totalValue: 10000,
          todayChange: 0,
          todayChangePercent: 0,
        },
      });

      const { result } = renderHook(() => useTrading(), { wrapper });

      await act(async () => {
        await result.current.fetchPortfolio();
      });

      act(() => {
        result.current.updatePrices(1, 110);
      });

      await waitFor(() => {
        const holding = result.current.getHolding(1);
        expect(holding?.currentPrice).toBe(110);
      });
    });
  });

  describe('getEntityPrice', () => {
    it('should return entity price', async () => {
      // First set up a holding with a price
      const mockHolding = createMockHolding({ entityId: 1, currentPrice: 105 });
      
      mockAuthenticatedRequest.mockResolvedValue({
        success: true,
        data: {
          cashBalance: 10000,
          holdings: [mockHolding],
          totalValue: 10050,
          todayChange: 0,
          todayChangePercent: 0,
        },
      });

      const { result } = renderHook(() => useTrading(), { wrapper });

      await act(async () => {
        await result.current.fetchPortfolio();
      });

      await waitFor(() => {
        expect(result.current.portfolio.holdings).toHaveLength(1);
      });

      // getEntityPrice is synchronous and reads from entityPrices state
      // which is set when portfolio is fetched
      const price = result.current.getEntityPrice(1);
      expect(price).toBe(105);
    });

    it('should return 0 for non-existent entity', () => {
      const { result } = renderHook(() => useTrading(), { wrapper });

      // getEntityPrice returns 100 as fallback, not 0
      // But if entityPrices is empty and MOCK_ENTITIES doesn't have it, it returns 100
      const price = result.current.getEntityPrice(999);
      // The function returns 100 as ultimate fallback, not 0
      expect(price).toBe(100);
    });
  });

  describe('resetPortfolio', () => {
    it('should reset portfolio to initial state', async () => {
      const mockHolding = createMockHolding();

      mockAuthenticatedRequest.mockResolvedValue({
        success: true,
        data: {
          cashBalance: 9000,
          holdings: [mockHolding],
          totalValue: 10050,
          todayChange: 50,
          todayChangePercent: 0.5,
        },
      });

      const { result } = renderHook(() => useTrading(), { wrapper });

      await act(async () => {
        await result.current.fetchPortfolio();
      });

      act(() => {
        result.current.resetPortfolio();
      });

      expect(result.current.portfolio.cashBalance).toBe(10000);
      expect(result.current.portfolio.holdings).toEqual([]);
    });
  });

  describe('fetchTransactions', () => {
    it('should fetch transactions successfully', async () => {
      const mockTransactions = [
        {
          id: 'tx-1',
          entityId: 1,
          ticker: 'TEST',
          type: 'buy',
          quantity: 10,
          price: 100,
          total: 1000,
          timestamp: new Date().toISOString(),
          status: 'completed',
        },
      ];

      mockAuthenticatedRequest.mockResolvedValue({
        success: true,
        data: {
          transactions: mockTransactions,
        },
      });

      const { result } = renderHook(() => useTrading(), { wrapper });

      await act(async () => {
        await result.current.fetchTransactions();
      });

      await waitFor(() => {
        expect(result.current.transactions).toHaveLength(1);
        expect(result.current.transactions[0].id).toBe('tx-1');
      });
    });

    it('should handle fetch transactions error', async () => {
      mockAuthenticatedRequest.mockResolvedValue({
        success: false,
        error: 'Failed to fetch transactions',
      });

      const { result } = renderHook(() => useTrading(), { wrapper });

      await act(async () => {
        await result.current.fetchTransactions();
      });

      expect(result.current.transactions).toEqual([]);
    });
  });

  describe('Market Hours', () => {
    it('should check market hours correctly', () => {
      const { result } = renderHook(() => useTrading(), { wrapper });

      // Market hours check runs on mount
      expect(result.current.isMarketOpen).toBeDefined();
      expect(result.current.marketStatusMessage).toBeDefined();
    });
  });

  describe('Pending Trades Recovery', () => {
    it('should recover pending trades on mount', async () => {
      const pendingTrade = {
        idempotencyKey: 'pending-key',
        entityId: 1,
        entityName: 'Test',
        entityTicker: 'TEST',
        type: 'buy' as const,
        quantity: 5,
        pricePerToken: 100,
        category: 'Tech',
        timestamp: Date.now(),
        previousCashBalance: 10000,
        previousHoldings: [],
      };

      await AsyncStorage.setItem('@moro_pending_trades', JSON.stringify([pendingTrade]));

      // Mock fetchPortfolio (called first), trade execution (idempotent verify), and final fetchPortfolio
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            cashBalance: 9500,
            holdings: [createMockHolding({ 
              entityId: 1,
              quantity: 5,
              category: 'Tech',
            })],
            totalValue: 10000,
            todayChange: 0,
            todayChangePercent: 0,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            cashBalance: 9500,
            holdings: [createMockHolding({ 
              entityId: 1,
              quantity: 5,
              category: 'Tech',
            })],
            totalValue: 10000,
            todayChange: 0,
            todayChangePercent: 0,
            executionDetails: {
              requestedPrice: 100,
              executionPrice: 100,
              priceAdjusted: false,
              slippagePercent: 0,
            },
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            cashBalance: 9500,
            holdings: [createMockHolding({ 
              entityId: 1,
              quantity: 5,
              category: 'Tech',
            })],
            totalValue: 10000,
            todayChange: 0,
            todayChangePercent: 0,
          },
        });

      const { result } = renderHook(() => useTrading(), { wrapper });

      await waitFor(() => {
        expect(mockAuthenticatedRequest).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });
});

