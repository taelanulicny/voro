import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { TradingProvider, useTrading } from '../../context/TradingContext';
import { AuthProvider } from '../../context/AuthContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { authenticatedRequest, apiRequest } from '../../config/api';
import { createMockUser, createMockToken, createMockHolding } from '../helpers/testUtils';

jest.mock('../../config/api');
jest.mock('../../context/AuthContext', () => ({
  ...jest.requireActual('../../context/AuthContext'),
  useAuth: jest.fn(),
}));

const mockAuthenticatedRequest = authenticatedRequest as jest.MockedFunction<typeof authenticatedRequest>;
const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <AuthProvider>
      <TradingProvider>{children}</TradingProvider>
    </AuthProvider>
  </ThemeProvider>
);

describe('Trade Flow Integration Tests', () => {
  const mockUser = createMockUser();
  const mockToken = createMockToken();

  beforeEach(() => {
    jest.clearAllMocks();
    (require('../../context/AuthContext').useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      token: mockToken,
      isAuthenticated: true,
      getToken: () => mockToken,
    });
  });

  describe('Complete Buy Trade Flow', () => {
    it('should execute buy trade and update portfolio', async () => {
      const initialPortfolio = {
        cashBalance: 10000,
        holdings: [],
        totalValue: 10000,
        todayChange: 0,
        todayChangePercent: 0,
      };

      const afterTradePortfolio = {
        cashBalance: 9500,
        holdings: [createMockHolding({ entityId: 1, quantity: 5, averagePrice: 100 })],
        totalValue: 10000,
        todayChange: 0,
        todayChangePercent: 0,
      };

      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: initialPortfolio,
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            cashBalance: 9500,
            holdings: [createMockHolding({ entityId: 1, quantity: 5, averagePrice: 100, currentPrice: 100 })],
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

      // Fetch initial portfolio
      await act(async () => {
        await result.current.fetchPortfolio();
      });

      await waitFor(() => {
        expect(result.current.portfolio.cashBalance).toBe(10000);
      });

      // Execute buy trade
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

      // Verify portfolio updated
      await waitFor(() => {
        expect(result.current.portfolio.cashBalance).toBe(9500);
        expect(result.current.portfolio.holdings).toHaveLength(1);
        expect(result.current.portfolio.holdings[0].quantity).toBe(5);
      });
    });
  });

  describe('Complete Sell Trade Flow', () => {
    it('should execute sell trade and update portfolio', async () => {
      const existingHolding = createMockHolding({ entityId: 1, quantity: 10, averagePrice: 100 });

      const initialPortfolio = {
        cashBalance: 9000,
        holdings: [existingHolding],
        totalValue: 10000,
        todayChange: 0,
        todayChangePercent: 0,
      };

      const afterTradePortfolio = {
        cashBalance: 9500,
        holdings: [createMockHolding({ entityId: 1, quantity: 5, averagePrice: 100 })],
        totalValue: 10000,
        todayChange: 0,
        todayChangePercent: 0,
      };

      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: initialPortfolio,
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            cashBalance: 9500,
            holdings: [createMockHolding({ entityId: 1, quantity: 5, averagePrice: 100, currentPrice: 100 })],
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

      // Fetch initial portfolio
      await act(async () => {
        await result.current.fetchPortfolio();
      });

      await waitFor(() => {
        expect(result.current.portfolio.holdings).toHaveLength(1);
        expect(result.current.portfolio.holdings[0].quantity).toBe(10);
      });

      // Execute sell trade
      await act(async () => {
        const tradeResult = await result.current.executeTrade(
          1,
          'Test Entity',
          'TEST',
          'sell',
          5,
          100,
          'Tech'
        );

        expect(tradeResult.success).toBe(true);
      });

      // Verify portfolio updated
      await waitFor(() => {
        expect(result.current.portfolio.cashBalance).toBe(9500);
        expect(result.current.portfolio.holdings[0].quantity).toBe(5);
      });
    });
  });

  describe('Trade Error Handling Flow', () => {
    it('should handle insufficient funds error gracefully', async () => {
      const initialPortfolio = {
        cashBalance: 100,
        holdings: [],
        totalValue: 100,
        todayChange: 0,
        todayChangePercent: 0,
      };

      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: initialPortfolio,
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'Insufficient funds',
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
          'buy',
          100,
          100,
          'Tech'
        );

        expect(tradeResult.success).toBe(false);
        expect(tradeResult.error).toBe('Insufficient funds');
      });

      // Portfolio should remain unchanged
      expect(result.current.portfolio.cashBalance).toBe(100);
    });
  });
});

