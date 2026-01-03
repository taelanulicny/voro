import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';
import { Entity } from '../types';

interface TrendingEntity {
  id: number;
  name: string;
  ticker: string;
  category: string;
  displayCategory: string;
  currentPrice: number;
  change24h: number;
  changePercent24h: number;
  rank?: number;
  positionChange?: number;
}

interface TrendingEntitiesProps {
  entities: TrendingEntity[];
  onEntityPress: (entity: TrendingEntity) => void;
  onSeeAll?: () => void;
  title?: string;
  maxItems?: number;
}

export default React.memo(function TrendingEntities({
  entities,
  onEntityPress,
  onSeeAll,
  title = "Trending",
  maxItems = 5,
}: TrendingEntitiesProps) {
  const { theme } = useTheme();

  const displayEntities = entities.slice(0, maxItems);

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  if (displayEntities.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {onSeeAll && (
            <TouchableOpacity onPress={onSeeAll}>
              <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="trending-up-outline" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No trending entities</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Trending entities will appear here
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll}>
            <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {displayEntities.map((entity, index) => (
          <TouchableOpacity
            key={entity.id}
            style={[styles.entityCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
            onPress={() => onEntityPress(entity)}
          >
            {entity.rank !== undefined && (
              <View style={styles.rankContainer}>
                <Text style={[styles.rankNumber, { color: theme.textSecondary }]}>
                  {entity.rank}
                </Text>
                {entity.positionChange !== undefined && entity.positionChange !== 0 && (
                  <View style={styles.positionChangeContainer}>
                    {entity.positionChange > 0 ? (
                      <View style={styles.positionChangeUp}>
                        <Ionicons name="arrow-up" size={10} color="#10B981" />
                        <Text style={styles.positionChangeTextUp}>{entity.positionChange}</Text>
                      </View>
                    ) : (
                      <View style={styles.positionChangeDown}>
                        <Ionicons name="arrow-down" size={10} color="#EF4444" />
                        <Text style={styles.positionChangeTextDown}>{Math.abs(entity.positionChange)}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
            <View style={styles.entityInfo}>
              <View style={[styles.entityIcon, { backgroundColor: theme.primaryLight }]}>
                <Text style={[styles.entityIconText, { color: theme.primary }]}>
                  {getInitials(entity.name)}
                </Text>
              </View>
              <View style={styles.entityDetails}>
                <Text style={[styles.entityName, { color: theme.text }]} numberOfLines={1}>
                  {entity.name}
                </Text>
                <Text style={[styles.entityCategory, { color: theme.textSecondary }]} numberOfLines={1}>
                  {entity.displayCategory}
                </Text>
              </View>
            </View>
            <View style={styles.priceInfo}>
              <Text style={[styles.price, { color: theme.text }]}>
                {formatCurrency(entity.currentPrice)}
              </Text>
              <Text style={[styles.change, { color: getChangeColor(entity.change24h) }]}>
                {entity.change24h >= 0 ? '+' : ''}
                {entity.changePercent24h.toFixed(2)}%
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    gap: 12,
  },
  entityCard: {
    width: 160,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  rankContainer: {
    alignItems: 'center',
    marginBottom: 4,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  positionChangeContainer: {
    marginTop: 2,
  },
  positionChangeUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  positionChangeDown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  positionChangeTextUp: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
  },
  positionChangeTextDown: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '600',
  },
  entityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  entityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entityIconText: {
    fontSize: 12,
    fontWeight: '600',
  },
  entityDetails: {
    flex: 1,
  },
  entityName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  entityCategory: {
    fontSize: 11,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  change: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});




