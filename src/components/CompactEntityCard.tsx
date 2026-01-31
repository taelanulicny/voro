import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types';
import { DiscoverEntity } from '../hooks/useDiscoverData';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';
import SparklineChart from './SparklineChart';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface CompactEntityCardProps {
  entity: DiscoverEntity;
  priceHistory?: number[]; // Array of prices for sparkline
  showRank?: boolean;
  rank?: number;
}

/**
 * Compact entity card for horizontal scrolling lists in Discover tab
 */
export default function CompactEntityCard({
  entity,
  priceHistory = [],
  showRank = false,
  rank,
}: CompactEntityCardProps) {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();

  const handlePress = () => {
    navigation.navigate('Entity', {
      entityId: entity.id,
      categoryId: entity.category,
    });
  };

  const isPositive = entity.changePercent24h >= 0;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Rank badge */}
      {showRank && rank !== undefined && (
        <View style={[styles.rankBadge, { backgroundColor: theme.primaryLight }]}>
          <Text style={[styles.rankText, { color: theme.primary }]}>#{rank}</Text>
        </View>
      )}

      {/* Entity info */}
      <View style={styles.content}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: theme.primaryLight }]}>
          <Text style={[styles.avatarText, { color: theme.primary }]}>
            {entity.name.substring(0, 2).toUpperCase()}
          </Text>
        </View>

        {/* Name */}
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
          {entity.name}
        </Text>

        {/* Category */}
        <Text style={[styles.category, { color: theme.textSecondary }]} numberOfLines={1}>
          {entity.category}
        </Text>

        {/* Sparkline chart */}
        {priceHistory.length >= 2 && (
          <View style={styles.chartContainer}>
            <SparklineChart
              data={priceHistory}
              width={100}
              height={30}
              color={isPositive ? '#10b981' : '#ef4444'}
            />
          </View>
        )}

        {/* Price and change */}
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: theme.text }]}>
            {formatCurrency(entity.currentPrice)}
          </Text>
          <Text style={[styles.change, { color: getChangeColor(entity.change24h) }]}>
            {isPositive ? '+' : ''}
            {entity.changePercent24h.toFixed(2)}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 120,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    position: 'relative',
  },
  rankBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 10,
  },
  rankText: {
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
    lineHeight: 16,
  },
  category: {
    fontSize: 10,
    marginBottom: 8,
    textAlign: 'center',
  },
  chartContainer: {
    marginVertical: 8,
    alignItems: 'center',
  },
  priceRow: {
    alignItems: 'center',
    marginTop: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  change: {
    fontSize: 11,
    fontWeight: '600',
  },
});
