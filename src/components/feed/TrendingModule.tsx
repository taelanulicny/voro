import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import EntityFeedCard from '../EntityFeedCard';
import { EntityWithStats } from '../../hooks/useCategoryData';

interface TrendingModuleProps {
  entities: EntityWithStats[];
  isLoading: boolean;
  onEntityPress?: (entity: EntityWithStats) => void;
  onQuickBuy?: (entity: EntityWithStats) => void;
  onQuickSell?: (entity: EntityWithStats) => void;
}

export default function TrendingModule({
  entities,
  isLoading,
  onEntityPress,
  onQuickBuy,
  onQuickSell,
}: TrendingModuleProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Trending Today</Text>
        {isLoading && <ActivityIndicator size="small" color={theme.primary} />}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {isLoading && entities.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Loading trending entities...
            </Text>
          </View>
        ) : entities.length > 0 ? (
          entities.map((entity) => (
            <View key={entity.id} style={styles.cardWrapper}>
              <EntityFeedCard
                entity={entity}
                onPress={() => onEntityPress?.(entity)}
                onQuickBuy={() => onQuickBuy?.(entity)}
                onQuickSell={() => onQuickSell?.(entity)}
                showSparkline={false} // Horizontal scroll - no sparklines for performance
              />
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No trending entities
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  scrollContent: {
    paddingRight: 16,
  },
  cardWrapper: {
    width: 320,
    marginLeft: 16,
  },
  emptyState: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});

