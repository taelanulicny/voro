import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  RefreshControl,
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

type EntityScreenRouteProp = RouteProp<RootStackParamList, 'Entity'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

// Chart config will be created dynamically based on theme

// Mock data generator for entity details
const generateMockEntityData = (entityId: number, categoryId: string) => {
  // Get entity from centralized data
  const entityData = getEntityById(entityId);
  
  // Fallback if entity not found
  if (!entityData) {
    const basePrice = 100 + entityId * 10;
    const change = (Math.random() - 0.5) * 10;
    const changePercent = (change / basePrice) * 100;

    const priceHistory: PriceDataPoint[] = [];
    let price = basePrice - change;
    const now = Date.now();

    for (let i = 30; i >= 0; i--) {
      const variance = (Math.random() - 0.5) * 5;
      price = Math.max(price + variance, basePrice * 0.8);
      priceHistory.push({
        timestamp: now - i * 24 * 60 * 60 * 1000,
        price,
        volume: Math.floor(Math.random() * 10000000) + 1000000,
      });
    }

    priceHistory[priceHistory.length - 1].price = basePrice;

    return {
      entity: {
        id: entityId,
        ticker: `ENTITY${entityId}`,
        name: `Entity ${entityId}`,
        type: 'stock' as const,
        currentPrice: basePrice,
        change24h: change,
        changePercent24h: changePercent,
        volume24h: Math.floor(Math.random() * 100000000) + 10000000,
        marketCap: Math.floor(Math.random() * 10000000000) + 1000000000,
        description: `Entity ${entityId} in the ${categoryId} category.`,
      },
      priceHistory,
      stats: {
        high24h: basePrice + Math.abs(change) * 0.5,
        low24h: basePrice - Math.abs(change) * 0.5,
        volume24h: Math.floor(Math.random() * 100000000) + 10000000,
        marketCap: Math.floor(Math.random() * 10000000000) + 1000000000,
        holdersCount: Math.floor(Math.random() * 50000) + 1000,
        rank: Math.floor(Math.random() * 100) + 1,
      },
    };
  }

  // Use centralized entity data
  const basePrice = entityData.basePrice;
  const change = (Math.random() - 0.5) * 10;
  const changePercent = (change / basePrice) * 100;

  // Generate 30 days of price history
  const priceHistory: PriceDataPoint[] = [];
  let price = basePrice - change;
  const now = Date.now();

  for (let i = 30; i >= 0; i--) {
    const variance = (Math.random() - 0.5) * 5;
    price = Math.max(price + variance, basePrice * 0.8);
    priceHistory.push({
      timestamp: now - i * 24 * 60 * 60 * 1000,
      price,
      volume: Math.floor(Math.random() * 10000000) + 1000000,
    });
  }

  // Update last price to match current
  priceHistory[priceHistory.length - 1].price = basePrice;

  return {
    entity: {
      id: entityId,
      ticker: entityData.ticker,
      name: entityData.name,
      type: 'stock' as const,
      currentPrice: basePrice,
      change24h: change,
      changePercent24h: changePercent,
      volume24h: Math.floor(Math.random() * 100000000) + 10000000,
      marketCap: Math.floor(Math.random() * 10000000000) + 1000000000,
      description: entityData.description,
    },
    priceHistory,
    stats: {
      high24h: basePrice + Math.abs(change) * 0.5,
      low24h: basePrice - Math.abs(change) * 0.5,
      volume24h: Math.floor(Math.random() * 100000000) + 10000000,
      marketCap: Math.floor(Math.random() * 10000000000) + 1000000000,
      holdersCount: Math.floor(Math.random() * 50000) + 1000,
      rank: Math.floor(Math.random() * 100) + 1,
    },
  };
};

export default function EntityScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EntityScreenRouteProp>();
  const { entityId, categoryId } = route.params;
  const { getHolding, updatePrices, getEntityPrice } = useTrading();
  const { getNewsByEntity } = useNews();
  const { theme } = useTheme();
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  
  // Generate entity data based on current entityId - updates when entityId changes
  const entityData = useMemo(() => generateMockEntityData(entityId, categoryId), [entityId, categoryId]);
  
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M' | 'ALL'>('1M');
  const [tradeModalVisible, setTradeModalVisible] = useState(false);
  const [shareOpinionModalVisible, setShareOpinionModalVisible] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PriceDataPoint[]>(entityData.priceHistory);
  const [chartUpdateKey, setChartUpdateKey] = useState(0); // Force chart re-render
  const [selectedTab, setSelectedTab] = useState<'chart' | 'about' | 'feed' | 'news'>('chart');
  const [refreshing, setRefreshing] = useState(false);

  // Update price history and reset tab whenever entityId changes (ensures we always show Chart when navigating to an entity)
  useEffect(() => {
    setSelectedTab('chart');
    setPriceHistory(entityData.priceHistory);
    setChartUpdateKey(prev => prev + 1); // Force chart to re-render with new data
  }, [entityId, entityData.priceHistory]);

  const holding = getHolding(entityId);
  const entityNews = getNewsByEntity(entityId);
  
  // Get live price from global price system
  const currentPrice = getEntityPrice(entityId);
  
  // Get entity info for feed
  const entity = getEntityById(entityId);
  
  // Entity-specific feed posts
  const entityFeedPosts = useMemo(() => {
    const now = Date.now();
    const entityName = entity?.name || '';
    
    // Generate posts with variety - some with other entity mentions, some without
    // Base template posts that work for any entity
    const entityMentionName = entityName?.replace(/\s+/g, '') || '';
    const posts: Post[] = [
      {
        id: `entity-${entityId}-1`,
        userId: 'user-1',
        username: 'trading_pro',
        displayName: 'Trading Pro',
        content: `just dropped @TaylorSwift's name in the conversation and now her moro score is skyrocketing 📈`,
        entityId: undefined,
        entityTicker: undefined,
        entityName: 'Taylor Swift',
        sentiment: 'positive',
        likes: 289,
        comments: 45,
        isLiked: false,
        isBookmarked: false,
        timestamp: new Date(now - 1000 * 60 * 18).toISOString(),
      },
      {
        id: `entity-${entityId}-2`,
        userId: 'user-2',
        username: 'market_watcher',
        displayName: 'Market Watcher',
        content: 'The trajectory looks solid. Really impressed with the recent performance and strategic moves.',
        entityId: undefined,
        entityTicker: undefined,
        entityName: undefined,
        sentiment: 'positive',
        likes: 145,
        comments: 23,
        isLiked: false,
        isBookmarked: false,
        timestamp: new Date(now - 1000 * 60 * 42).toISOString(),
      },
      {
        id: `entity-${entityId}-3`,
        userId: 'user-3',
        username: 'trend_analyst',
        displayName: 'Trend Analyst',
        content: 'A collab with @MrBeast would create insane value for both parties. The cross-audience potential is huge.',
        entityId: undefined,
        entityTicker: undefined,
        entityName: 'MrBeast',
        sentiment: 'positive',
        likes: 234,
        comments: 38,
        isLiked: false,
        isBookmarked: false,
        timestamp: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
      },
      {
        id: `entity-${entityId}-4`,
        userId: 'user-4',
        username: 'content_creator',
        displayName: 'Content Creator',
        content: 'The recent moves have been interesting. Curious to see what direction things take from here.',
        entityId: undefined,
        entityTicker: undefined,
        entityName: undefined,
        sentiment: undefined,
        likes: 98,
        comments: 14,
        isLiked: true,
        isBookmarked: false,
        timestamp: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
      },
      {
        id: `entity-${entityId}-5`,
        userId: 'user-5',
        username: 'influence_tracker',
        displayName: 'Influence Tracker',
        content: 'Engagement metrics are through the roof. Wonder if @Drake would consider a partnership? The synergy would be perfect.',
        entityId: undefined,
        entityTicker: undefined,
        entityName: 'Drake',
        sentiment: 'positive',
        likes: 312,
        comments: 52,
        isLiked: false,
        isBookmarked: true,
        timestamp: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
      },
      {
        id: `entity-${entityId}-6`,
        userId: 'user-6',
        username: 'social_metrics',
        displayName: 'Social Metrics',
        content: 'Not feeling great about the recent direction. The numbers aren\'t adding up like they used to.',
        entityId: undefined,
        entityTicker: undefined,
        entityName: undefined,
        sentiment: 'negative',
        likes: 167,
        comments: 29,
        isLiked: false,
        isBookmarked: false,
        timestamp: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
      },
      {
        id: `entity-${entityId}-7`,
        userId: 'user-7',
        username: 'industry_insider',
        displayName: 'Industry Insider',
        content: `@KanyeWest's recent comments about @Drake caused some controversy. The drama might actually help engagement though.`,
        entityId: undefined,
        entityTicker: undefined,
        entityName: 'Kanye West',
        sentiment: 'negative',
        likes: 445,
        comments: 78,
        isLiked: false,
        isBookmarked: false,
        timestamp: new Date(now - 1000 * 60 * 28).toISOString(),
      },
      {
        id: `entity-${entityId}-8`,
        userId: 'user-8',
        username: 'brand_analyst',
        displayName: 'Brand Analyst',
        content: 'The partnership deals are looking strong. Multiple big brands are showing interest.',
        entityId: undefined,
        entityTicker: undefined,
        entityName: undefined,
        sentiment: 'positive',
        likes: 198,
        comments: 31,
        isLiked: true,
        isBookmarked: false,
        timestamp: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
      },
    ];
    
    return posts;
  }, [entityId, entity]);
  
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);
  
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

  // Filter price history based on selected time range (using live data)
  const filteredPriceHistory = useMemo(() => {
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
        // Combine original history with live updates
        return [...entityData.priceHistory, ...priceHistory].filter((point, index, self) => {
          // Remove duplicates by timestamp
          return index === self.findIndex(p => p.timestamp === point.timestamp);
        }).sort((a, b) => a.timestamp - b.timestamp);
    }
    
    // Use live price history if available, otherwise fall back to original
    const historyToUse = priceHistory.length > 0 ? priceHistory : entityData.priceHistory;
    return historyToUse.filter(point => point.timestamp >= cutoffTime);
  }, [timeRange, priceHistory, entityData.priceHistory]);

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
  const basePrice = entityData.entity.currentPrice; // Original base price
  const priceChange = currentPrice - basePrice;
  const priceChangePercent = (priceChange / basePrice) * 100;
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
          onPress={() => setSelectedTab('chart')}
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
          onPress={() => setSelectedTab('about')}
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
          onPress={() => setSelectedTab('feed')}
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
          onPress={() => setSelectedTab('news')}
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
            width={width - 32}
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
              <Text style={[styles.statValue, { color: theme.text }]}>{formatCurrency(entityData.stats.high24h)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>24h Low</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>{formatCurrency(entityData.stats.low24h)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Volume</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>{formatVolume(entityData.stats.volume24h)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Market Cap</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>{formatVolume(entityData.stats.marketCap)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Holders</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {entityData.stats.holdersCount.toLocaleString()}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Rank</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>#{entityData.stats.rank}</Text>
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
          <Text style={[styles.entityName, { color: theme.text }]}>{entityData.entity.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.watchlistButton}
          onPress={() => {
            if (isInWatchlist(entityId)) {
              removeFromWatchlist(entityId);
            } else {
              addToWatchlist(entityId);
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

      {/* Content based on selected tab */}
      {selectedTab === 'feed' ? (
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
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {selectedTab === 'chart' && renderChartContent()}

          {selectedTab === 'about' && (
            <View style={styles.comingSoonContainer}>
              <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
                About coming soon
              </Text>
            </View>
          )}

          {selectedTab === 'news' && (
            <View style={styles.comingSoonContainer}>
              <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
                News coming soon
              </Text>
            </View>
          )}

          {/* Spacer for bottom buttons */}
          {selectedTab === 'chart' && <View style={{ height: 100 }} />}
        </ScrollView>
      )}

      {/* Fixed Bottom Trade Buttons */}
      <View style={[styles.bottomBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <View style={styles.bottomButtonsContainer}>
          <TouchableOpacity
            style={[styles.tradeButton, styles.halfWidthButton, { backgroundColor: theme.primary }]}
            onPress={() => setTradeModalVisible(true)}
          >
            <Text style={styles.tradeButtonText}>Trade {entityData.entity.name}</Text>
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
        entityName={entityData.entity.name}
        entityTicker={entityData.entity.ticker}
        currentPrice={currentPrice}
        category={categoryId}
        existingQuantity={holding?.quantity}
      />

      {/* Share Opinion Modal */}
      <CreatePostModal
        visible={shareOpinionModalVisible}
        onClose={() => setShareOpinionModalVisible(false)}
        entityId={entityId}
        entityName={entityData.entity.name}
        entityTicker={entityData.entity.ticker}
        slideFromBottom={true}
        prefillEntityTag={true}
      />
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

