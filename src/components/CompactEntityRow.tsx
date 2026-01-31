import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types';
import { DiscoverEntity } from '../hooks/useDiscoverData';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';
import SparklineChart from './SparklineChart';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface CompactEntityRowProps {
  entity: DiscoverEntity;
  rank?: number;
  showChart?: boolean;
  priceHistory?: number[];
}

/**
 * Compact row layout for entity display in vertical lists
 */
export default function CompactEntityRow({
  entity,
  rank,
  showChart = false,
  priceHistory = [],
}: CompactEntityRowProps) {
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
      style={[styles.row, { borderBottomColor: theme.border }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Rank (optional) */}
      {rank !== undefined && (
        <Text style={[styles.rank, { color: theme.textSecondary }]}>#{rank}</Text>
      )}

      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: theme.primaryLight }]}>
        <Text style={[styles.avatarText, { color: theme.primary }]}>
          {entity.name.substring(0, 2).toUpperCase()}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {entity.name}
        </Text>
        <Text style={[styles.category, { color: theme.textSecondary }]} numberOfLines={1}>
          {entity.category}
        </Text>
      </View>

      {/* Chart (optional) */}
      {showChart && priceHistory.length >= 2 && (
        <View style={styles.chartContainer}>
          <SparklineChart
            data={priceHistory}
            width={60}
            height={30}
            color={isPositive ? '#10b981' : '#ef4444'}
          />
        </View>
      )}

      {/* Price */}
      <View style={styles.priceContainer}>
        <Text style={[styles.price, { color: theme.text }]}>
          {formatCurrency(entity.currentPrice)}
        </Text>
        <View style={styles.changeRow}>
          {entity.hasPosition && (
            <Ionicons name="checkmark-circle" size={12} color={theme.primary} style={styles.positionIcon} />
          )}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  rank: {
    fontSize: 14,
    fontWeight: '700',
    width: 32,
    textAlign: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  category: {
    fontSize: 12,
  },
  chartContainer: {
    marginHorizontal: 12,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  positionIcon: {
    marginRight: 2,
  },
  change: {
    fontSize: 12,
    fontWeight: '600',
  },
});
