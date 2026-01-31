import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useDiscoverData } from '../hooks/useDiscoverData';
import { useTrading } from '../context/TradingContext';
import { useNews } from '../context/NewsContext';
import SectionHeader from '../components/SectionHeader';
import HorizontalEntityList from '../components/HorizontalEntityList';
import DiscussedEntityCard from '../components/DiscussedEntityCard';
import CompactEntityRow from '../components/CompactEntityRow';
import { SkeletonEntityCard, SkeletonEntityRow } from '../components/SkeletonLoader';

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
export default function DiscoverScreen() {
  const { theme } = useTheme();
  const { isLoading: isTradingLoading, fetchPortfolio, fetchEntityPrices } = useTrading();
  const { isLoadingNews, refreshNews } = useNews();
  const [refreshing, setRefreshing] = useState(false);

  // Get discover data from hook
  const {
    trending,
    movers,
    discussed,
    forYou,
    topGainers,
    topLosers,
  } = useDiscoverData();

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchPortfolio(),
        fetchEntityPrices(),
        refreshNews(),
      ]);
    } catch (error) {
      console.error('Error refreshing discover data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchPortfolio, fetchEntityPrices, refreshNews]);

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

  // Check if we have any data
  const hasData =
    (trending && trending.length > 0) ||
    (movers && movers.length > 0) ||
    (discussed && discussed.length > 0) ||
    (forYou && forYou.length > 0) ||
    (topGainers && topGainers.length > 0) ||
    (topLosers && topLosers.length > 0);

  const isLoading = isTradingLoading || isLoadingNews;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Discover</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Explore trending entities and opportunities
        </Text>
      </View>

      {/* Content */}
      {isLoading && !hasData ? (
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
});
