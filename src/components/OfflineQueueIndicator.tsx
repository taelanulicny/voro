/**
 * Offline Queue Indicator
 * 
 * Displays a banner when there are pending requests in the offline queue.
 * Shows queue size and processing status.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { getOfflineQueueStatus } from '../config/api';

export default function OfflineQueueIndicator() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [queueStatus, setQueueStatus] = useState({
    queueSize: 0,
    isProcessing: false,
    oldestRequestTimestamp: null as number | null,
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check queue status every 2 seconds
    const interval = setInterval(() => {
      const status = getOfflineQueueStatus();
      setQueueStatus(status);
      setIsVisible(status.queueSize > 0);
    }, 2000);

    // Check immediately
    const status = getOfflineQueueStatus();
    setQueueStatus(status);
    setIsVisible(status.queueSize > 0);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return null;
  }

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.warning || '#F59E0B', paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text style={styles.icon}>📤</Text>
        <View style={styles.textContainer}>
          <Text style={styles.message}>
            {queueStatus.isProcessing
              ? `Syncing ${queueStatus.queueSize} request${queueStatus.queueSize !== 1 ? 's' : ''}...`
              : `${queueStatus.queueSize} request${queueStatus.queueSize !== 1 ? 's' : ''} pending`}
          </Text>
          {queueStatus.oldestRequestTimestamp && (
            <Text style={styles.timestamp}>
              Oldest: {formatTimeAgo(queueStatus.oldestRequestTimestamp)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.9,
    marginTop: 2,
  },
});

