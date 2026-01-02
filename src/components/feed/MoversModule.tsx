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

interface MoversModuleProps {
  gainers: EntityWithStats[];
  losers: EntityWithStats[];
  isLoading: boolean;
  onEntityPress?: (entity: EntityWithStats) => void;
  onQuickBuy?: (entity: EntityWithStats) => void;
  onQuickSell?: (entity: EntityWithStats) => void;
}

export default function MoversModule({
  gainers,
  losers,
  isLoading,
  onEntityPress,
  onQuickBuy,
  onQuickSell,
}: MoversModuleProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Biggest Movers</Text>
        {isLoading && <ActivityIndicator size="small" color={theme.primary} />}
      </View>

      {/* Gainers */}
      <View style={styles.subsection}>
        <Text style={[styles.subsectionTitle, { color: theme.success }]}>Gainers</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {isLoading && gainers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Loading gainers...
              </Text>
            </View>
          ) : gainers.length > 0 ? (
            gainers.map((entity) => (
              <View key={entity.id} style={styles.cardWrapper}>
                <EntityFeedCard
                  entity={entity}
                  onPress={() => onEntityPress?.(entity)}
                  onQuickBuy={() => onQuickBuy?.(entity)}
                  onQuickSell={() => onQuickSell?.(entity)}
                  showSparkline={false}
                />
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No gainers
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Losers */}
      <View style={styles.subsection}>
        <Text style={[styles.subsectionTitle, { color: theme.error }]}>Losers</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {isLoading && losers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Loading losers...
              </Text>
            </View>
          ) : losers.length > 0 ? (
            losers.map((entity) => (
              <View key={entity.id} style={styles.cardWrapper}>
                <EntityFeedCard
                  entity={entity}
                  onPress={() => onEntityPress?.(entity)}
                  onQuickBuy={() => onQuickBuy?.(entity)}
                  onQuickSell={() => onQuickSell?.(entity)}
                  showSparkline={false}
                />
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No losers
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
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
  subsection: {
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 16,
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

