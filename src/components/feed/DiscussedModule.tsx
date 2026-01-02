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

interface DiscussedModuleProps {
  entities: EntityWithStats[];
  isLoading: boolean;
  onEntityPress?: (entity: EntityWithStats) => void;
  onQuickBuy?: (entity: EntityWithStats) => void;
  onQuickSell?: (entity: EntityWithStats) => void;
}

export default function DiscussedModule({
  entities,
  isLoading,
  onEntityPress,
  onQuickBuy,
  onQuickSell,
}: DiscussedModuleProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="chatbubbles-outline" size={20} color={theme.text} />
          <Text style={[styles.title, { color: theme.text }]}>Most Discussed</Text>
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
              Loading discussed entities...
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
                showSparkline={false}
              />
              {entity.postCount && entity.postCount > 0 && (
                <View style={[styles.postCountBadge, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons name="chatbubble" size={12} color={theme.primary} />
                  <Text style={[styles.postCountText, { color: theme.primary }]}>
                    {entity.postCount}
                  </Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No discussed entities
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
  postCountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
  },
  postCountText: {
    fontSize: 11,
    fontWeight: '600',
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

