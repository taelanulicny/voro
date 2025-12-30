import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { WatchlistItem, PriceAlert } from '../types';
import { useTrading } from './TradingContext';
import { useAuth } from './AuthContext';
import { authenticatedRequest, isBackendConfigured } from '../config/api';
import { WatchlistItemSchema, validateArrayLoose } from '../validators';

interface WatchlistContextType {
  watchlist: WatchlistItem[];
  priceAlerts: PriceAlert[];
  isLoading: boolean;
  addToWatchlist: (entityId: number) => Promise<{ success: boolean; error?: string }>;
  removeFromWatchlist: (entityId: number) => Promise<{ success: boolean; error?: string }>;
  isInWatchlist: (entityId: number) => boolean;
  refreshWatchlist: () => Promise<void>;
  addPriceAlert: (entityId: number, alertType: 'above' | 'below', targetPrice: number) => void;
  removePriceAlert: (alertId: string) => void;
  getAlertsForEntity: (entityId: number) => PriceAlert[];
  checkPriceAlerts: () => void;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export const WatchlistProvider = ({ children }: { children: ReactNode }) => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { getEntityPrice } = useTrading();
  const { token, isAuthenticated } = useAuth();

  // Fetch watchlist from backend
  const refreshWatchlist = useCallback(async () => {
    if (!token || !isAuthenticated || !isBackendConfigured()) {
      setWatchlist([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await authenticatedRequest<WatchlistItem[]>(
        '/api/watchlist',
        token,
        {
          method: 'GET',
        }
      );

      if (response.success && response.data && Array.isArray(response.data)) {
        // Validate watchlist items
        const validatedItems = validateArrayLoose(WatchlistItemSchema, response.data);
        
        // Update with current prices
        // Note: We use current price as both current and base initially
        // The price update effect will track changes over time
        const itemsWithPrices: WatchlistItem[] = validatedItems.map(item => {
          const currentPrice = getEntityPrice(item.entityId);
          // For now, set change to 0 - the price update effect will calculate real changes
          const change24h = 0;
          const changePercent24h = 0;

          return {
            ...item,
            currentPrice,
            change24h,
            changePercent24h,
          };
        });

        setWatchlist(itemsWithPrices);
      } else {
        setWatchlist([]);
      }
    } catch (error) {
      console.debug('Error fetching watchlist (backend may not be running):', error);
      setWatchlist([]);
    } finally {
      setIsLoading(false);
    }
  }, [token, isAuthenticated, getEntityPrice]);

  // Load watchlist on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated && token) {
      refreshWatchlist();
    } else {
      setWatchlist([]);
    }
  }, [isAuthenticated, token, refreshWatchlist]);

  // Update watchlist items with current prices (prices come from TradingContext)
  useEffect(() => {
    const updatePrices = () => {
      setWatchlist(prev =>
        prev.map(item => {
          const currentPrice = getEntityPrice(item.entityId);
          // Use the first price we saw as base, or current price if no base
          const basePrice = item.currentPrice || currentPrice;
          const change24h = currentPrice - basePrice;
          const changePercent24h = basePrice > 0 ? (change24h / basePrice) * 100 : 0;

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

  const addToWatchlist = useCallback(async (entityId: number): Promise<{ success: boolean; error?: string }> => {
    if (!token || !isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!isBackendConfigured()) {
      return { success: false, error: 'This feature requires a backend connection.' };
    }

    // Check if already in watchlist
    if (watchlist.some(item => item.entityId === entityId)) {
      return { success: false, error: 'Entity already in watchlist' };
    }

    try {
      const response = await authenticatedRequest<{
        entityId: number;
        entityTicker?: string;
        entityName?: string;
        category?: string;
        addedAt: string;
      }>(
        '/api/watchlist',
        token,
        {
          method: 'POST',
          body: JSON.stringify({ entityId }),
        }
      );

      if (response.success && response.data) {
        // Refresh watchlist from backend to get full entity details
        await refreshWatchlist();
        return { success: true };
      }

      return { success: false, error: response.error || 'Failed to add to watchlist' };
    } catch (error: any) {
      console.error('Error adding to watchlist:', error);
      return { success: false, error: error.message || 'Failed to add to watchlist' };
    }
  }, [token, isAuthenticated, watchlist, refreshWatchlist]);

  const removeFromWatchlist = useCallback(async (entityId: number): Promise<{ success: boolean; error?: string }> => {
    if (!token || !isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!isBackendConfigured()) {
      return { success: false, error: 'This feature requires a backend connection.' };
    }

    try {
      const response = await authenticatedRequest(
        `/api/watchlist/${entityId}`,
        token,
        {
          method: 'DELETE',
        }
      );

      if (response.success) {
        // Remove from local state immediately for better UX
        setWatchlist(prev => prev.filter(item => item.entityId !== entityId));
        // Also remove any alerts for this entity
        setPriceAlerts(prev => prev.filter(alert => alert.entityId !== entityId));
        return { success: true };
      }

      return { success: false, error: response.error || 'Failed to remove from watchlist' };
    } catch (error: any) {
      console.error('Error removing from watchlist:', error);
      return { success: false, error: error.message || 'Failed to remove from watchlist' };
    }
  }, [token, isAuthenticated]);

  const isInWatchlist = useCallback((entityId: number) => {
    return watchlist.some(item => item.entityId === entityId);
  }, [watchlist]);

  const addPriceAlert = useCallback((entityId: number, alertType: 'above' | 'below', targetPrice: number) => {
    // Find entity from watchlist to get ticker/name
    const watchlistItem = watchlist.find(item => item.entityId === entityId);
    if (!watchlistItem) {
      console.warn('Cannot add price alert: entity not in watchlist');
      return;
    }

    const currentPrice = getEntityPrice(entityId);

    const newAlert: PriceAlert = {
      id: `alert_${Date.now()}_${entityId}`,
      entityId,
      entityTicker: watchlistItem.entityTicker,
      entityName: watchlistItem.entityName,
      alertType,
      targetPrice,
      currentPrice,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    setPriceAlerts(prev => [...prev, newAlert]);
  }, [getEntityPrice, watchlist]);

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
        isLoading,
        addToWatchlist,
        removeFromWatchlist,
        isInWatchlist,
        refreshWatchlist,
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

