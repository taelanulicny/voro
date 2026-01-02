import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList, PriceDataPoint } from '../types';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';
import MiniChart from './MiniChart';
import { EntityWithStats } from '../hooks/useCategoryData';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface EntityFeedCardProps {
  entity: EntityWithStats;
  priceHistory?: PriceDataPoint[]; // Optional 24h history for sparkline
  sentiment?: 'positive' | 'negative' | 'neutral';
  onPress?: () => void;
  onQuickBuy?: () => void;
  onQuickSell?: () => void;
  showSparkline?: boolean; // Conditional rendering
}

export default React.memo(function EntityFeedCard({
  entity,
  priceHistory = [],
  sentiment,
  onPress,
  onQuickBuy,
  onQuickSell,
  showSparkline = false,
}: EntityFeedCardProps) {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();

  // Extract sparkline data from 24h price history (24 data points)
  const sparklineData = React.useMemo(() => {
    if (!priceHistory || priceHistory.length === 0 || !showSparkline) {
      return [];
    }
    // Take last 24 points or all if less than 24
    const data = priceHistory.slice(-24).map(point => point.price);
    return data.length >= 2 ? data : [];
  }, [priceHistory, showSparkline]);

  // Calculate price change
  const change = entity.change24h || 0;
  const changePercent = entity.changePercent24h || 0;
  const isPositive = change >= 0;
  const changeColor = getChangeColor(change);

  // Determine sentiment color
  const sentimentColor = React.useMemo(() => {
    if (sentiment === 'positive') return theme.success;
    if (sentiment === 'negative') return theme.error;
    return theme.textTertiary;
  }, [sentiment, theme]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Navigate to entity screen
      const categoryMap: Record<string, string> = {
        'Tech': 'Startups',
        'Politics': 'Political Figures',
        'Events': 'Sports',
        'People': 'Influencers',
      };
      const categoryId = categoryMap[entity.category || ''] || entity.category;
      
      navigation.navigate('Entity' as never, {
        entityId: entity.id,
        categoryId: categoryId || '',
      } as never);
    }
  };

  const handleQuickBuy = (e: any) => {
    e.stopPropagation();
    if (onQuickBuy) {
      onQuickBuy();
    }
  };

  const handleQuickSell = (e: any) => {
    e.stopPropagation();
    if (onQuickSell) {
      onQuickSell();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* Left: Logo/Avatar */}
        <View style={[styles.avatar, { backgroundColor: theme.primaryLight }]}>
          {entity.logoUrl ? (
            <Image source={{ uri: entity.logoUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.avatarText, { color: theme.primary }]}>
              {entity.name.substring(0, 2).toUpperCase()}
            </Text>
          )}
        </View>

        {/* Center: Info */}
        <View style={styles.info}>
          <View style={styles.infoHeader}>
            <Text style={[styles.ticker, { color: theme.text }]} numberOfLines={1}>
              {entity.ticker}
            </Text>
            {sentiment && (
              <View style={[styles.sentimentDot, { backgroundColor: sentimentColor }]} />
            )}
            {entity.category && (
              <View style={[styles.categoryBadge, { backgroundColor: theme.backgroundSecondary }]}>
                <Text style={[styles.categoryText, { color: theme.textSecondary }]} numberOfLines={1}>
                  {entity.category}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.name, { color: theme.textSecondary }]} numberOfLines={1}>
            {entity.name}
          </Text>
        </View>

        {/* Sparkline (optional) */}
        {showSparkline && sparklineData.length >= 2 && (
          <View style={styles.sparkline}>
            <MiniChart data={sparklineData} width={60} height={30} />
          </View>
        )}

        {/* Right: Price & Actions */}
        <View style={styles.rightSection}>
          <View style={styles.priceSection}>
            <Text style={[styles.price, { color: theme.text }]}>
              {formatCurrency(entity.currentPrice)}
            </Text>
            <View style={styles.changeRow}>
              <Ionicons
                name={isPositive ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={changeColor}
              />
              <Text style={[styles.change, { color: changeColor }]}>
                {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
              </Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.buyButton, { backgroundColor: theme.success + '20' }]}
              onPress={handleQuickBuy}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add-circle" size={18} color={theme.success} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.sellButton, { backgroundColor: theme.error + '20' }]}
              onPress={handleQuickSell}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="remove-circle" size={18} color={theme.error} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  info: {
    flex: 1,
    minWidth: 0, // Allow text truncation
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  ticker: {
    fontSize: 16,
    fontWeight: '600',
  },
  sentimentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '500',
  },
  name: {
    fontSize: 13,
  },
  sparkline: {
    marginHorizontal: 8,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 8,
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  change: {
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButton: {},
  sellButton: {},
});

