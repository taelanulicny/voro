import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import EntityFeedCard from '../EntityFeedCard';
import { EntityWithStats } from '../../hooks/useCategoryData';

interface ForYouModuleProps {
  entities: EntityWithStats[];
  reasons: Record<number, string>;
  isLoading: boolean;
  onEntityPress?: (entity: EntityWithStats) => void;
  onQuickBuy?: (entity: EntityWithStats) => void;
  onQuickSell?: (entity: EntityWithStats) => void;
}

export default function ForYouModule({
  entities,
  reasons,
  isLoading,
  onEntityPress,
  onQuickBuy,
  onQuickSell,
}: ForYouModuleProps) {
  const { theme } = useTheme();

  if (entities.length === 0 && !isLoading) {
    return null; // Don't show if no entities
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles-outline" size={20} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>For You</Text>
        </View>
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
              Loading recommendations...
            </Text>
          </View>
        ) : entities.length > 0 ? (
          entities.map((entity) => {
            const reason = reasons[entity.id];
            return (
              <View key={entity.id} style={styles.cardWrapper}>
                <EntityFeedCard
                  entity={entity}
                  onPress={() => onEntityPress?.(entity)}
                  onQuickBuy={() => onQuickBuy?.(entity)}
                  onQuickSell={() => onQuickSell?.(entity)}
                  showSparkline={false}
                />
                {reason && (
                  <View style={[styles.reasonBadge, { backgroundColor: theme.primaryLight }]}>
                    <Ionicons name="information-circle" size={12} color={theme.primary} />
                    <Text style={[styles.reasonText, { color: theme.primary }]} numberOfLines={1}>
                      {reason}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        ) : null}
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
    position: 'relative',
  },
  reasonBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reasonText: {
    fontSize: 10,
    fontWeight: '500',
    flex: 1,
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

