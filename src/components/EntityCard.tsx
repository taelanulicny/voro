import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList, Entity, PriceDataPoint } from '../types';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';
import MiniChart from './MiniChart';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface EntityCardProps {
  entity: Entity;
  priceHistory?: PriceDataPoint[]; // Optional 7-day price history for chart
  variant?: 'compact' | 'full';
  onPress?: () => void;
  onQuickBuy?: () => void;
  onQuickSell?: () => void;
  showQuickActions?: boolean;
}

export default function EntityCard({
  entity,
  priceHistory = [],
  variant = 'full',
  onPress,
  onQuickBuy,
  onQuickSell,
  showQuickActions = false,
}: EntityCardProps) {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();

  // Extract last 7 data points for sparkline
  const chartData = priceHistory
    .slice(-7)
    .map(point => point.price)
    .filter((_, index, arr) => arr.length >= 2 || index > 0); // Need at least 2 points

  // Calculate price change
  const change = entity.change24h || 0;
  const changePercent = entity.changePercent24h || 0;
  const isPositive = change >= 0;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Navigate to entity screen
      // Map category to categoryId format
      const categoryMap: Record<string, string> = {
        'Politics': 'Political Figures',
        'People': 'Influencers',
      };
      const categoryId = categoryMap[entity.category] || entity.category;
      
      navigation.navigate('Entity' as never, {
        entityId: entity.id,
        categoryId: categoryId,
      } as never);
    }
  };

  const handleQuickBuy = (e: any) => {
    e.stopPropagation();
    if (onQuickBuy) {
      onQuickBuy();
    } else {
      // Default: Navigate to entity screen with trade modal
      handlePress();
    }
  };

  const handleQuickSell = (e: any) => {
    e.stopPropagation();
    if (onQuickSell) {
      onQuickSell();
    } else {
      // Default: Navigate to entity screen with trade modal
      handlePress();
    }
  };

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={[styles.compactCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.compactContent}>
          {/* Avatar/Logo */}
          <View style={[styles.compactAvatar, { backgroundColor: theme.primaryLight }]}>
            {entity.logoUrl ? (
              <Image source={{ uri: entity.logoUrl }} style={styles.compactAvatarImage} />
            ) : (
              <Text style={[styles.compactAvatarText, { color: theme.primary }]}>
                {entity.name.substring(0, 2).toUpperCase()}
              </Text>
            )}
          </View>

          {/* Info */}
          <View style={styles.compactInfo}>
            <Text style={[styles.compactName, { color: theme.text }]} numberOfLines={2}>
              {entity.name}
            </Text>
          </View>

          {/* Chart */}
          {chartData.length >= 2 && (
            <View style={styles.compactChart}>
              <MiniChart data={chartData} width={50} height={24} />
            </View>
          )}

          {/* Price & Change */}
          <View style={styles.compactPrice}>
            <Text style={[styles.compactPriceText, { color: theme.text }]}>
              {formatCurrency(entity.currentPrice)}
            </Text>
            <Text
              style={[
                styles.compactChangeText,
                { color: getChangeColor(change) },
              ]}
            >
              {isPositive ? '+' : ''}
              {changePercent.toFixed(2)}%
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Full variant
  return (
    <TouchableOpacity
      style={[styles.fullCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.fullContent}>
        {/* Header */}
        <View style={styles.fullHeader}>
          <View style={styles.fullHeaderLeft}>
            {/* Avatar/Logo */}
            <View style={[styles.fullAvatar, { backgroundColor: theme.primaryLight }]}>
              {entity.logoUrl ? (
                <Image source={{ uri: entity.logoUrl }} style={styles.fullAvatarImage} />
              ) : (
                <Text style={[styles.fullAvatarText, { color: theme.primary }]}>
                  {entity.name.substring(0, 2).toUpperCase()}
                </Text>
              )}
            </View>

            {/* Entity Info */}
            <View style={styles.fullEntityInfo}>
              <View style={styles.fullEntityHeader}>
                <Text style={[styles.fullName, { color: theme.text }]} numberOfLines={2}>
                  {entity.name}
                </Text>
                <View style={[styles.fullCategoryBadge, { backgroundColor: theme.backgroundSecondary }]}>
                  <Text style={[styles.fullCategoryText, { color: theme.textSecondary }]}>
                    {entity.category}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Price Info */}
          <View style={styles.fullPriceInfo}>
            <Text style={[styles.fullPrice, { color: theme.text }]}>
              {formatCurrency(entity.currentPrice)}
            </Text>
            <View style={styles.fullChangeContainer}>
              <Ionicons
                name={isPositive ? 'trending-up' : 'trending-down'}
                size={14}
                color={getChangeColor(change)}
              />
              <Text
                style={[
                  styles.fullChange,
                  { color: getChangeColor(change) },
                ]}
              >
                {isPositive ? '+' : ''}
                {changePercent.toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Chart */}
        {chartData.length >= 2 && (
          <View style={styles.fullChart}>
            <MiniChart data={chartData} width={280} height={40} />
          </View>
        )}

        {/* Quick Actions */}
        {showQuickActions && (
          <View style={styles.fullActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.buyButton, { backgroundColor: theme.success + '20' }]}
              onPress={handleQuickBuy}
            >
              <Ionicons name="arrow-up" size={16} color={theme.success} />
              <Text style={[styles.actionButtonText, { color: theme.success }]}>Buy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.sellButton, { backgroundColor: theme.error + '20' }]}
              onPress={handleQuickSell}
            >
              <Ionicons name="arrow-down" size={16} color={theme.error} />
              <Text style={[styles.actionButtonText, { color: theme.error }]}>Sell</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Compact variant
  compactCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginRight: 12,
    width: 120,
    minHeight: 150,
  },
  compactContent: {
    alignItems: 'center',
  },
  compactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  compactAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  compactAvatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  compactInfo: {
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  compactTicker: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  compactName: {
    fontSize: 11,
    textAlign: 'center',
  },
  compactChart: {
    marginBottom: 8,
    alignItems: 'center',
  },
  compactPrice: {
    alignItems: 'center',
  },
  compactPriceText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  compactChangeText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Full variant
  fullCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  fullContent: {
    width: '100%',
  },
  fullHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  fullHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  fullAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fullAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  fullAvatarText: {
    fontSize: 18,
    fontWeight: '600',
  },
  fullEntityInfo: {
    flex: 1,
  },
  fullEntityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  fullTicker: {
    fontSize: 16,
    fontWeight: '600',
  },
  fullCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  fullCategoryText: {
    fontSize: 11,
    fontWeight: '500',
  },
  fullName: {
    fontSize: 14,
  },
  fullPriceInfo: {
    alignItems: 'flex-end',
  },
  fullPrice: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  fullChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fullChange: {
    fontSize: 14,
    fontWeight: '500',
  },
  fullChart: {
    marginBottom: 12,
    alignItems: 'center',
  },
  fullActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  buyButton: {},
  sellButton: {},
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

