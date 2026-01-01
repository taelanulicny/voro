import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    category: string,
    idempotencyKey?: string
  ) => Promise<{ success: boolean; error?: string; executionPrice?: number }>;
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

// Storage keys
const PENDING_TRADES_KEY = '@moro_pending_trades';

// Interface for pending trade tracking
interface PendingTrade {
  idempotencyKey: string;
  entityId: number;
  entityName: string;
  entityTicker: string;
  type: 'buy' | 'sell';
  quantity: number;
  pricePerToken: number;
  category: string;
  timestamp: number;
  previousCashBalance: number;
  previousHoldings: Holding[];
}

export const TradingProvider = ({ children }: { children: ReactNode }) => {
  const { token, isAuthenticated, getToken } = useAuth();
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

  // Recover pending trades on app startup
  useEffect(() => {
    if (isAuthenticated && token) {
      recoverPendingTrades();
    }
  }, [isAuthenticated, token, recoverPendingTrades]);

  // Handle app state changes (background/foreground) to recover pending trades
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated && token) {
        // App came to foreground - check for pending trades that may have completed
        recoverPendingTrades();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, token, recoverPendingTrades]);

  // Global entity prices - fetched from backend, initialized as empty object
  // Prices will be populated by fetchEntityPrices() on mount
  const [entityPrices, setEntityPrices] = useState<Record<number, number>>({});

  // Portfolio value history for chart animation
  const [portfolioHistory, setPortfolioHistory] = useState<number[]>([]);
  const portfolioHistoryRef = useRef<number[]>([]);
  const maxHistoryLength = 100;

  // Pending trades tracking
  const pendingTradesRef = useRef<Map<string, PendingTrade>>(new Map());

  // Save pending trade to AsyncStorage
  const savePendingTrade = useCallback(async (pendingTrade: PendingTrade) => {
    try {
      pendingTradesRef.current.set(pendingTrade.idempotencyKey, pendingTrade);
      const tradesArray = Array.from(pendingTradesRef.current.values());
      await AsyncStorage.setItem(PENDING_TRADES_KEY, JSON.stringify(tradesArray));
    } catch (error) {
      console.error('Error saving pending trade:', error);
    }
  }, []);

  // Remove pending trade from AsyncStorage
  const removePendingTrade = useCallback(async (idempotencyKey: string) => {
    try {
      pendingTradesRef.current.delete(idempotencyKey);
      const tradesArray = Array.from(pendingTradesRef.current.values());
      if (tradesArray.length > 0) {
        await AsyncStorage.setItem(PENDING_TRADES_KEY, JSON.stringify(tradesArray));
      } else {
        await AsyncStorage.removeItem(PENDING_TRADES_KEY);
      }
    } catch (error) {
      console.error('Error removing pending trade:', error);
    }
  }, []);

  // Load pending trades from AsyncStorage
  const loadPendingTrades = useCallback(async (): Promise<PendingTrade[]> => {
    try {
      const data = await AsyncStorage.getItem(PENDING_TRADES_KEY);
      if (data) {
        const trades: PendingTrade[] = JSON.parse(data);
        // Restore to ref
        pendingTradesRef.current.clear();
        trades.forEach(trade => {
          pendingTradesRef.current.set(trade.idempotencyKey, trade);
        });
        return trades;
      }
      return [];
    } catch (error) {
      console.error('Error loading pending trades:', error);
      return [];
    }
  }, []);

  // Verify and recover pending trades on app startup
  const recoverPendingTrades = useCallback(async () => {
    if (!token || !isAuthenticated || !isBackendConfigured()) return;

    try {
      const pendingTrades = await loadPendingTrades();
      if (pendingTrades.length === 0) return;

      console.info(`Recovering ${pendingTrades.length} pending trade(s) that may have completed...`);

      // Refresh portfolio from server to get the true state
      // If trades completed, portfolio will reflect them
      // If trades didn't complete, portfolio will have the old state
      await fetchPortfolio();

      // For each pending trade, verify if it completed by attempting idempotent execution
      // The backend will return existing result if trade already completed
      for (const pendingTrade of pendingTrades) {
        try {
          // Attempt to re-execute with same idempotency key (idempotent operation)
          // If trade completed, backend returns existing result
          // If trade didn't complete, it will execute now or fail with appropriate error
          const verifyResponse = await authenticatedRequest<{
            cashBalance: number;
            holdings: Holding[];
          }>('/api/trade/execute', token, {
            method: 'POST',
            body: JSON.stringify({
              entityId: pendingTrade.entityId,
              type: pendingTrade.type,
              quantity: pendingTrade.quantity,
              pricePerToken: pendingTrade.pricePerToken,
              idempotencyKey: pendingTrade.idempotencyKey,
            }),
          }, getToken);

          if (verifyResponse.success && verifyResponse.data) {
            // Trade completed (either just now or previously)
            console.info(`Pending trade ${pendingTrade.idempotencyKey} verified - trade completed`);
            await removePendingTrade(pendingTrade.idempotencyKey);
            
            // Update portfolio with verified state
            setCashBalance(verifyResponse.data.cashBalance);
            setHoldings(verifyResponse.data.holdings);
          } else {
            // Trade failed - rollback to previous state (already done by fetchPortfolio)
            console.info(`Pending trade ${pendingTrade.idempotencyKey} failed: ${verifyResponse.error}`);
            await removePendingTrade(pendingTrade.idempotencyKey);
          }
        } catch (error) {
          console.error(`Error verifying pending trade ${pendingTrade.idempotencyKey}:`, error);
          // On error, keep the pending trade for next recovery attempt
          // Don't remove it yet - might be network issue
        }
      }

      // Final portfolio refresh to ensure everything is synced
      await fetchPortfolio();
    } catch (error) {
      console.error('Error recovering pending trades:', error);
    }
  }, [token, isAuthenticated, loadPendingTrades, removePendingTrade, fetchPortfolio, getToken]);

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

  // Poll for price updates with exponential backoff on errors
  useEffect(() => {
    if (!isBackendConfigured()) return;

    const abortController = new AbortController();
    let consecutiveErrors = 0;
    let currentInterval = 5000; // Start with 5 seconds
    const baseInterval = 5000;
    const maxInterval = 120000; // Max 2 minutes
    const errorThreshold = 3; // Stop polling after 3 consecutive errors
    
    const poll = async () => {
      if (abortController.signal.aborted) return;
      
      try {
        await fetchEntityPrices(abortController.signal);
        
        // Only fetch portfolio if authenticated
        if (isAuthenticated && token && !abortController.signal.aborted) {
          await fetchPortfolio(abortController.signal);
        }
        
        // Reset on success
        consecutiveErrors = 0;
        currentInterval = baseInterval;
      } catch (err: any) {
        if (err.name !== 'AbortError' && err.error !== 'Request cancelled') {
          consecutiveErrors++;
          console.debug(`Error fetching data (${consecutiveErrors} consecutive):`, err);
          
          // Increase interval with exponential backoff
          if (consecutiveErrors < errorThreshold) {
            currentInterval = Math.min(baseInterval * Math.pow(2, consecutiveErrors - 1), maxInterval);
          } else {
            // Stop polling after threshold, require manual refresh
            console.warn('Too many consecutive errors, stopping automatic polling');
            return;
          }
        }
      }
      
      // Schedule next poll with current interval
      if (!abortController.signal.aborted && consecutiveErrors < errorThreshold) {
        setTimeout(poll, currentInterval);
      }
    };
    
    // Start polling
    poll();

    return () => {
      abortController.abort();
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
    category: string,
    idempotencyKey?: string
  ): Promise<{ success: boolean; error?: string; executionPrice?: number }> => {
    // Check Market Hours
    if (!isMarketOpen) {
      console.warn('Trade rejected: ' + marketStatusMessage);
      return { success: false, error: marketStatusMessage };
    }

    if (!token) {
      console.error('No authentication token');
      return { success: false, error: 'Not authenticated. Please log in.' };
    }

    // Store current state for rollback
    const previousCashBalance = cashBalance;
    const previousHoldings = [...holdings];
    const previousTodayChange = todayChange;
    const previousTodayChangePercent = todayChangePercent;

    // Optimistic update: update UI immediately
    try {
      setIsLoading(true);
      
      const totalAmount = quantity * pricePerToken;
      let optimisticCashBalance = cashBalance;
      let optimisticHoldings = [...holdings];
      let optimisticTodayChange = todayChange;
      let optimisticTodayChangePercent = todayChangePercent;

      if (type === 'buy') {
        // Optimistic buy update
        optimisticCashBalance = cashBalance - totalAmount;
        const existingHoldingIndex = optimisticHoldings.findIndex(h => h.entityId === entityId);
        
        if (existingHoldingIndex >= 0) {
          // Update existing holding
          const existing = optimisticHoldings[existingHoldingIndex];
          const newQuantity = existing.quantity + quantity;
          const newTotalCost = existing.totalCost + totalAmount;
          const newAverageCost = newTotalCost / newQuantity;
          
          optimisticHoldings[existingHoldingIndex] = {
            ...existing,
            quantity: newQuantity,
            averageCost: newAverageCost,
            totalCost: newTotalCost,
            totalValue: newQuantity * pricePerToken,
            profitLoss: (newQuantity * pricePerToken) - newTotalCost,
            profitLossPercent: ((newQuantity * pricePerToken) - newTotalCost) / newTotalCost * 100,
          };
        } else {
          // Create new holding
          optimisticHoldings.push({
            entityId,
            entityName,
            entityTicker,
            quantity,
            averageCost: pricePerToken,
            currentPrice: pricePerToken,
            totalValue: quantity * pricePerToken,
            totalCost: totalAmount,
            profitLoss: 0,
            profitLossPercent: 0,
            category,
          });
        }
      } else {
        // Optimistic sell update
        optimisticCashBalance = cashBalance + totalAmount;
        const existingHoldingIndex = optimisticHoldings.findIndex(h => h.entityId === entityId);
        
        if (existingHoldingIndex >= 0) {
          const existing = optimisticHoldings[existingHoldingIndex];
          const newQuantity = existing.quantity - quantity;
          
          if (newQuantity <= 0) {
            // Remove holding
            optimisticHoldings = optimisticHoldings.filter(h => h.entityId !== entityId);
          } else {
            // Update holding
            const newTotalCost = existing.totalCost * (newQuantity / existing.quantity);
            optimisticHoldings[existingHoldingIndex] = {
              ...existing,
              quantity: newQuantity,
              totalCost: newTotalCost,
              totalValue: newQuantity * pricePerToken,
              profitLoss: (newQuantity * pricePerToken) - newTotalCost,
              profitLossPercent: ((newQuantity * pricePerToken) - newTotalCost) / newTotalCost * 100,
            };
          }
        }
      }

      // Apply optimistic updates
      setCashBalance(optimisticCashBalance);
      setHoldings(optimisticHoldings);
      
      // Recalculate portfolio value for today change
      const holdingsValue = optimisticHoldings.reduce((sum, h) => sum + h.totalValue, 0);
      const totalValue = optimisticCashBalance + holdingsValue;
      const totalCost = optimisticHoldings.reduce((sum, h) => sum + h.totalCost, 0);
      const totalProfitLoss = optimisticHoldings.reduce((sum, h) => sum + h.profitLoss, 0);
      optimisticTodayChange = totalProfitLoss * 0.1; // Mock: 10% of P&L
      optimisticTodayChangePercent = totalValue > 0 ? (optimisticTodayChange / totalValue) * 100 : 0;
      setTodayChange(optimisticTodayChange);
      setTodayChangePercent(optimisticTodayChangePercent);

      // Generate idempotency key if not provided
      const tradeIdempotencyKey = idempotencyKey || `${entityId}-${type}-${quantity}-${pricePerToken}-${Date.now()}`;

      // Save pending trade to AsyncStorage before API call (for recovery if app is killed)
      const pendingTrade: PendingTrade = {
        idempotencyKey: tradeIdempotencyKey,
        entityId,
        entityName,
        entityTicker,
        type,
        quantity,
        pricePerToken,
        category,
        timestamp: Date.now(),
        previousCashBalance,
        previousHoldings,
      };
      await savePendingTrade(pendingTrade);

      // Make API call with retry logic (3 attempts with exponential backoff)
      const response = await authenticatedRequest<{
        cashBalance: number;
        holdings: Holding[];
        totalValue: number;
        todayChange: number;
        todayChangePercent: number;
        executionDetails?: {
          requestedPrice: number;
          executionPrice: number;
          priceAdjusted: boolean;
          slippagePercent: number;
        };
      }>('/api/trade/execute', token, {
        method: 'POST',
        body: JSON.stringify({
          entityId,
          type,
          quantity,
          pricePerToken,
          idempotencyKey: tradeIdempotencyKey,
        }),
        retryConfig: {
          maxRetries: 3,
          retryable: true,
        },
      }, getToken);

      if (response.success && response.data) {
        // Check if execution price was adjusted (slippage protection applied)
        if (response.data.executionDetails?.priceAdjusted) {
          const details = response.data.executionDetails;
          console.info(
            `Trade executed with price adjustment: Requested ${details.requestedPrice.toFixed(2)}, ` +
            `Executed at ${details.executionPrice.toFixed(2)} (${details.slippagePercent.toFixed(2)}% difference)`
          );
        }

        // Update with actual backend response (replaces optimistic update)
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
        
        // Invalidate cache for portfolio and prices after trade
        invalidateCache('/portfolio');
        invalidateCache('/prices');

        // Clear pending trade since it completed successfully
        await removePendingTrade(tradeIdempotencyKey);

        const executionPrice = response.data.executionDetails?.executionPrice || pricePerToken;
        return { 
          success: true, 
          executionPrice,
          error: response.data.executionDetails?.priceAdjusted 
            ? `Trade executed at ${executionPrice.toFixed(2)} (adjusted from ${pricePerToken.toFixed(2)})` 
            : undefined,
        };
      } else {
        // Rollback optimistic update on failure
        setCashBalance(previousCashBalance);
        setHoldings(previousHoldings);
        setTodayChange(previousTodayChange);
        setTodayChangePercent(previousTodayChangePercent);
        
        // Keep pending trade if it's a network/transient error (might retry)
        // Only remove if it's a definite failure (e.g., insufficient funds)
        const errorMessage = response.error || 'Trade execution failed';
        const isDefiniteFailure = errorMessage.includes('Insufficient') || 
                                  errorMessage.includes('Market is closed') ||
                                  errorMessage.includes('Price slippage');
        
        if (isDefiniteFailure) {
          await removePendingTrade(tradeIdempotencyKey);
        }
        // Otherwise keep it for recovery on next app start
        
        console.error('Trade execution failed:', errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      // Rollback optimistic update on error
      setCashBalance(previousCashBalance);
      setHoldings(previousHoldings);
      setTodayChange(previousTodayChange);
      setTodayChangePercent(previousTodayChangePercent);
      
      // Keep pending trade for network errors (will be recovered on next app start)
      // The trade might have completed on server even if network failed
      
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while executing the trade';
      console.error('Error executing trade:', errorMessage);
      return { success: false, error: errorMessage };
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
