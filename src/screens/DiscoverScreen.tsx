import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useDiscoverData } from '../hooks/useDiscoverData';
import { useDiscoverApi } from '../hooks/useDiscoverApi';
import { useTrading } from '../context/TradingContext';
import { useNews } from '../context/NewsContext';
import { isBackendConfigured } from '../config/api';
import SectionHeader from '../components/SectionHeader';
import HorizontalEntityList from '../components/HorizontalEntityList';
import DiscussedEntityCard from '../components/DiscussedEntityCard';
import CompactEntityRow from '../components/CompactEntityRow';
import CompactEntityCard from '../components/CompactEntityCard';
import { SkeletonEntityCard, SkeletonEntityRow } from '../components/SkeletonLoader';
import type { DiscoverEntity } from '../hooks/useDiscoverData';

type DiscoverSection =
  | { type: 'trending' }
  | { type: 'movers' }
  | { type: 'discussed' }
  | { type: 'forYou' }
  | { type: 'gainers' }
  | { type: 'losers' };

/**
 * Enhanced Discover Screen for the Categories tab
 * Shows trending entities, movers, most discussed, and personalized recommendations
 */
const ALL_CATEGORIES = 'All';

export default function DiscoverScreen() {
  const { theme } = useTheme();
  const { isLoading: isTradingLoading, fetchPortfolio, fetchEntityPrices } = useTrading();
  const { isLoadingNews, refreshNews } = useNews();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORIES);

  const useApi = isBackendConfigured();
  const api = useDiscoverApi();
  const local = useDiscoverData();

  // When user selects a category, fetch that category's entities from API
  useEffect(() => {
    if (useApi && selectedCategory !== ALL_CATEGORIES && !api.discoverByCategory[selectedCategory]) {
      api.fetchDiscoverCategory(selectedCategory);
    }
  }, [useApi, selectedCategory, api.discoverByCategory, api.fetchDiscoverCategory]);

  // Prefer API data when backend is configured and we have data; otherwise use local
  const trending = useApi && api.trending.length > 0 ? api.trending : local.trending;
  const movers = useApi && api.gainers.length + api.losers.length > 0
    ? [...api.gainers, ...api.losers].sort((a, b) => Math.abs(b.changePercent24h) - Math.abs(a.changePercent24h)).slice(0, 10)
    : local.movers;
  const discussed = local.discussed;
  const forYou = local.forYou;
  const topGainers = useApi && api.gainers.length > 0 ? api.gainers : local.topGainers;
  const topLosers = useApi && api.losers.length > 0 ? api.losers : local.topLosers;

  const categoryList = useApi && api.categories.length > 0
    ? [ALL_CATEGORIES, ...api.categories.map((c) => c.name)]
    : [ALL_CATEGORIES];
  const categoryEntities = selectedCategory !== ALL_CATEGORIES ? (api.discoverByCategory[selectedCategory] || []) : null;

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchPortfolio(),
        fetchEntityPrices(),
        refreshNews(),
        useApi ? api.refresh() : Promise.resolve(),
      ]);
    } catch (error) {
      console.error('Error refreshing discover data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchPortfolio, fetchEntityPrices, refreshNews, useApi, api.refresh]);

  // Define sections to render in FlatList
  const sections: DiscoverSection[] = [
    { type: 'trending' },
    { type: 'movers' },
    { type: 'discussed' },
    { type: 'forYou' },
    { type: 'gainers' },
    { type: 'losers' },
  ];

  const renderSection = ({ item }: { item: DiscoverSection }) => {
    switch (item.type) {
      case 'trending':
        if (!trending || trending.length === 0) return null;
        return (
          <View style={styles.section}>
            <SectionHeader
              title="Trending"
              subtitle="Highest trading volume"
              icon="flame-outline"
              showSeeAll={false}
            />
            <HorizontalEntityList entities={trending} showRanks />
          </View>
        );

      case 'movers':
        if (!movers || movers.length === 0) return null;
        return (
          <View style={styles.section}>
            <SectionHeader
              title="Biggest Movers"
              subtitle="Largest price changes"
              icon="trending-up-outline"
              showSeeAll={false}
            />
            <HorizontalEntityList entities={movers} />
          </View>
        );

      case 'discussed':
        if (!discussed || discussed.length === 0) return null;
        return (
          <View style={styles.section}>
            <SectionHeader
              title="Most Discussed"
              subtitle="Top news coverage"
              icon="newspaper-outline"
              showSeeAll={false}
            />
            <View style={styles.discussedList}>
              {discussed.slice(0, 5).map((entity, index) => (
                <DiscussedEntityCard
                  key={entity.id}
                  entity={entity}
                  rank={index + 1}
                />
              ))}
            </View>
          </View>
        );

      case 'forYou':
        if (!forYou || forYou.length === 0) return null;
        return (
          <View style={styles.section}>
            <SectionHeader
              title="For You"
              subtitle="Personalized recommendations"
              icon="sparkles-outline"
              showSeeAll={false}
            />
            <HorizontalEntityList entities={forYou} />
          </View>
        );

      case 'gainers':
        if (!topGainers || topGainers.length === 0) return null;
        return (
          <View style={styles.section}>
            <SectionHeader
              title="Top Gainers"
              subtitle="Best performers today"
              icon="arrow-up-circle-outline"
              showSeeAll={false}
            />
            <View style={styles.rowList}>
              {topGainers.slice(0, 5).map((entity, index) => (
                <CompactEntityRow
                  key={entity.id}
                  entity={entity}
                  rank={index + 1}
                  showChart={false}
                />
              ))}
            </View>
          </View>
        );

      case 'losers':
        if (!topLosers || topLosers.length === 0) return null;
        return (
          <View style={styles.section}>
            <SectionHeader
              title="Top Losers"
              subtitle="Worst performers today"
              icon="arrow-down-circle-outline"
              showSeeAll={false}
            />
            <View style={styles.rowList}>
              {topLosers.slice(0, 5).map((entity, index) => (
                <CompactEntityRow
                  key={entity.id}
                  entity={entity}
                  rank={index + 1}
                  showChart={false}
                />
              ))}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        Start trading to see personalized recommendations
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      {/* Trending skeleton */}
      <View style={styles.section}>
        <SectionHeader
          title="Trending"
          subtitle="Loading..."
          icon="flame-outline"
          showSeeAll={false}
        />
        <View style={styles.skeletonHorizontal}>
          <SkeletonEntityCard />
          <SkeletonEntityCard />
          <SkeletonEntityCard />
        </View>
      </View>

      {/* Movers skeleton */}
      <View style={styles.section}>
        <SectionHeader
          title="Biggest Movers"
          subtitle="Loading..."
          icon="trending-up-outline"
          showSeeAll={false}
        />
        <View style={styles.skeletonHorizontal}>
          <SkeletonEntityCard />
          <SkeletonEntityCard />
          <SkeletonEntityCard />
        </View>
      </View>

      {/* Discussed skeleton */}
      <View style={styles.section}>
        <SectionHeader
          title="Most Discussed"
          subtitle="Loading..."
          icon="newspaper-outline"
          showSeeAll={false}
        />
        <View style={styles.discussedList}>
          <SkeletonEntityRow />
          <SkeletonEntityRow />
          <SkeletonEntityRow />
        </View>
      </View>
    </View>
  );

  // When a category is selected, we show category entities (or loading)
  const showingCategoryFilter = selectedCategory !== ALL_CATEGORIES;
  const hasCategoryData = showingCategoryFilter && categoryEntities && categoryEntities.length > 0;
  const hasData =
    (trending && trending.length > 0) ||
    (movers && movers.length > 0) ||
    (discussed && discussed.length > 0) ||
    (forYou && forYou.length > 0) ||
    (topGainers && topGainers.length > 0) ||
    (topLosers && topLosers.length > 0) ||
    hasCategoryData;

  const isLoading = isTradingLoading || isLoadingNews || (useApi && api.loading && !api.trending.length);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Discover</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Explore trending entities and opportunities
        </Text>
        {/* Category filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={styles.chipScroll}
        >
          {categoryList.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.chip,
                  { backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary, borderColor: theme.border },
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.chipText, { color: isSelected ? theme.card : theme.text }]} numberOfLines={1}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content: category view or main sections */}
      {showingCategoryFilter ? (
        <>
          {categoryEntities === undefined ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading {selectedCategory}…</Text>
            </View>
          ) : categoryEntities.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No entities in this category yet.</Text>
            </View>
          ) : (
            <FlatList
              data={categoryEntities}
              keyExtractor={(item) => `${item.id}`}
              numColumns={2}
              columnWrapperStyle={styles.tileRow}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }: { item: DiscoverEntity }) => (
                <View style={styles.tileWrapper}>
                  <CompactEntityCard entity={item} />
                </View>
              )}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={theme.primary}
                  colors={[theme.primary]}
                />
              }
            />
          )}
        </>
      ) : isLoading && !hasData ? (
        renderLoadingState()
      ) : !hasData ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={sections}
          renderItem={renderSection}
          keyExtractor={(item) => item.type}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 100, // Extra padding for floating nav
  },
  section: {
    marginBottom: 24,
  },
  discussedList: {
    paddingHorizontal: 16,
  },
  rowList: {
    backgroundColor: 'transparent',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    paddingTop: 16,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  skeletonHorizontal: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  chipScroll: {
    marginTop: 12,
    maxHeight: 40,
  },
  chipRow: {
    paddingRight: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  tileRow: {
    paddingHorizontal: 12,
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  tileWrapper: {
    width: '48%',
  },
});
