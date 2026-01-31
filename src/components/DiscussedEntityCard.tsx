import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types';
import { DiscoverEntity } from '../hooks/useDiscoverData';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface DiscussedEntityCardProps {
  entity: DiscoverEntity;
  rank?: number;
}

/**
 * Entity card showing news/discussion count for Most Discussed section
 */
export default function DiscussedEntityCard({ entity, rank }: DiscussedEntityCardProps) {
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
      <View style={styles.content}>
        {/* Rank */}
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

          {/* News count */}
          <View style={styles.newsRow}>
            <Ionicons name="newspaper-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.newsCount, { color: theme.textSecondary }]}>
              {entity.newsCount} {entity.newsCount === 1 ? 'article' : 'articles'}
            </Text>
          </View>
        </View>

        {/* Price info */}
        <View style={styles.priceContainer}>
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
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rank: {
    fontSize: 16,
    fontWeight: '700',
    width: 32,
    textAlign: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
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
    marginBottom: 4,
  },
  newsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newsCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  priceContainer: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  change: {
    fontSize: 12,
    fontWeight: '600',
  },
});
