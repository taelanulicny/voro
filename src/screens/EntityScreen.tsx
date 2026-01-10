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
import Svg, { Defs, LinearGradient, Stop, Path, G, Line, Text as SvgText, Rect, Ellipse } from 'react-native-svg';
import { RootStackParamList, PriceDataPoint, Post } from '../types';
import { useTrading } from '../context/TradingContext';
import { calculateSentimentRatio, EPSILON } from '../utils/sentimentTrading';
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

// Custom American Football Icon Component
interface FootballIconProps {
  size: number;
  color: string;
}

const FootballIcon: React.FC<FootballIconProps> = ({ size, color }) => {
  const width = size;
  const height = size * 0.65; // Football is elongated oval
  const centerX = width / 2;
  const centerY = height / 2;
  
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Football body (elongated oval) */}
      <Ellipse
        cx={centerX}
        cy={centerY}
        rx={width / 2 - 1}
        ry={height / 2 - 1}
        fill={color}
      />
      
      {/* Laces - 8 parallel horizontal lines in the center */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <Line
          key={`lace-${i}`}
          x1={centerX - width * 0.2}
          y1={centerY - height * 0.15 + (i * height * 0.04)}
          x2={centerX + width * 0.2}
          y2={centerY - height * 0.15 + (i * height * 0.04)}
          stroke="#FFFFFF"
          strokeWidth={1.2}
          strokeLinecap="round"
        />
      ))}
      
      {/* Top end stripe (thick horizontal band) */}
      <Rect
        x={centerX - width * 0.35}
        y={1}
        width={width * 0.7}
        height={height * 0.15}
        fill="#FFFFFF"
        rx={1}
      />
      
      {/* Bottom end stripe (thick horizontal band) */}
      <Rect
        x={centerX - width * 0.35}
        y={height - height * 0.15 - 1}
        width={width * 0.7}
        height={height * 0.15}
        fill="#FFFFFF"
        rx={1}
      />
    </Svg>
  );
};

// Custom Basketball Icon Component
interface BasketballIconProps {
  size: number;
  color: string;
}

const BasketballIcon: React.FC<BasketballIconProps> = ({ size, color }) => {
  const radius = size / 2 - 1;
  const centerX = size / 2;
  const centerY = size / 2;
  
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Basketball circle */}
      <Ellipse
        cx={centerX}
        cy={centerY}
        rx={radius}
        ry={radius}
        fill={color}
      />
      
      {/* Basketball lines - curved lines typical of a basketball */}
      <Line
        x1={centerX - radius * 0.7}
        y1={centerY - radius * 0.3}
        x2={centerX + radius * 0.7}
        y2={centerY + radius * 0.3}
        stroke="#FFFFFF"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Line
        x1={centerX - radius * 0.7}
        y1={centerY + radius * 0.3}
        x2={centerX + radius * 0.7}
        y2={centerY - radius * 0.3}
        stroke="#FFFFFF"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Line
        x1={centerX}
        y1={centerY - radius * 0.8}
        x2={centerX}
        y2={centerY + radius * 0.8}
        stroke="#FFFFFF"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Chart config will be created dynamically based on theme

// Clean entity data generator - fresh start, no hardcoded data
const generateMockEntityData = (entityId: number, categoryId: string) => {
  // Get entity from centralized data
  const entityData = getEntityById(entityId);
  
  // Fallback if entity not found
  if (!entityData) {
    return {
      entity: {
        id: entityId,
        ticker: `ENTITY${entityId}`,
        name: `Entity ${entityId}`,
        type: 'stock' as const,
        currentPrice: 100,
        change24h: 0,
        changePercent24h: 0,
        volume24h: 0,
        marketCap: 0,
        description: `Entity ${entityId} in the ${categoryId} category.`,
      },
      priceHistory: [], // Empty - no graph data
      stats: {
        high24h: 100,
        low24h: 100,
        volume24h: 0,
        marketCap: 0,
        holdersCount: 0,
        rank: 0,
      },
    };
  }

  // Use centralized entity data - fresh start, no fake data
  return {
    entity: {
      id: entityId,
      ticker: entityData?.ticker || `ENTITY${entityId}`,
      name: entityData?.name || `Entity ${entityId}`,
      type: 'stock' as const,
      currentPrice: 100, // All entities start at 100
      change24h: 0, // No change
      changePercent24h: 0, // 0% change
      volume24h: 0, // No fake volume
      marketCap: 0, // No fake market cap
      description: entityData?.description || '',
    },
    priceHistory: [], // Empty - no graph data plotted
    stats: {
      high24h: 100,
      low24h: 100,
      volume24h: 0, // No fake volume
      marketCap: 0, // No fake market cap
      holdersCount: 0, // No fake holders
      rank: 0, // No fake rank
    },
  };
};

export default function EntityScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EntityScreenRouteProp>();
  const { entityId, categoryId } = route.params;
  const { getPosition, getEntityPrice } = useTrading();
  const { getNewsByEntity } = useNews();
  const { theme } = useTheme();
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  
  // Generate entity data based on current entityId - updates when entityId changes
  const entityData = useMemo(() => generateMockEntityData(entityId, categoryId), [entityId, categoryId]);
  
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1min' | 'coming-soon'>('1min');
  const [tradeModalVisible, setTradeModalVisible] = useState(false);
  const [shareOpinionModalVisible, setShareOpinionModalVisible] = useState(false);
  const [positionsModalVisible, setPositionsModalVisible] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PriceDataPoint[]>([]);
  const [chartUpdateKey, setChartUpdateKey] = useState(0); // Force chart re-render
  const [selectedTab, setSelectedTab] = useState<'chart' | 'about' | 'feed' | 'news'>('chart');
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Update price history and reset tab whenever entityId changes (ensures we always show Chart when navigating to an entity)
  useEffect(() => {
    setSelectedTab('chart');
    setPriceHistory([]); // Empty - no graph data
    setChartUpdateKey(prev => prev + 1); // Force chart to re-render
    // Reset scroll position to chart tab
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: 0, animated: false });
    }, 100);
    return () => clearTimeout(timer);
  }, [entityId]);
  
  // Ensure entityData is valid
  if (!entityData || !entityData.entity) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={[styles.errorContainer, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={[styles.errorText, { color: theme.text }]}>Entity not found</Text>
        </View>
      </SafeAreaView>
    );
  }


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

  const position = getPosition(entityId);
  const entityNews = getNewsByEntity(entityId);
  
  // Get entity info for feed - ensure it exists
  const entity = getEntityById(entityId);
  
  // Get live price from global price system - all entities start at 100
  const currentPrice = getEntityPrice(entityId) || 100;
  
  // categoryId is already in the correct format (no mapping needed)
  const displayCategoryId = categoryId
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Generate mock live game data for top 5 NFL and NBA teams
  const liveGameData = useMemo(() => {
    if ((categoryId !== 'NFL' && categoryId !== 'NBA') || !entity || !entityData?.entity) return null;
    
    if (categoryId === 'NFL') {
      // Top 5 NFL teams by basePrice: Chiefs (100), Cowboys (114), Eagles (116), 49ers (127), Bills (101)
      const top5TeamIds = [100, 114, 116, 127, 101];
      
      // Check if current entity is in top 5
      if (!top5TeamIds.includes(entityId)) return null;
      
      // Get all top 5 teams with their info
      const top5Teams = [
        { id: 100, name: 'Kansas City Chiefs', ticker: 'KCCHI' },
        { id: 114, name: 'Dallas Cowboys', ticker: 'DALCO' },
        { id: 116, name: 'Philadelphia Eagles', ticker: 'PHIEA' },
        { id: 127, name: 'San Francisco 49ers', ticker: 'SF49' },
        { id: 101, name: 'Buffalo Bills', ticker: 'BUFBI' },
      ];
      
      // Create matchups for each top 5 team
      const matchups: Record<number, { opponent: typeof top5Teams[0], teamScore: number, opponentScore: number, quarter: string, time: string, status: string, isAway: boolean }> = {
        100: { opponent: top5Teams[4], teamScore: 24, opponentScore: 21, quarter: 'Q3', time: '8:45', status: 'LIVE', isAway: true }, // Chiefs at Bills
        114: { opponent: top5Teams[3], teamScore: 31, opponentScore: 28, quarter: 'Q4', time: '2:15', status: 'LIVE', isAway: true }, // Cowboys at 49ers
        116: { opponent: top5Teams[0], teamScore: 17, opponentScore: 14, quarter: 'Q2', time: '5:32', status: 'LIVE', isAway: true }, // Eagles at Chiefs
        127: { opponent: top5Teams[1], teamScore: 28, opponentScore: 31, quarter: 'Q4', time: '2:15', status: 'LIVE', isAway: false }, // 49ers vs Cowboys (home)
        101: { opponent: top5Teams[0], teamScore: 21, opponentScore: 24, quarter: 'Q3', time: '8:45', status: 'LIVE', isAway: false }, // Bills vs Chiefs (home)
      };
      
      const game = matchups[entityId];
      if (!game) return null;
      
      return {
        teamName: entity?.name || '',
        teamTicker: entity?.ticker || '',
        teamId: entityId,
        teamScore: game.teamScore,
        opponentName: game.opponent.name,
        opponentTicker: game.opponent.ticker,
        opponentId: game.opponent.id,
        opponentScore: game.opponentScore,
        quarter: game.quarter,
        time: game.time,
        status: game.status,
        isAway: game.isAway,
        sportCategory: 'NFL',
      };
    } else if (categoryId === 'NBA') {
      // Top 5 NBA teams by basePrice: Celtics (200), Bucks (201), Nuggets (202), Suns (203), Lakers (204)
      const top5TeamIds = [200, 201, 202, 203, 204];
      
      // Check if current entity is in top 5
      if (!top5TeamIds.includes(entityId)) return null;
      
      // Get all top 5 teams with their info
      const top5Teams = [
        { id: 200, name: 'Boston Celtics', ticker: 'BOSCE' },
        { id: 201, name: 'Milwaukee Bucks', ticker: 'MILBU' },
        { id: 202, name: 'Denver Nuggets', ticker: 'DENNU' },
        { id: 203, name: 'Phoenix Suns', ticker: 'PHOEN' },
        { id: 204, name: 'Los Angeles Lakers', ticker: 'LALAK' },
      ];
      
      // Create matchups for each top 5 team (matching CategoryScreen)
      const matchups: Record<number, { opponent: typeof top5Teams[0], teamScore: number, opponentScore: number, quarter: string, time: string, status: string, isAway: boolean }> = {
        200: { opponent: top5Teams[4], teamScore: 112, opponentScore: 108, quarter: 'Q4', time: '3:24', status: 'LIVE', isAway: true }, // Celtics at Lakers
        201: { opponent: top5Teams[2], teamScore: 98, opponentScore: 105, quarter: 'Q3', time: '7:15', status: 'LIVE', isAway: true }, // Bucks at Nuggets
        202: { opponent: top5Teams[3], teamScore: 124, opponentScore: 118, quarter: 'Q4', time: '2:18', status: 'LIVE', isAway: false }, // Nuggets vs Suns (home)
        203: { opponent: top5Teams[0], teamScore: 119, opponentScore: 115, quarter: 'Q4', time: '1:42', status: 'LIVE', isAway: true }, // Suns at Celtics
        204: { opponent: top5Teams[1], teamScore: 102, opponentScore: 109, quarter: 'Q3', time: '5:33', status: 'LIVE', isAway: false }, // Lakers vs Bucks (home)
      };
      
      const game = matchups[entityId];
      if (!game) return null;
      
      return {
        teamName: entity?.name || '',
        teamTicker: entity?.ticker || '',
        teamId: entityId,
        teamScore: game.teamScore,
        opponentName: game.opponent.name,
        opponentTicker: game.opponent.ticker,
        opponentId: game.opponent.id,
        opponentScore: game.opponentScore,
        quarter: game.quarter,
        time: game.time,
        status: game.status,
        isAway: game.isAway,
        sportCategory: 'NBA',
      };
    }
    
    return null;
  }, [entityId, categoryId, entity]);

  // Helper function to convert team name to camelCase format for @tag
  const formatTeamTag = (teamName: string): string => {
    return teamName.replace(/\s+/g, '');
  };

  // Handler to navigate to team entity page
  const handleTeamPress = (teamId: number, sportCategory?: string) => {
    navigation.navigate('Entity' as never, {
      entityId: teamId,
      categoryId: sportCategory || categoryId,
    } as never);
  };
  
  // Entity-specific feed posts - empty for fresh start, no hardcoded data
  const entityFeedPosts = useMemo(() => {
    // Return empty array - no fake feed posts
    return [];
  }, [entityId]);

  // Get biggest trade in this entity for today - return null when no data (fresh start)
  const biggestEntityTrade = useMemo(() => {
    // Return null - no hardcoded data, don't show section until real trade data exists
    return null;
  }, [entityId, entityData?.entity?.name, displayCategoryId]);

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
        // No graph data - empty array (fresh start)
        return [];
  }, []);

  // All entities start at 100 with 0% change
  const basePrice = 100; // All entities start at 100
  const priceChange = 0; // No change - starting at 100
  const priceChangePercent = 0; // 0% change
  
  const isPositive = priceChange >= 0;

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const handleShare = async () => {
    try {
      const entityName = entityData?.entity?.name || 'Entity';
      const priceText = formatCurrency(currentPrice);
      const changeText = '0.00%'; // Always 0% since all start at 100
      
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

  // Convert filteredPriceHistory to chart data format - empty, no graph data
  const chartPrices = useMemo(() => {
    // Return empty array - no data to plot
    return [];
  }, []);

  // Calculate Y domain - center around current price (100) but no data plotted
  const yDomain = useMemo(() => {
    const price = currentPrice || 100;
    const padding = price * 0.1;
    return { yMin: price - padding, yMax: price + padding, yRange: padding * 2 };
  }, [currentPrice]);

  // Generate line path - return empty since no data to plot
  const generateLinePath = () => {
    // No graph data - return empty path
    return '';
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
                
                {/* Current price horizontal dotted line - show price at 100 */}
                {(() => {
                  const currentPriceValue = currentPrice || 100;
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

        {/* Biggest Trade in Entity Today - hidden for fresh start */}
        {biggestEntityTrade && (
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
        )}

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
        {position && (
          <View style={[styles.positionCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Position</Text>
            <View style={styles.positionGrid}>
              <View style={styles.positionItem}>
                <Text style={[styles.positionLabel, { color: theme.textSecondary }]}>Direction</Text>
                <Text style={[styles.positionValue, { color: position.direction === 'positive' ? '#10B981' : '#EF4444' }]}>
                  {position.direction === 'positive' ? 'Positive' : 'Negative'}
                </Text>
              </View>
              <View style={styles.positionItem}>
                <Text style={[styles.positionLabel, { color: theme.textSecondary }]}>Tokens Committed</Text>
                <Text style={[styles.positionValue, { color: theme.text }]}>{position.tokensCommitted}</Text>
              </View>
              <View style={styles.positionItem}>
                <Text style={[styles.positionLabel, { color: theme.textSecondary }]}>Current Price</Text>
                <Text style={[styles.positionValue, { color: theme.text }]}>{formatCurrency(currentPrice)}</Text>
              </View>
              <View style={styles.positionItem}>
                <Text style={[styles.positionLabel, { color: theme.textSecondary }]}>Tranches</Text>
                <Text style={[styles.positionValue, { color: theme.text }]}>
                  {position.trancheCount || 1}
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
          <Text style={[styles.entityName, { color: theme.text }]}>{entityData?.entity?.name || ''}</Text>
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
              {priceChange === 0 ? '' : isPositive ? '+' : ''}{formatCurrency(priceChange)}
            </Text>
            <Text style={[
              styles.entityChangePercent,
              { color: getChangeColor(priceChange, theme) }
            ]}>
              ({priceChangePercent === 0 ? '' : isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
            </Text>
          </View>
        </View>
        <View style={styles.entityStatsInfo}>
          <Text style={[styles.entityStatsLabel, { color: theme.textSecondary }]}>
            Volume: <Text style={{ color: theme.text }}>{formatVolume(entityData?.stats?.volume24h || 0)}</Text>
          </Text>
          <Text style={[styles.entityStatsLabel, { color: theme.textSecondary }]}>
            High: <Text style={{ color: theme.text }}>{formatCurrency(entityData?.stats?.high24h || 100)}</Text>
          </Text>
          <Text style={[styles.entityStatsLabel, { color: theme.textSecondary }]}>
            Low: <Text style={{ color: theme.text }}>{formatCurrency(entityData?.stats?.low24h || 100)}</Text>
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
          <FlatList
            data={categoryId === 'NFL' ? [] : entityFeedPosts}
            ListHeaderComponent={liveGameData ? (() => {
              const sportCategory = liveGameData.sportCategory || categoryId;
              const isNBA = sportCategory === 'NBA';
              const iconColor = isNBA ? '#C8102E' : '#1E40AF';
              
              return (
              <View style={[styles.liveGameModule, { backgroundColor: theme.card }]}>
                <View style={styles.liveGameHeader}>
                  <View style={styles.liveGameHeaderLeft}>
                    <View style={[styles.sportIcon, { backgroundColor: iconColor }]}>
                      {isNBA ? (
                        <BasketballIcon size={20} color="#FFFFFF" />
                      ) : (
                        <FootballIcon size={20} color="#FFFFFF" />
                      )}
                    </View>
                    <View>
                      <Text style={[styles.liveGameCategory, { color: theme.textSecondary }]}>
                        {liveGameData.sportCategory || categoryId}
                      </Text>
                      {(() => {
                        const awayTeamTag = `@${formatTeamTag(liveGameData.isAway ? liveGameData.teamName : liveGameData.opponentName)}`;
                        const homeTeamTag = `@${formatTeamTag(liveGameData.isAway ? liveGameData.opponentName : liveGameData.teamName)}`;
                        const fullTitle = `${awayTeamTag} at ${homeTeamTag}`;
                        const shouldWrap = fullTitle.length > 32;
                        const awayTeamId = liveGameData.isAway ? liveGameData.teamId : liveGameData.opponentId;
                        const homeTeamId = liveGameData.isAway ? liveGameData.opponentId : liveGameData.teamId;
                        
                        if (shouldWrap) {
                          return (
                            <View style={styles.liveGameTitleContainerWrapped}>
                              <TouchableOpacity onPress={() => handleTeamPress(awayTeamId, liveGameData.sportCategory || categoryId)}>
                                <Text style={[styles.liveGameTitle, { color: theme.primary }]}>
                                  {awayTeamTag}
                                </Text>
                              </TouchableOpacity>
                              <View style={styles.liveGameTitleRow}>
                                <Text style={[styles.liveGameTitle, { color: theme.text }]}>at </Text>
                                <TouchableOpacity onPress={() => handleTeamPress(homeTeamId, liveGameData.sportCategory || categoryId)}>
                                  <Text style={[styles.liveGameTitle, { color: theme.primary }]}>
                                    {homeTeamTag}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        } else {
                          return (
                            <View style={styles.liveGameTitleContainer}>
                              <TouchableOpacity onPress={() => handleTeamPress(awayTeamId, liveGameData.sportCategory || categoryId)}>
                                <Text style={[styles.liveGameTitle, { color: theme.primary }]}>
                                  {awayTeamTag}
                                </Text>
                              </TouchableOpacity>
                              <Text style={[styles.liveGameTitle, { color: theme.text }]}> at </Text>
                              <TouchableOpacity onPress={() => handleTeamPress(homeTeamId, liveGameData.sportCategory || categoryId)}>
                                <Text style={[styles.liveGameTitle, { color: theme.primary }]}>
                                  {homeTeamTag}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          );
                        }
                      })()}
                    </View>
                  </View>
                </View>
                
                <View style={styles.liveGameScoreSection}>
                  <View style={styles.liveGameStatusRow}>
                    <View style={styles.liveGameStatusLeft}>
                      <View style={[styles.liveGameStatusDot, { backgroundColor: '#EF4444' }]} />
                      <Text style={[styles.liveGameStatus, { color: theme.text }]}>
                        {liveGameData.status} · {liveGameData.quarter} - {liveGameData.time}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.liveGameScoreRow}>
                    <View style={styles.liveGameTeamScore}>
                      <Text style={[styles.liveGameScoreValue, { color: theme.text }]}>
                        {liveGameData.teamScore}
                      </Text>
                      <Text style={[styles.liveGameTeamAbbr, { color: theme.textSecondary }]}>
                        {liveGameData.teamTicker.substring(0, 3)}
                      </Text>
                    </View>
                    
                    <Text style={[styles.liveGameScoreSeparator, { color: theme.text }]}>-</Text>
                    
                    <View style={styles.liveGameTeamScore}>
                      <Text style={[styles.liveGameScoreValue, { color: theme.text }]}>
                        {liveGameData.opponentScore}
                      </Text>
                      <Text style={[styles.liveGameTeamAbbr, { color: theme.textSecondary }]}>
                        {liveGameData.opponentTicker.substring(0, 3)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              );
            })() : null}
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
                  {categoryId === 'NFL' ? 'Feeds are coming soon' : 'No posts yet for this entity'}
                </Text>
          </View>
        )}
          />
        </View>

        {/* News Tab */}
        <View style={{ width: SCREEN_WIDTH }}>
          <FlatList
            data={entityNews}
            ListHeaderComponent={liveGameData ? (() => {
              const sportCategory = liveGameData.sportCategory || categoryId;
              const isNBA = sportCategory === 'NBA';
              const iconColor = isNBA ? '#C8102E' : '#1E40AF';
              
              return (
              <View style={[styles.liveGameModule, { backgroundColor: theme.card }]}>
                <View style={styles.liveGameHeader}>
                  <View style={styles.liveGameHeaderLeft}>
                    <View style={[styles.sportIcon, { backgroundColor: iconColor }]}>
                      {isNBA ? (
                        <BasketballIcon size={20} color="#FFFFFF" />
                      ) : (
                        <FootballIcon size={20} color="#FFFFFF" />
                      )}
                    </View>
                    <View>
                      <Text style={[styles.liveGameCategory, { color: theme.textSecondary }]}>
                        {liveGameData.sportCategory || categoryId}
                      </Text>
                      {(() => {
                        const awayTeamTag = `@${formatTeamTag(liveGameData.isAway ? liveGameData.teamName : liveGameData.opponentName)}`;
                        const homeTeamTag = `@${formatTeamTag(liveGameData.isAway ? liveGameData.opponentName : liveGameData.teamName)}`;
                        const fullTitle = `${awayTeamTag} at ${homeTeamTag}`;
                        const shouldWrap = fullTitle.length > 32;
                        const awayTeamId = liveGameData.isAway ? liveGameData.teamId : liveGameData.opponentId;
                        const homeTeamId = liveGameData.isAway ? liveGameData.opponentId : liveGameData.teamId;
                        
                        if (shouldWrap) {
                          return (
                            <View style={styles.liveGameTitleContainerWrapped}>
                              <TouchableOpacity onPress={() => handleTeamPress(awayTeamId, liveGameData.sportCategory || categoryId)}>
                                <Text style={[styles.liveGameTitle, { color: theme.primary }]}>
                                  {awayTeamTag}
                                </Text>
                              </TouchableOpacity>
                              <View style={styles.liveGameTitleRow}>
                                <Text style={[styles.liveGameTitle, { color: theme.text }]}>at </Text>
                                <TouchableOpacity onPress={() => handleTeamPress(homeTeamId, liveGameData.sportCategory || categoryId)}>
                                  <Text style={[styles.liveGameTitle, { color: theme.primary }]}>
                                    {homeTeamTag}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        } else {
                          return (
                            <View style={styles.liveGameTitleContainer}>
                              <TouchableOpacity onPress={() => handleTeamPress(awayTeamId, liveGameData.sportCategory || categoryId)}>
                                <Text style={[styles.liveGameTitle, { color: theme.primary }]}>
                                  {awayTeamTag}
                                </Text>
                              </TouchableOpacity>
                              <Text style={[styles.liveGameTitle, { color: theme.text }]}> at </Text>
                              <TouchableOpacity onPress={() => handleTeamPress(homeTeamId, liveGameData.sportCategory || categoryId)}>
                                <Text style={[styles.liveGameTitle, { color: theme.primary }]}>
                                  {homeTeamTag}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          );
                        }
                      })()}
                    </View>
                  </View>
                </View>
                
                <View style={styles.liveGameScoreSection}>
                  <View style={styles.liveGameStatusRow}>
                    <View style={styles.liveGameStatusLeft}>
                      <View style={[styles.liveGameStatusDot, { backgroundColor: '#EF4444' }]} />
                      <Text style={[styles.liveGameStatus, { color: theme.text }]}>
                        {liveGameData.status} · {liveGameData.quarter} - {liveGameData.time}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.liveGameScoreRow}>
                    <View style={styles.liveGameTeamScore}>
                      <Text style={[styles.liveGameScoreValue, { color: theme.text }]}>
                        {liveGameData.teamScore}
                      </Text>
                      <Text style={[styles.liveGameTeamAbbr, { color: theme.textSecondary }]}>
                        {liveGameData.teamTicker.substring(0, 3)}
                      </Text>
                    </View>
                    
                    <Text style={[styles.liveGameScoreSeparator, { color: theme.text }]}>-</Text>
                    
                    <View style={styles.liveGameTeamScore}>
                      <Text style={[styles.liveGameScoreValue, { color: theme.text }]}>
                        {liveGameData.opponentScore}
                      </Text>
                      <Text style={[styles.liveGameTeamAbbr, { color: theme.textSecondary }]}>
                        {liveGameData.opponentTicker.substring(0, 3)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              );
            })() : null}
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
                entityName: entityData?.entity?.name || '',
                entityTicker: entityData?.entity?.ticker || '',
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
        entityName={entityData?.entity?.name || ''}
        entityTicker={entityData?.entity?.ticker || ''}
        category={categoryId}
      />

      {/* Share Opinion Modal */}
      <CreatePostModal
        visible={shareOpinionModalVisible}
        onClose={() => setShareOpinionModalVisible(false)}
        entityId={entityId}
        entityName={entityData?.entity?.name || ''}
        entityTicker={entityData?.entity?.ticker || ''}
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
                Positions - {entityData?.entity?.name || 'Entity'}
              </Text>
              <TouchableOpacity
                onPress={() => setPositionsModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            {position ? (
              <ScrollView style={styles.positionsModalBody} showsVerticalScrollIndicator={false}>
                <View style={[styles.positionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.positionRow}>
                    <Text style={[styles.positionLabel, { color: theme.textSecondary }]}>Direction</Text>
                    <Text style={[styles.positionValue, { color: position.direction === 'positive' ? '#10B981' : '#EF4444' }]}>
                      {position.direction === 'positive' ? 'Positive' : 'Negative'}
                    </Text>
                  </View>
                  <View style={styles.positionRow}>
                    <Text style={[styles.positionLabel, { color: theme.textSecondary }]}>Tokens Committed</Text>
                    <Text style={[styles.positionValue, { color: theme.text }]}>
                      {position.tokensCommitted}
                    </Text>
                  </View>
                  <View style={styles.positionRow}>
                    <Text style={[styles.positionLabel, { color: theme.textSecondary }]}>Current Price</Text>
                    <Text style={[styles.positionValue, { color: theme.text }]}>
                      {formatCurrency(currentPrice)}
                    </Text>
                  </View>
                  <View style={styles.positionRow}>
                    <Text style={[styles.positionLabel, { color: theme.textSecondary }]}>Tranches</Text>
                    <Text style={[styles.positionValue, { color: theme.text }]}>
                      {position.trancheCount || 1}
                    </Text>
                  </View>
                  <View style={[styles.positionDivider, { backgroundColor: theme.border }]} />
                  <Text style={[styles.summaryNote, { color: theme.textSecondary, marginTop: 8 }]}>
                    P&L will be calculated when you close the position
                  </Text>
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
  liveGameModule: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  liveGameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  liveGameHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  sportIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveGameCategory: {
    fontSize: 12,
    marginBottom: 4,
  },
  liveGameTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  liveGameTitleContainerWrapped: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  liveGameTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveGameTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  liveGameHeaderRight: {
    flexDirection: 'row',
    gap: 12,
  },
  liveGameIconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveGameScoreSection: {
    marginTop: 8,
  },
  liveGameStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  liveGameStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveGameStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveGameStatus: {
    fontSize: 13,
    fontWeight: '500',
  },
  liveGameScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  liveGameTeamScore: {
    alignItems: 'center',
    gap: 8,
  },
  liveGameScoreValue: {
    fontSize: 48,
    fontWeight: '700',
  },
  liveGameTeamAbbr: {
    fontSize: 14,
    fontWeight: '600',
  },
  liveGameScoreSeparator: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: -20,
    lineHeight: 48,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
  },
  summaryNote: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

