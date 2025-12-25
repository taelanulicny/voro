import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Portfolio, Holding, UserTransaction } from '../types';
import { MOCK_ENTITIES } from '../utils/mockEntities';

interface TradingContextType {
  portfolio: Portfolio;
  transactions: UserTransaction[];
  executeTrade: (
    entityId: number,
    entityName: string,
    entityTicker: string,
    type: 'buy' | 'sell',
    quantity: number,
    pricePerToken: number,
    category: string
  ) => boolean;
  getHolding: (entityId: number) => Holding | undefined;
  updatePrices: (entityId: number, newPrice: number) => void;
  resetPortfolio: () => void;
  getEntityPrice: (entityId: number) => number;
  getAllEntityPrices: () => Record<number, number>;
  portfolioHistory: number[]; // Portfolio value history for chart
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const INITIAL_CASH_BALANCE = 10000; // Starting cash: $10,000

export const TradingProvider = ({ children }: { children: ReactNode }) => {
  const [cashBalance, setCashBalance] = useState(INITIAL_CASH_BALANCE);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [todayChange, setTodayChange] = useState(0);
  const [todayChangePercent, setTodayChangePercent] = useState(0);
  
  // Global entity prices - tracks current price for all entities
  const [entityPrices, setEntityPrices] = useState<Record<number, number>>(() => {
    const initialPrices: Record<number, number> = {};
    MOCK_ENTITIES.forEach(entity => {
      // Start with base price plus small random variation (with cents)
      const variation = (Math.random() - 0.5) * 8; // -4 to +4 range
      initialPrices[entity.id] = Math.round((entity.basePrice + variation) * 100) / 100; // Round to 2 decimals
    });
    return initialPrices;
  });
  
  // Portfolio value history for chart animation
  const [portfolioHistory, setPortfolioHistory] = useState<number[]>([]);
  const portfolioHistoryRef = useRef<number[]>([]);
  const maxHistoryLength = 100; // Keep last 100 data points

  // Calculate portfolio total value
  const calculateTotalValue = () => {
    const holdingsValue = holdings.reduce((sum, holding) => sum + holding.totalValue, 0);
    return cashBalance + holdingsValue;
  };

  // Calculate today's change (mock for now - in real app would compare to yesterday's close)
  const calculateTodayChange = () => {
    const totalProfitLoss = holdings.reduce((sum, holding) => sum + holding.profitLoss, 0);
    return totalProfitLoss * 0.1; // Mock: 10% of P&L as today's change
  };

  // Real-time price updates for all entities - DISABLED (keeping prices static)
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setEntityPrices(prev => {
  //       const updated: Record<number, number> = {};
  //       MOCK_ENTITIES.forEach(entity => {
  //         const currentPrice = prev[entity.id] || entity.basePrice;
  //         // More noticeable random change: ±1% to ±3% per update for visible movement
  //         const changePercent = (Math.random() - 0.5) * 0.06; // -3% to +3%
  //         const change = currentPrice * changePercent;
  //         const newPrice = Math.max(entity.basePrice * 0.5, Math.min(entity.basePrice * 1.5, currentPrice + change)); // Prevent going too low or too high
  //         updated[entity.id] = newPrice;
  //         
  //         // Update holdings if user owns this entity
  //         setHoldings(currentHoldings => 
  //           currentHoldings.map(h => {
  //             if (h.entityId === entity.id) {
  //               const newTotalValue = h.quantity * newPrice;
  //               const newProfitLoss = newTotalValue - h.totalCost;
  //               const newProfitLossPercent = (newProfitLoss / h.totalCost) * 100;
  //               return {
  //                 ...h,
  //                 currentPrice: newPrice,
  //                 totalValue: newTotalValue,
  //                 profitLoss: newProfitLoss,
  //                 profitLossPercent: newProfitLossPercent,
  //               };
  //             }
  //             return h;
  //           })
  //         );
  //       });
  //       return updated;
  //     });
  //   }, 3000); // Update every 3 seconds

  //   return () => clearInterval(interval);
  // }, []);

  // Update portfolio history for chart - update more frequently for smooth animation
  useEffect(() => {
    // Initial value
    const initialValue = calculateTotalValue();
    if (portfolioHistoryRef.current.length === 0) {
      portfolioHistoryRef.current = Array(10).fill(initialValue); // Start with 10 points of same value
      setPortfolioHistory([...portfolioHistoryRef.current]);
    }
  }, []);

  // Update portfolio history continuously - DISABLED (keeping portfolio static)
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     const totalValue = calculateTotalValue();
  //     portfolioHistoryRef.current = [...portfolioHistoryRef.current, totalValue];
  //     
  //     // Keep only last N points (sliding window effect - removes oldest, adds newest)
  //     if (portfolioHistoryRef.current.length > maxHistoryLength) {
  //       portfolioHistoryRef.current = portfolioHistoryRef.current.slice(-maxHistoryLength);
  //     }
  //     
  //     // Force update by creating new array reference
  //     setPortfolioHistory([...portfolioHistoryRef.current]);
  //   }, 3000); // Update every 3 seconds to match price updates
  //   
  //   return () => clearInterval(interval);
  // }, [holdings, cashBalance, entityPrices]); // Update when these change

  useEffect(() => {
    const change = calculateTodayChange();
    const totalValue = calculateTotalValue();
    setTodayChange(change);
    setTodayChangePercent(totalValue > 0 ? (change / totalValue) * 100 : 0);
  }, [holdings, cashBalance]);

  const executeTrade = (
    entityId: number,
    entityName: string,
    entityTicker: string,
    type: 'buy' | 'sell',
    quantity: number,
    pricePerToken: number,
    category: string
  ): boolean => {
    const totalAmount = quantity * pricePerToken;

    if (type === 'buy') {
      // Check if user has enough cash
      if (totalAmount > cashBalance) {
        return false; // Insufficient funds
      }

      // Deduct cash
      setCashBalance(prev => prev - totalAmount);

      // Update or create holding
      setHoldings(prev => {
        const existingHolding = prev.find(h => h.entityId === entityId);

        if (existingHolding) {
          // Add to existing position
          const newQuantity = existingHolding.quantity + quantity;
          const newTotalCost = existingHolding.totalCost + totalAmount;
          const newAverageCost = newTotalCost / newQuantity;
          const newTotalValue = newQuantity * pricePerToken;
          const newProfitLoss = newTotalValue - newTotalCost;
          const newProfitLossPercent = (newProfitLoss / newTotalCost) * 100;

          return prev.map(h =>
            h.entityId === entityId
              ? {
                  ...h,
                  quantity: newQuantity,
                  averageCost: newAverageCost,
                  currentPrice: pricePerToken,
                  totalValue: newTotalValue,
                  totalCost: newTotalCost,
                  profitLoss: newProfitLoss,
                  profitLossPercent: newProfitLossPercent,
                }
              : h
          );
        } else {
          // Create new holding
          const newHolding: Holding = {
            entityId,
            entityName,
            entityTicker,
            quantity,
            averageCost: pricePerToken,
            currentPrice: pricePerToken,
            totalValue: totalAmount,
            totalCost: totalAmount,
            profitLoss: 0,
            profitLossPercent: 0,
            category,
          };
          return [...prev, newHolding];
        }
      });
    } else {
      // SELL
      const existingHolding = holdings.find(h => h.entityId === entityId);

      if (!existingHolding || existingHolding.quantity < quantity) {
        return false; // Insufficient holdings
      }

      // Add cash from sale
      setCashBalance(prev => prev + totalAmount);

      // Update or remove holding
      setHoldings(prev => {
        const holding = prev.find(h => h.entityId === entityId);
        if (!holding) return prev;

        const newQuantity = holding.quantity - quantity;

        if (newQuantity === 0) {
          // Remove holding completely
          return prev.filter(h => h.entityId !== entityId);
        } else {
          // Reduce quantity
          const newTotalCost = holding.totalCost * (newQuantity / holding.quantity);
          const newTotalValue = newQuantity * pricePerToken;
          const newProfitLoss = newTotalValue - newTotalCost;
          const newProfitLossPercent = (newProfitLoss / newTotalCost) * 100;

          return prev.map(h =>
            h.entityId === entityId
              ? {
                  ...h,
                  quantity: newQuantity,
                  currentPrice: pricePerToken,
                  totalValue: newTotalValue,
                  totalCost: newTotalCost,
                  profitLoss: newProfitLoss,
                  profitLossPercent: newProfitLossPercent,
                }
              : h
          );
        }
      });
    }

    // Record transaction
    const newTransaction: UserTransaction = {
      id: Date.now().toString() + Math.random().toString(),
      entityId,
      entityName,
      entityTicker,
      type,
      quantity,
      pricePerToken,
      totalAmount,
      timestamp: new Date().toISOString(),
      category,
    };
    setTransactions(prev => [newTransaction, ...prev]);

    return true;
  };

  const getHolding = (entityId: number): Holding | undefined => {
    return holdings.find(h => h.entityId === entityId);
  };

  const updatePrices = (entityId: number, newPrice: number) => {
    setHoldings(prev =>
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
  };

  const getEntityPrice = (entityId: number): number => {
    return entityPrices[entityId] || MOCK_ENTITIES.find(e => e.id === entityId)?.basePrice || 100;
  };

  const getAllEntityPrices = (): Record<number, number> => {
    return entityPrices;
  };

  const portfolio: Portfolio = {
    cashBalance,
    totalValue: calculateTotalValue(),
    holdings,
    todayChange,
    todayChangePercent,
  };

  return (
    <TradingContext.Provider
      value={{
        portfolio,
        transactions,
        executeTrade,
        getHolding,
        updatePrices,
        resetPortfolio,
        getEntityPrice,
        getAllEntityPrices,
        portfolioHistory,
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
