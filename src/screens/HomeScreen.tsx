import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  FlatList,
  Animated,
  Image,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import Svg, { Path, Line } from 'react-native-svg';
import { RootStackParamList, MainTabParamList, Entity, PriceDataPoint } from '../types';
import { useTrading } from '../context/TradingContext';
import { useTheme } from '../context/ThemeContext';
import { useWatchlist } from '../context/WatchlistContext';
import { useSideMenu } from '../context/SideMenuContext';
import { useSocial } from '../context/SocialContext';
import { formatCurrency, getChangeColor, TOKEN_SYMBOL } from '../utils/dataGenerator';
import { getEntityById, getAllEntities, ENTITIES, getEntitiesByCategory } from '../utils/entities';
import { BASE_PRICE } from '../utils/sentimentTrading';
import TradeModal from '../components/TradeModal';
import SideMenu from '../components/SideMenu';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { portfolio, getEntityPrice, getAllEntityPrices, getPosition, getPositionOpenPnL } = useTrading();
  const { theme } = useTheme();
  const { watchlist } = useWatchlist();
  const { isVisible: sideMenuVisible, setIsVisible: setSideMenuVisible } = useSideMenu();
  const { activityFeed } = useSocial();
  const [refreshing, setRefreshing] = useState(false);
  const [referralModalVisible, setReferralModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('For You');
  const [addedCategories, setAddedCategories] = useState<string[]>([]);
  
  // State to force updates every minute (for top movers, chart tickers, and discover new additions)
  // Declared early so it can be used in useMemo hooks below
  const [updateKey, setUpdateKey] = useState(0);

  // Load added categories from AsyncStorage on mount and when focused
  useEffect(() => {
    const loadAddedCategories = async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const stored = await AsyncStorage.getItem('addedCategories');
        if (stored) {
          setAddedCategories(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error loading added categories:', error);
      }
    };
    loadAddedCategories();
  }, []);

  // Reload when screen is focused (in case category was added from CategoryScreen)
  useFocusEffect(
    useCallback(() => {
      const loadAddedCategories = async () => {
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const stored = await AsyncStorage.getItem('addedCategories');
          if (stored) {
            setAddedCategories(JSON.parse(stored));
          }
        } catch (error) {
          console.error('Error loading added categories:', error);
        }
      };
      loadAddedCategories();
    }, [])
  );

  // Swipeable section state
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const swipeableScrollRef = useRef<ScrollView>(null);
  const TOTAL_PAGES = 6;
  
  // Categories match the treemap categories from AllCategoriesScreen
  const categories = ['For You', 'People', 'Teams', 'Actors', 'NBA Players', 'NFL Players', 'Soccer Players', 'Influencers', 'Political Figures', 'NFL Teams', 'NBA Teams', 'College Basketball Teams', 'Rap Music', 'Country Music', 'Pop Music'];
  const customizableCategories = ['People', 'Teams', 'Actors', 'NBA Players', 'NFL Players', 'Soccer Players', 'Influencers', 'Political Figures', 'NFL Teams', 'NBA Teams', 'College Basketball Teams', 'Rap Music', 'Country Music', 'Pop Music'];

  // Get icon name for each category
  const getCategoryIcon = (category: string): string => {
    const iconMap: Record<string, string> = {
      'People': 'people-outline',
      'Teams': 'grid-outline', // Generic teams icon
      'Actors': 'film-outline',
      'NBA Players': 'basketball-outline',
      'NFL Players': 'american-football-outline',
      'Soccer Players': 'football-outline',
      'Influencers': 'megaphone-outline',
      'Political Figures': 'flag-outline',
      'NFL Teams': 'grid-outline', // Field/court icon
      'NBA Teams': 'grid-outline', // Court icon
      'College Basketball Teams': 'grid-outline', // Court icon
      'Rap Music': 'musical-notes-outline',
      'Country Music': 'musical-notes-outline',
      'Pop Music': 'musical-notes-outline',
    };
    return iconMap[category] || 'ellipse-outline';
  };

  // Simple White House outline icon
  const WhiteHouseIcon = ({ size = 28, color = '#775a96' }: { size?: number; color?: string }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9.5 12 4l9 5.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 10.5v9h14v-9" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 19.5v-5h6v5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="3" y1="10.5" x2="21" y2="10.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );

  // Render category icon, with custom White House for Political Figures
  const renderCategoryIcon = (category: string, color: string) => {
    if (category === 'Political Figures') {
      return <WhiteHouseIcon color={color} size={28} />;
    }
    return <Ionicons name={getCategoryIcon(category) as any} size={28} color={color} />;
  };
  
  // Get live entity prices
  const entityPrices = getAllEntityPrices();
  const [previousPrices, setPreviousPrices] = useState<Record<number, number>>({});

  // Get all open positions
  const openPositions = useMemo(() => {
    const positions: Array<{
      entityId: number;
      entityName: string;
      category: string;
      currentPrice: number;
      pnl: number;
    }> = [];

    ENTITIES.forEach((entity) => {
      const position = getPosition(entity.id);
      if (position) {
        const currentPrice = getEntityPrice(entity.id) || BASE_PRICE;
        const pnl = getPositionOpenPnL(entity.id);
        positions.push({
          entityId: entity.id,
          entityName: entity.name,
          category: entity.category,
          currentPrice,
          pnl,
        });
      }
    });

    return positions;
  }, [entityPrices, getPosition, getEntityPrice, getPositionOpenPnL]);
  
  // Force chart update when portfolio value changes - DISABLED (keeping prices static)
  // useEffect(() => {
  //   setChartUpdateKey(prev => prev + 1);
  // }, [portfolio.totalValue, portfolioHistory.length]);
  
  // Update entities with live prices
  const entities = useMemo(() => {
    return ENTITIES.map((entity) => {
      const currentPrice = getEntityPrice(entity.id);
      const previousPrice = previousPrices[entity.id] || entity.basePrice;
      // Calculate change from basePrice
      const change24h = currentPrice - entity.basePrice;
      const changePercent24h = (change24h / entity.basePrice) * 100;
      
      return {
        id: entity.id,
        name: entity.name,
        type: 'stock' as const,
        currentPrice,
        change24h,
        changePercent24h,
        volume24h: Math.floor(Math.random() * 50000000) + 5000000,
        marketCap: Math.floor(Math.random() * 10000000000) + 1000000000,
        description: entity.description,
        category: entity.category,
      };
    });
  }, [entityPrices, previousPrices, getEntityPrice]);
  
  // Track previous prices for change calculations
  useEffect(() => {
    setPreviousPrices(entityPrices);
  }, [entityPrices]);

  // Update top movers and chart tickers every minute
  useEffect(() => {
    const interval = setInterval(() => {
      // Force update by incrementing updateKey
      // This triggers recalculation of topGainers and refreshes chart tickers
      setUpdateKey(prev => prev + 1);
    }, 60000); // Update every 60 seconds (1 minute)

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []); // Empty dependency array - only run on mount/unmount
  
  // Trade modal states
  const [tradeModalVisible, setTradeModalVisible] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{
    id: number;
    name: string;
    price: number;
    category: string;
  } | null>(null);
  

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Calculate page width - full screen width since section has no padding
  const PAGE_WIDTH = SCREEN_WIDTH;

  // Handle swipeable section scroll
  const handleSwipeableScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / PAGE_WIDTH);
    
    // Handle circular scrolling with duplicate pages
    if (pageIndex === 0) {
      setCurrentPageIndex(5); // Jump to page 6 (0-indexed: 5)
    } else if (pageIndex === TOTAL_PAGES + 1) {
      setCurrentPageIndex(0); // Jump to page 1 (0-indexed: 0)
    } else if (pageIndex >= 1 && pageIndex <= TOTAL_PAGES) {
      setCurrentPageIndex(pageIndex - 1);
    }
  };

  // Handle scroll end for circular scrolling
  const handleSwipeableScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / PAGE_WIDTH);
    
    if (pageIndex === 0) {
      swipeableScrollRef.current?.scrollTo({ x: PAGE_WIDTH * TOTAL_PAGES, animated: false });
      setCurrentPageIndex(5); // Jump to page 6 (0-indexed: 5)
    } else if (pageIndex === TOTAL_PAGES + 1) {
      swipeableScrollRef.current?.scrollTo({ x: PAGE_WIDTH, animated: false });
      setCurrentPageIndex(0); // Jump to page 1 (0-indexed: 0)
    } else if (pageIndex >= 1 && pageIndex <= TOTAL_PAGES) {
      setCurrentPageIndex(pageIndex - 1);
    }
  };

  // Initialize scroll position on mount
  useEffect(() => {
    setTimeout(() => {
      swipeableScrollRef.current?.scrollTo({ x: PAGE_WIDTH, animated: false });
    }, 100);
  }, []);

  // Helper to convert hex to rgba
  const hexToRgba = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  // Generate price history for comparison chart (last week, multiple points per day)
  const generateComparisonPriceHistory = (entityId: number, basePrice: number, currentPrice: number): PriceDataPoint[] => {
    const history: PriceDataPoint[] = [];
    const now = Date.now();
    
    let price = basePrice + (Math.random() - 0.5) * 20;
    const targetPrice = currentPrice;
    const totalChange = targetPrice - price;
    
    const pointsPerDay = 6;
    const totalPoints = 7 * pointsPerDay;
    
    for (let i = 0; i <= totalPoints; i++) {
      const daysAgo = i / pointsPerDay;
      const timestamp = now - daysAgo * 24 * 60 * 60 * 1000;
      
      const progress = i / totalPoints;
      const interpolatedPrice = price + (totalChange * progress);
      const variance = (Math.random() - 0.5) * 5;
      const finalPrice = interpolatedPrice + variance;
      
      history.push({
        timestamp,
        price: Math.max(80, Math.min(220, finalPrice)),
      });
    }
    
    if (history.length > 0) {
      history[history.length - 1].price = currentPrice;
    }
    
    return history.reverse();
  };

  const handleHoldingPress = (entityId: number, category: string) => {
    // Category is already in the correct format (no mapping needed)
    navigation.navigate('Entity', { entityId, categoryId: category });
  };


  // Categories are now stored directly (no mapping needed)
  // Get previous day ranks for a category (returns current ranks - no movement)
  const getPreviousDayRanks = (category: string): Record<number, number> => {
    const filteredEntities = getEntitiesByCategory(category);
    
    // All entities start at price 100, so use current prices for ranking
    const entitiesWithPrices = filteredEntities.map((entity) => {
      const currentPrice = getEntityPrice(entity.id);
      return {
        id: entity.id,
        price: currentPrice,
      };
    });
    
    // Sort by price to get ranks (same as current since all prices start at 100)
    const sorted = [...entitiesWithPrices].sort((a, b) => b.price - a.price);
    
    // Map entity ID to rank (will be same as current rank since all prices start at 100)
    const mockRanks: Record<number, number> = {};
    sorted.forEach((entity, index) => {
      mockRanks[entity.id] = index + 1;
    });
    
    return mockRanks;
  };

  // Get top 5 entities for a category (ranked by price)
  const getTopEntitiesForCategory = (category: string) => {
    const filteredEntities = getEntitiesByCategory(category);
    
    const mappedEntities = filteredEntities.map((entity) => {
      const currentPrice = getEntityPrice(entity.id);
      // Calculate change from BASE_PRICE (100) - all entities start at 100
      const change24h = currentPrice - BASE_PRICE;
      const changePercent24h = (change24h / BASE_PRICE) * 100;
      return {
        id: entity.id,
        name: entity.name,
        currentPrice,
        change24h,
        changePercent24h,
        category: entity.category,
      };
    });
    
    // Sort by price (descending) - highest price = rank #1
    const sorted = [...mappedEntities].sort((a, b) => b.currentPrice - a.currentPrice);
    
    // Add rank and position change, return top 5
    // All entities start at price 100 with no movement, so previousRank = currentRank (positionChange = 0)
    return sorted.slice(0, 5).map((entity, index) => {
      const currentRank = index + 1;
      const previousRank = currentRank; // No movement - previous rank equals current rank
      const positionChange = 0; // No movement - all entities start at 100
      
      return {
        ...entity,
        rank: currentRank,
        previousRank,
        positionChange,
      };
    });
  };

  // Get top 3 influencers for comparison chart (updates every minute with top movers)
  const topInfluencers = useMemo(() => {
    const top5 = getTopEntitiesForCategory('Influencers');
    return top5.slice(0, 3);
  }, [entityPrices, getEntityPrice, updateKey]);

  // Multi Entity Chart - Three entities with different colors
  const multiEntityData = useMemo(() => {
    const numPoints = 50;
    
    // Alix Earle - ending at 200
    const alixEarlePrices: number[] = [];
    let alixPrice = 170 + (Math.random() - 0.5) * 20; // Random starting price around 170
    for (let i = 0; i < numPoints; i++) {
      const progress = i / (numPoints - 1);
      const targetPrice = 200;
      // Random walk towards target, with more weight on target as we progress
      alixPrice = alixPrice * (1 - progress * 0.1) + targetPrice * (progress * 0.1) + (Math.random() - 0.5) * 8;
      if (i === numPoints - 1) {
        alixPrice = targetPrice; // Ensure exact ending price
      }
      alixEarlePrices.push(Math.max(150, Math.min(210, alixPrice)));
    }
    
    // Mr Beast - ending at 188.98
    const mrBeastPrices: number[] = [];
    let mrBeastPrice = 160 + (Math.random() - 0.5) * 20; // Random starting price around 160
    for (let i = 0; i < numPoints; i++) {
      const progress = i / (numPoints - 1);
      const targetPrice = 188.98;
      mrBeastPrice = mrBeastPrice * (1 - progress * 0.1) + targetPrice * (progress * 0.1) + (Math.random() - 0.5) * 8;
      if (i === numPoints - 1) {
        mrBeastPrice = targetPrice; // Ensure exact ending price
      }
      mrBeastPrices.push(Math.max(140, Math.min(200, mrBeastPrice)));
    }
    
    // Logan Paul - ending at 186.25
    const loganPaulPrices: number[] = [];
    let loganPrice = 155 + (Math.random() - 0.5) * 20; // Random starting price around 155
    for (let i = 0; i < numPoints; i++) {
      const progress = i / (numPoints - 1);
      const targetPrice = 186.25;
      loganPrice = loganPrice * (1 - progress * 0.1) + targetPrice * (progress * 0.1) + (Math.random() - 0.5) * 8;
      if (i === numPoints - 1) {
        loganPrice = targetPrice; // Ensure exact ending price
      }
      loganPaulPrices.push(Math.max(135, Math.min(195, loganPrice)));
    }
    
    return {
      alixEarle: alixEarlePrices,
      mrBeast: mrBeastPrices,
      loganPaul: loganPaulPrices,
    };
  }, []);

  // Multi Entity Chart dimensions
  const multiEntityChartHeight = 220;
  const multiEntityChartWidth = SCREEN_WIDTH;
  const multiEntityMargin = { top: 50, right: 0, left: 0, bottom: 0 };
  const multiEntityInnerWidth = multiEntityChartWidth - multiEntityMargin.left - multiEntityMargin.right;
  const multiEntityInnerHeight = multiEntityChartHeight - multiEntityMargin.top - multiEntityMargin.bottom;

  // Calculate Y domain for multi entity chart - include all three datasets
  const multiEntityYDomain = useMemo(() => {
    const allPrices = [...multiEntityData.alixEarle, ...multiEntityData.mrBeast, ...multiEntityData.loganPaul];
    if (allPrices.length === 0) {
      const price = 180;
      const padding = price * 0.1;
      return { yMin: price - padding, yMax: price + padding, yRange: padding * 2 };
    }
    const fullDataMin = Math.min(...allPrices);
    const fullDataMax = Math.max(...allPrices);
    const dataRange = fullDataMax - fullDataMin;
    const yMin = fullDataMin - dataRange * 0.1;
    const yMax = fullDataMax + dataRange * 0.1;
    const yRange = yMax - yMin;
    return { yMin, yMax, yRange };
  }, [multiEntityData]);

  // Generate line path helper function
  const generateMultiEntityLinePath = (prices: number[]) => {
    if (prices.length === 0) return '';
    
    const totalPoints = prices.length;
    const pointSpacing = multiEntityInnerWidth / Math.max(1, totalPoints - 1);
    
    const points = prices.map((price, i) => {
      const x = multiEntityMargin.left + (i * pointSpacing);
      const y = multiEntityMargin.top + multiEntityInnerHeight - ((price - multiEntityYDomain.yMin) / multiEntityYDomain.yRange) * multiEntityInnerHeight;
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

  // Generate comparison chart data
  const comparisonChartData = useMemo(() => {
    if (topInfluencers.length < 3) return null;

    const histories = topInfluencers.map(entity => ({
      entity,
      history: generateComparisonPriceHistory(
        entity.id,
        BASE_PRICE, // All entities start at BASE_PRICE (100)
        entity.currentPrice
      ),
    }));

    const minTimestamp = Math.min(...histories.map(h => h.history[0]?.timestamp || Date.now()));
    const alignedHistories = histories.map(({ entity, history }) => {
      const filtered = history.filter(point => point.timestamp >= minTimestamp);
      return { entity, history: filtered };
    });

    const labels: string[] = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = Date.now();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      labels.push(days[date.getDay()]);
    }

    const allDatasets = alignedHistories.map(({ entity, history }) => {
      const data: number[] = [];
      for (let day = 0; day < 7; day++) {
        const targetTime = now - (6 - day) * 24 * 60 * 60 * 1000;
        const closestPoint = history.reduce((prev, curr) => 
          Math.abs(curr.timestamp - targetTime) < Math.abs(prev.timestamp - targetTime) ? curr : prev
        );
        data.push(closestPoint.price);
      }
      // Ensure the last data point is exactly the current price so the line ends at the correct position
      if (data.length > 0) {
        data[data.length - 1] = entity.currentPrice;
      }
      return data;
    });

    const colors = ['#1F2937', '#775a96', '#10B981'];

    return {
      labels: labels.slice(0, 7),
      datasets: allDatasets.map((data, index) => ({
        data,
        color: (opacity = 1) => {
          const color = colors[index] || '#6B7280';
          if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
          }
          return color;
        },
        strokeWidth: 2,
      })),
      entities: topInfluencers,
      colors,
    };
  }, [topInfluencers, getEntityPrice, updateKey]);

  // Handle adding a category to home screen
  const handleAddCategory = (category: string) => {
    if (!addedCategories.includes(category)) {
      setAddedCategories([...addedCategories, category]);
    }
  };

  // Handle removing a category from home screen
  const handleRemoveCategory = async (category: string) => {
    const updated = addedCategories.filter(c => c !== category);
    setAddedCategories(updated);
    // Persist to AsyncStorage
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('addedCategories', JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving added categories:', error);
    }
  };

  // Get top 3 most liked posts of the day (only posts with entityId)
  const topLikedPosts = useMemo(() => {
    const sorted = [...activityFeed]
      .filter(post => post.entityId) // Only posts about entities
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 3);
    return sorted;
  }, [activityFeed]);

  // Get dates from this week (newest to oldest: today to 6 days ago)
  const getDatesThisWeek = () => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i <= 6; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const year = date.getFullYear();
      dates.push(`${month}/${day}/${year}`);
    }
    return dates;
  };

  // Static entity selection for "Discover New Additions" (same as DiscoverNewAdditionsScreen)
  // Same entities are always shown, sorted by date (newest first)
  // Note: updateKey state is declared earlier in the component
  const discoverNewAdditions = useMemo(() => {
    const weekDates = getDatesThisWeek();
    
    // Fixed entity IDs (not random - these stay the same)
    // Get 1 entity from Influencers (IDs 11-20) - using a fixed index
    const influencers = ENTITIES.filter(e => e.id >= 11 && e.id <= 20);
    const fixedInfluencer = influencers[0]; // Always use first one
    
    // Get 1 entity from Music Artists (IDs 21-30) - using a fixed index
    const musicArtists = ENTITIES.filter(e => e.id >= 21 && e.id <= 30);
    const fixedMusicArtist = musicArtists[0]; // Always use first one
    
    // Get 1 entity from Political Figures (IDs 31-39) - using a fixed index
    const politicalFigures = ENTITIES.filter(e => e.category === 'Politics' && e.id >= 31 && e.id <= 39);
    const fixedPolitical = politicalFigures[0]; // Always use first one
    
    // Get 1 more entity from any of these categories - using a fixed index
    const allCandidates = [...influencers, ...musicArtists, ...politicalFigures];
    const fixedFourth = allCandidates[3]; // Always use same one
    
    const entities = [
      fixedInfluencer,
      fixedMusicArtist,
      fixedPolitical,
      fixedFourth,
    ].filter(Boolean); // Remove any undefined values
    
    // Assign dates from this week to each entity (newest dates first)
    const itemsWithDates = entities.map((entity, index) => {
      const currentPrice = getEntityPrice(entity.id);
      // Calculate change from BASE_PRICE (100) - all entities start at 100
      const change24h = currentPrice - BASE_PRICE;
      const changePercent24h = (change24h / BASE_PRICE) * 100;

      return {
        id: entity.id,
        name: entity.name,
        category: entity.category,
      displayCategory: entity.category,
        currentPrice,
        change24h,
        changePercent24h,
      addedDate: weekDates[index], // Assign dates in order (newest first)
      isCategory: false,
      };
    });
    
    // Sort by date (newest first) - this ensures the 5 most recent are at the top
    return itemsWithDates.sort((a, b) => {
      const dateA = new Date(a.addedDate);
      const dateB = new Date(b.addedDate);
      return dateB.getTime() - dateA.getTime();
    });
  }, [getEntityPrice, updateKey]); // Include updateKey to update every minute like top movers

  // Dynamic Top Movers (top 5 by absolute percentage change from BASE_PRICE)
  const topGainers = useMemo(() => {
    // Get all entities with their current prices and calculate percentage changes
    const entitiesWithChanges = ENTITIES.map((entity) => {
      const currentPrice = getEntityPrice(entity.id);
      // Calculate change from BASE_PRICE (100) - all entities start at 100
      const change24h = currentPrice - BASE_PRICE;
      const changePercent24h = (change24h / BASE_PRICE) * 100;

      return {
        id: entity.id,
        name: entity.name,
        category: entity.category,
        displayCategory: entity.category,
        currentPrice,
        change24h,
        changePercent24h,
        // Calculate rank within category
        rank: 1, // Will be calculated if needed
        previousRank: 1,
        positionChange: 0,
      };
    });
    
    // Filter out entities with no movement (0% change) if desired, or keep all
    // Sort by absolute percentage change (descending) - largest moves first
    const sortedByMovement = [...entitiesWithChanges]
      .filter(entity => Math.abs(entity.changePercent24h) > 0) // Only entities with movement
      .sort((a, b) => Math.abs(b.changePercent24h) - Math.abs(a.changePercent24h));
      
    // Return top 5 movers
    return sortedByMovement.slice(0, 5).map((entity, index) => ({
      ...entity,
      rank: index + 1, // Rank in top movers list
    }));
  }, [entityPrices, getEntityPrice, updateKey]); // Include updateKey to force refresh

  // Mock spotlight items - can be ads, entities, users, or events
  const spotlights = useMemo(() => [
    {
      id: '1',
      type: 'ad' as const,
      title: 'bonus',
      imageSource: require('../../assets/spotlight1.png'),
      backgroundColor: '#000000',
      textColor: '#F5F5DC',
      subtitle: '',
      entityId: null,
      onPress: () => {
        // Handle ad click
      },
    },
    {
      id: '2',
      type: 'entity' as const,
      title: 'Elon Musk',
      imageSource: require('../../assets/spotlight2.png'),
      backgroundColor: '#E5E5E5',
      textColor: '#1E3A8A',
      subtitle: '',
      entityId: null,
      icon: '🍎',
      onPress: () => {
        // Handle entity click - could navigate to entity detail
      },
    },
    {
      id: '3',
      type: 'entity' as const,
      title: 'moro & X',
      imageSource: require('../../assets/spotlight3.png'),
      backgroundColor: '#1E3A8A',
      textColor: '#FFFFFF',
      subtitle: '',
      entityId: null,
      onPress: () => {
        // Handle entity click
      },
    },
  ], []);

  // Spotlight auto-rotation state (isolated to spotlights only)
  const [currentSpotlightIndex, setCurrentSpotlightIndex] = useState(0);
  const spotlightFadeAnim = useRef(new Animated.Value(1)).current;

  // Auto-rotate spotlights with fade animation (isolated effect)
  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      Animated.timing(spotlightFadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // Change spotlight after fade out
        setCurrentSpotlightIndex((prev) => (prev + 1) % spotlights.length);
        // Fade in
        Animated.timing(spotlightFadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, [spotlights.length, spotlightFadeAnim]);


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setSideMenuVisible(true)}
          >
            <Ionicons name="menu" size={24} color={theme.text} />
          </TouchableOpacity>
          
          <View style={styles.moroContainer}>
            <Image 
              source={require('../../assets/moro-logo.png')} 
              style={styles.moroLogo}
              resizeMode="contain"
            />
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setReferralModalVisible(true)}
          >
            <Ionicons name="gift-outline" size={24} color={theme.text} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              navigation.navigate('Notifications');
            }}
          >
            <Ionicons name="notifications-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Selector */}
      <View style={[styles.categorySelectorContainer, { backgroundColor: theme.card, borderBottomColor: theme.border, borderTopWidth: 0 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categorySelector}
          contentContainerStyle={styles.categorySelectorContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={styles.categoryButton}
              onPress={() => {
                if (category === 'For You') {
                  // Keep "For You" on the home page
                  setSelectedCategory(category);
                } else {
                  // Navigate to the Category screen for other categories
                  navigation.navigate('Category', { categoryId: category });
                }
              }}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  {
                    color: selectedCategory === category ? theme.text : theme.textSecondary,
                    fontWeight: selectedCategory === category ? '600' : '400',
                  }
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >

        {/* Swipeable Section with 5 Pages */}
        <View style={[styles.section, { backgroundColor: 'transparent', borderBottomColor: theme.backgroundSecondary, paddingHorizontal: 0, paddingVertical: 0 }]}>
          <ScrollView
            ref={swipeableScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleSwipeableScroll}
            onMomentumScrollEnd={handleSwipeableScrollEnd}
            scrollEventThrottle={16}
            style={styles.swipeableScrollView}
            contentContainerStyle={styles.swipeableScrollContent}
          >
            {/* Duplicate of page 6 at the start for circular scrolling */}
            <View key="duplicate-6" style={[styles.swipeablePage, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.swipeablePageContent}>
                <Text style={[styles.swipeablePageLabel, { color: theme.textSecondary }]}>
                  Page 6
                </Text>
                <Text style={[styles.swipeablePageMessage, { color: theme.text }]}>
                  Page 6 coming soon
                </Text>
              </View>
            </View>
            
            {/* Real pages 1-6 */}
            {Array.from({ length: TOTAL_PAGES }, (_, index) => {
              // Page 1: Multi entity chart for top 3 influencers
              if (index === 0) {
                return (
                  <View key={index} style={[styles.swipeablePage, { backgroundColor: theme.backgroundSecondary }]}>
                    <View style={styles.comparisonChartContainer}>
                      {/* Header */}
                      <View style={styles.comparisonChartHeaderRow}>
                      <Text style={[styles.comparisonChartHeader, { color: theme.text }]}>
                        People on Moro - Top 3
                      </Text>
                        <TouchableOpacity
                          onPress={() => navigation.navigate('Category', { categoryId: 'People' })}
                          style={styles.headerArrowButton}
                        >
                          <Ionicons name="chevron-forward" size={20} color={theme.text} />
                        </TouchableOpacity>
                      </View>
                      
                      {/* Legend/Key showing entities horizontally */}
                      <View style={styles.chartLegend}>
                        <View style={styles.legendItem}>
                          <View
                            style={[
                              styles.legendColorDot,
                              { backgroundColor: '#EC4899' },
                            ]}
                          />
                          <View style={styles.legendText}>
                            <Text style={[styles.legendName, { color: theme.text }]}>
                              Timothée{'\n'}Chalamet
                            </Text>
                            <Text
                              style={[
                                styles.legendPrice,
                                { color: '#EC4899' },
                              ]}
                            >
                              {formatCurrency(200)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.legendItem}>
                          <View
                            style={[
                              styles.legendColorDot,
                              { backgroundColor: '#775a96' },
                            ]}
                          />
                          <View style={styles.legendText}>
                            <Text style={[styles.legendName, { color: theme.text }]}>
                              Tom{'\n'}Brady
                            </Text>
                            <Text
                              style={[
                                styles.legendPrice,
                                { color: '#775a96' },
                              ]}
                            >
                              {formatCurrency(188.98)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.legendItem}>
                          <View
                            style={[
                              styles.legendColorDot,
                              { backgroundColor: '#10B981' },
                            ]}
                          />
                          <View style={styles.legendText}>
                            <Text style={[styles.legendName, { color: theme.text }]}>
                              Donald{'\n'}Trump
                            </Text>
                            <Text
                              style={[
                                styles.legendPrice,
                                { color: '#10B981' },
                              ]}
                            >
                              {formatCurrency(186.25)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      
                      {/* Chart - Multi Entity SVG Chart */}
                      <View style={styles.chartWithOverlay}>
                        <Svg width={multiEntityChartWidth} height={multiEntityChartHeight}>
                          {/* Horizontal line at bottom edge */}
                          <Line
                            x1={0}
                            y1={multiEntityMargin.top + multiEntityInnerHeight}
                            x2={multiEntityChartWidth}
                            y2={multiEntityMargin.top + multiEntityInnerHeight}
                            stroke="#000000"
                            strokeWidth="1"
                          />
                          
                          {/* Alix Earle line - Pink color */}
                          {multiEntityData.alixEarle.length > 1 && (
                            <Path
                              d={generateMultiEntityLinePath(multiEntityData.alixEarle)}
                              stroke="#EC4899"
                              strokeWidth="2"
                              fill="none"
                            />
                          )}
                          
                          {/* Mr Beast line - Blue color */}
                          {multiEntityData.mrBeast.length > 1 && (
                            <Path
                              d={generateMultiEntityLinePath(multiEntityData.mrBeast)}
                              stroke="#775a96"
                              strokeWidth="2"
                              fill="none"
                            />
                          )}
                          
                          {/* Logan Paul line - Green color */}
                          {multiEntityData.loganPaul.length > 1 && (
                            <Path
                              d={generateMultiEntityLinePath(multiEntityData.loganPaul)}
                              stroke="#10B981"
                              strokeWidth="2"
                              fill="none"
                            />
                          )}
                        </Svg>
                      </View>
                      
                      {/* Date labels under x-axis */}
                      <View style={styles.xAxisDateLabels}>
                        {(() => {
                          // Get dates for recent week (ending on 1/20)
                          const dates: string[] = [];
                          const endDate = new Date(2025, 0, 20); // January 20, 2025
                          for (let i = 6; i >= 0; i--) {
                            const date = new Date(endDate);
                            date.setDate(date.getDate() - i);
                            const month = (date.getMonth() + 1).toString().padStart(2, '0');
                            const day = date.getDate().toString().padStart(2, '0');
                            dates.push(`${month}/${day}`);
                          }
                          return dates.map((date, index) => {
                            const chartWidth = SCREEN_WIDTH;
                            const plotWidth = chartWidth; // Full width
                            // Keep 1/14 at left (index 0) and 1/20 at right (index 6)
                            // Evenly space the 5 dates in between (indices 1-5)
                            // We need 6 gaps total: between 1/14-1/15, 1/15-1/16, ..., 1/19-1/20
                            let xPosition: number;
                            if (index === 0) {
                              // 1/14: keep at left edge
                              xPosition = 0;
                            } else if (index === dates.length - 1) {
                              // 1/20: keep at right edge with offset for text width
                              xPosition = plotWidth - 35;
                            } else {
                              // 1/15-1/19: evenly space between left and right positions
                              const rightEdge = plotWidth - 35;
                              const spacing = rightEdge / 6; // 6 gaps for 7 dates
                              xPosition = spacing * index;
                            }
                            
                            return (
                              <Text
                                key={date}
                                style={[
                                  styles.xAxisDateLabel,
                                  { 
                                    color: theme.textSecondary,
                                    left: xPosition,
                                    transform: [{ translateX: 0 }], // Override the default centering transform
                                  },
                                ]}
                              >
                                {date}
                              </Text>
                            );
                          });
                        })()}
                      </View>
                    </View>
                  </View>
                );
              }
              
              // Page 2: Top Movers (top 5 by absolute percentage change)
              if (index === 1) {
                const getInitials = (name: string) => {
                  return name.substring(0, 2).toUpperCase();
                };
                
                return (
                  <View key={index} style={[styles.swipeablePage, { backgroundColor: theme.backgroundSecondary }]}>
                    <View style={styles.topMoversContainer}>
                      <Text style={[styles.topMoversHeader, { color: theme.text }]}>
                        Today's Top Movers
                      </Text>
                      <ScrollView
                        style={styles.topMoversScroll}
                        contentContainerStyle={styles.topMoversScrollContent}
                        showsVerticalScrollIndicator={false}
                      >
                        {topGainers.map((entity, entityIndex) => (
                          <TouchableOpacity
                            key={entity.id}
                            style={[styles.discoverCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                            onPress={() => handleHoldingPress(entity.id, entity.category)}
                          >
                            <View style={styles.discoverCardLeft}>
                              <View style={[styles.discoverIcon, { backgroundColor: theme.primaryLight }]}>
                                <Text style={[styles.discoverIconText, { color: theme.primary }]}>
                                  {getInitials(entity.name)}
                                </Text>
                              </View>
                              <View style={styles.discoverInfo}>
                                <Text style={[styles.discoverName, { color: theme.text }]}>
                                  {entity.name}
                                </Text>
                                <Text style={[styles.discoverCategory, { color: theme.textSecondary }]}>
                                  {entity.category}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.discoverCardRight}>
                              <Text style={[styles.discoverPrice, { color: theme.text }]}>
                                {formatCurrency(entity.currentPrice)}
                              </Text>
                              <Text style={[styles.discoverChange, { color: getChangeColor(entity.change24h) }]}>
                                {entity.change24h >= 0 ? '+' : ''}
                                {entity.changePercent24h.toFixed(2)}%
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                );
              }
              
              // Page 3: Featured IMO
              if (index === 2) {
                const abridgeEntity = getEntityById(42); // Abridge entity ID
                const handleAbridgePress = () => {
                  if (abridgeEntity) {
                    navigation.navigate('Entity', { 
                      entityId: abridgeEntity.id, 
                      categoryId: abridgeEntity.category 
                    });
                  }
                };
                
                const renderTextWithMentions = (text: string) => {
                  const parts: React.ReactNode[] = [];
                  let lastIndex = 0;
                  const mentionRegex = /@([\p{L}\p{N}.'-]+)/gu;
                  let match;
                  
                  while ((match = mentionRegex.exec(text)) !== null) {
                    const startIndex = match.index;
                    const mention = match[0];
                    
                    // Add text before the mention
                    if (startIndex > lastIndex) {
                      const textBefore = text.substring(lastIndex, startIndex);
                      parts.push(
                        <Text key={`text-${lastIndex}`} style={[styles.imoText, { color: theme.text }]}>
                          {textBefore}
                        </Text>
                      );
                    }
                    
                    // Add the mention (blue and clickable)
                    parts.push(
                      <Text
                        key={`mention-${startIndex}`}
                        style={[styles.imoText, styles.imoMention, { color: theme.primary }]}
                        onPress={handleAbridgePress}
                      >
                        {mention}
                      </Text>
                    );
                    
                    lastIndex = startIndex + mention.length;
                  }
                  
                  // Add any remaining text after the last mention
                  if (lastIndex < text.length) {
                    const textAfter = text.substring(lastIndex);
                    if (textAfter) {
                      parts.push(
                        <Text key={`text-${lastIndex}`} style={[styles.imoText, { color: theme.text }]}>
                          {textAfter}
                        </Text>
                      );
                    }
                  }
                  
                  return <Text style={{ fontSize: 15, lineHeight: 22 }}>{parts}</Text>;
                };
                
                return (
                  <View key={index} style={[styles.swipeablePage, { backgroundColor: theme.backgroundSecondary }]}>
                    <View style={styles.imoContainer}>
                      {/* Header with badge-style tag */}
                      <View style={styles.imoHeader}>
                        <Text style={[styles.imoHeaderText, { color: theme.text }]}>
                          Featured IMO
                        </Text>
                        <TouchableOpacity 
                          onPress={handleAbridgePress}
                          style={[styles.imoTagButton, { backgroundColor: theme.primaryLight }]}
                        >
                          <Text style={[styles.imoTag, { color: theme.primary }]}>
                            @Abridge
                          </Text>
                        </TouchableOpacity>
                      </View>
                      
                      {/* Content card */}
                      <View style={[styles.imoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={styles.imoContent}>
                          <Text style={[styles.imoWelcomeText, { color: theme.text }]}>
                            We would like to welcome Abridge onto Moro and are excited to see what the public's opinion is!
                          </Text>
                          
                          <View style={styles.imoDivider} />
                          
                          <View style={styles.imoTextContainer}>
                            {renderTextWithMentions('To be a part of the "Initial Moro Offering", click the tag and decide if you feel positively or negatively about @Abridge.')}
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              }
              
              // Page 4: Most Liked Posts
              if (index === 3) {
                const formatTimestamp = (timestamp: string) => {
                  const now = new Date();
                  const postDate = new Date(timestamp);
                  const diffMs = now.getTime() - postDate.getTime();
                  const diffMins = Math.floor(diffMs / 60000);
                  const diffHours = Math.floor(diffMs / 3600000);
                  const diffDays = Math.floor(diffMs / 86400000);

                  if (diffMins < 1) return 'Just now';
                  if (diffMins < 60) return `${diffMins}m ago`;
                  if (diffHours < 24) return `${diffHours}h ago`;
                  if (diffDays < 7) return `${diffDays}d ago`;
                  
                  return postDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                };

                const handlePostPress = (post: any) => {
                  if (post.entityId) {
                    // Map entity category to categoryId format
                    const entity = getEntityById(post.entityId);
                    let categoryId = 'Influencers';
                    
                    if (entity) {
                      // Category is already in the correct format (no mapping needed)
                      categoryId = entity.category;
                    }
                    
                    navigation.navigate('Entity', {
                      entityId: post.entityId,
                      categoryId: categoryId,
                    });
                  }
                };

                return (
                  <View key={index} style={[styles.swipeablePage, { backgroundColor: theme.backgroundSecondary }]}>
                    <View style={styles.mostLikedContainer}>
                      <Text style={[styles.mostLikedHeader, { color: theme.text }]}>
                        Most Liked Today
                      </Text>
                      <ScrollView
                        style={styles.mostLikedScroll}
                        showsVerticalScrollIndicator={false}
                      >
                        {topLikedPosts.map((post, postIndex) => (
                          <TouchableOpacity
                            key={post.id}
                            style={[styles.mostLikedCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                            onPress={() => handlePostPress(post)}
                          >
                            <View style={styles.mostLikedCardHeader}>
                              <View style={styles.mostLikedUserInfo}>
                                <View style={[styles.mostLikedAvatar, { backgroundColor: theme.primaryLight }]}>
                                  <Text style={[styles.mostLikedAvatarText, { color: theme.primary }]}>
                                    {post.displayName.substring(0, 2).toUpperCase()}
                                  </Text>
                                </View>
                                <View style={styles.mostLikedUserText}>
                                  <Text style={[styles.mostLikedUsername, { color: theme.text }]}>
                                    {post.displayName}
                                  </Text>
                                  <Text style={[styles.mostLikedTimestamp, { color: theme.textSecondary }]}>
                                    {formatTimestamp(post.timestamp)}
                                  </Text>
                                </View>
                              </View>
                              {post.entityName && (
                                <Text style={[styles.mostLikedEntityTag, { color: theme.primary }]}>
                                  @{post.entityName.replace(/\s+/g, '')}
                                </Text>
                              )}
                            </View>
                            <Text 
                              style={[styles.mostLikedContent, { color: theme.text }]}
                              numberOfLines={3}
                            >
                              {post.content}
                            </Text>
                            <View style={styles.mostLikedStats}>
                              <View style={styles.mostLikedStat}>
                                <Ionicons name="heart" size={16} color={theme.textSecondary} />
                                <Text style={[styles.mostLikedStatText, { color: theme.textSecondary }]}>
                                  {post.likes}
                                </Text>
                              </View>
                              <View style={styles.mostLikedStat}>
                                <Ionicons name="chatbubble-outline" size={16} color={theme.textSecondary} />
                                <Text style={[styles.mostLikedStatText, { color: theme.textSecondary }]}>
                                  {post.comments}
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                );
              }
              
              // Page 5: Discover New Additions
              if (index === 4) {
                const handleEntityPress = (entityId: number, category: string) => {
                  navigation.navigate('Entity', {
                    entityId,
                    categoryId: category,
                  });
                };

                const handleCategoryPress = (categoryId: string) => {
                  navigation.navigate('Category', {
                    categoryId,
                  });
                };

                return (
                  <View key={index} style={[styles.swipeablePage, { backgroundColor: theme.backgroundSecondary }]}>
                    <View style={styles.discoverContainer}>
                      <View style={styles.discoverHeader}>
                        <Text style={[styles.discoverHeaderText, { color: theme.text }]}>
                          Discover New Additions
                        </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('DiscoverNewAdditions')}>
                          <Text style={[styles.seeMoreText, { color: theme.primary }]}>
                            See More
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <ScrollView
                        style={styles.discoverScroll}
                        contentContainerStyle={styles.discoverScrollContent}
                        showsVerticalScrollIndicator={false}
                      >
                        {/* Show 5 most recent items (top 5) */}
                        {discoverNewAdditions.map((item) => (
                          <TouchableOpacity
                            key={item.id}
                            style={[styles.discoverCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                            onPress={() => handleEntityPress(item.id, item.category)}
                          >
                            <View style={styles.discoverCardLeft}>
                              <View style={[styles.discoverIcon, { backgroundColor: theme.primaryLight }]}>
                                <Text style={[styles.discoverIconText, { color: theme.primary }]}>
                                  {item.name.substring(0, 2).toUpperCase()}
                                </Text>
                              </View>
                              <View style={styles.discoverInfo}>
                                <Text style={[styles.discoverName, { color: theme.text }]}>
                                  {item.name}
                                </Text>
                                <Text style={[styles.discoverCategory, { color: theme.textSecondary }]}>
                                  {item.category}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.discoverCardRight}>
                              <Text style={[styles.discoverPrice, { color: theme.text }]}>
                                {formatCurrency(item.currentPrice)}
                              </Text>
                              <Text style={[styles.discoverChange, { color: getChangeColor(item.change24h) }]}>
                                {item.change24h >= 0 ? '+' : ''}
                                {item.changePercent24h.toFixed(2)}%
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                );
              }
              
              // Page 6: Top 2 Biggest Trades Today
              if (index === 5) {
                // Fake trade data
                const topTrades = [
                  {
                    id: 1,
                    userName: 'Alex Morgan',
                    userInitials: 'AM',
                    entityName: 'Alix Earle',
                    category: 'Influencers',
                    amount: 15420.50,
                    isPositive: true,
                  },
                  {
                    id: 2,
                    userName: 'Jordan Smith',
                    userInitials: 'JS',
                    entityName: 'Joe Biden',
                    category: 'Political Figures',
                    amount: 12350.75,
                    isPositive: false,
                  },
                ];

                return (
                  <View key={index} style={[styles.swipeablePage, { backgroundColor: theme.backgroundSecondary }]}>
                    <View style={styles.topTradesContainer}>
                      <Text style={[styles.topTradesHeader, { color: theme.text }]}>
                        Top 2 Biggest Trades Today
                      </Text>
                      <ScrollView
                        style={styles.topTradesScroll}
                        contentContainerStyle={styles.topTradesScrollContent}
                        showsVerticalScrollIndicator={false}
                      >
                        {topTrades.map((trade) => (
                          <View
                            key={trade.id}
                            style={[styles.topTradeCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                          >
                            <View style={styles.topTradeCardTop}>
                              {/* Left: User */}
                              <View style={styles.topTradeUserInfo}>
                                <View style={[styles.topTradeAvatar, { backgroundColor: theme.primaryLight }]}>
                                  <Text style={[styles.topTradeAvatarText, { color: theme.primary }]}>
                                    {trade.userInitials}
                                  </Text>
                                </View>
                                <Text style={[styles.topTradeUserName, { color: theme.text }]}>
                                  {trade.userName}
                                </Text>
                              </View>
                              
                              {/* Right: Entity and Category */}
                              <View style={styles.topTradeEntityInfo}>
                                <Text style={[styles.topTradeEntityName, { color: theme.text }]}>
                                  {trade.entityName}
                                </Text>
                                <Text style={[styles.topTradeCategory, { color: theme.textSecondary }]}>
                                  {trade.category}
                                </Text>
                              </View>
                            </View>
                            
                            {/* Bottom: Amount and Positive/Negative */}
                            <View style={[styles.topTradeCardBottom, { borderTopColor: theme.border }]}>
                              <Text style={[styles.topTradeAmount, { color: theme.text }]}>
                                {formatCurrency(trade.amount)}
                              </Text>
                              <Text
                                style={[
                                  styles.topTradeStatus,
                                  { color: trade.isPositive ? '#10B981' : '#EF4444' },
                                ]}
                              >
                                {trade.isPositive ? 'Positive' : 'Negative'}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                );
              }
              
              // Other pages: placeholder
              return (
                <View key={index} style={[styles.swipeablePage, { backgroundColor: theme.backgroundSecondary }]}>
                  <View style={styles.swipeablePageContent}>
                    <Text style={[styles.swipeablePageLabel, { color: theme.textSecondary }]}>
                      Page {index + 1}
                    </Text>
                    <Text style={[styles.swipeablePageMessage, { color: theme.text }]}>
                      Content coming soon
                    </Text>
                  </View>
                </View>
              );
            })}
            
            {/* Duplicate of page 6 at the end for circular scrolling */}
            <View key="duplicate-6-end" style={[styles.swipeablePage, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.swipeablePageContent}>
                <Text style={[styles.swipeablePageLabel, { color: theme.textSecondary }]}>
                  Page 6
                </Text>
                <Text style={[styles.swipeablePageMessage, { color: theme.text }]}>
                  Page 6 coming soon
                </Text>
              </View>
            </View>
          </ScrollView>
          
          {/* Page Indicator Dots */}
          <View style={[styles.pageIndicatorContainer, { backgroundColor: theme.backgroundSecondary }]}>
            {Array.from({ length: TOTAL_PAGES }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.pageIndicatorDot,
                  {
                    backgroundColor: currentPageIndex === index ? theme.primary : theme.border,
                    width: currentPageIndex === index ? 8 : 6,
                    height: currentPageIndex === index ? 8 : 6,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Spotlights Section */}
        <View style={[styles.section, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Spotlights</Text>
          <View style={styles.spotlightsContainer}>
            <Animated.View
              style={[
                styles.spotlightCardContainer,
                {
                  opacity: spotlightFadeAnim,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.spotlightCard}
                onPress={spotlights[currentSpotlightIndex].onPress}
              >
                {spotlights[currentSpotlightIndex].imageSource ? (
                  <Image
                    source={spotlights[currentSpotlightIndex].imageSource}
                    style={styles.spotlightImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View
                    style={[
                      styles.spotlightCardContent,
                      {
                        backgroundColor: spotlights[currentSpotlightIndex].backgroundColor,
                      },
                    ]}
                  >
                    {spotlights[currentSpotlightIndex].icon && (
                      <Text style={styles.spotlightIcon}>{spotlights[currentSpotlightIndex].icon}</Text>
                    )}
                    <Text
                      style={[
                        styles.spotlightCardTitle,
                        {
                          color: spotlights[currentSpotlightIndex].textColor,
                        },
                      ]}
                    >
                      {spotlights[currentSpotlightIndex].title}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        {/* Watchlist Section */}
        <View style={[styles.section, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Watchlist</Text>
            <TouchableOpacity onPress={() => {
              // Navigate to Watchlist tab
              navigation.navigate('Watchlist');
            }}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {watchlist.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No watchlist items yet</Text>
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                Add entities to your watchlist to track them
              </Text>
            </View>
          ) : (
            <>
              {watchlist.slice(0, 5).map((item) => {
                return (
                  <TouchableOpacity
                    key={item.entityId}
                    style={[styles.watchlistCard, { borderBottomColor: theme.borderLight }]}
                    onPress={() => handleHoldingPress(item.entityId, item.category)}
                  >
                    <View style={styles.watchlistLeft}>
                      <View style={[styles.watchlistIcon, { backgroundColor: theme.primaryLight }]}>
                        <Text style={[styles.watchlistIconText, { color: theme.primary }]}>
                          {item.entityName.substring(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.watchlistInfo}>
                        <Text style={[styles.watchlistName, { color: theme.text }]}>{item.entityName}</Text>
                        <Text style={[styles.watchlistCategory, { color: theme.textSecondary }]}>
                          {item.category}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.watchlistRight}>
                      <Text style={[styles.watchlistPrice, { color: theme.text }]}>
                        {formatCurrency(item.currentPrice)}
                      </Text>
                      <Text style={[styles.watchlistChange, { color: getChangeColor(item.change24h) }]}>
                        {item.change24h >= 0 ? '+' : ''}
                        {item.changePercent24h.toFixed(2)}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </View>

        {/* Open Positions Section */}
        <View style={[styles.section, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Open Positions</Text>
            <TouchableOpacity onPress={() => {
              // Navigate to Portfolio tab
              navigation.navigate('Portfolio');
            }}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {openPositions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No open positions</Text>
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                Start trading to see your positions here
              </Text>
            </View>
          ) : (
            <>
              {openPositions.slice(0, 5).map((position) => {
                return (
                  <TouchableOpacity
                    key={position.entityId}
                    style={[styles.watchlistCard, { borderBottomColor: theme.borderLight }]}
                    onPress={() => handleHoldingPress(position.entityId, position.category)}
                  >
                    <View style={styles.watchlistLeft}>
                      <View style={[styles.watchlistIcon, { backgroundColor: theme.primaryLight }]}>
                        <Text style={[styles.watchlistIconText, { color: theme.primary }]}>
                          {position.entityName.substring(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.watchlistInfo}>
                        <Text style={[styles.watchlistName, { color: theme.text }]}>{position.entityName}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.watchlistRight}>
                      <Text style={[styles.watchlistPrice, { color: theme.text }]}>
                        {formatCurrency(position.currentPrice)}
                      </Text>
                      <Text style={[styles.watchlistChange, { color: getChangeColor(position.pnl) }]}>
                        {position.pnl >= 0 ? '+' : ''}
                        {formatCurrency(position.pnl)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </View>

        {/* Added Category Modules */}
        {addedCategories.map((category) => {
          const topEntities = getTopEntitiesForCategory(category);
          return (
            <View key={category} style={[styles.section, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{category}</Text>
                <TouchableOpacity onPress={() => handleRemoveCategory(category)}>
                  <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              {topEntities.map((entity) => {
                const livePrice = getEntityPrice(entity.id);
                // Calculate change from BASE_PRICE (100) - all entities start at 100
                const liveChange = livePrice - BASE_PRICE;
                const liveChangePercent = (liveChange / BASE_PRICE) * 100;
                
                // Get initials from name (first 2 letters)
                const getInitials = (name: string) => {
                  return name.substring(0, 2).toUpperCase();
                };

                return (
                  <TouchableOpacity
                    key={entity.id}
                    style={[styles.miniCard, { backgroundColor: theme.backgroundSecondary }]}
                    onPress={() => {
                      // Use entity's actual category (subcategory) for navigation, not the People category
                      navigation.navigate('Entity', { entityId: entity.id, categoryId: entity.category });
                    }}
                  >
                    <View style={styles.rankContainer}>
                      <Text style={[styles.categoryRankNumber, { color: theme.textSecondary }]}>{entity.rank}</Text>
                      {entity.positionChange !== 0 && (
                        <View style={styles.positionChangeContainer}>
                          {entity.positionChange > 0 ? (
                            <View style={styles.positionChangeUp}>
                              <Ionicons name="arrow-up" size={10} color="#10B981" />
                              <Text style={styles.positionChangeTextUp}>{entity.positionChange}</Text>
                            </View>
                          ) : (
                            <View style={styles.positionChangeDown}>
                              <Ionicons name="arrow-down" size={10} color="#EF4444" />
                              <Text style={styles.positionChangeTextDown}>{Math.abs(entity.positionChange)}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                    <View style={styles.miniCardLeft}>
                      <View style={[styles.miniIcon, { backgroundColor: theme.primaryLight }]}>
                        <Text style={[styles.miniIconText, { color: theme.primary }]}>
                          {getInitials(entity.name)}
                        </Text>
                      </View>
                      <View style={styles.miniNameContainer}>
                        <Text style={[styles.miniName, { color: theme.text }]}>{entity.name}</Text>
                        <Text style={[styles.miniCategory, { color: theme.textSecondary }]}>
                          {(category === 'People' || category === 'Teams') ? entity.category : category}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.miniCardRight}>
                      <Text style={[styles.miniPrice, { color: theme.text }]}>{formatCurrency(livePrice)}</Text>
                      <Text style={[styles.miniChange, { color: getChangeColor(liveChange) }]}>
                        {liveChangePercent >= 0 ? '+' : ''}{liveChangePercent.toFixed(2)}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        {/* Customize Section */}
        <View style={[styles.section, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Customize Your Home Screen</Text>
          <View style={styles.widgetIconsContainer}>
            {customizableCategories.map((category) => {
              const isAdded = addedCategories.includes(category);
              return (
                <TouchableOpacity
                  key={category}
                  style={styles.widgetItem}
                  onPress={() => {
                    if (isAdded) {
                      handleRemoveCategory(category);
                    } else {
                      handleAddCategory(category);
                    }
                  }}
                  disabled={isAdded}
                >
                  <View style={[styles.widgetIcon, { borderColor: isAdded ? theme.textTertiary : theme.primary, opacity: isAdded ? 0.5 : 1 }]}>
                    {renderCategoryIcon(category, isAdded ? theme.textTertiary : theme.primary)}
                  </View>
                  <Text style={[styles.widgetLabel, { color: isAdded ? theme.textTertiary : theme.text }]}>
                    {isAdded ? '✓ Added' : `+ ${category}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Bottom Padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Trade Modal */}
      {selectedEntity && (
        <TradeModal
          visible={tradeModalVisible}
          onClose={() => {
            setTradeModalVisible(false);
            setSelectedEntity(null);
          }}
          entityId={selectedEntity.id}
          entityName={selectedEntity.name}
          category={selectedEntity.category}
        />
      )}

      {/* Referral Modal */}
      <Modal
        visible={referralModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setReferralModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.referralModal, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setReferralModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            
            <Text style={[styles.referralModalTitle, { color: theme.text }]}>
              Refer Friends
            </Text>
            
            <Text style={[styles.referralModalText, { color: theme.textSecondary }]}>
              Send the link to 2 friends and receive
            </Text>
            
            <Text style={[styles.referralTokenAmount, { color: theme.text }]}>
              50 {TOKEN_SYMBOL}
            </Text>
            
            <TouchableOpacity
              style={[styles.referralShareButton, { backgroundColor: theme.primary }]}
              onPress={async () => {
                try {
                  const shareMessage = `Join me on Moro! 🚀\n\nMoro is the social platform where you can trade, predict, and connect with others around the things you care about.\n\nCreate your account and start building your community today!\n\nDownload Moro now!`;
                  
                  await Share.share({
                    message: shareMessage,
                    title: 'Invite a Friend to Moro',
                  });
                } catch (error) {
                  console.error('Error sharing:', error);
                }
              }}
            >
              <Ionicons name="share-outline" size={20} color="#FFFFFF" />
              <Text style={styles.referralShareButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Side Menu */}
      <SideMenu />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10, // Ensure menu button is above the logo image
  },
  moroContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  moroText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 28,
  },
  moroLogo: {
    position: 'absolute',
    top: -36, // Adjust to center vertically on text
    left: -60, // Adjust to align with text start
    width: 200,
    height: 65,
    zIndex: 1,
  },
  categorySelectorContainer: {
    borderBottomWidth: 1,
    borderTopWidth: 0,
    paddingTop: 4,
    paddingBottom: 4,
  },
  categorySelector: {
    maxHeight: 20,
  },
  categorySelectorContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 0,
    alignItems: 'flex-end',
  },
  categoryButton: {
    marginRight: 18,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryButtonText: {
    fontSize: 15,
    lineHeight: 18,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 8,
    borderBottomColor: '#F9FAFB',
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  section: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#F9FAFB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  spotlightsContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotlightCardContainer: {
    width: SCREEN_WIDTH - 32, // Full width minus padding
  },
  spotlightCard: {
    width: SCREEN_WIDTH - 32, // Full width minus padding
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  spotlightImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
  },
  spotlightCardContent: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    justifyContent: 'center',
  },
  spotlightIcon: {
    fontSize: 24,
  },
  spotlightCardTitle: {
    fontSize: 18,
    fontWeight: '400',
    fontStyle: 'italic',
    // For a cursive look, you may want to use a custom font
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#775a96',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  holdingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  holdingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  holdingIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  holdingIconText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#775a96',
  },
  holdingInfo: {
    flex: 1,
  },
  holdingTicker: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  holdingQuantity: {
    fontSize: 13,
    color: '#6B7280',
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  holdingChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  holdingChange: {
    fontSize: 13,
    fontWeight: '600',
  },
  holdingChangePercent: {
    fontSize: 13,
    fontWeight: '600',
  },
  miniCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: 50,
    marginRight: 12,
    position: 'relative',
  },
  categoryRankNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  trendingRankNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  positionChangeContainer: {
    position: 'absolute',
    top: -2,
    left: 18,
    alignItems: 'flex-start',
  },
  positionChangeUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  positionChangeDown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  positionChangeTextUp: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
    lineHeight: 10,
  },
  positionChangeTextDown: {
    fontSize: 9,
    fontWeight: '700',
    color: '#EF4444',
    lineHeight: 10,
  },
  miniCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  miniIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  miniIconText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  miniNameContainer: {
    flex: 1,
  },
  miniName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  miniCategory: {
    fontSize: 12,
    marginTop: 2,
    color: '#6B7280',
  },
  miniCardRight: {
    alignItems: 'flex-end',
  },
  miniPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  miniChange: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  watchlistCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  watchlistLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  watchlistIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  watchlistIconText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#775a96',
  },
  watchlistInfo: {
    flex: 1,
  },
  watchlistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  watchlistCategory: {
    fontSize: 12,
    marginTop: 2,
    color: '#6B7280',
  },
  watchlistRight: {
    alignItems: 'flex-end',
  },
  watchlistPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  watchlistChange: {
    fontSize: 13,
    fontWeight: '600',
  },
  cashCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  cashLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cashInfo: {
    gap: 4,
  },
  cashLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  cashValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCancelText: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
  },
  selectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  selectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionIconText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#775a96',
  },
  selectionInfo: {
    flex: 1,
  },
  selectionTicker: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  selectionName: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectionRight: {
    alignItems: 'flex-end',
  },
  selectionPrice: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  selectionChange: {
    fontSize: 14,
    fontWeight: '600',
  },
  balanceDisplay: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
  },
  balanceDisplayLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  balanceDisplayValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  modalButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  quickAmountsLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
  },
  quickAmountsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAmountButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  quickAmountText: {
    fontSize: 18,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  widgetIconsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  widgetItem: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 20,
  },
  widgetIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  widgetIconText: {
    fontSize: 14,
    fontWeight: '600',
  },
  widgetLabel: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  trendingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  trendingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankNumber: {
    width: 24,
    marginRight: 12,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: '600',
  },
  trendingIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trendingIconText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  trendingInfo: {
    flex: 1,
  },
  trendingName: {
    fontSize: 16,
    fontWeight: '600',
  },
  trendingCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  trendingRight: {
    alignItems: 'flex-end',
  },
  trendingPrice: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  trendingChange: {
    fontSize: 13,
    fontWeight: '600',
  },
  swipeableScrollView: {
    flex: 1,
  },
  swipeableScrollContent: {
    flexDirection: 'row',
  },
  swipeablePage: {
    width: SCREEN_WIDTH,
    paddingVertical: 0,
    height: 360, // Fixed height - locked
    paddingHorizontal: 0,
    // backgroundColor will be set dynamically using theme
  },
  swipeablePageContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  swipeablePageLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  swipeablePageMessage: {
    fontSize: 16,
  },
  pageIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 12,
    gap: 8,
    // backgroundColor will be set dynamically using theme
  },
  pageIndicatorDot: {
    borderRadius: 4,
  },
  comparisonChartContainer: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 0,
  },
  comparisonChartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  comparisonChartHeader: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerArrowButton: {
    padding: 4,
    marginLeft: 8,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    flexDirection: 'column',
  },
  legendName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  legendPrice: {
    fontSize: 16,
    fontWeight: '600',
  },
  chartWithLabelsWrapper: {
    position: 'relative',
    width: SCREEN_WIDTH,
    height: 220,
    overflow: 'visible',
  },
  chartContainerClipped: {
    width: SCREEN_WIDTH,
    height: 220,
    overflow: 'hidden',
    paddingLeft: 32,
  },
  comparisonChart: {
    marginVertical: 0,
    marginLeft: 0,
  },
  chartWithOverlay: {
    position: 'relative',
    height: 220,
    width: SCREEN_WIDTH,
  },
  customChartSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  yAxisLabelsRight: {
    position: 'absolute',
    right: 16,
    top: 20,
    bottom: 40,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: 80,
  },
  yAxisLabelText: {
    fontSize: 12,
    fontWeight: '400',
  },
  chartEndDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
  xAxisDateLabels: {
    position: 'relative',
    width: SCREEN_WIDTH,
    height: 24,
    marginTop: 2,
    paddingLeft: 0,
    paddingBottom: 16,
  },
  xAxisDateLabel: {
    position: 'absolute',
    fontSize: 11,
    fontWeight: '400',
    transform: [{ translateX: -20 }], // Center the text on its position
  },
  topMoversContainer: {
    flex: 1,
    paddingTop: 12,
  },
  topMoversHeader: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  topMoversScroll: {
    flex: 1,
  },
  topMoversScrollContent: {
    paddingBottom: 12,
  },
  imoContainer: {
    flex: 1,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  imoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  imoHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  imoTagButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  imoTag: {
    fontSize: 15,
    fontWeight: '600',
  },
  imoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imoContent: {
    gap: 20,
  },
  imoWelcomeText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  imoDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  imoTextContainer: {
    marginTop: 4,
  },
  imoText: {
    fontSize: 15,
    lineHeight: 22,
  },
  imoMention: {
    fontWeight: '600',
  },
  mostLikedContainer: {
    flex: 1,
    paddingTop: 12,
  },
  mostLikedHeader: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  mostLikedScroll: {
    flex: 1,
    paddingBottom: 12,
  },
  mostLikedCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  mostLikedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  mostLikedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mostLikedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  mostLikedAvatarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mostLikedUserText: {
    flex: 1,
  },
  mostLikedUsername: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  mostLikedTimestamp: {
    fontSize: 12,
  },
  mostLikedEntityTag: {
    fontSize: 14,
    fontWeight: '600',
  },
  mostLikedContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  mostLikedStats: {
    flexDirection: 'row',
    gap: 16,
  },
  mostLikedStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mostLikedStatText: {
    fontSize: 13,
    fontWeight: '500',
  },
  discoverContainer: {
    flex: 1,
    paddingTop: 12,
  },
  discoverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  discoverHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  seeMoreText: {
    fontSize: 15,
    fontWeight: '600',
  },
  discoverScroll: {
    flex: 1,
  },
  discoverScrollContent: {
    paddingBottom: 40,
  },
  discoverCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  discoverCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  discoverIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  discoverIconText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  discoverInfo: {
    flex: 1,
  },
  discoverName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  discoverCategory: {
    fontSize: 12,
  },
  discoverCardRight: {
    alignItems: 'flex-end',
  },
  discoverPrice: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  discoverChange: {
    fontSize: 13,
    fontWeight: '600',
  },
  topTradesContainer: {
    flex: 1,
    paddingTop: 12,
  },
  topTradesHeader: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  topTradesScroll: {
    flex: 1,
    paddingBottom: 12,
  },
  topTradesScrollContent: {
    paddingBottom: 12,
  },
  topTradeCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  topTradeCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralModal: {
    width: SCREEN_WIDTH * 0.85,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  referralModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    marginTop: 8,
  },
  referralModalText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  referralTokenAmount: {
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  referralShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    width: '100%',
  },
  referralShareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  topTradeUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  topTradeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  topTradeAvatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  topTradeUserName: {
    fontSize: 16,
    fontWeight: '600',
  },
  topTradeEntityInfo: {
    alignItems: 'flex-end',
  },
  topTradeEntityName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  topTradeCategory: {
    fontSize: 13,
  },
  topTradeCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  topTradeAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  topTradeStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
});
