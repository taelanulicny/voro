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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Stop, Path, G, Line, Text as SvgText, Rect } from 'react-native-svg';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1min' | 'coming-soon'>('1min');
  const [tradeModalVisible, setTradeModalVisible] = useState(false);
  const [shareOpinionModalVisible, setShareOpinionModalVisible] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PriceDataPoint[]>(entityData.priceHistory);
  const [chartUpdateKey, setChartUpdateKey] = useState(0); // Force chart re-render
  const [selectedTab, setSelectedTab] = useState<'chart' | 'about' | 'feed' | 'news'>('chart');
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Update price history and reset tab whenever entityId changes (ensures we always show Chart when navigating to an entity)
  useEffect(() => {
    setSelectedTab('chart');
    setPriceHistory(entityData.priceHistory);
    setChartUpdateKey(prev => prev + 1); // Force chart to re-render with new data
    // Reset scroll position to chart tab
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: 0, animated: false });
    }, 100);
    return () => clearTimeout(timer);
  }, [entityId, entityData.priceHistory]);


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
  
  // Get entity info for feed
  const entity = getEntityById(entityId);
  
  // categoryId is already in the correct format (no mapping needed)
  const displayCategoryId = categoryId
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
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

  // Filter price history - for now just use all available data (1min timeframe shows all data)
  const filteredPriceHistory = useMemo(() => {
        // Combine original history with live updates
        return [...entityData.priceHistory, ...priceHistory].filter((point, index, self) => {
          // Remove duplicates by timestamp
          return index === self.findIndex(p => p.timestamp === point.timestamp);
        }).sort((a, b) => a.timestamp - b.timestamp);
  }, [priceHistory, entityData.priceHistory]);


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

  // Chart dimensions - full screen width
  const chartHeight = 220;
  const chartWidth = SCREEN_WIDTH;
  const margin = { top: 50, right: 0, left: 0, bottom: 0 }; // Increased top margin for tab selector
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  // Convert filteredPriceHistory to chart data format
  const chartPrices = useMemo(() => {
    if (filteredPriceHistory.length === 0) return [currentPrice];
    return filteredPriceHistory.map(point => point.price);
  }, [filteredPriceHistory, currentPrice]);

  // Calculate Y domain - center around starting price
  const yDomain = useMemo(() => {
    if (chartPrices.length === 0) {
      const price = currentPrice;
      const padding = price * 0.1;
      return { yMin: price - padding, yMax: price + padding, yRange: padding * 2 };
    }
    const fullDataMin = Math.min(...chartPrices);
    const fullDataMax = Math.max(...chartPrices);
    const startPrice = chartPrices[0];
    const dataRange = Math.max(fullDataMax - startPrice, startPrice - fullDataMin);
    const yMin = startPrice - dataRange * 1.1;
    const yMax = startPrice + dataRange * 1.1;
    const yRange = yMax - yMin;
    return { yMin, yMax, yRange };
  }, [chartPrices, currentPrice]);

  // Generate line path
  const generateLinePath = () => {
    if (chartPrices.length === 0) return '';
    
    const totalPoints = chartPrices.length;
    const pointSpacing = innerWidth / Math.max(1, totalPoints - 1);
    
    const points = chartPrices.map((price, i) => {
      const x = margin.left + (i * pointSpacing);
      const y = margin.top + innerHeight - ((price - yDomain.yMin) / yDomain.yRange) * innerHeight;
      return { x, y };
    });

    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y}`;
    }

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1] || curr;
      
      const dx1 = (curr.x - prev.x) / 3;
      const dy1 = (curr.y - prev.y) / 3;
      const dx2 = (next.x - curr.x) / 3;
      const dy2 = (next.y - curr.y) / 3;
      
      path += ` C ${prev.x + dx1} ${prev.y + dy1}, ${curr.x - dx2} ${curr.y - dy2}, ${curr.x} ${curr.y}`;
    }
    
    return path;
  };

  const renderChartContent = () => (
    <>
        {/* Price Header */}
        <View style={[styles.entityHeader, { backgroundColor: theme.card }]}>
          <View style={styles.entityPriceInfo}>
            <Text style={[styles.entityCurrentPrice, { color: theme.text }]}>
              {formatCurrency(currentPrice)}
            </Text>
            <View style={styles.entityChangeContainer}>
              <Text style={[
                styles.entityChangeText,
                { color: getChangeColor(priceChange, theme) }
              ]}>
                {isPositive ? '+' : ''}{formatCurrency(priceChange)}
              </Text>
              <Text style={[
                styles.entityChangePercent,
                { color: getChangeColor(priceChange, theme) }
              ]}>
                ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
              </Text>
          </View>
          </View>
          <View style={styles.entityStatsInfo}>
            <Text style={[styles.entityStatsLabel, { color: theme.textSecondary }]}>
              Volume: <Text style={{ color: theme.text }}>{formatVolume(entityData.stats.volume24h)}</Text>
            </Text>
            <Text style={[styles.entityStatsLabel, { color: theme.textSecondary }]}>
              High: <Text style={{ color: theme.text }}>{formatCurrency(entityData.stats.high24h)}</Text>
            </Text>
            <Text style={[styles.entityStatsLabel, { color: theme.textSecondary }]}>
              Low: <Text style={{ color: theme.text }}>{formatCurrency(entityData.stats.low24h)}</Text>
            </Text>
          </View>
        </View>

        {/* Chart Container */}
        <View style={[styles.entityChartWrapperFullWidth, { backgroundColor: theme.card }]}>
          <View style={styles.entityChartContainerFull}>
            {/* Tab Selector - positioned above chart */}
            <View style={[styles.tabSelectorContainerAboveChart, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
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

            {/* SVG Chart */}
            <View style={styles.chartWithOverlay}>
              <Svg width={chartWidth} height={chartHeight}>
                <Defs>
                  <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="5%" stopColor={isPositive ? "#10B981" : "#EF4444"} stopOpacity="0.8" />
                    <Stop offset="95%" stopColor={isPositive ? "#10B981" : "#EF4444"} stopOpacity="0.1" />
                  </LinearGradient>
                </Defs>
                
                {/* Horizontal line at bottom edge */}
                <Line
                  x1={0}
                  y1={margin.top + innerHeight}
                  x2={chartWidth}
                  y2={margin.top + innerHeight}
                  stroke="#000000"
                  strokeWidth="1"
                />
                
                {/* Line stroke */}
                {chartPrices.length > 1 && (
                  <Path
                    d={generateLinePath()}
                    stroke={isPositive ? "#10B981" : "#EF4444"}
                    strokeWidth="2"
                    fill="none"
                  />
                )}
                
                {/* Current price horizontal dotted line */}
                {chartPrices.length > 0 && (() => {
                  const currentPriceValue = chartPrices[chartPrices.length - 1];
                  const currentPriceY = margin.top + innerHeight - ((currentPriceValue - yDomain.yMin) / yDomain.yRange) * innerHeight;
                  return (
                    <G>
                      <Line
                        x1={0}
                        y1={currentPriceY}
                        x2={chartWidth}
                        y2={currentPriceY}
                        stroke="#000000"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                      />
                      {/* Price label box on the right */}
                      <Rect
                        x={chartWidth - 60}
                        y={currentPriceY - 12}
                        width={55}
                        height={24}
                        rx={4}
                        fill={isPositive ? "#10B981" : "#EF4444"}
                      />
                      <SvgText
                        x={chartWidth - 32.5}
                        y={currentPriceY + 4}
                        fontSize="12"
                        fill="#FFFFFF"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {currentPriceValue.toFixed(2)}
                      </SvgText>
                    </G>
                  );
                })()}
              </Svg>
            </View>
          </View>

          {/* Time Frame Selector */}
          <View style={styles.timeframeSelector}>
              <TouchableOpacity
                style={[
                styles.timeframeButton,
                {
                  backgroundColor: selectedTimeframe === '1min' ? theme.primary : theme.backgroundSecondary,
                  borderColor: theme.border,
                },
                ]}
              onPress={() => setSelectedTimeframe('1min')}
            >
              <Text style={[
                styles.timeframeButtonText,
                { color: selectedTimeframe === '1min' ? '#FFFFFF' : theme.text }
              ]}>
                1 min
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
                  style={[
                styles.timeframeButton,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
              disabled={true}
            >
              <Text style={[
                styles.timeframeButtonText,
                { color: theme.textSecondary }
              ]}>
                More Timeframes Coming Soon
                </Text>
              </TouchableOpacity>
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

    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerLeft}>
          <Text style={[styles.entityName, { color: theme.text }]}>{entityData.entity.name}</Text>
          <Text style={[styles.categoryName, { color: theme.textSecondary }]}>
            {displayCategoryId}
          </Text>
            </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => {
              navigation.navigate('Search');
            }}
          >
            <Ionicons name="search" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
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
            </View>

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
            <Text style={styles.tradeButtonText}>Predict - {entityData.entity.name}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shareOpinionButton, styles.halfWidthButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setShareOpinionModalVisible(true)}
          >
            <Text style={[styles.shareOpinionButtonText, { color: theme.text }]}>Post Your Opinion</Text>
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
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerLeft: {
    flex: 1,
  },
  entityName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  categoryName: {
    fontSize: 14,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchButton: {
    padding: 4,
  },
  watchlistButton: {
    padding: 4,
  },
  entityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  entityPriceInfo: {
    alignItems: 'flex-start',
    flex: 1,
  },
  entityStatsInfo: {
    alignItems: 'flex-end',
    gap: 4,
  },
  entityStatsLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  entityCurrentPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  entityChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entityChangeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  entityChangePercent: {
    fontSize: 14,
    fontWeight: '500',
  },
  entityChartWrapperFullWidth: {
    position: 'relative',
    width: SCREEN_WIDTH,
    backgroundColor: '#FFFFFF',
    paddingBottom: 16,
  },
  entityChartContainerFull: {
    width: SCREEN_WIDTH,
    position: 'relative',
    overflow: 'visible',
  },
  chartWithOverlay: {
    position: 'relative',
    height: 220,
  },
  tabSelectorContainerAboveChart: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: 2,
    justifyContent: 'center',
  },
  timeframeSelector: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    alignSelf: 'flex-start',
  },
  timeframeButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
  },
  timeframeButtonText: {
    fontSize: 12,
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
    alignItems: 'center',
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

