import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Portfolio, Holding, UserTransaction } from '../types';
import { authenticatedRequest, isBackendConfigured, invalidateCache } from '../config/api';
import { useAuth } from './AuthContext';
import { ENTITIES } from '../utils/entities';
import { calculatePrice, getInitialPoolValues, calculateSentimentRatio } from '../utils/sentimentTrading';

interface TradingContextType {
  portfolio: Portfolio;
  transactions: UserTransaction[];
  isLoading: boolean;
  executeTrade: (
    entityId: number,
    entityName: string,
    type: 'open' | 'close',
    direction: 'positive' | 'negative',
    tokensCommitted: number,
    category: string
  ) => Promise<boolean>;
  openPosition: (
    entityId: number,
    entityName: string,
    direction: 'positive' | 'negative',
    tokensCommitted: number,
    category: string
  ) => Promise<boolean>;
  closePosition: (
    entityId: number,
    entityName: string,
    category: string
  ) => Promise<boolean>;
  getHolding: (entityId: number) => Holding | undefined;
  getPosition: (entityId: number) => { direction: 'positive' | 'negative'; tokensCommitted: number; trancheCount: number } | null;
  updatePrices: (entityId: number, newPrice: number) => void;
  resetPortfolio: () => void;
  getEntityPrice: (entityId: number) => number;
  getAllEntityPrices: () => Record<number, number>;
  getEntityVolume: (entityId: number) => number;
  getEntityHigh: (entityId: number) => number;
  getEntityLow: (entityId: number) => number;
  getPositionOpenPnL: (entityId: number) => number;
  getCategoryVolumes: () => Record<string, { volume: number; percentage: number }>;
  portfolioHistory: number[];
  fetchPortfolio: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  lastPriceUpdateTime: number | null;
  isPriceStale: boolean;
  /** Set when a trade fails; cleared when user dismisses the error modal */
  tradeError: { type: 'error' | 'warning'; title: string; message: string } | null;
  clearTradeError: () => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

/** Map API/throw error to user-friendly modal content */
function getTradeErrorDisplay(error: Error): { type: 'error' | 'warning'; title: string; message: string } {
  const msg = (error.message || '').toLowerCase();
  if (msg.includes('insufficient funds')) {
    return {
      type: 'error',
      title: 'Insufficient Funds',
      message: "You don't have enough cash for this trade. Add more to your balance or try a smaller amount.",
    };
  }
  if (msg.includes('direction mismatch') || msg.includes('direction')) {
    return {
      type: 'warning',
      title: 'Direction Mismatch',
      message: "You already have a position in the opposite direction. Close it first, or add to your existing position.",
    };
  }
  if (msg.includes('no position') || msg.includes('no holding')) {
    return {
      type: 'warning',
      title: 'No Position',
      message: "You don't have an open position for this entity. Open a position first to close.",
    };
  }
  if (msg.includes('invalid pool') || msg.includes('insufficient holdings')) {
    return {
      type: 'warning',
      title: 'Can\'t Complete Trade',
      message: "There isn't enough to complete this trade. Try a smaller amount or refresh and try again.",
    };
  }
  if (msg.includes('market is closed')) {
    return {
      type: 'warning',
      title: 'Market Closed',
      message: "Trading is paused between 2am–8am EST. Try again during market hours.",
    };
  }
  if (msg.includes('slippage') || msg.includes('price')) {
    return {
      type: 'warning',
      title: 'Price Changed',
      message: "The price moved since you opened the trade. Please refresh and try again.",
    };
  }
  return {
    type: 'error',
    title: 'Trade Failed',
    message: "Something went wrong. Please check your connection and try again.",
  };
}

const INITIAL_CASH_BALANCE = 1000;

// AsyncStorage keys for persistence
const STORAGE_KEYS = {
  ENTITY_POOLS: '@trading:entityPools',
  USER_POSITIONS: '@trading:userPositions',
  CASH_BALANCE: '@trading:cashBalance',
  TRANSACTIONS: '@trading:transactions',
};

// Transaction queue to prevent race conditions
interface QueuedTrade {
  id: string;
  entityId: number;
  entityName: string;
  type: 'open' | 'close';
  direction: 'positive' | 'negative';
  tokensCommitted: number;
  category: string;
  resolve: (success: boolean) => void;
  reject: (error: Error) => void;
}

// Optimistic update state for rollback
interface OptimisticState {
  entityPools: Record<number, { positiveTokens: number; negativeTokens: number }>;
  userPositions: Record<number, { direction: 'positive' | 'negative'; tranches: PositionTranche[] }>;
  cashBalance: number;
  transactions: UserTransaction[];
}

export const TradingProvider = ({ children }: { children: ReactNode }) => {
  const { token, isAuthenticated } = useAuth();
  const [cashBalance, setCashBalance] = useState(INITIAL_CASH_BALANCE);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [todayChange, setTodayChange] = useState(0);
  const [todayChangePercent, setTodayChangePercent] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [lastPriceUpdateTime, setLastPriceUpdateTime] = useState<number | null>(null);
  const [tradeError, setTradeError] = useState<{ type: 'error' | 'warning'; title: string; message: string } | null>(null);

  const clearTradeError = useCallback(() => setTradeError(null), []);

  // Entity sentiment pools (P and N) - tracked locally for immediate price updates
  const [entityPools, setEntityPools] = useState<Record<number, { positiveTokens: number; negativeTokens: number }>>(() => {
    // Initialize all pools to 0 (P=0, N=0 gives price = 100)
    const initialPools: Record<number, { positiveTokens: number; negativeTokens: number }> = {};
    ENTITIES.forEach((entity) => {
      initialPools[entity.id] = getInitialPoolValues();
    });
    return initialPools;
  });

  // User positions - track open positions with direction and tranches (each add is a separate tranche)
  interface PositionTranche {
    tokensCommitted: number;
    entryRatio: number;
  }
  const [userPositions, setUserPositions] = useState<Record<number, { direction: 'positive' | 'negative'; tranches: PositionTranche[] }>>({});

  // Transaction queue to prevent race conditions
  const tradeQueueRef = useRef<QueuedTrade[]>([]);
  const isProcessingQueueRef = useRef<boolean>(false);
  const optimisticStateRef = useRef<OptimisticState | null>(null);

  // Refs to track latest state for queue processor (avoids stale closures)
  const entityPoolsRef = useRef(entityPools);
  const userPositionsRef = useRef(userPositions);
  const cashBalanceRef = useRef(cashBalance);
  const transactionsRef = useRef(transactions);

  // Update refs when state changes
  useEffect(() => {
    entityPoolsRef.current = entityPools;
  }, [entityPools]);
  useEffect(() => {
    userPositionsRef.current = userPositions;
  }, [userPositions]);
  useEffect(() => {
    cashBalanceRef.current = cashBalance;
  }, [cashBalance]);
  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  // Debounce timer for price updates
  const priceUpdateDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPriceUpdatesRef = useRef<Record<number, number>>({});

  // Global entity prices - calculated from sentiment pools
  const [entityPrices, setEntityPrices] = useState<Record<number, number>>(() => {
    // Initialize all prices to 100 (from P=0, N=0)
    const initialPrices: Record<number, number> = {};
    ENTITIES.forEach((entity) => {
      initialPrices[entity.id] = calculatePrice(0, 0); // = 100
    });
    return initialPrices;
  });

  // Track current day for resetting high/low at midnight
  const [currentDay, setCurrentDay] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  });

  // Entity high/low prices - reset daily at midnight
  const [entityHighLow, setEntityHighLow] = useState<Record<number, { high: number; low: number; openingPrice: number }>>(() => {
    // Initialize all high/low to current price (100)
    const initialHighLow: Record<number, { high: number; low: number; openingPrice: number }> = {};
    ENTITIES.forEach((entity) => {
      const initialPrice = calculatePrice(0, 0); // = 100
      initialHighLow[entity.id] = {
        high: initialPrice,
        low: initialPrice,
        openingPrice: initialPrice,
      };
    });
    return initialHighLow;
  });

  // Portfolio value history for chart animation
  const [portfolioHistory, setPortfolioHistory] = useState<number[]>([]);
  const portfolioHistoryRef = useRef<number[]>([]);
  const maxHistoryLength = 100;

  // Persistence functions
  const saveEntityPools = useCallback(async (pools: Record<number, { positiveTokens: number; negativeTokens: number }>) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ENTITY_POOLS, JSON.stringify(pools));
    } catch (error) {
      console.error('Error saving entity pools to AsyncStorage:', error);
    }
  }, []);

  const saveUserPositions = useCallback(async (positions: Record<number, { direction: 'positive' | 'negative'; tranches: PositionTranche[] }>) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_POSITIONS, JSON.stringify(positions));
    } catch (error) {
      console.error('Error saving user positions to AsyncStorage:', error);
    }
  }, []);

  const saveCashBalance = useCallback(async (balance: number) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CASH_BALANCE, JSON.stringify(balance));
    } catch (error) {
      console.error('Error saving cash balance to AsyncStorage:', error);
    }
  }, []);

  const saveTransactions = useCallback(async (txns: UserTransaction[]) => {
    try {
      // Only save last 100 transactions to avoid storage bloat
      const toSave = txns.slice(0, 100);
      await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(toSave));
    } catch (error) {
      console.error('Error saving transactions to AsyncStorage:', error);
    }
  }, []);

  // Load persisted data on mount
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        // Load entity pools
        const poolsData = await AsyncStorage.getItem(STORAGE_KEYS.ENTITY_POOLS);
        if (poolsData) {
          const parsedPools = JSON.parse(poolsData);
          // Merge with initial pools to ensure all entities are present
          const mergedPools: Record<number, { positiveTokens: number; negativeTokens: number }> = {};
          ENTITIES.forEach((entity) => {
            mergedPools[entity.id] = parsedPools[entity.id] || getInitialPoolValues();
          });
          setEntityPools(mergedPools);
        }

        // Load user positions
        const positionsData = await AsyncStorage.getItem(STORAGE_KEYS.USER_POSITIONS);
        if (positionsData) {
          setUserPositions(JSON.parse(positionsData));
        }

        // Load cash balance
        const balanceData = await AsyncStorage.getItem(STORAGE_KEYS.CASH_BALANCE);
        if (balanceData) {
          const balance = JSON.parse(balanceData);
          if (typeof balance === 'number' && balance >= 0) {
            setCashBalance(balance);
          }
        }

        // Load transactions
        const transactionsData = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
        if (transactionsData) {
          setTransactions(JSON.parse(transactionsData));
        }
      } catch (error) {
        console.error('Error loading persisted trading data:', error);
      }
    };

    loadPersistedData();
  }, []); // Only run on mount

  // Save entity pools whenever they change
  useEffect(() => {
    saveEntityPools(entityPools);
  }, [entityPools, saveEntityPools]);

  // Save user positions whenever they change
  useEffect(() => {
    saveUserPositions(userPositions);
  }, [userPositions, saveUserPositions]);

  // Save cash balance whenever it changes
  useEffect(() => {
    saveCashBalance(cashBalance);
  }, [cashBalance, saveCashBalance]);

  // Save transactions whenever they change
  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions, saveTransactions]);

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
          type: t.type === 'buy' ? 'open' : t.type === 'sell' ? 'close' : t.type, // Map old format
          direction: t.direction,
          tokensCommitted: t.tokensCommitted ?? t.quantity ?? 0, // Use tokensCommitted or fallback to quantity
          pricePerToken: t.pricePerToken,
          totalAmount: t.totalAmount,
          timestamp: t.timestamp,
          category: t.category,
          profitLoss: t.profitLoss,
          quantity: t.quantity, // Legacy field for backwards compatibility
        }));
        setTransactions(mappedTransactions);
      }
    } catch (error) {
      // Silently handle errors - don't crash the app
      console.debug('Error fetching transactions (backend may not be running):', error);
    }
  }, [token, isAuthenticated]);

  // Debounced price update function
  const debouncedPriceUpdate = useCallback(() => {
    if (priceUpdateDebounceTimerRef.current) {
      clearTimeout(priceUpdateDebounceTimerRef.current);
    }

    priceUpdateDebounceTimerRef.current = setTimeout(() => {
      const updates = { ...pendingPriceUpdatesRef.current };
      pendingPriceUpdatesRef.current = {};

      if (Object.keys(updates).length > 0) {
        setEntityPrices(prev => {
          const updated = { ...prev };
          Object.keys(updates).forEach(entityIdStr => {
            updated[parseInt(entityIdStr, 10)] = updates[parseInt(entityIdStr, 10)];
          });
          return updated;
        });
        setLastPriceUpdateTime(Date.now());
      }
    }, 300); // 300ms debounce delay
  }, []);

  // Fetch entity prices with debouncing
  const fetchEntityPrices = useCallback(async () => {
    if (!token || !isAuthenticated || !isBackendConfigured()) return;

    try {
      const response = await authenticatedRequest<any[]>('/api/entities', token, {
        method: 'GET',
      });

      if (response.success && response.data) {
        // Store updates in pending ref instead of updating state directly
        response.data.forEach((entity: any) => {
          const price = entity.currentPrice || entity.basePrice;
          pendingPriceUpdatesRef.current[entity.entityId] = price;
        });

        // Trigger debounced update
        debouncedPriceUpdate();
      }
    } catch (error) {
      // Silently handle errors - don't crash the app
      console.debug('Error fetching entity prices (backend may not be running):', error);
    }
  }, [token, isAuthenticated, debouncedPriceUpdate]);

  // Load portfolio and transactions on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated && token) {
      // Wrap in try-catch to prevent app crashes
      fetchPortfolio().catch(err => console.error('Error fetching portfolio:', err));
      fetchTransactions().catch(err => console.error('Error fetching transactions:', err));
      fetchEntityPrices().catch(err => console.error('Error fetching entity prices:', err));
    }
  }, [isAuthenticated, token, fetchPortfolio, fetchTransactions, fetchEntityPrices]);

  // Poll for price updates every 1 second (only if backend is configured)
  // More frequent updates for real-time trading experience
  // Debouncing is handled in fetchEntityPrices
  useEffect(() => {
    if (!isAuthenticated || !token || !isBackendConfigured()) return;

    const interval = setInterval(() => {
      fetchEntityPrices().catch(err => console.error('Error fetching entity prices:', err));
      fetchPortfolio().catch(err => console.error('Error fetching portfolio:', err));
    }, 1000); // 1 second for real-time price updates

    return () => {
      clearInterval(interval);
      // Cleanup debounce timer on unmount
      if (priceUpdateDebounceTimerRef.current) {
        clearTimeout(priceUpdateDebounceTimerRef.current);
      }
    };
  }, [isAuthenticated, token, fetchEntityPrices, fetchPortfolio]);

  // Check for new day (midnight reset) - runs every second
  useEffect(() => {
    const checkNewDay = () => {
      const now = new Date();
      const today = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

      if (today !== currentDay) {
        // New day - reset high/low to opening prices (current prices at midnight)
        setCurrentDay(today);
        setEntityHighLow(prev => {
          const updated: Record<number, { high: number; low: number; openingPrice: number }> = {};
          Object.keys(prev).forEach((entityIdStr) => {
            const entityId = parseInt(entityIdStr, 10);
            const pools = entityPools[entityId] || getInitialPoolValues();
            const openingPrice = calculatePrice(pools.positiveTokens, pools.negativeTokens);
            updated[entityId] = {
              high: openingPrice,
              low: openingPrice,
              openingPrice,
            };
          });
          return updated;
        });
      }
    };

    // Check every second for midnight
    const interval = setInterval(checkNewDay, 1000);
    checkNewDay(); // Initial check

    return () => clearInterval(interval);
  }, [currentDay, entityPools]);

  // Recalculate prices whenever pools change (for immediate UI updates)
  // Also update high/low prices
  useEffect(() => {
    const newPrices: Record<number, number> = {};
    setEntityHighLow(prev => {
      const updated = { ...prev };
      Object.keys(entityPools).forEach((entityIdStr) => {
        const entityId = parseInt(entityIdStr, 10);
        const pools = entityPools[entityId];
        if (pools) {
          const calculatedPrice = calculatePrice(pools.positiveTokens, pools.negativeTokens);
          newPrices[entityId] = calculatedPrice;

          // Initialize high/low if not exists
          if (!updated[entityId]) {
            updated[entityId] = {
              high: calculatedPrice,
              low: calculatedPrice,
              openingPrice: calculatedPrice,
            };
          } else {
            // Update high if current price is higher
            if (calculatedPrice > updated[entityId].high) {
              updated[entityId].high = calculatedPrice;
            }
            // Update low if current price is lower
            if (calculatedPrice < updated[entityId].low) {
              updated[entityId].low = calculatedPrice;
            }
          }
        }
      });
      return updated;
    });
    setEntityPrices(prev => ({ ...prev, ...newPrices }));
  }, [entityPools]);

  // Update portfolio history
  useEffect(() => {
    const totalValue = holdings.reduce((sum, h) => sum + h.totalValue, 0) + cashBalance;

    portfolioHistoryRef.current = [...portfolioHistoryRef.current, totalValue];
    if (portfolioHistoryRef.current.length > maxHistoryLength) {
      portfolioHistoryRef.current = portfolioHistoryRef.current.slice(-maxHistoryLength);
    }
    setPortfolioHistory([...portfolioHistoryRef.current]);
  }, [holdings, cashBalance]);

  // Internal trade execution function (without queue - called by queue processor)
  // Uses refs to get latest state values
  const executeTradeInternalRef = useRef<((entityId: number, entityName: string, type: 'open' | 'close', direction: 'positive' | 'negative', tokensCommitted: number, category: string) => Promise<boolean>) | null>(null);

  // Transaction queue processor - ensures trades execute sequentially to prevent race conditions
  const processTradeQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || tradeQueueRef.current.length === 0) {
      return;
    }

    if (!executeTradeInternalRef.current) {
      console.error('executeTradeInternal not initialized');
      return;
    }

    isProcessingQueueRef.current = true;

    while (tradeQueueRef.current.length > 0) {
      const trade = tradeQueueRef.current.shift();
      if (!trade) break;

      try {
        // Save current state for rollback (using refs to get latest values)
        optimisticStateRef.current = {
          entityPools: JSON.parse(JSON.stringify(entityPoolsRef.current)),
          userPositions: JSON.parse(JSON.stringify(userPositionsRef.current)),
          cashBalance: cashBalanceRef.current,
          transactions: [...transactionsRef.current],
        };

        // Execute trade optimistically (this will update state)
        const success = await executeTradeInternalRef.current(
          trade.entityId,
          trade.entityName,
          trade.type,
          trade.direction,
          trade.tokensCommitted,
          trade.category
        );

        trade.resolve(success);
      } catch (error) {
        // Rollback on error
        if (optimisticStateRef.current) {
          setEntityPools(optimisticStateRef.current.entityPools);
          setUserPositions(optimisticStateRef.current.userPositions);
          setCashBalance(optimisticStateRef.current.cashBalance);
          setTransactions(optimisticStateRef.current.transactions);
          optimisticStateRef.current = null;
        }
        trade.reject(error instanceof Error ? error : new Error('Trade execution failed'));
      }
    }

    isProcessingQueueRef.current = false;
  }, []);

  // Internal trade execution function (without queue - called by queue processor)
  // Uses refs to get latest state values
  const executeTradeInternal = useCallback(async (
    entityId: number,
    entityName: string,
    type: 'open' | 'close',
    direction: 'positive' | 'negative',
    tokensCommitted: number,
    category: string
  ): Promise<boolean> => {
    // Get current state from refs (always latest values)
    const currentPools = entityPoolsRef.current[entityId] || getInitialPoolValues();
    const currentPositions = userPositionsRef.current;
    const currentBalance = cashBalanceRef.current;
    const currentTransactions = transactionsRef.current;

    const p = currentPools.positiveTokens;
    const n = currentPools.negativeTokens;

    if (type === 'open') {
      // Check if user already has an open position for this entity
      const existingPosition = currentPositions[entityId];

      if (existingPosition) {
        // User has existing position - check if direction matches
        if (existingPosition.direction !== direction) {
          throw new Error(`Direction mismatch: You already have a ${existingPosition.direction} position.`);
        }

        // ADD TO EXISTING POSITION
        // Check sufficient funds
        if (currentBalance < tokensCommitted) {
          throw new Error(`Insufficient funds: You need ${tokensCommitted} tokens but only have ${currentBalance.toFixed(2)}.`);
        }

        // Calculate current ratio BEFORE adding new tokens (this is the entry ratio for this tranche)
        const currentRatio = calculateSentimentRatio(p, n);

        // Add tokens to appropriate pool
        const newP = direction === 'positive' ? p + tokensCommitted : p;
        const newN = direction === 'negative' ? n + tokensCommitted : n;

        // Ensure P and N never go below 0
        if (newP < 0 || newN < 0) {
          throw new Error('Invalid pool state: Pools cannot go negative.');
        }

        // Update pools immediately (optimistic update)
        setEntityPools(prev => ({
          ...prev,
          [entityId]: { positiveTokens: newP, negativeTokens: newN }
        }));

        // Add new tranche to position
        setUserPositions(prev => ({
          ...prev,
          [entityId]: {
            direction,
            tranches: [
              ...existingPosition.tranches,
              { tokensCommitted, entryRatio: currentRatio }
            ]
          }
        }));

        // Recalculate price immediately using new pools
        const newPrice = calculatePrice(newP, newN);
        setEntityPrices(prev => ({ ...prev, [entityId]: newPrice }));

        // Update cash balance (deduct tokens committed)
        setCashBalance(prev => Math.max(0, prev - tokensCommitted));

        // Record transaction
        const newTransaction: UserTransaction = {
          id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          entityId,
          entityName,
          type: 'open',
          direction,
          tokensCommitted,
          pricePerToken: currentRatio,
          totalAmount: tokensCommitted,
          timestamp: new Date().toISOString(),
          category,
        };
        setTransactions(prev => [newTransaction, ...prev]);

        // Try to execute on backend
        if (token && isBackendConfigured()) {
          try {
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
                type: 'open',
                direction,
                tokensCommitted,
              }),
            });

            if (response.success && response.data) {
              // Update with backend response (authoritative)
              setCashBalance(response.data.cashBalance);
              setHoldings(response.data.holdings);
              setTodayChange(response.data.todayChange);
              setTodayChangePercent(response.data.todayChangePercent);
              await fetchTransactions();

              // Invalidate cache after successful trade execution
              invalidateCache('portfolio');
              invalidateCache('transactions');
            } else {
              // Backend failed - rollback will be handled by queue processor
              throw new Error(response.error || 'Backend trade execution failed');
            }
          } catch (error) {
            // Backend error - rollback
            throw error;
          }
        }

        return true;
      }

      // NEW POSITION
      // Check sufficient funds
      if (currentBalance < tokensCommitted) {
        throw new Error(`Insufficient funds: You need ${tokensCommitted} tokens but only have ${currentBalance.toFixed(2)}.`);
      }

      // Calculate EntryRatio BEFORE adding tokens
      const entryRatio = calculateSentimentRatio(p, n);

      // Add tokens to appropriate pool
      const newP = direction === 'positive' ? p + tokensCommitted : p;
      const newN = direction === 'negative' ? n + tokensCommitted : n;

      // Ensure P and N never go below 0
      if (newP < 0 || newN < 0) {
        throw new Error('Invalid pool state: Pools cannot go negative.');
      }

      // Update pools immediately (optimistic update)
      setEntityPools(prev => ({
        ...prev,
        [entityId]: { positiveTokens: newP, negativeTokens: newN }
      }));

      // Store position (first tranche)
      setUserPositions(prev => ({
        ...prev,
        [entityId]: {
          direction,
          tranches: [{ tokensCommitted, entryRatio }]
        }
      }));

      // Recalculate price immediately using new pools
      const newPrice = calculatePrice(newP, newN);
      setEntityPrices(prev => ({ ...prev, [entityId]: newPrice }));

      // Update cash balance (deduct tokens committed)
      setCashBalance(prev => Math.max(0, prev - tokensCommitted));

      // Record transaction
      const newTransaction: UserTransaction = {
        id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        entityId,
        entityName,
        type: 'open',
        direction,
        tokensCommitted,
        pricePerToken: entryRatio,
        totalAmount: tokensCommitted,
        timestamp: new Date().toISOString(),
        category,
      };
      setTransactions(prev => [newTransaction, ...prev]);

      // Try to execute trade on backend if available
      if (token && isBackendConfigured()) {
        try {
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
              type: 'open',
              direction,
              tokensCommitted,
            }),
          });

          if (response.success && response.data) {
            // Update with backend response (authoritative)
            setCashBalance(response.data.cashBalance);
            setHoldings(response.data.holdings);
            setTodayChange(response.data.todayChange);
            setTodayChangePercent(response.data.todayChangePercent);
            await fetchTransactions();

            // Invalidate cache after successful trade execution
            invalidateCache('portfolio');
            invalidateCache('transactions');
          } else {
            // Backend failed - rollback
            throw new Error(response.error || 'Backend trade execution failed');
          }
        } catch (error) {
          // Backend error - rollback
          throw error;
        }
      }

      return true;
    } else {
      // CLOSE position
      const position = currentPositions[entityId];
      if (!position) {
        throw new Error('No position: You do not have an open position for this entity.');
      }

      const positionDirection = position.direction;
      const tranches = position.tranches;

      // Calculate total tokens committed (sum of all tranches)
      const totalTokensCommitted = tranches.reduce((sum, tranche) => sum + tranche.tokensCommitted, 0);

      // Remove ALL user tokens from pool FIRST
      const newP = positionDirection === 'positive' ? Math.max(0, p - totalTokensCommitted) : p;
      const newN = positionDirection === 'negative' ? Math.max(0, n - totalTokensCommitted) : n;

      // Calculate exitRatio AFTER removing all tokens
      const exitRatio = calculateSentimentRatio(newP, newN);

      // Calculate PnL per tranche using reverse simulation
      let simulatedP = newP;
      let simulatedN = newN;
      let totalProfitLoss = 0;

      for (let i = tranches.length - 1; i >= 0; i--) {
        const tranche = tranches[i];
        const effectiveExitRatio = calculateSentimentRatio(simulatedP, simulatedN);
        const deltaR = effectiveExitRatio - tranche.entryRatio;
        let tranchePnL = tranche.tokensCommitted * deltaR;

        if (positionDirection === 'negative') {
          tranchePnL = -tranchePnL;
        }

        totalProfitLoss += tranchePnL;

        if (positionDirection === 'positive') {
          simulatedP += tranche.tokensCommitted;
        } else {
          simulatedN += tranche.tokensCommitted;
        }
      }

      // Calculate total tokens returned
      const tokensReturned = Math.max(0, totalTokensCommitted + totalProfitLoss);

      // Update pools immediately (optimistic update)
      setEntityPools(prev => ({
        ...prev,
        [entityId]: { positiveTokens: newP, negativeTokens: newN }
      }));

      // Remove position (close it)
      setUserPositions(prev => {
        const updated = { ...prev };
        delete updated[entityId];
        return updated;
      });

      // Recalculate price immediately using new pools
      const newPrice = calculatePrice(newP, newN);
      setEntityPrices(prev => ({ ...prev, [entityId]: newPrice }));

      // Update cash balance (add tokens returned)
      setCashBalance(prev => prev + tokensReturned);

      // Record transaction
      const newTransaction: UserTransaction = {
        id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        entityId,
        entityName,
        type: 'close',
        tokensCommitted: totalTokensCommitted,
        pricePerToken: exitRatio,
        totalAmount: tokensReturned,
        timestamp: new Date().toISOString(),
        category,
        profitLoss: totalProfitLoss,
      };
      setTransactions(prev => [newTransaction, ...prev]);

      // Try to execute trade on backend if available
      if (token && isBackendConfigured()) {
        try {
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
              type: 'close',
              quantity: totalTokensCommitted,
            }),
          });

          if (response.success && response.data) {
            // Update with backend response (authoritative)
            setCashBalance(response.data.cashBalance);
            setHoldings(response.data.holdings);
            setTodayChange(response.data.todayChange);
            setTodayChangePercent(response.data.todayChangePercent);
            await fetchTransactions();

            // Invalidate cache after successful trade execution
            invalidateCache('portfolio');
            invalidateCache('transactions');
          } else {
            // Backend failed - rollback
            throw new Error(response.error || 'Backend trade execution failed');
          }
        } catch (error) {
          // Backend error - rollback
          throw error;
        }
      }

      return true;
    }
  }, [token, fetchTransactions]);

  // Store executeTradeInternal in ref so processTradeQueue can access it
  useEffect(() => {
    executeTradeInternalRef.current = executeTradeInternal;
  }, [executeTradeInternal]);

  // Public executeTrade function - queues trades to prevent race conditions
  const executeTrade = async (
    entityId: number,
    entityName: string,
    type: 'open' | 'close',
    direction: 'positive' | 'negative',
    tokensCommitted: number,
    category: string
  ): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      setIsLoading(true);

      // Create queued trade
      const queuedTrade: QueuedTrade = {
        id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        entityId,
        entityName,
        type,
        direction,
        tokensCommitted,
        category,
        resolve: (success: boolean) => {
          setIsLoading(false);
          // Invalidate cache after successful trade
          if (success) {
            invalidateCache('portfolio');
            invalidateCache('transactions');
          }
          resolve(success);
        },
        reject: (error: Error) => {
          setIsLoading(false);
          setTradeError(getTradeErrorDisplay(error));
          reject(error);
        },
      };

      // Add to queue
      tradeQueueRef.current.push(queuedTrade);

      // Process queue (will process sequentially)
      processTradeQueue().catch(err => {
        console.error('Error processing trade queue:', err);
        queuedTrade.reject(err instanceof Error ? err : new Error('Queue processing failed'));
      });
    });
  };

  // Wrapper functions for openPosition and closePosition
  const openPosition = async (
    entityId: number,
    entityName: string,
    direction: 'positive' | 'negative',
    tokensCommitted: number,
    category: string
  ): Promise<boolean> => {
    return executeTrade(entityId, entityName, 'open', direction, tokensCommitted, category);
  };

  const closePosition = async (
    entityId: number,
    entityName: string,
    category: string
  ): Promise<boolean> => {
    const position = userPositions[entityId];
    if (!position) {
      setTradeError(getTradeErrorDisplay(new Error('No position')));
      return false;
    }
    // For close, calculate total tokens from all tranches
    const totalTokens = position.tranches.reduce((sum, tranche) => sum + tranche.tokensCommitted, 0);
    return executeTrade(entityId, entityName, 'close', position.direction, totalTokens, category);
  };

  const getHolding = (entityId: number): Holding | undefined => {
    return holdings.find(h => h.entityId === entityId);
  };

  const getPosition = (entityId: number): { direction: 'positive' | 'negative'; tokensCommitted: number; trancheCount: number } | null => {
    const position = userPositions[entityId];
    if (!position) return null;
    const totalTokens = position.tranches.reduce((sum, tranche) => sum + tranche.tokensCommitted, 0);
    return {
      direction: position.direction,
      tokensCommitted: totalTokens,
      trancheCount: position.tranches.length,
    };
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

  const resetPortfolio = async () => {
    setCashBalance(INITIAL_CASH_BALANCE);
    setHoldings([]);
    setTransactions([]);
    setTodayChange(0);
    setTodayChangePercent(0);
    portfolioHistoryRef.current = [];
    setPortfolioHistory([]);
    // Reset pools to initial state (P=0, N=0)
    const resetPools: Record<number, { positiveTokens: number; negativeTokens: number }> = {};
    ENTITIES.forEach((entity) => {
      resetPools[entity.id] = getInitialPoolValues();
    });
    setEntityPools(resetPools);
    // Reset prices to 100
    const resetPrices: Record<number, number> = {};
    ENTITIES.forEach((entity) => {
      resetPrices[entity.id] = calculatePrice(0, 0); // = 100
    });
    setEntityPrices(resetPrices);
    // Reset high/low to 100
    const resetHighLow: Record<number, { high: number; low: number; openingPrice: number }> = {};
    ENTITIES.forEach((entity) => {
      resetHighLow[entity.id] = {
        high: 100,
        low: 100,
        openingPrice: 100,
      };
    });
    setEntityHighLow(resetHighLow);
    // Clear all positions
    setUserPositions({});

    // Clear AsyncStorage
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ENTITY_POOLS,
        STORAGE_KEYS.USER_POSITIONS,
        STORAGE_KEYS.CASH_BALANCE,
        STORAGE_KEYS.TRANSACTIONS,
      ]);
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
    }
  };

  const getEntityPrice = (entityId: number): number => {
    // Always calculate price from current pools for real-time updates
    const pools = entityPools[entityId] || getInitialPoolValues();
    const calculatedPrice = calculatePrice(pools.positiveTokens, pools.negativeTokens);

    // Update price in state if it's different (for reactivity)
    // Defer state update to avoid updating during render
    if (entityPrices[entityId] !== calculatedPrice) {
      queueMicrotask(() => {
        setEntityPrices(prev => ({ ...prev, [entityId]: calculatedPrice }));
      });
    }

    return calculatedPrice;
  };

  const getAllEntityPrices = (): Record<number, number> => {
    return entityPrices;
  };

  const getEntityVolume = (entityId: number): number => {
    // Calculate volume as sum of positiveTokens + negativeTokens
    const pools = entityPools[entityId] || getInitialPoolValues();
    return pools.positiveTokens + pools.negativeTokens;
  };

  const getEntityHigh = (entityId: number): number => {
    // Return tracked high price for today
    const highLow = entityHighLow[entityId];
    if (highLow) {
      return highLow.high;
    }
    // Fallback to current price if not tracked
    const pools = entityPools[entityId] || getInitialPoolValues();
    return calculatePrice(pools.positiveTokens, pools.negativeTokens);
  };

  const getEntityLow = (entityId: number): number => {
    // Return tracked low price for today
    const highLow = entityHighLow[entityId];
    if (highLow) {
      return highLow.low;
    }
    // Fallback to current price if not tracked
    const pools = entityPools[entityId] || getInitialPoolValues();
    return calculatePrice(pools.positiveTokens, pools.negativeTokens);
  };

  const getPositionOpenPnL = (entityId: number): number => {
    const position = userPositions[entityId];
    if (!position) return 0;

    const pools = entityPools[entityId] || getInitialPoolValues();
    const p = pools.positiveTokens;
    const n = pools.negativeTokens;

    const positionDirection = position.direction;
    const tranches = position.tranches;

    // Calculate total tokens committed (sum of all tranches)
    const totalTokensCommitted = tranches.reduce((sum, tranche) => sum + tranche.tokensCommitted, 0);

    // Calculate what exitRatio would be AFTER removing all user tokens (same as closing)
    const newP = positionDirection === 'positive' ? Math.max(0, p - totalTokensCommitted) : p;
    const newN = positionDirection === 'negative' ? Math.max(0, n - totalTokensCommitted) : n;
    const exitRatio = calculateSentimentRatio(newP, newN);

    // Calculate P&L per tranche using the same logic as closing
    // Reverse simulate: Start from exitRatio (state after removing all tokens),
    // and work backwards to determine what each tranche's "effective exit ratio" should be
    let simulatedP = newP;
    let simulatedN = newN;
    let totalProfitLoss = 0;

    // Process tranches in reverse order (last added = first to evaluate)
    for (let i = tranches.length - 1; i >= 0; i--) {
      const tranche = tranches[i];

      // The effective exit ratio for this tranche is the current simulated pool state
      const effectiveExitRatio = calculateSentimentRatio(simulatedP, simulatedN);

      // Calculate P&L for this tranche
      const deltaR = effectiveExitRatio - tranche.entryRatio;
      let tranchePnL = tranche.tokensCommitted * deltaR;

      // Direction adjustment: if negative position, flip PnL
      if (positionDirection === 'negative') {
        tranchePnL = -tranchePnL;
      }

      totalProfitLoss += tranchePnL;

      // Re-add this tranche's tokens to simulated pool (working backwards)
      if (positionDirection === 'positive') {
        simulatedP += tranche.tokensCommitted;
      } else {
        simulatedN += tranche.tokensCommitted;
      }
    }

    return totalProfitLoss;
  };

  const getCategoryVolumes = (): Record<string, { volume: number; percentage: number }> => {
    // Calculate total volume per category from all transactions
    const categoryVolumes: Record<string, number> = {};
    let totalVolume = 0;

    // Sum up tokensCommitted for each category from all transactions
    transactions.forEach(transaction => {
      if (transaction.category) {
        const volume = transaction.tokensCommitted || 0;
        categoryVolumes[transaction.category] = (categoryVolumes[transaction.category] || 0) + volume;
        totalVolume += volume;
      }
    });

    // Calculate percentages
    const result: Record<string, { volume: number; percentage: number }> = {};
    Object.keys(categoryVolumes).forEach(category => {
      const volume = categoryVolumes[category];
      const percentage = totalVolume > 0 ? (volume / totalVolume) * 100 : 0;
      result[category] = { volume, percentage };
    });

    return result;
  };

  // Check if prices are stale (> 60 seconds since last update)
  const isPriceStale = useMemo(() => {
    if (!lastPriceUpdateTime) return false;
    const secondsSinceUpdate = (Date.now() - lastPriceUpdateTime) / 1000;
    return secondsSinceUpdate > 60;
  }, [lastPriceUpdateTime]);

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
        openPosition,
        closePosition,
        getHolding,
        getPosition,
        updatePrices,
        resetPortfolio,
        getEntityPrice,
        getAllEntityPrices,
        getEntityVolume,
        getEntityHigh,
        getEntityLow,
        getPositionOpenPnL,
        getCategoryVolumes,
        portfolioHistory,
        fetchPortfolio,
        fetchTransactions,
        lastPriceUpdateTime,
        isPriceStale,
        tradeError,
        clearTradeError,
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
