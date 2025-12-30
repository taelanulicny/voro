import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { Portfolio, Holding, UserTransaction } from '../types';
import { authenticatedRequest, apiRequest, isBackendConfigured } from '../config/api';
import { useAuth } from './AuthContext';
import { MOCK_ENTITIES } from '../utils/mockEntities';
import {
  PortfolioResponseSchema,
  TransactionsResponseSchema,
  BackendEntityArraySchema,
  safeValidate,
  validateArrayLoose,
} from '../validators';

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

  // Global entity prices - fetched from backend, initialized as empty object
  // Prices will be populated by fetchEntityPrices() on mount
  const [entityPrices, setEntityPrices] = useState<Record<number, number>>({});

  // Portfolio value history for chart animation
  const [portfolioHistory, setPortfolioHistory] = useState<number[]>([]);
  const portfolioHistoryRef = useRef<number[]>([]);
  const maxHistoryLength = 100;

  // Fetch portfolio from backend
  const fetchPortfolio = useCallback(async (signal?: AbortSignal) => {
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
        signal,
      });

      if (response.success && response.data) {
        // Validate portfolio response
        const validatedPortfolio = safeValidate(PortfolioResponseSchema, response.data);
        if (validatedPortfolio) {
          setCashBalance(validatedPortfolio.cashBalance);
          setHoldings(validatedPortfolio.holdings);
          setTodayChange(validatedPortfolio.todayChange);
          setTodayChangePercent(validatedPortfolio.todayChangePercent);

          // Update entity prices from holdings
          const prices: Record<number, number> = {};
          validatedPortfolio.holdings.forEach((holding) => {
            prices[holding.entityId] = holding.currentPrice;
          });
          setEntityPrices((prev) => ({ ...prev, ...prices }));
        } else {
          console.warn('Invalid portfolio response format');
        }
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
  const fetchTransactions = useCallback(async (signal?: AbortSignal) => {
    if (!token || !isAuthenticated || !isBackendConfigured()) return;

    try {
      const response = await authenticatedRequest<{
        transactions: UserTransaction[];
        lastEvaluatedKey?: string;
      }>('/api/transactions', token, {
        method: 'GET',
        signal,
      });

      if (response.success && response.data) {
        // Validate transactions response
        const validatedResponse = safeValidate(TransactionsResponseSchema, response.data);
        if (validatedResponse) {
          const mappedTransactions: UserTransaction[] = validatedResponse.transactions.map((t) => ({
            id: t.id,
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
        } else {
          console.warn('Invalid transactions response format');
        }
      }
    } catch (error) {
      // Silently handle errors - don't crash the app
      console.debug('Error fetching transactions (backend may not be running):', error);
    }
  }, [token, isAuthenticated]);

  // Fetch entity prices - public endpoint, no auth required
  const fetchEntityPrices = useCallback(async (signal?: AbortSignal) => {
    if (!isBackendConfigured()) return;

    try {
      // Use the new dedicated prices endpoint for better performance
      const response = await apiRequest<{ 
        success?: boolean; 
        data?: Record<number, number>;
        timestamp?: string;
      }>('/api/prices', {
        method: 'GET',
        signal,
      });

      if (response.success && response.data) {
        // response.data is a Record<number, number> (entityId -> price)
        const prices = response.data;
        if (Object.keys(prices).length > 0) {
          setEntityPrices(prices);
          setLastPriceUpdateTime(Date.now());
        }
      } else {
        // Fallback to old endpoint if new one doesn't exist yet
        const fallbackResponse = await apiRequest<{ success?: boolean; data?: unknown[] }>('/api/entities', {
          method: 'GET',
          signal,
        });

        if (fallbackResponse.success && fallbackResponse.data) {
          const dataArray = Array.isArray(fallbackResponse.data) ? fallbackResponse.data : [];
          const validatedEntities = safeValidate(BackendEntityArraySchema, dataArray);
          if (validatedEntities && validatedEntities.length > 0) {
            const prices: Record<number, number> = {};
            validatedEntities.forEach((entity) => {
              prices[entity.entityId] = entity.currentPrice || entity.basePrice;
            });
            setEntityPrices(prices);
            setLastPriceUpdateTime(Date.now());
          }
        }
      }
    } catch (error) {
      // Silently handle errors - don't crash the app
      console.debug('Error fetching entity prices (backend may not be running):', error);
    }
  }, []);

  // Fetch entity prices on mount (public endpoint, no auth required)
  useEffect(() => {
    const abortController = new AbortController();
    fetchEntityPrices(abortController.signal).catch(err => {
      if (err.name !== 'AbortError' && err.error !== 'Request cancelled') {
        console.debug('Error fetching entity prices:', err);
      }
    });
    return () => {
      abortController.abort();
    };
  }, [fetchEntityPrices]);

  // Load portfolio and transactions when auth changes (requires auth)
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    
    const abortController = new AbortController();
    
    // Wrap in try-catch to prevent app crashes
    fetchPortfolio(abortController.signal).catch(err => {
      if (err.name !== 'AbortError' && err.error !== 'Request cancelled') {
        console.debug('Error fetching portfolio:', err);
      }
    });
    fetchTransactions(abortController.signal).catch(err => {
      if (err.name !== 'AbortError' && err.error !== 'Request cancelled') {
        console.debug('Error fetching transactions:', err);
      }
    });
    
    return () => {
      abortController.abort();
    };
  }, [isAuthenticated, token, fetchPortfolio, fetchTransactions]);

  // Poll for price updates every 30 seconds (entities are public)
  useEffect(() => {
    if (!isBackendConfigured()) return;

    const abortController = new AbortController();
    
    const interval = setInterval(() => {
      if (abortController.signal.aborted) return;
      fetchEntityPrices(abortController.signal).catch(err => {
        if (err.name !== 'AbortError' && err.error !== 'Request cancelled') {
          console.debug('Error fetching entity prices:', err);
        }
      });
      // Only fetch portfolio if authenticated
      if (isAuthenticated && token && !abortController.signal.aborted) {
        fetchPortfolio(abortController.signal).catch(err => {
          if (err.name !== 'AbortError' && err.error !== 'Request cancelled') {
            console.debug('Error fetching portfolio:', err);
          }
        });
      }
    }, 30000); // Reduced from 5s to 30s to avoid excessive API calls

    return () => {
      abortController.abort();
      clearInterval(interval);
    };
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
    // Always check backend prices first
    if (entityPrices[entityId] !== undefined) {
      return entityPrices[entityId];
    }
    // Fallback: use basePrice from MOCK_ENTITIES only if backend unavailable
    // This ensures we always have a price to display, even when backend is not configured
    const entity = MOCK_ENTITIES.find(e => e.id === entityId);
    if (entity) {
      return entity.basePrice;
    }
    return 100; // Ultimate fallback if entity not found
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
