import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';
import Treemap from '../components/Treemap';
import { Ionicons } from '@expo/vector-icons';
import EntityCard from '../components/EntityCard';
import CategoryFilterChips from '../components/CategoryFilterChips';
import TradeModal from '../components/TradeModal';
import EntityFeedCard from '../components/EntityFeedCard';
import EntityFeedCardSkeleton from '../components/feed/EntityFeedCardSkeleton';
import TrendingModule from '../components/feed/TrendingModule';
import MoversModule from '../components/feed/MoversModule';
import DiscussedModule from '../components/feed/DiscussedModule';
import ForYouModule from '../components/feed/ForYouModule';
import { useCategoryData, EntityWithStats } from '../hooks/useCategoryData';
import { useTrading } from '../context/TradingContext';
import { PriceDataPoint } from '../types';
import { apiRequest, isBackendConfigured } from '../config/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TREEMAP_HEIGHT = SCREEN_HEIGHT * 0.67; // 2/3 of screen height

// Type for category volume data from backend
interface CategoryVolume {
  name: string;
  categoryId: string;
  percentage: number;
  previousPercentage: number;
  color: 'green' | 'red';
  volume24h: number;
  previousVolume24h: number;
  entityCount: number;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AllCategoriesScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { portfolio } = useTrading();
  const [viewType, setViewType] = useState<'treemap' | 'list' | 'browse'>('treemap');
  const [sortFilter, setSortFilter] = useState<'alphabetical' | 'volume-high-low' | 'volume-low-high' | 'trending'>('volume-high-low');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [tradeModalEntity, setTradeModalEntity] = useState<EntityWithStats | null>(null);
  const [tradeModalVisible, setTradeModalVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Category volumes from backend
  const [categoryVolumes, setCategoryVolumes] = useState<CategoryVolume[]>([]);
  const [isLoadingVolumes, setIsLoadingVolumes] = useState(true);
  const [volumesError, setVolumesError] = useState<string | null>(null);
  
  const {
    trending,
    movers,
    discussed,
    discoverEntities,
    forYouEntities,
    forYouReasons,
    isLoadingTrending,
    isLoadingMovers,
    isLoadingDiscussed,
    isLoadingDiscover,
    isLoadingForYou,
    hasMoreDiscover,
    loadMoreDiscover,
    refreshTrending,
    refreshMovers,
    refreshDiscussed,
    refreshDiscover,
    refreshForYou,
    fetchDiscover,
    fetchEntityPriceHistory,
  } = useCategoryData();
  
  const [refreshing, setRefreshing] = useState(false);

  // Price history cache for sparklines (lazy loaded)
  const [priceHistoryCache, setPriceHistoryCache] = useState<Record<number, PriceDataPoint[]>>({});
  const [loadingPriceHistory, setLoadingPriceHistory] = useState<Set<number>>(new Set());
  const priceHistoryCacheRef = useRef<Record<number, PriceDataPoint[]>>({});
  const loadingPriceHistoryRef = useRef<Set<number>>(new Set());

  // Keep refs in sync with state
  useEffect(() => {
    priceHistoryCacheRef.current = priceHistoryCache;
  }, [priceHistoryCache]);

  useEffect(() => {
    loadingPriceHistoryRef.current = loadingPriceHistory;
  }, [loadingPriceHistory]);

  // Fetch category volumes from backend
  const fetchCategoryVolumes = useCallback(async () => {
    if (!isBackendConfigured()) {
      setVolumesError('Backend not configured');
      setIsLoadingVolumes(false);
      return;
    }

    setIsLoadingVolumes(true);
    setVolumesError(null);
    
    try {
      const response = await apiRequest<{ success?: boolean; volumes?: CategoryVolume[] }>('/api/categories/volumes');
      
      if (response.success && response.data) {
        const data = response.data as any;
        // Handle different response formats
        if (Array.isArray(data.volumes)) {
          setCategoryVolumes(data.volumes);
        } else if (Array.isArray(data)) {
          setCategoryVolumes(data);
        } else if (data && typeof data === 'object' && 'volumes' in data && Array.isArray((data as any).volumes)) {
          setCategoryVolumes((data as any).volumes);
        } else {
          // If no volumes data, set empty array (no error - just no data yet)
          setCategoryVolumes([]);
        }
      } else {
        // If response is not successful but no error message, it might be empty data
        if (response.error) {
          setVolumesError(response.error);
        } else {
          // No error message means likely empty data, not an error
          setCategoryVolumes([]);
        }
      }
    } catch (error: any) {
      console.error('Error fetching category volumes:', error);
      // Only set error if it's a real error, not just empty data
      const errorMessage = error?.message || 'Failed to fetch category volumes';
      // Check if it's an "Internal server error" - might be backend issue
      if (errorMessage.includes('Internal server error') || errorMessage.includes('500')) {
        setVolumesError('Unable to load category volumes. Please try again later.');
      } else {
        setVolumesError(errorMessage);
      }
      setCategoryVolumes([]);
    } finally {
      setIsLoadingVolumes(false);
    }
  }, []);

  // Load category volumes on mount
  useEffect(() => {
    fetchCategoryVolumes();
  }, [fetchCategoryVolumes]);

  const handleCategoryPress = (categoryId: string) => {
    navigation.navigate('Category', { categoryId });
  };

  const handleViewChange = (view: 'treemap' | 'list' | 'browse') => {
    setViewType(view);
    const scrollToX = view === 'treemap' ? 0 : view === 'list' ? SCREEN_WIDTH : SCREEN_WIDTH * 2;
    scrollViewRef.current?.scrollTo({ x: scrollToX, animated: true });
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / SCREEN_WIDTH);
    const newView = pageIndex === 0 ? 'treemap' : pageIndex === 1 ? 'list' : 'browse';
    if (newView !== viewType) {
      setViewType(newView);
    }
  };

  // Initialize scroll position based on viewType
  useEffect(() => {
    // Small delay to ensure ScrollView is mounted
    const timer = setTimeout(() => {
      const scrollToX = viewType === 'treemap' ? 0 : viewType === 'list' ? SCREEN_WIDTH : SCREEN_WIDTH * 2;
      scrollViewRef.current?.scrollTo({ x: scrollToX, animated: false });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchCategoryVolumes(),
      refreshTrending(),
      refreshMovers(),
      refreshDiscussed(),
      refreshDiscover(),
      refreshForYou(),
    ]);
    setRefreshing(false);
  };

  const renderFilterTabs = () => (
    <View style={[styles.filterTabs, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <TouchableOpacity
        style={styles.filterTab}
        onPress={() => handleViewChange('treemap')}
      >
        <Text
          style={[
            styles.filterTabText,
            { color: viewType === 'treemap' ? theme.primary : theme.textSecondary },
            viewType === 'treemap' && { fontWeight: '600' },
          ]}
        >
          Treemap
        </Text>
        {viewType === 'treemap' && <View style={[styles.filterTabIndicator, { backgroundColor: theme.primary }]} />}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.filterTab}
        onPress={() => handleViewChange('list')}
      >
        <Text
          style={[
            styles.filterTabText,
            { color: viewType === 'list' ? theme.primary : theme.textSecondary },
            viewType === 'list' && { fontWeight: '600' },
          ]}
        >
          List View
        </Text>
        {viewType === 'list' && <View style={[styles.filterTabIndicator, { backgroundColor: theme.primary }]} />}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.filterTab}
        onPress={() => handleViewChange('browse')}
      >
        <Text
          style={[
            styles.filterTabText,
            { color: viewType === 'browse' ? theme.primary : theme.textSecondary },
            viewType === 'browse' && { fontWeight: '600' },
          ]}
        >
          Browse
        </Text>
        {viewType === 'browse' && <View style={[styles.filterTabIndicator, { backgroundColor: theme.primary }]} />}
      </TouchableOpacity>
    </View>
  );

  // Sort categories based on selected filter (using real data from backend)
  const sortedCategories = useMemo(() => {
    const sorted = [...categoryVolumes];
    
    switch (sortFilter) {
      case 'alphabetical':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      
      case 'volume-high-low':
        // Default - already sorted by percentage (trade volume) high to low
        return sorted.sort((a, b) => b.percentage - a.percentage);
      
      case 'volume-low-high':
        return sorted.sort((a, b) => a.percentage - b.percentage);
      
      case 'trending':
        // Sort by absolute percentage change (trending = biggest moves, positive or negative)
        return sorted.sort((a, b) => {
          const changeA = Math.abs(a.percentage - a.previousPercentage);
          const changeB = Math.abs(b.percentage - b.previousPercentage);
          return changeB - changeA; // High to low
        });
      
      default:
        return sorted;
    }
  }, [sortFilter, categoryVolumes]);

  const renderFilterButtons = () => (
    <View style={[styles.filterSection, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortFilterTabs}
      >
        <TouchableOpacity
          style={[
            styles.sortFilterTab,
            {
              backgroundColor: sortFilter === 'alphabetical' ? theme.primaryLight : theme.backgroundSecondary,
              borderColor: sortFilter === 'alphabetical' ? theme.primary : theme.border,
            },
          ]}
          onPress={() => setSortFilter('alphabetical')}
        >
          <Text
            style={[
              styles.sortFilterTabText,
              { color: sortFilter === 'alphabetical' ? theme.primary : theme.textSecondary },
              sortFilter === 'alphabetical' && { fontWeight: '600' },
            ]}
          >
            Alphabetical
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sortFilterTab,
            {
              backgroundColor: sortFilter === 'volume-high-low' ? theme.primaryLight : theme.backgroundSecondary,
              borderColor: sortFilter === 'volume-high-low' ? theme.primary : theme.border,
            },
          ]}
          onPress={() => setSortFilter('volume-high-low')}
        >
          <Text
            style={[
              styles.sortFilterTabText,
              { color: sortFilter === 'volume-high-low' ? theme.primary : theme.textSecondary },
              sortFilter === 'volume-high-low' && { fontWeight: '600' },
            ]}
          >
            Trade Volume High to Low
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sortFilterTab,
            {
              backgroundColor: sortFilter === 'volume-low-high' ? theme.primaryLight : theme.backgroundSecondary,
              borderColor: sortFilter === 'volume-low-high' ? theme.primary : theme.border,
            },
          ]}
          onPress={() => setSortFilter('volume-low-high')}
        >
          <Text
            style={[
              styles.sortFilterTabText,
              { color: sortFilter === 'volume-low-high' ? theme.primary : theme.textSecondary },
              sortFilter === 'volume-low-high' && { fontWeight: '600' },
            ]}
          >
            Trade Volume Low to High
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sortFilterTab,
            {
              backgroundColor: sortFilter === 'trending' ? theme.primaryLight : theme.backgroundSecondary,
              borderColor: sortFilter === 'trending' ? theme.primary : theme.border,
            },
          ]}
          onPress={() => setSortFilter('trending')}
        >
          <Text
            style={[
              styles.sortFilterTabText,
              { color: sortFilter === 'trending' ? theme.primary : theme.textSecondary },
              sortFilter === 'trending' && { fontWeight: '600' },
            ]}
          >
            Trending
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderCategoryItem = ({ item }: { item: CategoryVolume }) => {
    const changePercent = item.percentage - item.previousPercentage;
    const isPositive = changePercent > 0;
    const changeColor = isPositive ? '#10B981' : '#EF4444';
    
    return (
      <TouchableOpacity
        style={[styles.categoryItem, { backgroundColor: theme.card, borderBottomColor: theme.border }]}
        onPress={() => handleCategoryPress(item.categoryId)}
      >
        <View style={styles.categoryItemLeft}>
          <View style={[
            styles.categoryIndicator,
            { backgroundColor: item.color === 'green' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }
          ]}>
            <View style={[
              styles.categoryDot,
              { backgroundColor: item.color === 'green' ? '#10B981' : '#EF4444' }
            ]} />
          </View>
          <Text style={[styles.categoryItemName, { color: theme.text }]}>{item.name}</Text>
        </View>
        <View style={styles.categoryItemRight}>
          <Text style={[styles.categoryItemPercentage, { color: theme.text }]}>
            {item.percentage}%
          </Text>
          <View style={styles.changeContainer}>
            <Text style={[styles.changeText, { color: changeColor }]}>(</Text>
            <Ionicons 
              name={isPositive ? 'arrow-up' : 'arrow-down'} 
              size={12} 
              color={changeColor} 
            />
            <Text style={[styles.changeText, { color: changeColor }]}>
              {Math.abs(changePercent).toFixed(1)}%)
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const handleCategoryChange = useCallback((category: string | null) => {
    setSelectedCategory(category);
    // Refresh discover feed with new category filter
    if (fetchDiscover) {
      fetchDiscover(category, undefined, false);
    } else {
      refreshDiscover();
    }
  }, [refreshDiscover, fetchDiscover]);

  const handleSearchPress = useCallback(() => {
    navigation.navigate('Search');
  }, [navigation]);

  const handleEntityPress = useCallback((entity: EntityWithStats) => {
    const categoryMap: Record<string, string> = {
      'Tech': 'Startups',
      'Politics': 'Political Figures',
      'Events': 'Sports',
      'People': 'Influencers',
    };
    const categoryId = categoryMap[entity.category || ''] || entity.category;
    
    navigation.navigate('Entity' as never, {
      entityId: entity.id,
      categoryId: categoryId || '',
    } as never);
  }, [navigation]);

  const handleQuickBuy = useCallback((entity: EntityWithStats) => {
    setTradeModalEntity(entity);
    setTradeModalVisible(true);
  }, []);

  const handleQuickSell = useCallback((entity: EntityWithStats) => {
    setTradeModalEntity(entity);
    setTradeModalVisible(true);
  }, []);

  // Lazy load price history when entity becomes visible
  const loadPriceHistory = useCallback(async (entityId: number) => {
    // Check if already cached or loading using refs
    if (priceHistoryCacheRef.current[entityId] || loadingPriceHistoryRef.current.has(entityId)) {
      return;
    }

    if (!fetchEntityPriceHistory) return;

    // Mark as loading
    setLoadingPriceHistory(prev => new Set(prev).add(entityId));

    try {
      const history = await fetchEntityPriceHistory(entityId);
      if (history) {
        setPriceHistoryCache(prev => ({ ...prev, [entityId]: history }));
      }
    } catch (error) {
      console.error('Error loading price history:', error);
    } finally {
      setLoadingPriceHistory(prev => {
        const next = new Set(prev);
        next.delete(entityId);
        return next;
      });
    }
  }, [fetchEntityPriceHistory]);

  // Render entity card with optional sparkline
  const renderDiscoverEntity = useCallback(({ item }: { item: EntityWithStats }) => {
    return (
      <EntityFeedCard
        entity={item}
        priceHistory={priceHistoryCache[item.id]}
        showSparkline={!!priceHistoryCache[item.id] && priceHistoryCache[item.id].length >= 2}
        onPress={() => handleEntityPress(item)}
        onQuickBuy={() => handleQuickBuy(item)}
        onQuickSell={() => handleQuickSell(item)}
      />
    );
  }, [priceHistoryCache, handleEntityPress, handleQuickBuy, handleQuickSell]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>All Categories</Text>
        {viewType === 'browse' && (
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearchPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="search-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        )}
      </View>

      {renderFilterTabs()}

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.horizontalScroll}
        contentContainerStyle={styles.horizontalScrollContent}
      >
        {/* Treemap View */}
        <View style={[styles.pageContainer, { width: SCREEN_WIDTH }]}>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {isLoadingVolumes ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                  Loading category volumes...
                </Text>
              </View>
            ) : volumesError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={theme.error} />
                <Text style={[styles.errorText, { color: theme.text }]}>
                  {volumesError}
                </Text>
                <TouchableOpacity 
                  style={[styles.retryButton, { backgroundColor: theme.primary }]}
                  onPress={fetchCategoryVolumes}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : categoryVolumes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="folder-open-outline" size={48} color={theme.textTertiary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No trading activity yet
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
                  Start trading to see category volumes
                </Text>
              </View>
            ) : categoryVolumes.every(cat => cat.volume24h === 0) ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="trending-up-outline" size={48} color={theme.textTertiary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No trading activity yet
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
                  Make your first trade to see category volumes
                </Text>
              </View>
            ) : (
              <View style={styles.treemapWrapper}>
                <Treemap
                  data={categoryVolumes.filter(cat => cat.volume24h > 0)}
                  onItemPress={handleCategoryPress}
                  containerHeight={TREEMAP_HEIGHT}
                  padding={8}
                />
              </View>
            )}
          </ScrollView>
        </View>

        {/* List View */}
        <View style={[styles.pageContainer, { width: SCREEN_WIDTH }]}>
          {renderFilterButtons()}
          <FlatList
            data={sortedCategories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.categoryId}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Browse View */}
        <View style={[styles.pageContainer, { width: SCREEN_WIDTH }]}>
          {/* Category Filter Chips - Only show in Browse view */}
          <View style={[styles.categoryFilterContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <CategoryFilterChips
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
            />
          </View>

          <FlatList
            data={discoverEntities}
            renderItem={renderDiscoverEntity}
            keyExtractor={(item) => item.id.toString()}
            onViewableItemsChanged={useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
              // Load price history for visible items (lazy loading)
              viewableItems.forEach((viewToken) => {
                const entity = viewToken.item as EntityWithStats;
                if (entity && !priceHistoryCacheRef.current[entity.id] && 
                    !loadingPriceHistoryRef.current.has(entity.id)) {
                  // Use setTimeout to avoid setState during render
                  setTimeout(() => {
                    loadPriceHistory(entity.id);
                  }, 0);
                }
              });
            }, [loadPriceHistory])}
            viewabilityConfig={{
              itemVisiblePercentThreshold: 50,
            }}
            ListHeaderComponent={() => (
              <>
                <TrendingModule
                  entities={trending}
                  isLoading={isLoadingTrending}
                  onEntityPress={handleEntityPress}
                  onQuickBuy={handleQuickBuy}
                  onQuickSell={handleQuickSell}
                />

                <MoversModule
                  gainers={movers.gainers}
                  losers={movers.losers}
                  isLoading={isLoadingMovers}
                  onEntityPress={handleEntityPress}
                  onQuickBuy={handleQuickBuy}
                  onQuickSell={handleQuickSell}
                />

                <DiscussedModule
                  entities={discussed}
                  isLoading={isLoadingDiscussed}
                  onEntityPress={handleEntityPress}
                  onQuickBuy={handleQuickBuy}
                  onQuickSell={handleQuickSell}
                />

                {forYouEntities.length > 0 && (
                  <ForYouModule
                    entities={forYouEntities}
                    reasons={forYouReasons}
                    isLoading={isLoadingForYou}
                    onEntityPress={handleEntityPress}
                    onQuickBuy={handleQuickBuy}
                    onQuickSell={handleQuickSell}
                  />
                )}

                {/* Discover Feed Section Header */}
                <View style={styles.browseSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Discover</Text>
                    {isLoadingDiscover && discoverEntities.length === 0 && (
                      <ActivityIndicator size="small" color={theme.primary} />
                    )}
                  </View>
                </View>
              </>
            )}
            ListFooterComponent={() => {
              if (isLoadingDiscover && discoverEntities.length > 0) {
                return (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color={theme.primary} />
                    <Text style={[styles.footerLoaderText, { color: theme.textSecondary }]}>Loading more...</Text>
                  </View>
                );
              }
              if (!hasMoreDiscover && discoverEntities.length > 0) {
                return (
                  <View style={styles.footerLoader}>
                    <Text style={[styles.footerLoaderText, { color: theme.textSecondary }]}>
                      You've reached the end
                    </Text>
                  </View>
                );
              }
              if (isLoadingDiscover && discoverEntities.length === 0) {
                return (
                  <View style={styles.skeletonContainer}>
                    {[...Array(3)].map((_, i) => (
                      <EntityFeedCardSkeleton key={i} />
                    ))}
                  </View>
                );
              }
              return null;
            }}
            ListEmptyComponent={() => (
              discoverEntities.length === 0 && !isLoadingDiscover ? (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={64} color={theme.textTertiary} />
                  <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No entities found</Text>
                  <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                    Try refreshing to load more entities
                  </Text>
                </View>
              ) : null
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.primary}
              />
            }
            onEndReached={() => {
              if (hasMoreDiscover && !isLoadingDiscover) {
                loadMoreDiscover(selectedCategory);
              }
            }}
            onEndReachedThreshold={0.3}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={5}
            contentContainerStyle={[
              styles.browseContent,
              discoverEntities.length === 0 && styles.emptyListContent,
            ]}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </ScrollView>

      {/* Trade Modal */}
      {tradeModalEntity && (
        <TradeModal
          visible={tradeModalVisible}
          onClose={() => {
            setTradeModalVisible(false);
            setTradeModalEntity(null);
          }}
          entityId={tradeModalEntity.id}
          entityName={tradeModalEntity.name}
          entityTicker={tradeModalEntity.ticker}
          currentPrice={tradeModalEntity.currentPrice}
          category={tradeModalEntity.category || ''}
          existingQuantity={portfolio.holdings.find(h => h.entityId === tradeModalEntity.id)?.quantity}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  searchButton: {
    padding: 4,
  },
  categoryFilterContainer: {
    borderBottomWidth: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 32,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
  },
  filterTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  filterTabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  filterTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  horizontalScroll: {
    flex: 1,
  },
  horizontalScrollContent: {
    flexDirection: 'row',
  },
  pageContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  treemapWrapper: {
    // Padding is handled by Treemap component
  },
  listContent: {
    paddingVertical: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  categoryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryItemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  categoryItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryItemPercentage: {
    fontSize: 16,
    fontWeight: '600',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterSection: {
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  sortFilterTabs: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  sortFilterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  sortFilterTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  browseContent: {
    paddingBottom: 100,
  },
  browseSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  horizontalSection: {
    marginBottom: 8,
  },
  horizontalCardWrapper: {
    marginLeft: 16,
  },
  entityCardWrapper: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  moversContainer: {
    marginBottom: 16,
  },
  moverSubsection: {
    marginBottom: 16,
  },
  emptyHorizontalSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 14,
  },
  skeletonContainer: {
    paddingVertical: 8,
  },
});

