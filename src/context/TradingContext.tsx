import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Portfolio, Holding, UserTransaction } from '../types';

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
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const INITIAL_CASH_BALANCE = 10000; // Starting cash: $10,000

export const TradingProvider = ({ children }: { children: ReactNode }) => {
  const [cashBalance, setCashBalance] = useState(INITIAL_CASH_BALANCE);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [todayChange, setTodayChange] = useState(0);
  const [todayChangePercent, setTodayChangePercent] = useState(0);

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
