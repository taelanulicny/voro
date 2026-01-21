import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { Portfolio, Holding, UserTransaction } from '../types';
import { authenticatedRequest, isBackendConfigured } from '../config/api';
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
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const INITIAL_CASH_BALANCE = 1000;

export const TradingProvider = ({ children }: { children: ReactNode }) => {
  const { token, isAuthenticated } = useAuth();
  const [cashBalance, setCashBalance] = useState(INITIAL_CASH_BALANCE);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [todayChange, setTodayChange] = useState(0);
  const [todayChangePercent, setTodayChangePercent] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [lastPriceUpdateTime, setLastPriceUpdateTime] = useState<number | null>(null);
  
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
        // Update last price update time
        setLastPriceUpdateTime(Date.now());
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

  // Poll for price updates every 1 second (only if backend is configured)
  // More frequent updates for real-time trading experience
  useEffect(() => {
    if (!isAuthenticated || !token || !isBackendConfigured()) return;

    const interval = setInterval(() => {
      fetchEntityPrices().catch(err => console.error('Error fetching entity prices:', err));
      fetchPortfolio().catch(err => console.error('Error fetching portfolio:', err));
    }, 1000); // 1 second for real-time price updates

    return () => clearInterval(interval);
  }, [isAuthenticated, token, fetchEntityPrices, fetchPortfolio]);

  // Always recalculate prices every second even if pools haven't changed
  // This keeps UI and timestamps fresh in standalone mode as well.
  useEffect(() => {
    const interval = setInterval(() => {
      const recalculated: Record<number, number> = {};
      ENTITIES.forEach((entity) => {
        const pools = entityPools[entity.id] || getInitialPoolValues();
        recalculated[entity.id] = calculatePrice(pools.positiveTokens, pools.negativeTokens);
      });
      setEntityPrices((prev) => ({ ...prev, ...recalculated }));
      setLastPriceUpdateTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [entityPools]);

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

  const executeTrade = async (
    entityId: number,
    entityName: string,
    type: 'open' | 'close',
    direction: 'positive' | 'negative',
    tokensCommitted: number,
    category: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);

      // Get current pools for this entity
      const currentPools = entityPools[entityId] || getInitialPoolValues();
      const p = currentPools.positiveTokens;
      const n = currentPools.negativeTokens;

      if (type === 'open') {
        // Check if user already has an open position for this entity
        const existingPosition = userPositions[entityId];
        
        if (existingPosition) {
          // User has existing position - check if direction matches
          if (existingPosition.direction !== direction) {
            Alert.alert('Direction Mismatch', `You already have a ${existingPosition.direction} position. Cannot add ${direction} tokens. Close the existing position first.`);
            return false;
          }

          // ADD TO EXISTING POSITION
          // Check sufficient funds
          if (cashBalance < tokensCommitted) {
            Alert.alert('Insufficient Funds', `You need ${tokensCommitted} tokens but only have ${cashBalance.toFixed(2)}.`);
            return false;
          }

          // Calculate current ratio BEFORE adding new tokens (this is the entry ratio for this tranche)
          const currentRatio = calculateSentimentRatio(p, n);

          // Add tokens to appropriate pool
          const newP = direction === 'positive' ? p + tokensCommitted : p;
          const newN = direction === 'negative' ? n + tokensCommitted : n;

          // Ensure P and N never go below 0
          if (newP < 0 || newN < 0) {
            Alert.alert('Invalid Pool State', 'Pools cannot go negative.');
            return false;
          }

          // Update pools immediately
          setEntityPools(prev => ({
            ...prev,
            [entityId]: { positiveTokens: newP, negativeTokens: newN }
          }));

          // Add new tranche to position (each add is a separate tranche with its own entry ratio)
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

          // Record transaction for adding to position
          const newTransaction: UserTransaction = {
            id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            entityId,
          entityName,
            type: 'open', // Still 'open' type
            direction,
            tokensCommitted, // Only the new tokens added
            pricePerToken: currentRatio, // Current ratio before adding
            totalAmount: tokensCommitted, // Cost is new tokens committed
            timestamp: new Date().toISOString(),
            category,
          };
          setTransactions(prev => [newTransaction, ...prev]);

          // Try to execute on backend (treat as 'add' type if backend supports it)
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
                  type: 'open', // Backend should handle adding to existing position
                  direction,
                  tokensCommitted,
                }),
              });

              if (response.success && response.data) {
                setCashBalance(response.data.cashBalance);
                setHoldings(response.data.holdings);
                setTodayChange(response.data.todayChange);
                setTodayChangePercent(response.data.todayChangePercent);
                await fetchTransactions();
              }
            } catch (error) {
              console.error('Error adding to position on backend:', error);
            }
          }

          return true;
        }

        // NEW POSITION
        // Check sufficient funds
        if (cashBalance < tokensCommitted) {
          Alert.alert('Insufficient Funds', `You need ${tokensCommitted} tokens but only have ${cashBalance.toFixed(2)}.`);
          return false;
        }

        // Calculate EntryRatio BEFORE adding tokens
        const entryRatio = calculateSentimentRatio(p, n);

        // Add tokens to appropriate pool
        const newP = direction === 'positive' ? p + tokensCommitted : p;
        const newN = direction === 'negative' ? n + tokensCommitted : n;

        // Ensure P and N never go below 0
        if (newP < 0 || newN < 0) {
          Alert.alert('Invalid Pool State', 'Pools cannot go negative.');
          return false;
        }

        // Update pools immediately
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

        // Record transaction for new position
        const newTransaction: UserTransaction = {
          id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          entityId,
          entityName,
          type: 'open',
          direction,
          tokensCommitted,
          pricePerToken: entryRatio, // Entry ratio at time of opening
          totalAmount: tokensCommitted, // Cost is tokens committed
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
        // Update local state with backend response
        setCashBalance(response.data.cashBalance);
        setHoldings(response.data.holdings);
        setTodayChange(response.data.todayChange);
        setTodayChangePercent(response.data.todayChangePercent);

              // Refresh transactions
              await fetchTransactions();
            }
          } catch (error) {
            console.error('Error executing trade on backend:', error);
            // Continue with local state (already updated above)
          }
        }

        return true;
      } else {
        // CLOSE position
        const position = userPositions[entityId];
        if (!position) {
          Alert.alert('No Position', 'You do not have an open position for this entity.');
          return false;
        }

        const positionDirection = position.direction;
        const tranches = position.tranches;
        
        // Calculate total tokens committed (sum of all tranches)
        const totalTokensCommitted = tranches.reduce((sum, tranche) => sum + tranche.tokensCommitted, 0);

        // Remove ALL user tokens from pool FIRST (to restore pools to state before user's first trade)
        const newP = positionDirection === 'positive' ? Math.max(0, p - totalTokensCommitted) : p;
        const newN = positionDirection === 'negative' ? Math.max(0, n - totalTokensCommitted) : n;

        // Calculate exitRatio AFTER removing all tokens (as required)
        // This exitRatio represents the pool state without the user's tokens
        const exitRatio = calculateSentimentRatio(newP, newN);

        // Calculate PnL per tranche and sum them
        // CRITICAL: To ensure users get back exactly what they put in when no other trades occur,
        // we need to simulate what each tranche's effective "exit state" would be.
        // Since exitRatio is the pool state after removing ALL tokens (i.e., original state if no other trades),
        // we need to account for the fact that each tranche's entryRatio was calculated with previous tranches' impact.
        // 
        // The solution: When calculating each tranche's P&L, we need to determine what the exitRatio
        // would be from that tranche's perspective - i.e., the pool state just before that tranche was added.
        // This requires working backwards from the current exitRatio.
        
        // Reverse simulate: Start from exitRatio (state after removing all tokens),
        // and work backwards to determine what each tranche's "effective exit ratio" should be
        // by re-adding previous tranches one by one
        
        let simulatedP = newP;
        let simulatedN = newN;
        let totalProfitLoss = 0;
        
        // Process tranches in reverse order (last added = first to evaluate)
        // As we work backwards, we're essentially asking: "If this tranche exits,
        // what would the pool state be (which other tranches are still in)?"
        for (let i = tranches.length - 1; i >= 0; i--) {
          const tranche = tranches[i];
          
          // The effective exit ratio for this tranche is the current simulated pool state
          // This represents what the pool looks like when evaluating this tranche's exit,
          // accounting for all tranches added before it
          const effectiveExitRatio = calculateSentimentRatio(simulatedP, simulatedN);
          
          // Calculate P&L for this tranche using its entryRatio vs effectiveExitRatio
          const deltaR = effectiveExitRatio - tranche.entryRatio;
          let tranchePnL = tranche.tokensCommitted * deltaR;
          
          // Direction adjustment: if negative position, flip PnL
          if (positionDirection === 'negative') {
            tranchePnL = -tranchePnL;
          }
          
          totalProfitLoss += tranchePnL;
          
          // Re-add this tranche's tokens to simulated pool (working backwards)
          // This prepares the state for evaluating the next (earlier) tranche
          if (positionDirection === 'positive') {
            simulatedP += tranche.tokensCommitted;
          } else {
            simulatedN += tranche.tokensCommitted;
          }
        }

        // Calculate total tokens returned
        const tokensReturned = Math.max(0, totalTokensCommitted + totalProfitLoss);

        // Update pools immediately
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

        // Record transaction for closing position
        const newTransaction: UserTransaction = {
          id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          entityId,
          entityName,
          type: 'close',
          tokensCommitted: totalTokensCommitted, // Total tokens from all tranches
          pricePerToken: exitRatio, // Exit ratio after removing all tokens
          totalAmount: tokensReturned, // Tokens returned to user
          timestamp: new Date().toISOString(),
          category,
          profitLoss: totalProfitLoss, // Total P&L (sum of all tranches)
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
              }),
            });

            if (response.success && response.data) {
              // Update local state with backend response
              setCashBalance(response.data.cashBalance);
              setHoldings(response.data.holdings);
              setTodayChange(response.data.todayChange);
              setTodayChangePercent(response.data.todayChangePercent);

        // Refresh transactions
        await fetchTransactions();
            }
          } catch (error) {
            console.error('Error executing trade on backend:', error);
            // Continue with local state (already updated above)
          }
        }

        return true;
      }
    } catch (error) {
      console.error('Error executing trade:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
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
      Alert.alert('No Position', 'You do not have an open position for this entity.');
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

  const resetPortfolio = () => {
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
