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
  Modal,
  Share,
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
import { formatCurrency, getChangeColor, TOKEN_SYMBOL } from '../utils/dataGenerator';
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
  const [positionsModalVisible, setPositionsModalVisible] = useState(false);
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
    
    // Pool of realistic user names
    const firstNames = ['Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Sam', 'Jamie', 'Drew', 'Quinn', 'Blake', 'Cameron', 'Avery', 'Sage', 'River', 'Phoenix', 'Skylar', 'Dakota', 'Reese', 'Hayden'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee'];
    
    // Generate random user for each post
    const getRandomUser = () => {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const displayName = `${firstName} ${lastName}`;
      const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}`;
      return { displayName, username, userId: `user-${Math.random().toString(36).substr(2, 9)}` };
    };
    
    // Generate posts that are all about this specific entity
    // Each post starts with @(entity name) and comments about them
    const entityMentionName = entityName?.replace(/\s+/g, '') || '';
    const posts: Post[] = [
      {
        id: `entity-${entityId}-1`,
        ...getRandomUser(),
        content: `@${entityMentionName} just dropped a new project and their moro score is skyrocketing 📈`,
        entityId: entityId,
        entityTicker: undefined,
        entityName: entityName,
        sentiment: 'positive',
        likes: 289,
        comments: 45,
        isLiked: false,
        isBookmarked: false,
        timestamp: new Date(now - 1000 * 60 * 18).toISOString(),
      },
      {
        id: `entity-${entityId}-2`,
        ...getRandomUser(),
        content: `@${entityMentionName} The trajectory looks solid. Really impressed with the recent performance and strategic moves.`,
        entityId: entityId,
        entityTicker: undefined,
        entityName: entityName,
        sentiment: 'positive',
        likes: 145,
        comments: 23,
        isLiked: false,
        isBookmarked: false,
        timestamp: new Date(now - 1000 * 60 * 42).toISOString(),
      },
      {
        id: `entity-${entityId}-3`,
        ...getRandomUser(),
        content: `@${entityMentionName} A potential collab would create insane value. The cross-audience potential is huge.`,
        entityId: entityId,
        entityTicker: undefined,
        entityName: entityName,
        sentiment: 'positive',
        likes: 234,
        comments: 38,
        isLiked: false,
        isBookmarked: false,
        timestamp: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
      },
      {
        id: `entity-${entityId}-4`,
        ...getRandomUser(),
        content: `@${entityMentionName} The recent moves have been interesting. Curious to see what direction things take from here.`,
        entityId: entityId,
        entityTicker: undefined,
        entityName: entityName,
        sentiment: undefined,
        likes: 98,
        comments: 14,
        isLiked: true,
        isBookmarked: false,
        timestamp: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
      },
      {
        id: `entity-${entityId}-5`,
        ...getRandomUser(),
        content: `@${entityMentionName} Engagement metrics are through the roof. The synergy with recent partnerships is perfect.`,
        entityId: entityId,
        entityTicker: undefined,
        entityName: entityName,
        sentiment: 'positive',
        likes: 312,
        comments: 52,
        isLiked: false,
        isBookmarked: true,
        timestamp: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
      },
      {
        id: `entity-${entityId}-6`,
        ...getRandomUser(),
        content: `@${entityMentionName} Not feeling great about the recent direction. The numbers aren't adding up like they used to.`,
        entityId: entityId,
        entityTicker: undefined,
        entityName: entityName,
        sentiment: 'negative',
        likes: 167,
        comments: 29,
        isLiked: false,
        isBookmarked: false,
        timestamp: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
      },
      {
        id: `entity-${entityId}-7`,
        ...getRandomUser(),
        content: `@${entityMentionName} Recent moves caused some controversy. The drama might actually help engagement though.`,
        entityId: entityId,
        entityTicker: undefined,
        entityName: entityName,
        sentiment: 'negative',
        likes: 445,
        comments: 78,
        isLiked: false,
        isBookmarked: false,
        timestamp: new Date(now - 1000 * 60 * 28).toISOString(),
      },
      {
        id: `entity-${entityId}-8`,
        ...getRandomUser(),
        content: `@${entityMentionName} The partnership deals are looking strong. Multiple big brands are showing interest.`,
        entityId: entityId,
        entityTicker: undefined,
        entityName: entityName,
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

  // Get biggest trade in this entity for today (mock data)
  const biggestEntityTrade = useMemo(() => {
    // Mock data - in real app, this would come from backend
    // Generate random trade amount between 1,000 and 22,000
    const mockUsers = [
      { name: 'Alex Morgan', initials: 'AM' },
      { name: 'Jordan Smith', initials: 'JS' },
      { name: 'Taylor Kim', initials: 'TK' },
      { name: 'Casey Johnson', initials: 'CJ' },
      { name: 'Morgan Davis', initials: 'MD' },
      { name: 'Riley Brown', initials: 'RB' },
    ];
    
    // Random user and amount for this entity
    const randomUser = mockUsers[Math.floor(Math.random() * mockUsers.length)];
    const randomAmount = Math.floor(Math.random() * 21000) + 1000; // 1,000 to 22,000
    const isPositive = Math.random() > 0.5; // Random positive/negative
    
    return {
      userName: randomUser.name,
      userInitials: randomUser.initials,
      entityName: entityData.entity.name,
      category: displayCategoryId,
      amount: randomAmount,
      isPositive: isPositive,
    };
  }, [entityId, entityData.entity.name, displayCategoryId]);

  // Get top comment/post from entity feed today
  const topFeedPost = useMemo(() => {
    if (!entityFeedPosts || entityFeedPosts.length === 0) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filter posts from today and sort by engagement (likes + comments)
    const todayPosts = entityFeedPosts.filter(post => {
      const postDate = new Date(post.timestamp);
      return postDate >= today;
    });

    if (todayPosts.length === 0) {
      // If no posts today, get the most recent post
      return entityFeedPosts[0];
    }

    // Sort by engagement (likes + comments)
    return todayPosts.sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))[0];
  }, [entityFeedPosts]);
  
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

  const handleShare = async () => {
    try {
      const entityName = entityData.entity.name;
      const priceText = formatCurrency(currentPrice);
      const changeText = `${isPositive ? '+' : ''}${formatCurrency(priceChange)} (${isPositive ? '+' : ''}${priceChangePercent.toFixed(2)}%)`;
      
      // Format category name
      const categoryName = categoryId
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      const shareMessage = `${entityName}\nCategory: ${categoryName}\n\nPrice: ${priceText}\nChange: ${changeText}\n\nCheck it out on Moro!`;
      
      await Share.share({
        message: shareMessage,
        title: `Share ${entityName}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
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
  const margin = { top: 20, right: 0, left: 0, bottom: 0 }; // Reduced top margin since tab selector is now persistent
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
        {/* Chart Container */}
        <View style={[styles.entityChartWrapperFullWidth, { backgroundColor: theme.card }]}>
          <View style={styles.entityChartContainerFull}>
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

        {/* Biggest Trade in Entity Today */}
        <View style={[styles.infoCard, styles.biggestTradeCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.infoCardTitle, { color: theme.text }]}>Biggest Trade Today</Text>
          <View style={styles.biggestTradeContainer}>
            {/* Top Row: User (left) and Entity (right) */}
            <View style={styles.biggestTradeTopRow}>
              <View style={styles.biggestTradeLeft}>
                <View style={[styles.userAvatar, { backgroundColor: theme.primary + '20' }]}>
                  <Text style={[styles.userAvatarText, { color: theme.primary }]}>
                    {biggestEntityTrade.userInitials}
                  </Text>
                </View>
                <Text style={[styles.userName, { color: theme.text }]}>
                  {biggestEntityTrade.userName}
                </Text>
              </View>
              <View style={styles.biggestTradeRight}>
                <Text style={[styles.entityNameInTrade, { color: theme.text }]}>
                  {biggestEntityTrade.entityName}
                </Text>
                <Text style={[styles.categoryInTrade, { color: theme.textSecondary }]}>
                  {biggestEntityTrade.category}
                </Text>
              </View>
            </View>
            
            {/* Divider */}
            <View style={[styles.biggestTradeDivider, { backgroundColor: theme.borderLight }]} />
            
            {/* Bottom Row: Amount (left) and Positive/Negative (right) */}
            <View style={styles.biggestTradeBottomRow}>
              <Text style={[styles.tradeAmount, { color: theme.text }]}>
                {biggestEntityTrade.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {TOKEN_SYMBOL}
              </Text>
              <Text style={[
                styles.tradeSentiment,
                { color: biggestEntityTrade.isPositive ? '#10B981' : '#EF4444' }
              ]}>
                {biggestEntityTrade.isPositive ? 'Positive' : 'Negative'}
              </Text>
            </View>
          </View>
        </View>

        {/* Top Comment in Entity Feed Today */}
        {topFeedPost && (
          <View style={[styles.infoCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.infoCardTitle, { color: theme.text }]}>Top Comment Today</Text>
            <View style={styles.commentInfo}>
              <View style={styles.commentHeader}>
                <Text style={[styles.commentAuthor, { color: theme.text }]}>
                  {topFeedPost.displayName}
                </Text>
                <Text style={[styles.commentTime, { color: theme.textSecondary }]}>
                  {(() => {
                    const now = Date.now();
                    const postTime = new Date(topFeedPost.timestamp).getTime();
                    const diffMs = now - postTime;
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    if (diffMins < 60) return `${diffMins}m ago`;
                    if (diffHours < 24) return `${diffHours}h ago`;
                    return 'Today';
                  })()}
                </Text>
              </View>
              <Text style={[styles.commentContent, { color: theme.text }]} numberOfLines={3}>
                {topFeedPost.content}
              </Text>
              <View style={styles.commentEngagement}>
                <Ionicons name="heart-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.commentEngagementText, { color: theme.textSecondary }]}>
                  {topFeedPost.likes}
                </Text>
                <Ionicons name="chatbubble-outline" size={14} color={theme.textSecondary} style={{ marginLeft: 12 }} />
                <Text style={[styles.commentEngagementText, { color: theme.textSecondary }]}>
                  {topFeedPost.comments}
                </Text>
              </View>
            </View>
          </View>
        )}

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

      {/* Price Header - Persists across all tabs */}
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

      {/* Tab Selector - Persists across all tabs */}
      <View style={[styles.tabSelectorContainerPersistent, { backgroundColor: theme.card, borderBottomColor: 'rgba(0, 0, 0, 0.08)' }]}>
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
          {categoryId === 'NFL' ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyStateText, { color: theme.text }]}>
                Feeds are coming soon
              </Text>
            </View>
          ) : (
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
          )}
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
          {/* Left Side: Segmented Control */}
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segmentButton, styles.segmentButtonActive]}
              onPress={() => setTradeModalVisible(true)}
            >
              <Text style={styles.segmentButtonTextActive}>Predict</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentButton, styles.segmentButtonInactive]}
              onPress={() => setShareOpinionModalVisible(true)}
            >
              <Text style={styles.segmentButtonTextInactive}>Post</Text>
            </TouchableOpacity>
          </View>

          {/* Right Side: Icon Buttons */}
          <View style={styles.rightIconButtons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setPositionsModalVisible(true)}
            >
              <Ionicons name="briefcase-outline" size={24} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate('CreateAlert', {
                entityId: entityId,
                entityName: entityData.entity.name,
                entityTicker: entityData.entity.ticker,
                currentPrice: currentPrice,
                change24h: priceChange,
                changePercent24h: priceChangePercent,
              })}
            >
              <Ionicons name="notifications-outline" size={24} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
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

      {/* Positions Modal */}
      <Modal
        visible={positionsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPositionsModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay} edges={['bottom']}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setPositionsModalVisible(false)}
          />
          <View style={[styles.positionsModalContent, { backgroundColor: theme.backgroundSecondary }]}>
            {/* Handle bar */}
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            
            {/* Header */}
            <View style={[styles.positionsModalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.positionsModalTitle, { color: theme.text }]}>
                Positions - {entityData.entity.name}
              </Text>
              <TouchableOpacity
                onPress={() => setPositionsModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            {holding ? (
              <ScrollView style={styles.positionsModalBody} showsVerticalScrollIndicator={false}>
                <View style={[styles.positionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.positionRow}>
                    <Text style={[styles.positionLabel, { color: theme.textSecondary }]}>Quantity</Text>
                    <Text style={[styles.positionValue, { color: theme.text }]}>{holding.quantity}</Text>
                  </View>
                  <View style={styles.positionRow}>
                    <Text style={[styles.positionLabel, { color: theme.textSecondary }]}>Average Cost</Text>
                    <Text style={[styles.positionValue, { color: theme.text }]}>
                      {formatCurrency(holding.averageCost)}
                    </Text>
                  </View>
                  <View style={styles.positionRow}>
                    <Text style={[styles.positionLabel, { color: theme.textSecondary }]}>Current Price</Text>
                    <Text style={[styles.positionValue, { color: theme.text }]}>
                      {formatCurrency(holding.currentPrice)}
                    </Text>
                  </View>
                  <View style={styles.positionRow}>
                    <Text style={[styles.positionLabel, { color: theme.textSecondary }]}>Total Value</Text>
                    <Text style={[styles.positionValue, { color: theme.text }]}>
                      {formatCurrency(holding.totalValue)}
                    </Text>
                  </View>
                  <View style={[styles.positionDivider, { backgroundColor: theme.border }]} />
                  <View style={styles.positionRow}>
                    <Text style={[styles.positionLabel, { color: theme.textSecondary }]}>P&L</Text>
                    <Text style={[styles.positionValue, { color: getChangeColor(holding.profitLoss, theme) }]}>
                      {holding.profitLoss >= 0 ? '+' : ''}{formatCurrency(holding.profitLoss)}
                    </Text>
                  </View>
                  <View style={styles.positionRow}>
                    <Text style={[styles.positionLabel, { color: theme.textSecondary }]}>P&L %</Text>
                    <Text style={[styles.positionValue, { color: getChangeColor(holding.profitLoss, theme) }]}>
                      {holding.profitLossPercent >= 0 ? '+' : ''}{holding.profitLossPercent.toFixed(2)}%
                    </Text>
                  </View>
                </View>
              </ScrollView>
            ) : (
              <View style={styles.emptyPositionsContainer}>
                <Text style={[styles.emptyPositionsText, { color: theme.textSecondary }]}>
                  You don't have any open positions
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
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
  tabSelectorContainerPersistent: {
    borderBottomWidth: 0.5,
    paddingTop: 12,
    paddingBottom: 12,
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
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  biggestTradeCard: {
    marginTop: 16,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  biggestTradeContainer: {
    gap: 12,
  },
  biggestTradeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  biggestTradeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  biggestTradeRight: {
    alignItems: 'flex-end',
  },
  entityNameInTrade: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryInTrade: {
    fontSize: 13,
  },
  biggestTradeDivider: {
    height: 1,
    width: '100%',
  },
  biggestTradeBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tradeAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  tradeSentiment: {
    fontSize: 14,
    fontWeight: '600',
  },
  commentInfo: {
    gap: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
  },
  commentTime: {
    fontSize: 12,
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  commentEngagement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  commentEngagementText: {
    fontSize: 12,
    marginLeft: 4,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  segmentButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  segmentButtonActive: {
    backgroundColor: '#3B82F6', // Blue
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  segmentButtonInactive: {
    backgroundColor: '#10B981', // Green
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 32, // Extra padding to balance with "Predict"
  },
  segmentButtonTextActive: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  segmentButtonTextInactive: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rightIconButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  positionsModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '45%',
    paddingBottom: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  positionsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  positionsModalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  positionsModalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    flex: 1,
  },
  positionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  positionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  positionLabel: {
    fontSize: 15,
  },
  positionValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  positionDivider: {
    height: 1,
    marginVertical: 12,
  },
  emptyPositionsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
  },
  emptyPositionsText: {
    fontSize: 14,
  },
});

