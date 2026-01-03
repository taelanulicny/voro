import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Portfolio, Holding, UserTransaction } from '../types';
import { authenticatedRequest, apiRequest, isBackendConfigured, invalidateCache } from '../config/api';
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
  isExecutingTrade: boolean;
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
  loadMoreTransactions: () => Promise<void>;
  hasMoreTransactions: boolean;
  isLoadingMoreTransactions: boolean;
  isMarketOpen: boolean;
  marketStatusMessage: string;
  lastPriceUpdateTime: number | null;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const INITIAL_CASH_BALANCE = 10000;

// Storage keys
const PENDING_TRADES_KEY = '@moro_pending_trades';
const PRICE_HISTORY_CACHE_KEY = '@moro_price_history_cache';
const OPENING_PRICES_KEY = '@moro_opening_prices';
const PORTFOLIO_HISTORY_KEY = '@moro_portfolio_history';

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
  const [isExecutingTrade, setIsExecutingTrade] = useState(false);
  const [lastPriceUpdateTime, setLastPriceUpdateTime] = useState<number | null>(Date.now());
  
  // Transaction pagination state
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
  const [isLoadingMoreTransactions, setIsLoadingMoreTransactions] = useState(false);
  const lastEvaluatedKeyRef = useRef<string | undefined>(undefined);

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
  
  // Opening prices for today (price at market open - 8am EST)
  const [openingPrices, setOpeningPrices] = useState<Record<number, number>>({});
  
  // Price history cache for offline mode
  const [priceHistoryCache, setPriceHistoryCache] = useState<Record<number, Array<{ timestamp: number; price: number }>>>({});

  // Portfolio value history for chart animation
  const [portfolioHistory, setPortfolioHistory] = useState<number[]>([]);
  const portfolioHistoryRef = useRef<number[]>([]);
  const maxHistoryLength = 100;
  
  // Load portfolio history from AsyncStorage on mount
  useEffect(() => {
    const loadPortfolioHistory = async () => {
      try {
        const data = await AsyncStorage.getItem(PORTFOLIO_HISTORY_KEY);
        if (data) {
          const history: number[] = JSON.parse(data);
          if (Array.isArray(history) && history.length > 0) {
            portfolioHistoryRef.current = history;
            setPortfolioHistory(history);
          }
        }
      } catch (error) {
        console.debug('Error loading portfolio history:', error);
      }
    };
    loadPortfolioHistory();
  }, []);
  
  // Save portfolio history to AsyncStorage whenever it updates
  const savePortfolioHistory = useCallback(async (history: number[]) => {
    try {
      await AsyncStorage.setItem(PORTFOLIO_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.debug('Error saving portfolio history:', error);
    }
  }, []);

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

  // Calculate todayChange from opening prices (client-side calculation)
  const calculateTodayChange = useCallback(async (holdingsToCalculate: Holding[]): Promise<{ todayChange: number; todayChangePercent: number }> => {
    const holdingsValue = holdingsToCalculate.reduce((sum, h) => sum + h.totalValue, 0);
    const totalValue = cashBalance + holdingsValue;
    let calculatedTodayChange = 0;
    let holdingsWithOpeningPrice = 0;
    
    for (const holding of holdingsToCalculate) {
      const openingPrice = await getOpeningPrice(holding.entityId);
      if (openingPrice !== null && openingPrice > 0) {
        // Only calculate if we have a valid opening price (not fallback to current price)
        // Check if opening price is significantly different from current price
        // If they're the same, it means we're using a fallback and shouldn't count it
        const currentPrice = holding.currentPrice || 0;
        const priceDiff = Math.abs(openingPrice - currentPrice);
        const priceDiffPercent = currentPrice > 0 ? (priceDiff / currentPrice) : 0;
        
        // Only use opening price if it's different from current price (not a fallback)
        // Or if the difference is very small (< 0.1%), it's likely the same price
        if (priceDiffPercent > 0.001 || priceDiff > 0.01) {
          const openingValue = holding.quantity * openingPrice;
          const currentValue = holding.totalValue;
          calculatedTodayChange += (currentValue - openingValue);
          holdingsWithOpeningPrice++;
        }
      }
    }
    
    // If we couldn't get opening prices for any holdings, return 0
    // This prevents false calculations when backend also returns 0
    if (holdingsWithOpeningPrice === 0) {
      return { todayChange: 0, todayChangePercent: 0 };
    }
    
    const calculatedTodayChangePercent = totalValue > 0 ? (calculatedTodayChange / totalValue) * 100 : 0;
    return { todayChange: calculatedTodayChange, todayChangePercent: calculatedTodayChangePercent };
  }, [cashBalance, getOpeningPrice]);

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
          
          // Use backend-calculated todayChange (which now uses actual opening prices)
          setTodayChange(validatedPortfolio.todayChange);
          setTodayChangePercent(validatedPortfolio.todayChangePercent);

          // Update entity prices from holdings
          const prices: Record<number, number> = {};
          validatedPortfolio.holdings.forEach((holding) => {
            prices[holding.entityId] = holding.currentPrice;
          });
          setEntityPrices((prev) => ({ ...prev, ...prices }));
          
          // Also recalculate client-side as a fallback/verification
          // (This ensures we have accurate data even if backend calculation is off)
          // Only do this if we have holdings (avoid unnecessary API calls)
          if (validatedPortfolio.holdings.length > 0) {
            calculateTodayChange(validatedPortfolio.holdings).then((result) => {
              // Only update if backend value seems incorrect
              // Use absolute difference to handle small values correctly
              const backendValue = validatedPortfolio.todayChange;
              const clientValue = result.todayChange;
              const absoluteDiff = Math.abs(backendValue - clientValue);
              
              // Calculate percentage difference more safely
              // If backend value is very small (< $0.10), use absolute difference only
              // Otherwise, calculate percentage
              let percentDiff = 0;
              if (Math.abs(backendValue) > 0.1) {
                percentDiff = Math.abs((backendValue - clientValue) / backendValue);
              }
              
              // Only update if:
              // 1. Absolute difference > $1 AND
              // 2. Either backend value is very small (< $0.10) OR percentage difference > 5%
              // This prevents false positives when backend returns near-zero values
              const shouldUpdate = absoluteDiff > 1 && (
                Math.abs(backendValue) < 0.1 || percentDiff > 0.05
              );
              
              if (shouldUpdate) {
                const percentDisplay = Math.abs(backendValue) < 0.1 
                  ? 'N/A (backend value too small)' 
                  : `${(percentDiff * 100).toFixed(1)}%`;
                console.debug(`[Portfolio] todayChange mismatch detected:`, {
                  backendValue: `$${backendValue.toFixed(2)}`,
                  clientValue: `$${clientValue.toFixed(2)}`,
                  absoluteDiff: `$${absoluteDiff.toFixed(2)}`,
                  percentDiff: percentDisplay,
                  holdingsCount: validatedPortfolio.holdings.length,
                  action: 'Using client-calculated value',
                  hint: 'Backend may be missing opening price data. Client calculation uses cached/API opening prices.',
                });
                setTodayChange(clientValue);
                setTodayChangePercent(result.todayChangePercent);
              }
            }).catch((error) => {
              // Silently ignore errors - backend value is acceptable
              console.debug('[Portfolio] Error calculating client-side todayChange (using backend value):', {
                error: error.message || String(error),
                errorType: error.name || 'Error',
                hint: 'Falling back to backend-calculated value',
              });
            });
          }
        } else {
          console.warn('Invalid portfolio response format');
        }
      } else if (response.error && response.error.includes('not configured')) {
        // Backend not configured - use default values
        console.log('Backend not configured, using default portfolio values');
      }
    } catch (error: any) {
      // Silently handle errors - don't crash the app
      console.debug('[Portfolio] Error fetching portfolio:', {
        error: error.message || String(error),
        errorType: error.name || 'Error',
        status: error.status || 'unknown',
        endpoint: '/api/portfolio',
        hint: 'Backend may not be running or configured. Using default/previous portfolio values.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [token, isAuthenticated, calculateTodayChange]);

  // Fetch transactions from backend (first page)
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
          
          // Update pagination state
          lastEvaluatedKeyRef.current = validatedResponse.lastEvaluatedKey;
          setHasMoreTransactions(!!validatedResponse.lastEvaluatedKey);
        } else {
          console.warn('Invalid transactions response format');
        }
      }
    } catch (error: any) {
      // Silently handle errors - don't crash the app
      console.debug('[Transactions] Error fetching transactions:', {
        error: error.message || String(error),
        errorType: error.name || 'Error',
        status: error.status || 'unknown',
        endpoint: '/api/transactions',
        hint: 'Backend may not be running or configured. Transaction history unavailable.',
      });
    }
  }, [token, isAuthenticated]);
  
  // Load more transactions (pagination)
  const loadMoreTransactions = useCallback(async () => {
    if (!token || !isAuthenticated || !isBackendConfigured() || !hasMoreTransactions || isLoadingMoreTransactions) {
      return;
    }

    try {
      setIsLoadingMoreTransactions(true);
      const url = lastEvaluatedKeyRef.current
        ? `/api/transactions?lastKey=${encodeURIComponent(lastEvaluatedKeyRef.current)}`
        : '/api/transactions';
      const response = await authenticatedRequest<{
        transactions: UserTransaction[];
        lastEvaluatedKey?: string;
      }>(url, token, {
        method: 'GET',
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
          
          // Append to existing transactions
          setTransactions((prev) => [...prev, ...mappedTransactions]);
          
          // Update pagination state
          lastEvaluatedKeyRef.current = validatedResponse.lastEvaluatedKey;
          setHasMoreTransactions(!!validatedResponse.lastEvaluatedKey);
        } else {
          console.warn('Invalid transactions response format');
        }
      }
    } catch (error: any) {
      // Silently handle errors - don't crash the app
      console.debug('[Transactions] Error loading more transactions:', {
        error: error.message || String(error),
        errorType: error.name || 'Error',
        status: error.status || 'unknown',
        endpoint: '/api/transactions',
        hint: 'Backend may not be running or configured. Transaction history unavailable.',
      });
    } finally {
      setIsLoadingMoreTransactions(false);
    }
  }, [token, isAuthenticated, hasMoreTransactions, isLoadingMoreTransactions]);

  // Track in-flight opening price requests to prevent duplicate API calls
  const openingPriceRequests = useRef<Map<number, Promise<number | null>>>(new Map());
  
  // Track failed requests to prevent retry spam (cache failures for 5 minutes)
  const failedOpeningPriceRequests = useRef<Map<number, number>>(new Map());
  const FAILURE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

  // Get opening price for today (price at market open - 8am EST/EDT)
  const getOpeningPrice = useCallback(async (entityId: number): Promise<number | null> => {
    // Check if there's already an in-flight request for this entity
    const existingRequest = openingPriceRequests.current.get(entityId);
    if (existingRequest) {
      return existingRequest;
    }
    
    // Check if this request recently failed (prevent retry spam)
    const lastFailureTime = failedOpeningPriceRequests.current.get(entityId);
    if (lastFailureTime && (Date.now() - lastFailureTime) < FAILURE_COOLDOWN_MS) {
      // Recently failed, skip API call and use fallback
      if (entityPrices[entityId] !== undefined) {
        return entityPrices[entityId];
      }
      const entity = MOCK_ENTITIES.find(e => e.id === entityId);
      return entity ? entity.basePrice : null;
    }

    // Use proper timezone handling (accounts for DST automatically)
    // Market opens at 8am EST/EDT (America/New_York timezone)
    // Match backend calculation exactly
    const now = new Date();
    const estTimeString = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      hour12: false,
    }).formatToParts(now);
    
    const estHours = parseInt(estTimeString.find(p => p.type === 'hour')?.value || '0', 10);
    const estYear = parseInt(estTimeString.find(p => p.type === 'year')?.value || '0', 10);
    const estMonth = parseInt(estTimeString.find(p => p.type === 'month')?.value || '0', 10) - 1; // 0-indexed
    const estDay = parseInt(estTimeString.find(p => p.type === 'day')?.value || '0', 10);
    
    // Create market open time (8am EST/EDT) in UTC - match backend exactly
    const marketOpenTime = new Date(Date.UTC(estYear, estMonth, estDay, 8, 0, 0));
    
    // If it's before 8am, use yesterday's opening price
    if (estHours < 8) {
      marketOpenTime.setUTCDate(marketOpenTime.getUTCDate() - 1);
    }
    
    const marketOpenTimestamp = marketOpenTime.toISOString();
    const todayKey = marketOpenTime.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Create the request promise
    const requestPromise = (async () => {
      try {
        // Try to get from cache first
        const cachedOpeningPrices = await AsyncStorage.getItem(OPENING_PRICES_KEY);
        if (cachedOpeningPrices) {
          const parsed = JSON.parse(cachedOpeningPrices);
          if (parsed.date === todayKey && parsed.prices[entityId]) {
            return parsed.prices[entityId];
          }
        }
        
        // If not in cache, fetch from backend
        if (isBackendConfigured()) {
          // Don't retry on server errors (500+) - they indicate backend issues
          const response = await apiRequest<{ success?: boolean; data?: Array<{ timestamp: string; price: number }> }>(
            `/api/entities/${entityId}/price-history?timeRange=1D&limit=100`,
            { method: 'GET', signal: undefined },
            { maxRetries: 0, retryable: false } // Don't retry - prevent spam on 500 errors
          );
        
        if (response.success && response.data && Array.isArray(response.data)) {
          // Sort by timestamp (oldest first) to find first price after market open
          const sortedData = [...response.data].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          
          // Find first price after market open
          const openingPriceEntry = sortedData.find(
            (entry) => new Date(entry.timestamp) >= marketOpenTime
          );
          
          if (openingPriceEntry && typeof openingPriceEntry.price === 'number') {
            const price = openingPriceEntry.price;
            
            // Cache the opening price
            const cached = await AsyncStorage.getItem(OPENING_PRICES_KEY);
            const parsed = cached ? JSON.parse(cached) : { date: '', prices: {} };
            if (parsed.date !== todayKey) {
              parsed.date = todayKey;
              parsed.prices = {};
            }
            parsed.prices[entityId] = price;
            await AsyncStorage.setItem(OPENING_PRICES_KEY, JSON.stringify(parsed));
            
            // Clear failure cache on success
            failedOpeningPriceRequests.current.delete(entityId);
            
            return price;
          }
        } else if (!response.success) {
          // Request failed - cache the failure to prevent retry spam
          failedOpeningPriceRequests.current.set(entityId, Date.now());
        }
        }
        
        // Fallback: use current price from entityPrices or MOCK_ENTITIES
        if (entityPrices[entityId] !== undefined) {
          return entityPrices[entityId];
        }
        const entity = MOCK_ENTITIES.find(e => e.id === entityId);
        return entity ? entity.basePrice : null;
      } catch (error: any) {
        // Cache the failure to prevent retry spam
        failedOpeningPriceRequests.current.set(entityId, Date.now());
        
        // Only log if it's not a 500 error (to reduce noise)
        if (error.status !== 500) {
          console.debug(`[Opening Price] Error getting opening price for entity ${entityId}:`, {
            entityId,
            error: error.message || String(error),
            errorType: error.name || 'Error',
            status: error.status || 'unknown',
            endpoint: `/api/entities/${entityId}/price-history`,
            marketOpenTimestamp,
            hint: 'Falling back to current price or base price. Opening price calculation may be inaccurate.',
          });
        }
        // Fallback: use current price from entityPrices or MOCK_ENTITIES
        if (entityPrices[entityId] !== undefined) {
          return entityPrices[entityId];
        }
        const entity = MOCK_ENTITIES.find(e => e.id === entityId);
        return entity ? entity.basePrice : null;
      } finally {
        // Remove from in-flight requests map when done
        openingPriceRequests.current.delete(entityId);
      }
    })();

    // Store the promise in the map
    openingPriceRequests.current.set(entityId, requestPromise);
    
    return requestPromise;
  }, [entityPrices]);

  // Fetch entity prices - public endpoint, no auth required
  const fetchEntityPrices = useCallback(async (signal?: AbortSignal) => {
    if (!isBackendConfigured()) {
      // Try to load from cache if offline
      try {
        const cachedPrices = await AsyncStorage.getItem(PRICE_HISTORY_CACHE_KEY);
        if (cachedPrices) {
          const parsed = JSON.parse(cachedPrices);
          const prices: Record<number, number> = {};
          Object.keys(parsed).forEach((entityIdStr) => {
            const entityId = parseInt(entityIdStr, 10);
            const history = parsed[entityId];
            if (history && history.length > 0) {
              // Use most recent price from cache
              prices[entityId] = history[history.length - 1].price;
            }
          });
          if (Object.keys(prices).length > 0) {
            setEntityPrices(prices);
          }
        }
      } catch (error) {
        console.debug('Error loading cached prices:', error);
      }
      return;
    }

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
          
          // Update price history cache
          try {
            const cached = await AsyncStorage.getItem(PRICE_HISTORY_CACHE_KEY);
            const parsed = cached ? JSON.parse(cached) : {};
            const now = Date.now();
            
            Object.keys(prices).forEach((entityIdStr) => {
              const entityId = parseInt(entityIdStr, 10);
              const price = prices[entityId];
              if (!parsed[entityId]) {
                parsed[entityId] = [];
              }
              // Add new price point
              parsed[entityId].push({ timestamp: now, price });
              // Keep only last 100 points per entity
              if (parsed[entityId].length > 100) {
                parsed[entityId] = parsed[entityId].slice(-100);
              }
            });
            
            await AsyncStorage.setItem(PRICE_HISTORY_CACHE_KEY, JSON.stringify(parsed));
            setPriceHistoryCache(parsed);
          } catch (error) {
            console.debug('Error updating price history cache:', error);
          }
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
      
      // Try to load from cache if offline
      try {
        const cachedPrices = await AsyncStorage.getItem(PRICE_HISTORY_CACHE_KEY);
        if (cachedPrices) {
          const parsed = JSON.parse(cachedPrices);
          const prices: Record<number, number> = {};
          Object.keys(parsed).forEach((entityIdStr) => {
            const entityId = parseInt(entityIdStr, 10);
            const history = parsed[entityId];
            if (history && history.length > 0) {
              // Use most recent price from cache
              prices[entityId] = history[history.length - 1].price;
            }
          });
          if (Object.keys(prices).length > 0) {
            setEntityPrices(prices);
          }
        }
      } catch (cacheError) {
        console.debug('Error loading cached prices:', cacheError);
      }
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
        console.debug('[Startup] Error fetching portfolio on mount:', {
          error: err.message || String(err),
          errorType: err.name || 'Error',
          hint: 'This may be expected if backend is not configured or user is not authenticated.',
        });
      }
    });
    fetchTransactions(abortController.signal).catch(err => {
      if (err.name !== 'AbortError' && err.error !== 'Request cancelled') {
        console.debug('[Startup] Error fetching transactions on mount:', {
          error: err.message || String(err),
          errorType: err.name || 'Error',
          hint: 'This may be expected if backend is not configured or user is not authenticated.',
        });
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
          console.debug(`[Price Polling] Error fetching data (${consecutiveErrors} consecutive errors):`, {
          consecutiveErrors,
          error: err.message || String(err),
          errorType: err.name || 'Error',
          currentInterval: `${currentInterval}ms`,
          hint: consecutiveErrors >= errorThreshold 
            ? 'Polling stopped due to too many errors. Manual refresh required.'
            : `Retrying in ${currentInterval}ms with exponential backoff.`,
        });
          
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
    const updatedHistory = [...portfolioHistoryRef.current];
    setPortfolioHistory(updatedHistory);
    // Persist to AsyncStorage
    savePortfolioHistory(updatedHistory);
  }, [holdings, cashBalance, savePortfolioHistory]);

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
    // Prevent concurrent trade executions (race condition protection)
    if (isExecutingTrade) {
      console.warn('Trade execution already in progress');
      return { success: false, error: 'A trade is already being processed. Please wait.' };
    }
    
    // Check Market Hours
    if (!isMarketOpen) {
      console.warn('Trade rejected: ' + marketStatusMessage);
      return { success: false, error: marketStatusMessage };
    }

    if (!token) {
      console.error('No authentication token');
      return { success: false, error: 'Not authenticated. Please log in.' };
    }
    
    // Set execution lock
    setIsExecutingTrade(true);

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
      
      // Calculate todayChange from actual price deltas (current price vs opening price)
      // This will be calculated asynchronously, but we'll use a placeholder for now
      // The actual calculation will happen when opening prices are fetched
      optimisticTodayChange = 0; // Will be updated when opening prices are available
      optimisticTodayChangePercent = 0;
      
      // Calculate todayChange asynchronously
      (async () => {
        try {
          let calculatedTodayChange = 0;
          
          for (const holding of optimisticHoldings) {
            const openingPrice = await getOpeningPrice(holding.entityId);
            if (openingPrice !== null) {
              const openingValue = holding.quantity * openingPrice;
              const currentValue = holding.totalValue;
              calculatedTodayChange += (currentValue - openingValue);
            }
          }
          
          const calculatedTodayChangePercent = totalValue > 0 ? (calculatedTodayChange / totalValue) * 100 : 0;
          setTodayChange(calculatedTodayChange);
          setTodayChangePercent(calculatedTodayChangePercent);
        } catch (error) {
          console.debug('[Trade Execution] Error calculating todayChange for optimistic update:', {
            error: error.message || String(error),
            errorType: error.name || 'Error',
            hint: 'Using backend-calculated value instead. This is non-critical.',
          });
        }
      })();
      
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
      setIsExecutingTrade(false); // Release execution lock
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
    lastEvaluatedKeyRef.current = undefined;
    setHasMoreTransactions(false);
    // Clear persisted portfolio history
    AsyncStorage.removeItem(PORTFOLIO_HISTORY_KEY).catch(() => {});
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
        isExecutingTrade,
        executeTrade,
        getHolding,
        updatePrices,
        resetPortfolio,
        getEntityPrice,
        getAllEntityPrices,
        portfolioHistory,
        fetchPortfolio,
        fetchTransactions,
        loadMoreTransactions,
        hasMoreTransactions,
        isLoadingMoreTransactions,
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
