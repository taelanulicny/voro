import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WatchlistItem, PriceAlert } from '../types';
import { MOCK_ENTITIES } from '../utils/mockEntities';
import { useTrading } from './TradingContext';

interface WatchlistContextType {
  watchlist: WatchlistItem[];
  priceAlerts: PriceAlert[];
  addToWatchlist: (entityId: number) => void;
  removeFromWatchlist: (entityId: number) => void;
  isInWatchlist: (entityId: number) => boolean;
  addPriceAlert: (entityId: number, alertType: 'above' | 'below', targetPrice: number) => void;
  removePriceAlert: (alertId: string) => void;
  getAlertsForEntity: (entityId: number) => PriceAlert[];
  checkPriceAlerts: () => void;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

const WATCHLIST_STORAGE_KEY = '@moro_watchlist';
const PRICE_ALERTS_STORAGE_KEY = '@moro_price_alerts';

export const WatchlistProvider = ({ children }: { children: ReactNode }) => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const { getEntityPrice } = useTrading();

  // Load watchlist from storage
  useEffect(() => {
    const loadWatchlist = async () => {
      try {
        const stored = await AsyncStorage.getItem(WATCHLIST_STORAGE_KEY);
        if (stored) {
          setWatchlist(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error loading watchlist:', error);
      }
    };

    const loadAlerts = async () => {
      try {
        const stored = await AsyncStorage.getItem(PRICE_ALERTS_STORAGE_KEY);
        if (stored) {
          setPriceAlerts(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error loading price alerts:', error);
      }
    };

    loadWatchlist();
    loadAlerts();
  }, []);

  // Save watchlist to storage
  useEffect(() => {
    const saveWatchlist = async () => {
      try {
        await AsyncStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
      } catch (error: any) {
        // Ignore AsyncStorage errors in simulator (known issue with manifest file writing)
        // This is a harmless simulator-only issue and doesn't affect functionality
        if (__DEV__ && error?.message?.includes('manifest file')) {
          // Silently ignore in development/simulator
          return;
        }
        console.error('Error saving watchlist:', error);
      }
    };

    if (watchlist.length > 0 || watchlist.length === 0) {
      saveWatchlist();
    }
  }, [watchlist]);

  // Save alerts to storage
  useEffect(() => {
    const saveAlerts = async () => {
      try {
        await AsyncStorage.setItem(PRICE_ALERTS_STORAGE_KEY, JSON.stringify(priceAlerts));
      } catch (error: any) {
        // Ignore AsyncStorage errors in simulator (known issue with manifest file writing)
        // This is a harmless simulator-only issue and doesn't affect functionality
        if (__DEV__ && error?.message?.includes('manifest file')) {
          // Silently ignore in development/simulator
          return;
        }
        console.error('Error saving price alerts:', error);
      }
    };

    saveAlerts();
  }, [priceAlerts]);

  // Update watchlist items with current prices
  useEffect(() => {
    const updatePrices = () => {
      setWatchlist(prev =>
        prev.map(item => {
          const entity = MOCK_ENTITIES.find(e => e.id === item.entityId);
          if (!entity) return item;

          const currentPrice = getEntityPrice(item.entityId);
          const basePrice = entity.basePrice;
          const change24h = currentPrice - basePrice;
          const changePercent24h = (change24h / basePrice) * 100;

          return {
            ...item,
            currentPrice,
            change24h,
            changePercent24h,
          };
        })
      );
    };

    // Update prices every 5 seconds
    const interval = setInterval(updatePrices, 5000);
    updatePrices(); // Initial update

    return () => clearInterval(interval);
  }, [getEntityPrice]);

  // Check price alerts periodically
  useEffect(() => {
    const checkAlerts = () => {
      setPriceAlerts(prev =>
        prev.map(alert => {
          if (!alert.isActive) return alert;

          const currentPrice = getEntityPrice(alert.entityId);
          const shouldTrigger =
            (alert.alertType === 'above' && currentPrice >= alert.targetPrice) ||
            (alert.alertType === 'below' && currentPrice <= alert.targetPrice);

          if (shouldTrigger && !alert.triggeredAt) {
            // Trigger alert (in real app, would send notification)
            console.log(`Price alert triggered: ${alert.entityTicker} ${alert.alertType} ${alert.targetPrice}`);
            
            return {
              ...alert,
              currentPrice,
              isActive: false,
              triggeredAt: new Date().toISOString(),
            };
          }

          return {
            ...alert,
            currentPrice,
          };
        })
      );
    };

    const interval = setInterval(checkAlerts, 5000);
    checkAlerts(); // Initial check

    return () => clearInterval(interval);
  }, [getEntityPrice]);

  const addToWatchlist = useCallback((entityId: number) => {
    const entity = MOCK_ENTITIES.find(e => e.id === entityId);
    if (!entity) return;

    const currentPrice = getEntityPrice(entityId);
    const basePrice = entity.basePrice;
    const change24h = currentPrice - basePrice;
    const changePercent24h = (change24h / basePrice) * 100;

    const newItem: WatchlistItem = {
      entityId,
      entityTicker: entity.ticker,
      entityName: entity.name,
      category: entity.category,
      addedAt: new Date().toISOString(),
      currentPrice,
      change24h,
      changePercent24h,
    };

    setWatchlist(prev => {
      // Check if already in watchlist
      if (prev.some(item => item.entityId === entityId)) {
        return prev;
      }
      return [...prev, newItem];
    });
  }, [getEntityPrice]);

  const removeFromWatchlist = useCallback((entityId: number) => {
    setWatchlist(prev => prev.filter(item => item.entityId !== entityId));
    // Also remove any alerts for this entity
    setPriceAlerts(prev => prev.filter(alert => alert.entityId !== entityId));
  }, []);

  const isInWatchlist = useCallback((entityId: number) => {
    return watchlist.some(item => item.entityId === entityId);
  }, [watchlist]);

  const addPriceAlert = useCallback((entityId: number, alertType: 'above' | 'below', targetPrice: number) => {
    const entity = MOCK_ENTITIES.find(e => e.id === entityId);
    if (!entity) return;

    const currentPrice = getEntityPrice(entityId);

    const newAlert: PriceAlert = {
      id: `alert_${Date.now()}_${entityId}`,
      entityId,
      entityTicker: entity.ticker,
      entityName: entity.name,
      alertType,
      targetPrice,
      currentPrice,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    setPriceAlerts(prev => [...prev, newAlert]);
  }, [getEntityPrice]);

  const removePriceAlert = useCallback((alertId: string) => {
    setPriceAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  const getAlertsForEntity = useCallback((entityId: number) => {
    return priceAlerts.filter(alert => alert.entityId === entityId && alert.isActive);
  }, [priceAlerts]);

  const checkPriceAlerts = useCallback(() => {
    // This is handled by the useEffect above
    // But we can expose it for manual checks if needed
  }, []);

  return (
    <WatchlistContext.Provider
      value={{
        watchlist,
        priceAlerts,
        addToWatchlist,
        removeFromWatchlist,
        isInWatchlist,
        addPriceAlert,
        removePriceAlert,
        getAlertsForEntity,
        checkPriceAlerts,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
};

export const useWatchlist = () => {
  const context = useContext(WatchlistContext);
  if (context === undefined) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
};

