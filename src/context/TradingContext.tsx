import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { Portfolio, Holding, UserTransaction } from '../types';
import { authenticatedRequest, isBackendConfigured } from '../config/api';
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

  // Fetch entity prices
  const fetchEntityPrices = useCallback(async () => {
    if (!token || !isAuthenticated || !isBackendConfigured()) return;

    try {
      const response = await authenticatedRequest<any[]>('/api/entities', token, {
        method: 'GET',
      });

      if (response.success && response.data) {
        const prices: Record<number, number> = {};
        response.data.forEach((entity: any) => {
          prices[entity.entityId] = entity.currentPrice || entity.basePrice;
        });
        setEntityPrices(prices);
      }
    } catch (error) {
      // Silently handle errors - don't crash the app
      console.debug('Error fetching entity prices (backend may not be running):', error);
    }
  }, [token, isAuthenticated]);

  // Load portfolio and transactions on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated && token) {
      // Wrap in try-catch to prevent app crashes
      fetchPortfolio().catch(err => console.error('Error fetching portfolio:', err));
      fetchTransactions().catch(err => console.error('Error fetching transactions:', err));
      fetchEntityPrices().catch(err => console.error('Error fetching entity prices:', err));
    }
  }, [isAuthenticated, token, fetchPortfolio, fetchTransactions, fetchEntityPrices]);

  // Poll for price updates every 5 seconds
  useEffect(() => {
    if (!isAuthenticated || !token || !isBackendConfigured()) return;

    const interval = setInterval(() => {
      fetchEntityPrices().catch(err => console.error('Error fetching entity prices:', err));
      fetchPortfolio().catch(err => console.error('Error fetching portfolio:', err));
    }, 5000);

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
    setEntityPrices((prev) => ({ ...prev, [entityId]: newPrice }));
    
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
      let changePercent: number;
      
      // Prediction Markets (IDs 300-325) get specific varied change percentages
      if (entityId >= 300 && entityId <= 325) {
        // Specific change percentages for each prediction market entity
        const predictionMarketChanges: Record<number, number> = {
          300: 2.38,   // Kalshi - up
          301: -1.45,  // Polymarket - down
          302: 3.12,   // PredictIt - up
          303: -2.67,  // Betfair - down
          304: 1.89,   // Smarkets - up
          305: -3.24,  // Augur - down
          306: 2.56,   // Gnosis - up
          307: -1.78,  // Omen - down
          308: 4.23,   // Zeitgeist - up
          309: -2.34,  // PlotX - down
          310: 1.67,   // Reality.eth - up
          311: -3.45,  // Stox - down
          312: 2.89,   // Catnip Exchange - up
          313: -1.23,  // Manifold Markets - down
          314: 3.56,   // Metaculus - up
          315: -2.12,  // Good Judgment Project - down
          316: 1.34,   // Hypermind - up
          317: -4.67,  // Numerai - down
          318: 2.78,   // Kleros - up
          319: -1.56,  // Forecaster - down
          320: 3.89,   // Infer - up
          321: -2.45,  // Crowdwise - down
          322: 1.12,   // Insight Prediction - up
          323: -3.78,  // Cultivat3 - down
          324: 2.23,   // Lay3rs - up
          325: -1.89,  // Polymarket Clone - down
        };
        changePercent = predictionMarketChanges[entityId] || 0;
      } else {
        // Use entity ID to determine a consistent change percentage (alternating pattern)
        changePercent = (entityId % 2 === 0 ? 1 : -1) * (3 + (entityId % 3) * 0.5); // 3-5% range
      }
      
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
