import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { Portfolio, Holding, UserTransaction } from '../types';
import { authenticatedRequest, apiRequest, isBackendConfigured } from '../config/api';
import { useAuth } from './AuthContext';
import { MOCK_ENTITIES } from '../utils/mockEntities';

interface TradingContextType {
  portfolio: Portfolio;
  transactions: UserTransaction[];
  isLoading: boolean;
  executeTrade: (
    entityId: number,
    entityName: string,
    entityTicker: string,
    type: 'buy' | 'sell',
    quantity: number,
    pricePerToken: number,
    category: string
  ) => Promise<boolean>;
  getHolding: (entityId: number) => Holding | undefined;
  updatePrices: (entityId: number, newPrice: number) => void;
  resetPortfolio: () => void;
  getEntityPrice: (entityId: number) => number;
  getAllEntityPrices: () => Record<number, number>;
  portfolioHistory: number[];
  fetchPortfolio: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  isMarketOpen: boolean;
  marketStatusMessage: string;
  lastPriceUpdateTime: number | null;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const INITIAL_CASH_BALANCE = 10000;

export const TradingProvider = ({ children }: { children: ReactNode }) => {
  const { token, isAuthenticated } = useAuth();
  const [cashBalance, setCashBalance] = useState(INITIAL_CASH_BALANCE);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [todayChange, setTodayChange] = useState(0);
  const [todayChangePercent, setTodayChangePercent] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [lastPriceUpdateTime, setLastPriceUpdateTime] = useState<number | null>(Date.now());

  // Market Hours Logic
  const [isMarketOpen, setIsMarketOpen] = useState(true);
  const [marketStatusMessage, setMarketStatusMessage] = useState('');

  const checkMarketHours = useCallback(() => {
    // Get current time in EST
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const estOffset = -5 * 60 * 60 * 1000; // EST is UTC-5
    const estTime = new Date(utcTime + estOffset);

    const hours = estTime.getHours();

    // Market Closed: 2:00 AM - 8:00 AM EST
    const isClosed = hours >= 2 && hours < 8;

    setIsMarketOpen(!isClosed);
    setMarketStatusMessage(isClosed ? 'Market Closed (2am-8am EST)' : 'Market Open');
  }, []);

  // Check market hours every minute
  useEffect(() => {
    checkMarketHours();
    const interval = setInterval(checkMarketHours, 60000);
    return () => clearInterval(interval);
  }, [checkMarketHours]);

  // Global entity prices - fetched from backend or initialized with hardcoded 3-5% moves
  const [entityPrices, setEntityPrices] = useState<Record<number, number>>(() => {
    // Initialize prices with hardcoded percentage changes (3-5% moves)
    const initialPrices: Record<number, number> = {};
    // Predefined percentage changes for each entity (alternating between positive and negative, 3-5% range)
    const changePercentages: Record<number, number> = {
      10: -4.2, 11: 3.8, 12: -3.5, 13: 4.7, 14: -3.9, 15: 4.1, 16: -4.5, 17: 3.6, 18: -4.3, 19: 4.9, 20: -3.7,
      21: 4.4, 22: -3.8, 23: 4.2, 24: -4.1, 25: 3.9, 26: -4.6, 27: 3.7, 28: -4.0, 29: 4.3, 30: -3.6,
      31: 4.5, 32: -3.4, 33: 4.8, 34: -3.9, 35: 4.0, 36: -4.2, 37: 3.8, 38: -4.4, 39: 3.5,
      40: 4.6, 41: -3.7, 42: 4.3, 43: -4.1, 44: 3.9, 45: -4.5, 46: 4.2, 47: -3.8, 48: 4.4, 49: -3.6,
    };

    MOCK_ENTITIES.forEach((entity) => {
      // Get hardcoded percentage change (3-5% range), default to 0 if not specified
      const changePercent = changePercentages[entity.id] || 0;
      // Cap at ±12% maximum
      const cappedChangePercent = Math.max(-12, Math.min(12, changePercent));
      // Calculate price based on basePrice with the percentage change
      let price = entity.basePrice * (1 + cappedChangePercent / 100);
      // Ensure price stays within $80-$200 range
      price = Math.max(80, Math.min(200, price));
      // Round to 2 decimal places (cents)
      price = Math.round(price * 100) / 100;
      initialPrices[entity.id] = price;
    });
    return initialPrices;
  });

  // Portfolio value history for chart animation
  const [portfolioHistory, setPortfolioHistory] = useState<number[]>([]);
  const portfolioHistoryRef = useRef<number[]>([]);
  const maxHistoryLength = 100;

  // Fetch portfolio from backend
  const fetchPortfolio = useCallback(async () => {
    if (!token || !isAuthenticated || !isBackendConfigured()) return;

    try {
      setIsLoading(true);
      const response = await authenticatedRequest<{
        cashBalance: number;
        holdings: Holding[];
        totalValue: number;
        todayChange: number;
        todayChangePercent: number;
      }>('/api/portfolio', token, {
        method: 'GET',
      });

      if (response.success && response.data) {
        setCashBalance(response.data.cashBalance);
        setHoldings(response.data.holdings);
        setTodayChange(response.data.todayChange);
        setTodayChangePercent(response.data.todayChangePercent);

        // Update entity prices from holdings
        const prices: Record<number, number> = {};
        response.data.holdings.forEach((holding) => {
          prices[holding.entityId] = holding.currentPrice;
        });
        setEntityPrices((prev) => ({ ...prev, ...prices }));
      } else if (response.error && response.error.includes('not configured')) {
        // Backend not configured - use default values
        console.log('Backend not configured, using default portfolio values');
      }
    } catch (error) {
      // Silently handle errors - don't crash the app
      console.debug('Error fetching portfolio (backend may not be running):', error);
    } finally {
      setIsLoading(false);
    }
  }, [token, isAuthenticated]);

  // Fetch transactions from backend
  const fetchTransactions = useCallback(async () => {
    if (!token || !isAuthenticated || !isBackendConfigured()) return;

    try {
      const response = await authenticatedRequest<{
        transactions: UserTransaction[];
        lastEvaluatedKey?: string;
      }>('/api/transactions', token, {
        method: 'GET',
      });

      if (response.success && response.data) {
        // Map backend transaction format to frontend format
        const mappedTransactions: UserTransaction[] = response.data.transactions.map((t: any) => ({
          id: t.transactionId || t.id,
          entityId: t.entityId,
          entityName: t.entityName,
          entityTicker: t.entityTicker,
          type: t.type,
          quantity: t.quantity,
          pricePerToken: t.pricePerToken,
          totalAmount: t.totalAmount,
          timestamp: t.timestamp,
          category: t.category,
        }));
        setTransactions(mappedTransactions);
      }
    } catch (error) {
      // Silently handle errors - don't crash the app
      console.debug('Error fetching transactions (backend may not be running):', error);
    }
  }, [token, isAuthenticated]);

  // Fetch entity prices - public endpoint, no auth required
  const fetchEntityPrices = useCallback(async () => {
    if (!isBackendConfigured()) return;

    try {
      // Use apiRequest (not authenticated) since entities are public
      const response = await apiRequest<any[]>('/api/entities', {
        method: 'GET',
      });

      if (response.success && response.data) {
        const prices: Record<number, number> = {};
        response.data.forEach((entity: any) => {
          prices[entity.entityId] = entity.currentPrice || entity.basePrice;
        });
        setEntityPrices(prices);
        setLastPriceUpdateTime(Date.now());
      }
    } catch (error) {
      // Silently handle errors - don't crash the app
      console.debug('Error fetching entity prices (backend may not be running):', error);
    }
  }, []);

  // Fetch entity prices on mount (public endpoint, no auth required)
  useEffect(() => {
    fetchEntityPrices().catch(err => console.debug('Error fetching entity prices:', err));
  }, [fetchEntityPrices]);

  // Load portfolio and transactions when auth changes (requires auth)
  useEffect(() => {
    if (isAuthenticated && token) {
      // Wrap in try-catch to prevent app crashes
      fetchPortfolio().catch(err => console.debug('Error fetching portfolio:', err));
      fetchTransactions().catch(err => console.debug('Error fetching transactions:', err));
    }
  }, [isAuthenticated, token, fetchPortfolio, fetchTransactions]);

  // Poll for price updates every 30 seconds (entities are public)
  useEffect(() => {
    if (!isBackendConfigured()) return;

    const interval = setInterval(() => {
      fetchEntityPrices().catch(err => console.debug('Error fetching entity prices:', err));
      // Only fetch portfolio if authenticated
      if (isAuthenticated && token) {
        fetchPortfolio().catch(err => console.debug('Error fetching portfolio:', err));
      }
    }, 30000); // Reduced from 5s to 30s to avoid excessive API calls

    return () => clearInterval(interval);
  }, [isAuthenticated, token, fetchEntityPrices, fetchPortfolio]);

  // Update portfolio history
  useEffect(() => {
    const totalValue = holdings.reduce((sum, h) => sum + h.totalValue, 0) + cashBalance;

    portfolioHistoryRef.current = [...portfolioHistoryRef.current, totalValue];
    if (portfolioHistoryRef.current.length > maxHistoryLength) {
      portfolioHistoryRef.current = portfolioHistoryRef.current.slice(-maxHistoryLength);
    }
    setPortfolioHistory([...portfolioHistoryRef.current]);
  }, [holdings, cashBalance]);

  const executeTrade = async (
    entityId: number,
    entityName: string,
    entityTicker: string,
    type: 'buy' | 'sell',
    quantity: number,
    pricePerToken: number,
    category: string
  ): Promise<boolean> => {
    // Check Market Hours
    if (!isMarketOpen) {
      console.warn('Trade rejected: ' + marketStatusMessage);
      return false;
    }

    if (!token) {
      console.error('No authentication token');
      return false;
    }

    try {
      setIsLoading(true);
      const response = await authenticatedRequest<{
        cashBalance: number;
        holdings: Holding[];
        totalValue: number;
        todayChange: number;
        todayChangePercent: number;
      }>('/api/trade/execute', token, {
        method: 'POST',
        body: JSON.stringify({
          entityId,
          type,
          quantity,
          pricePerToken,
        }),
      });

      if (response.success && response.data) {
        // Update local state with backend response
        setCashBalance(response.data.cashBalance);
        setHoldings(response.data.holdings);
        setTodayChange(response.data.todayChange);
        setTodayChangePercent(response.data.todayChangePercent);

        // Update entity prices
        const prices: Record<number, number> = {};
        response.data.holdings.forEach((holding) => {
          prices[holding.entityId] = holding.currentPrice;
        });
        setEntityPrices((prev) => ({ ...prev, ...prices }));
        setLastPriceUpdateTime(Date.now());


        // Refresh transactions
        await fetchTransactions();

        return true;
      } else {
        console.error('Trade execution failed:', response.error);
        return false;
      }
    } catch (error) {
      console.error('Error executing trade:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getHolding = (entityId: number): Holding | undefined => {
    return holdings.find(h => h.entityId === entityId);
  };

  const updatePrices = (entityId: number, newPrice: number) => {
    /**
     * TODO: Implement Custom Price Formula
     * 
     * Future implementation will use a specific formula to calculate price changes
     * based on market events, user activity, and randomized factors.
     * 
     * For now, this function updates the local state with the provided price.
     */
    setEntityPrices((prev) => ({ ...prev, [entityId]: newPrice }));
    setLastPriceUpdateTime(Date.now());

    // Update holdings with new price
    setHoldings((prev) =>
      prev.map(h => {
        if (h.entityId === entityId) {
          const newTotalValue = h.quantity * newPrice;
          const newProfitLoss = newTotalValue - h.totalCost;
          const newProfitLossPercent = (newProfitLoss / h.totalCost) * 100;

          return {
            ...h,
            currentPrice: newPrice,
            totalValue: newTotalValue,
            profitLoss: newProfitLoss,
            profitLossPercent: newProfitLossPercent,
          };
        }
        return h;
      })
    );
  };

  const resetPortfolio = () => {
    setCashBalance(INITIAL_CASH_BALANCE);
    setHoldings([]);
    setTransactions([]);
    setTodayChange(0);
    setTodayChangePercent(0);
    portfolioHistoryRef.current = [];
    setPortfolioHistory([]);
    setEntityPrices({});
  };

  const getEntityPrice = (entityId: number): number => {
    if (entityPrices[entityId] !== undefined) {
      return entityPrices[entityId];
    }
    // Fallback: calculate price with 3-5% move from basePrice
    const entity = MOCK_ENTITIES.find(e => e.id === entityId);
    if (entity) {
      // Use entity ID to determine a consistent change percentage (alternating pattern)
      const changePercent = (entityId % 2 === 0 ? 1 : -1) * (3 + (entityId % 3) * 0.5); // 3-5% range
      const cappedChangePercent = Math.max(-12, Math.min(12, changePercent));
      let price = entity.basePrice * (1 + cappedChangePercent / 100);
      price = Math.max(80, Math.min(200, price));
      price = Math.round(price * 100) / 100;
      // Cache it
      setEntityPrices(prev => ({ ...prev, [entityId]: price }));
      return price;
    }
    return 100; // Ultimate fallback
  };

  const getAllEntityPrices = (): Record<number, number> => {
    return entityPrices;
  };

  const portfolio: Portfolio = {
    cashBalance,
    totalValue: holdings.reduce((sum, h) => sum + h.totalValue, 0) + cashBalance,
    holdings,
    todayChange,
    todayChangePercent,
  };

  return (
    <TradingContext.Provider
      value={{
        portfolio,
        transactions,
        isLoading,
        executeTrade,
        getHolding,
        updatePrices,
        resetPortfolio,
        getEntityPrice,
        getAllEntityPrices,
        portfolioHistory,
        fetchPortfolio,
        fetchTransactions,
        isMarketOpen,
        marketStatusMessage,
        lastPriceUpdateTime,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (context === undefined) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
};
