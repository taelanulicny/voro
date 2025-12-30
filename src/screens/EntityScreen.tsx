import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { RootStackParamList, PriceDataPoint, Post } from '../types';
import { useTrading } from '../context/TradingContext';
import { useNews } from '../context/NewsContext';
import { useTheme } from '../context/ThemeContext';
import { useWatchlist } from '../context/WatchlistContext';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';
import { getEntityById } from '../utils/mockEntities';
import TradeModal from '../components/TradeModal';
import NewsCard from '../components/NewsCard';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import { apiRequest, authenticatedRequest, isBackendConfigured } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { PostSchema, validateArrayLoose } from '../validators';
import { isValidEntityId } from '../utils/idValidation';

type EntityScreenRouteProp = RouteProp<RootStackParamList, 'Entity'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Chart config will be created dynamically based on theme

function EntityScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EntityScreenRouteProp>();
  const { entityId, categoryId } = route.params;
  const { getHolding, updatePrices, getEntityPrice } = useTrading();
  const { getNewsByEntity } = useNews();
  const { theme } = useTheme();
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const { token, isAuthenticated } = useAuth();
  const { refreshActivityFeed } = useSocial();
  
  // Get entity from centralized data
  const entity = getEntityById(entityId);
  
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M' | 'ALL'>('1M');
  const [tradeModalVisible, setTradeModalVisible] = useState(false);
  const [shareOpinionModalVisible, setShareOpinionModalVisible] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PriceDataPoint[]>([]);
  const [isLoadingPriceHistory, setIsLoadingPriceHistory] = useState(false);
  const [chartUpdateKey, setChartUpdateKey] = useState(0); // Force chart re-render
  const [selectedTab, setSelectedTab] = useState<'chart' | 'about' | 'feed' | 'news'>('chart');
  const [refreshing, setRefreshing] = useState(false);
  const [entityFeedPosts, setEntityFeedPosts] = useState<Post[]>([]);
  const [isLoadingEntityPosts, setIsLoadingEntityPosts] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Fetch price history from backend
  const fetchPriceHistory = async (entityId: number, timeRange: '1D' | '1W' | '1M' | 'ALL') => {
    // Validate entityId before making API call
    if (!isValidEntityId(entityId)) {
      console.debug('Invalid entityId for price history:', entityId);
      setPriceHistory([]);
      return;
    }

    if (!isBackendConfigured()) {
      // Backend not configured - return empty array
      setPriceHistory([]);
      return;
    }

    try {
      setIsLoadingPriceHistory(true);
      const params = new URLSearchParams({
        timeRange,
        limit: '100',
      });

      const response = await apiRequest<{ success?: boolean; data?: Array<{ timestamp: string; price: number }> }>(
        `/api/entities/${entityId}/price-history?${params}`
      );

      if (response.success && response.data && Array.isArray(response.data)) {
        // Convert backend format to frontend PriceDataPoint format
        const convertedHistory: PriceDataPoint[] = response.data.map((item) => ({
          timestamp: new Date(item.timestamp).getTime(),
          price: item.price,
        }));
        setPriceHistory(convertedHistory);
        setChartUpdateKey(prev => prev + 1); // Force chart to re-render
      } else {
        setPriceHistory([]);
      }
    } catch (error) {
      console.debug('Error fetching price history (backend may not be running):', error);
      setPriceHistory([]);
    } finally {
      setIsLoadingPriceHistory(false);
    }
  };

  // Fetch price history on mount and when entityId or timeRange changes
  useEffect(() => {
    // Validate entityId before attempting to fetch
    if (!isValidEntityId(entityId)) {
      console.debug('Skipping fetch - invalid entityId:', entityId);
      return;
    }
    
    setSelectedTab('chart');
    fetchPriceHistory(entityId, timeRange);
    fetchEntityPosts(entityId);
    // Reset scroll position to chart tab
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: 0, animated: false });
    }, 100);
    return () => clearTimeout(timer);
  }, [entityId, timeRange, token, isAuthenticated]);


  const handleTabChange = (tab: 'chart' | 'about' | 'feed' | 'news') => {
    setSelectedTab(tab);
    const tabIndex = tab === 'chart' ? 0 : tab === 'about' ? 1 : tab === 'feed' ? 2 : 3;
    const scrollToX = tabIndex * SCREEN_WIDTH;
    scrollViewRef.current?.scrollTo({ x: scrollToX, animated: true });
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / SCREEN_WIDTH);
    const tabs: ('chart' | 'about' | 'feed' | 'news')[] = ['chart', 'about', 'feed', 'news'];
    const newTab = tabs[pageIndex];
    if (newTab && newTab !== selectedTab) {
      setSelectedTab(newTab);
    }
  };

  const holding = getHolding(entityId);
  const entityNews = getNewsByEntity(entityId);
  
  // Get live price from global price system
  const currentPrice = getEntityPrice(entityId);

  // Helper to map backend post format to frontend format
  const mapBackendPost = (p: any): Post => ({
    id: p.postId || p.id,
    userId: p.userId,
    username: p.username,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    content: p.content,
    entityId: p.entityId,
    entityTicker: p.entityTicker,
    entityName: p.entityName,
    sentiment: p.sentiment,
    likes: p.likes || 0,
    comments: p.comments || 0,
    isLiked: p.isLiked || false,
    isBookmarked: p.isBookmarked || false,
    timestamp: p.timestamp,
  });

  // Fetch entity-specific posts from backend
  const fetchEntityPosts = React.useCallback(async (entityId: number) => {
    // Validate entityId before making API call
    if (!isValidEntityId(entityId)) {
      console.debug('Invalid entityId for entity posts:', entityId);
      setEntityFeedPosts([]);
      return;
    }

    if (!isBackendConfigured()) {
      setEntityFeedPosts([]);
      return;
    }

    if (!token || !isAuthenticated) {
      // If not authenticated, try public endpoint or return empty
      setEntityFeedPosts([]);
      return;
    }

    try {
      setIsLoadingEntityPosts(true);
      const response = await authenticatedRequest<{
        posts: any[];
        lastEvaluatedKey?: string;
      }>(`/api/social/entities/${entityId}/posts?limit=50`, token, {
        method: 'GET',
      });

      if (response.success && response.data && response.data.posts) {
        // Validate posts - filter out invalid ones
        const validatedPosts = validateArrayLoose(PostSchema, response.data.posts);
        const mappedPosts: Post[] = validatedPosts.map(mapBackendPost);
        setEntityFeedPosts(mappedPosts);
      } else {
        setEntityFeedPosts([]);
      }
    } catch (error) {
      console.debug('Error fetching entity posts (backend may not be running):', error);
      setEntityFeedPosts([]);
    } finally {
      setIsLoadingEntityPosts(false);
    }
  }, [token, isAuthenticated]);
  
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchPriceHistory(entityId, timeRange),
        fetchEntityPosts(entityId),
      ]);
    } catch (error) {
      console.error('Error refreshing entity data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [entityId, timeRange, fetchEntityPosts]);
  
  // Force chart update when price changes - DISABLED (keeping prices static)
  // useEffect(() => {
  //   setChartUpdateKey(prev => prev + 1);
  // }, [currentPrice]);

  // Update price history in real-time for chart animation - DISABLED (keeping prices static)
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     const now = Date.now();
  //     const livePrice = getEntityPrice(entityId);
  //     
  //     setPriceHistory(prev => {
  //       // Add new data point with current live price
  //       const newPoint: PriceDataPoint = {
  //         timestamp: now,
  //         price: livePrice,
  //         volume: Math.floor(Math.random() * 10000000) + 1000000,
  //       };
  //       
  //       // Keep last 100 points for 1D view, or filter based on timeRange
  //       let filtered = [...prev, newPoint];
  //       
  //       // For 1D, keep only last 24 hours
  //       if (timeRange === '1D') {
  //         const cutoff = now - 24 * 60 * 60 * 1000;
  //         filtered = filtered.filter(p => p.timestamp >= cutoff);
  //       }
  //       
  //       // Limit to 100 points max
  //       if (filtered.length > 100) {
  //         filtered = filtered.slice(-100);
  //       }
  //       
  //       return filtered;
  //     });
  //   }, 3000); // Update every 3 seconds to match global price updates

  //   return () => clearInterval(interval);
  // }, [entityId, timeRange, getEntityPrice]);

  // Filter price history based on selected time range
  const filteredPriceHistory = useMemo(() => {
    if (priceHistory.length === 0) {
      return [];
    }

    const now = Date.now();
    let cutoffTime: number;
    
    switch (timeRange) {
      case '1D':
        cutoffTime = now - 24 * 60 * 60 * 1000; // 1 day ago
        break;
      case '1W':
        cutoffTime = now - 7 * 24 * 60 * 60 * 1000; // 1 week ago
        break;
      case '1M':
        cutoffTime = now - 30 * 24 * 60 * 60 * 1000; // 1 month ago
        break;
      case 'ALL':
      default:
        return priceHistory.sort((a, b) => a.timestamp - b.timestamp);
    }
    
    return priceHistory.filter(point => point.timestamp >= cutoffTime);
  }, [timeRange, priceHistory]);

  // Generate chart data with appropriate labels based on time range
  const chartData = useMemo(() => {
    let labelInterval: number;
    let labelFormatter: (point: PriceDataPoint, index: number) => string;
    
    switch (timeRange) {
      case '1D':
        labelInterval = Math.max(1, Math.floor(filteredPriceHistory.length / 6));
        labelFormatter = (point) => {
          const date = new Date(point.timestamp);
          return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
        };
        break;
      case '1W':
        labelInterval = 1; // Show all days
        labelFormatter = (point) => {
          const date = new Date(point.timestamp);
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          return days[date.getDay()];
        };
        break;
      case '1M':
        labelInterval = Math.max(1, Math.floor(filteredPriceHistory.length / 5));
        labelFormatter = (point) => {
          const date = new Date(point.timestamp);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        };
        break;
      case 'ALL':
      default:
        labelInterval = Math.max(1, Math.floor(filteredPriceHistory.length / 6));
        labelFormatter = (point) => {
          const date = new Date(point.timestamp);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        };
    }
    
    const labels = filteredPriceHistory
      .map((point, index) => index % labelInterval === 0 ? labelFormatter(point, index) : '')
      .filter((label, index) => index % labelInterval === 0 || label !== '');
    
    // Ensure we always have data points
    const priceData = filteredPriceHistory.length > 0 
      ? filteredPriceHistory.map((point) => point.price)
      : [currentPrice]; // Fallback to current price if no history
    
    return {
      labels: labels.length > 0 ? labels : priceData.map((_, i) => i % labelInterval === 0 ? `${i}` : ''),
      datasets: [
        {
          data: priceData,
        },
      ],
    };
  }, [timeRange, filteredPriceHistory, currentPrice]);

  // Calculate price change from base price
  const basePrice = entity?.basePrice || currentPrice; // Use entity basePrice or current price as fallback
  const priceChange = currentPrice - basePrice;
  const priceChangePercent = basePrice > 0 ? (priceChange / basePrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  // Convert hex color to rgba for chart
  const hexToRgba = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const chartConfig = {
    backgroundColor: theme.card,
    backgroundGradientFrom: theme.card,
    backgroundGradientTo: theme.card,
    decimalPlaces: 2,
    color: (opacity = 1) => 
      isPositive ? `rgba(16, 185, 129, ${opacity})` : `rgba(239, 68, 68, ${opacity})`,
    labelColor: (opacity = 1) => hexToRgba(theme.textSecondary, opacity),
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '0',
    },
  };

  const renderTabSelector = () => (
    <View style={[styles.tabSelectorContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabSelector}
        contentContainerStyle={styles.tabSelectorContent}
      >
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => handleTabChange('chart')}
        >
          <Text
            style={[
              styles.tabButtonText,
              {
                color: selectedTab === 'chart' ? theme.text : theme.textSecondary,
                fontWeight: selectedTab === 'chart' ? '600' : '400',
              }
            ]}
          >
            Chart
          </Text>
          </TouchableOpacity>
          <TouchableOpacity
          style={styles.tabButton}
          onPress={() => handleTabChange('about')}
          >
          <Text
            style={[
              styles.tabButtonText,
              {
                color: selectedTab === 'about' ? theme.text : theme.textSecondary,
                fontWeight: selectedTab === 'about' ? '600' : '400',
              }
            ]}
          >
            About
          </Text>
          </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => handleTabChange('feed')}
        >
          <Text
            style={[
              styles.tabButtonText,
              {
                color: selectedTab === 'feed' ? theme.text : theme.textSecondary,
                fontWeight: selectedTab === 'feed' ? '600' : '400',
              }
            ]}
          >
            Feed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => handleTabChange('news')}
        >
          <Text
            style={[
              styles.tabButtonText,
              {
                color: selectedTab === 'news' ? theme.text : theme.textSecondary,
                fontWeight: selectedTab === 'news' ? '600' : '400',
              }
            ]}
          >
            News
          </Text>
        </TouchableOpacity>
      </ScrollView>
        </View>
  );

  const renderChartContent = () => (
    <>
        {/* Price Section */}
        <View style={[styles.priceSection, { backgroundColor: theme.card }]}>
          <Text style={[styles.price, { color: theme.text }]}>{formatCurrency(currentPrice)}</Text>
          <View style={styles.changeContainer}>
            <Text style={[styles.change, { color: getChangeColor(priceChange) }]}>
              {isPositive ? '+' : ''}
              {formatCurrency(priceChange)}
            </Text>
            <Text style={[styles.changePercent, { color: getChangeColor(priceChange) }]}>
              ({isPositive ? '+' : ''}
              {priceChangePercent.toFixed(2)}%)
            </Text>
          </View>
        </View>

        {/* Chart */}
        <View style={[styles.chartContainer, { backgroundColor: theme.card }]}>
          <LineChart
            key={`entity-${entityId}-${timeRange}-${filteredPriceHistory.length}-${currentPrice.toFixed(2)}-${chartUpdateKey}`}
            data={chartData}
            width={SCREEN_WIDTH - 32}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={timeRange !== '1D'}
            withOuterLines={false}
            withVerticalLabels={timeRange !== '1D'}
            withHorizontalLabels={true}
            withDots={timeRange === '1D' || filteredPriceHistory.length <= 7}
            segments={timeRange === '1D' ? 6 : timeRange === '1W' ? 7 : 5}
          />

          {/* Time Range Selector */}
          <View style={styles.timeRangeSelector}>
            {(['1D', '1W', '1M', 'ALL'] as const).map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.timeRangeButton,
                  { backgroundColor: theme.backgroundSecondary },
                  timeRange === range && { backgroundColor: theme.primary },
                ]}
                onPress={() => setTimeRange(range)}
              >
                <Text
                  style={[
                    styles.timeRangeText,
                    { color: theme.textSecondary },
                    timeRange === range && { color: '#FFFFFF' },
                  ]}
                >
                  {range}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Your Position (if any) */}
        {holding && (
          <View style={[styles.positionCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Position</Text>
            <View style={styles.positionGrid}>
              <View style={styles.positionItem}>
                <Text style={[styles.positionLabel, { color: theme.textSecondary }]}>Shares</Text>
                <Text style={[styles.positionValue, { color: theme.text }]}>{holding.quantity}</Text>
              </View>
              <View style={styles.positionItem}>
                <Text style={[styles.positionLabel, { color: theme.textSecondary }]}>Avg Cost</Text>
                <Text style={[styles.positionValue, { color: theme.text }]}>{formatCurrency(holding.averageCost)}</Text>
              </View>
              <View style={styles.positionItem}>
                <Text style={[styles.positionLabel, { color: theme.textSecondary }]}>Total Value</Text>
                <Text style={[styles.positionValue, { color: theme.text }]}>{formatCurrency(holding.totalValue)}</Text>
              </View>
              <View style={styles.positionItem}>
                <Text style={[styles.positionLabel, { color: theme.textSecondary }]}>P&L</Text>
                <Text
                  style={[
                    styles.positionValue,
                    { color: getChangeColor(holding.profitLoss) },
                  ]}
                >
                  {holding.profitLoss >= 0 ? '+' : ''}
                  {formatCurrency(holding.profitLoss)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={[styles.statsCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>24h High</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {priceHistory.length > 0 ? formatCurrency(Math.max(...priceHistory.map(p => p.price))) : 'N/A'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>24h Low</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {priceHistory.length > 0 ? formatCurrency(Math.min(...priceHistory.map(p => p.price))) : 'N/A'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Current Price</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>{formatCurrency(currentPrice)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Base Price</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>{formatCurrency(basePrice)}</Text>
            </View>
          </View>
        </View>
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.entityName, { color: theme.text }]}>{entity?.name || `Entity ${entityId}`}</Text>
        </View>
        <TouchableOpacity
          style={styles.watchlistButton}
          onPress={async () => {
            if (isInWatchlist(entityId)) {
              const result = await removeFromWatchlist(entityId);
              if (!result.success && result.error) {
                Alert.alert('Error', result.error);
              }
            } else {
              const result = await addToWatchlist(entityId);
              if (!result.success && result.error) {
                Alert.alert('Error', result.error);
              }
            }
          }}
        >
          <Ionicons
            name={isInWatchlist(entityId) ? 'star' : 'star-outline'}
            size={24}
            color={isInWatchlist(entityId) ? theme.primary : theme.textSecondary}
          />
        </TouchableOpacity>
        </View>

      {/* Tab Selector */}
      {renderTabSelector()}

      {/* Content with horizontal swipe */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.horizontalScrollView}
      >
        {/* Chart Tab */}
        <View style={{ width: SCREEN_WIDTH }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {renderChartContent()}
            {/* Spacer for bottom buttons */}
            <View style={{ height: 100 }} />
          </ScrollView>
            </View>

        {/* About Tab */}
        <View style={{ width: SCREEN_WIDTH }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.comingSoonContainer}>
              <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
                About coming soon
              </Text>
            </View>
            {/* Spacer for bottom buttons */}
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>

        {/* Feed Tab */}
        <View style={{ width: SCREEN_WIDTH }}>
          <FlatList
            data={entityFeedPosts}
            renderItem={({ item }) => (
              <PostCard 
                post={item} 
                isEntityFeed={true}
                entityId={entityId}
                entityName={entity?.name}
                categoryId={categoryId}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.feedContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color={theme.textTertiary} />
                <Text style={[styles.emptyStateText, { color: theme.text }]}>
                  No posts yet for this entity
                </Text>
          </View>
        )}
          />
        </View>

        {/* News Tab */}
        <View style={{ width: SCREEN_WIDTH }}>
          <FlatList
            data={entityNews}
            renderItem={({ item }) => (
              <NewsCard article={item} showEntity={false} />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.feedContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="newspaper-outline" size={48} color={theme.textTertiary} />
                <Text style={[styles.emptyStateText, { color: theme.text }]}>
                  No news yet for this entity
                </Text>
              </View>
            )}
          />
        </View>
      </ScrollView>

      {/* Fixed Bottom Trade Buttons */}
      <View style={[styles.bottomBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <View style={styles.bottomButtonsContainer}>
        <TouchableOpacity
            style={[styles.tradeButton, styles.halfWidthButton, { backgroundColor: theme.primary }]}
          onPress={() => setTradeModalVisible(true)}
        >
            <Text style={styles.tradeButtonText}>Trade {entity?.ticker || `ENTITY${entityId}`}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shareOpinionButton, styles.halfWidthButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setShareOpinionModalVisible(true)}
          >
            <Text style={[styles.shareOpinionButtonText, { color: theme.text }]}>Share Your Opinion</Text>
        </TouchableOpacity>
        </View>
      </View>

      {/* Trade Modal */}
      <TradeModal
        visible={tradeModalVisible}
        onClose={() => setTradeModalVisible(false)}
        entityId={entityId}
        entityName={entity?.name || `Entity ${entityId}`}
        entityTicker={entity?.ticker || `ENTITY${entityId}`}
        currentPrice={currentPrice}
        category={categoryId}
        existingQuantity={holding?.quantity}
      />

      {/* Share Opinion Modal */}
      <CreatePostModal
        visible={shareOpinionModalVisible}
        onClose={() => {
          setShareOpinionModalVisible(false);
          // Refresh entity posts after creating a new post
          fetchEntityPosts(entityId);
        }}
        entityId={entityId}
        entityName={entity?.name || `Entity ${entityId}`}
        entityTicker={entity?.ticker || `ENTITY${entityId}`}
        slideFromBottom={true}
        prefillEntityTag={true}
      />
    </SafeAreaView>
  );
}

export default React.memo(EntityScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 28,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  entityName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 40,
  },
  watchlistButton: {
    padding: 4,
  },
  priceSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  price: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  change: {
    fontSize: 18,
    fontWeight: '600',
  },
  changePercent: {
    fontSize: 18,
    fontWeight: '600',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: 1,
    paddingBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 0,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  positionCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  positionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  positionItem: {
    width: '47%',
  },
  positionLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  positionValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    width: '47%',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  aboutCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  newsSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  newsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  newsCount: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
  },
  halfWidthButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  tradeButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  shareOpinionButton: {
    borderWidth: 1.5,
  },
  shareOpinionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
    textAlign: 'center',
    lineHeight: 20,
  },
  horizontalScrollView: {
    flex: 1,
  },
  tabSelectorContainer: {
    borderBottomWidth: 1,
    paddingTop: 4,
    paddingBottom: 4,
  },
  tabSelector: {
    maxHeight: 20,
  },
  tabSelectorContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 0,
    alignItems: 'flex-end',
  },
  tabButton: {
    marginRight: 18,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonText: {
    fontSize: 15,
    lineHeight: 18,
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    minHeight: 400,
  },
  comingSoonText: {
    fontSize: 16,
  },
  feedContent: {
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 16,
  },
});

