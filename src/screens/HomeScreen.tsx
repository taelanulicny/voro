import React, { useState, useMemo, useEffect, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { RootStackParamList, MainTabParamList, Entity, PriceDataPoint } from '../types';
import { useTrading } from '../context/TradingContext';
import { useTheme } from '../context/ThemeContext';
import { useWatchlist } from '../context/WatchlistContext';
import { useSideMenu } from '../context/SideMenuContext';
import { useSocial } from '../context/SocialContext';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';
import { getEntityById, getAllEntities, MOCK_ENTITIES, getEntitiesByCategory } from '../utils/mockEntities';
import TradeModal from '../components/TradeModal';
import SideMenu from '../components/SideMenu';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { portfolio, getEntityPrice, getAllEntityPrices } = useTrading();
  const { theme } = useTheme();
  const { watchlist } = useWatchlist();
  const { isVisible: sideMenuVisible, setIsVisible: setSideMenuVisible } = useSideMenu();
  const { activityFeed } = useSocial();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('For You');
  const [addedCategories, setAddedCategories] = useState<string[]>([]);
  
  // Swipeable section state
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const swipeableScrollRef = useRef<ScrollView>(null);
  const TOTAL_PAGES = 5;
  
  const categories = ['For You', 'Influencers', 'Music Artists', 'Sports', 'Political Figures', 'Startups'];
  const customizableCategories = ['Influencers', 'Music Artists', 'Sports', 'Political Figures', 'Startups'];
  
  // Get live entity prices
  const entityPrices = getAllEntityPrices();
  const [previousPrices, setPreviousPrices] = useState<Record<number, number>>({});
  
  // Force chart update when portfolio value changes - DISABLED (keeping prices static)
  // useEffect(() => {
  //   setChartUpdateKey(prev => prev + 1);
  // }, [portfolio.totalValue, portfolioHistory.length]);
  
  // Update entities with live prices
  const entities = useMemo(() => {
    return MOCK_ENTITIES.map((entity) => {
      const currentPrice = getEntityPrice(entity.id);
      const previousPrice = previousPrices[entity.id] || entity.basePrice;
      // Calculate change from basePrice
      const change24h = currentPrice - entity.basePrice;
      const changePercent24h = (change24h / entity.basePrice) * 100;
      
      return {
        id: entity.id,
        ticker: entity.ticker,
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
  
  // Trade modal states
  const [tradeModalVisible, setTradeModalVisible] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{
    id: number;
    ticker: string;
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
      setCurrentPageIndex(4);
    } else if (pageIndex === TOTAL_PAGES + 1) {
      setCurrentPageIndex(0);
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
      setCurrentPageIndex(4);
    } else if (pageIndex === TOTAL_PAGES + 1) {
      swipeableScrollRef.current?.scrollTo({ x: PAGE_WIDTH, animated: false });
      setCurrentPageIndex(0);
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
    navigation.navigate('Entity', { entityId, categoryId: category });
  };


  // Map entity categories to display category names
  const getDisplayCategory = (entityId: number, category: string): string => {
    // Distinguish between Influencers (IDs 11-20) and Music Artists (IDs 21-30) in People category
    if (category === 'People') {
      if (entityId >= 11 && entityId <= 20) {
        return 'Influencers';
      } else if (entityId >= 21 && entityId <= 30) {
        return 'Music Artists';
      }
      return 'Influencers'; // Default for other People entities
    }
    
    const categoryMap: Record<string, string> = {
      'Tech': 'Startups',
      'Politics': 'Political Figures',
      'Events': 'Sports',
    };
    
    return categoryMap[category] || category;
  };

  // Map display category to entity category
  const getEntityCategory = (displayCategory: string): string => {
    const categoryMap: Record<string, string> = {
      'Influencers': 'People',
      'Music Artists': 'People',
      'Sports': 'Events',
      'Political Figures': 'Politics',
      'Startups': 'Tech',
    };
    return categoryMap[displayCategory] || displayCategory;
  };

  // Get previous day ranks for a category (mock data)
  const getPreviousDayRanks = (displayCategory: string): Record<number, number> => {
    const entityCategory = getEntityCategory(displayCategory);
    let filteredEntities = getEntitiesByCategory(entityCategory);
    
    if (displayCategory === 'Music Artists') {
      filteredEntities = filteredEntities.filter(entity => entity.id >= 21 && entity.id <= 30);
    } else if (displayCategory === 'Influencers') {
      filteredEntities = filteredEntities.filter(entity => entity.id >= 11 && entity.id <= 20);
    }
    
    // Create mock previous day prices (slightly different to simulate ranking changes)
    const previousDayEntities = filteredEntities.map((entity) => {
      const currentPrice = getEntityPrice(entity.id);
      // Simulate previous day price (add some randomness for ranking changes)
      const randomChange = (Math.random() - 0.5) * 0.1; // ±5% variation
      const previousPrice = currentPrice * (1 + randomChange);
      return {
        id: entity.id,
        previousPrice,
      };
    });
    
    // Sort by previous day price to get previous day ranks
    const sortedPrevious = [...previousDayEntities].sort((a, b) => b.previousPrice - a.previousPrice);
    
    // Map entity ID to previous day rank
    const mockRanks: Record<number, number> = {};
    sortedPrevious.forEach((entity, index) => {
      mockRanks[entity.id] = index + 1;
    });
    
    return mockRanks;
  };

  // Get top 5 entities for a category (ranked by price)
  const getTopEntitiesForCategory = (displayCategory: string) => {
    const entityCategory = getEntityCategory(displayCategory);
    let filteredEntities = getEntitiesByCategory(entityCategory);
    
    // Filter out influencers from Music Artists (both use 'People' category)
    if (displayCategory === 'Music Artists') {
      filteredEntities = filteredEntities.filter(entity => entity.id >= 21 && entity.id <= 30);
    } else if (displayCategory === 'Influencers') {
      filteredEntities = filteredEntities.filter(entity => entity.id >= 11 && entity.id <= 20);
    }
    
    const mappedEntities = filteredEntities.map((entity) => {
      const currentPrice = getEntityPrice(entity.id);
      // Calculate change from basePrice
      const change24h = currentPrice - entity.basePrice;
      const changePercent24h = (change24h / entity.basePrice) * 100;
      return {
        id: entity.id,
        ticker: entity.ticker,
        name: entity.name,
        currentPrice,
        change24h,
        changePercent24h,
        category: entity.category,
      };
    });
    
    // Sort by price (descending) - highest price = rank #1
    const sorted = [...mappedEntities].sort((a, b) => b.currentPrice - a.currentPrice);
    
    // Get previous day ranks for this category
    const previousDayRanks = getPreviousDayRanks(displayCategory);
    
    // Add rank and position change, return top 5
    return sorted.slice(0, 5).map((entity, index) => {
      const currentRank = index + 1;
      const previousRank = previousDayRanks[entity.id] || currentRank;
      const positionChange = previousRank - currentRank; // Positive = moved up, Negative = moved down
      
      return {
        ...entity,
        rank: currentRank,
        previousRank,
        positionChange,
      };
    });
  };

  // Get top 3 influencers for comparison chart
  const topInfluencers = useMemo(() => {
    const top5 = getTopEntitiesForCategory('Influencers');
    return top5.slice(0, 3);
  }, [entityPrices, getEntityPrice]);

  // Generate comparison chart data
  const comparisonChartData = useMemo(() => {
    if (topInfluencers.length < 3) return null;

    const histories = topInfluencers.map(entity => ({
      entity,
      history: generateComparisonPriceHistory(
        entity.id,
        getEntityById(entity.id)?.basePrice || entity.currentPrice,
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

    const colors = ['#1F2937', '#3B82F6', '#10B981'];

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
  }, [topInfluencers, getEntityPrice]);

  // Handle adding a category to home screen
  const handleAddCategory = (category: string) => {
    if (!addedCategories.includes(category)) {
      setAddedCategories([...addedCategories, category]);
    }
  };

  // Handle removing a category from home screen
  const handleRemoveCategory = (category: string) => {
    setAddedCategories(addedCategories.filter(c => c !== category));
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
  const discoverNewAdditions = useMemo(() => {
    const weekDates = getDatesThisWeek();
    
    // Fixed entity IDs (not random - these stay the same)
    // Get 1 entity from Influencers (IDs 11-20) - using a fixed index
    const influencers = MOCK_ENTITIES.filter(e => e.id >= 11 && e.id <= 20);
    const fixedInfluencer = influencers[0]; // Always use first one
    
    // Get 1 entity from Music Artists (IDs 21-30) - using a fixed index
    const musicArtists = MOCK_ENTITIES.filter(e => e.id >= 21 && e.id <= 30);
    const fixedMusicArtist = musicArtists[0]; // Always use first one
    
    // Get 1 entity from Political Figures (IDs 31-39) - using a fixed index
    const politicalFigures = MOCK_ENTITIES.filter(e => e.category === 'Politics' && e.id >= 31 && e.id <= 39);
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
    const itemsWithDates = entities.map((entity, index) => ({
      id: entity.id,
      name: entity.name,
      ticker: entity.ticker,
      category: entity.category,
      displayCategory: getDisplayCategory(entity.id, entity.category),
      currentPrice: getEntityPrice(entity.id),
      change24h: getEntityPrice(entity.id) - entity.basePrice,
      changePercent24h: ((getEntityPrice(entity.id) - entity.basePrice) / entity.basePrice) * 100,
      addedDate: weekDates[index], // Assign dates in order (newest first)
      isCategory: false,
    }));
    
    // Add Startups category as 5th item
    itemsWithDates.push({
      id: -1, // Special ID for category
      name: 'Startups',
      ticker: '',
      category: 'Startups',
      displayCategory: 'Startups',
      currentPrice: 0,
      change24h: 0,
      changePercent24h: 0,
      addedDate: weekDates[4], // 5th date (5 days ago)
      isCategory: true,
      volumePercentage: 10.0, // Volume percentage like in treemap
    });
    
    // Sort by date (newest first) - this ensures the 5 most recent are at the top
    return itemsWithDates.sort((a, b) => {
      const dateA = new Date(a.addedDate);
      const dateB = new Date(b.addedDate);
      return dateB.getTime() - dateA.getTime();
    });
  }, [getEntityPrice]); // Only recalculate if getEntityPrice changes

  // Calculate trending entities (top 5 by absolute percentage change)
  const topGainers = useMemo(() => {
    const entitiesWithData = MOCK_ENTITIES.map(entity => {
      const livePrice = getEntityPrice(entity.id);
      const change = livePrice - entity.basePrice;
      const changePercent = (change / entity.basePrice) * 100;
      const displayCategory = getDisplayCategory(entity.id, entity.category);
      
      return {
        id: entity.id,
        ticker: entity.ticker,
        name: entity.name,
        category: entity.category,
        displayCategory,
        currentPrice: livePrice,
        changePercent24h: changePercent,
        change24h: change,
      };
    });
    
    // Sort by absolute percentage change and get top 5
    const top5 = entitiesWithData
      .sort((a, b) => Math.abs(b.changePercent24h) - Math.abs(a.changePercent24h))
      .slice(0, 5);
    
    // Calculate position changes within each entity's category
    return top5.map(entity => {
      const previousDayRanks = getPreviousDayRanks(entity.displayCategory);
      
      // Get all entities in this category to calculate current rank
      const entityCategory = getEntityCategory(entity.displayCategory);
      let categoryEntities = getEntitiesByCategory(entityCategory);
      
      if (entity.displayCategory === 'Music Artists') {
        categoryEntities = categoryEntities.filter(e => e.id >= 21 && e.id <= 30);
      } else if (entity.displayCategory === 'Influencers') {
        categoryEntities = categoryEntities.filter(e => e.id >= 11 && e.id <= 20);
      }
      
      // Calculate current rank in category (by price)
      const categoryEntitiesWithPrices = categoryEntities.map(e => ({
        id: e.id,
        currentPrice: getEntityPrice(e.id),
      }));
      const sortedCategory = [...categoryEntitiesWithPrices].sort((a, b) => b.currentPrice - a.currentPrice);
      const currentRank = sortedCategory.findIndex(e => e.id === entity.id) + 1;
      const previousRank = previousDayRanks[entity.id] || currentRank;
      const positionChange = previousRank - currentRank;
      
      return {
        ...entity,
        rank: currentRank,
        previousRank,
        positionChange,
      };
    });
  }, [entityPrices, getEntityPrice]);

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
          
          <Text style={[styles.logoText, { color: theme.text }]}>moro</Text>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              // Will be linked later
            }}
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
            {/* Duplicate of page 5 at the start for circular scrolling */}
            <View key="duplicate-5" style={[styles.swipeablePage, { backgroundColor: theme.card }]}>
              <View style={styles.swipeablePageContent}>
                <Text style={[styles.swipeablePageLabel, { color: theme.textSecondary }]}>
                  Page 5
                </Text>
                <Text style={[styles.swipeablePageMessage, { color: theme.text }]}>
                  Content coming soon
                </Text>
              </View>
            </View>
            
            {/* Real pages 1-5 */}
            {Array.from({ length: TOTAL_PAGES }, (_, index) => {
              // Page 1: Comparison chart for top 3 influencers
              if (index === 0 && comparisonChartData) {
                // Get current prices from entities to determine Y-axis range
                const currentPrices = comparisonChartData.entities.map(e => e.currentPrice);
                const minCurrentPrice = Math.min(...currentPrices);
                const maxCurrentPrice = Math.max(...currentPrices);
                
                // Y-axis range: $10 above highest current price, $10 below lowest current price
                const yMin = Math.round((minCurrentPrice - 10) * 100) / 100;
                const yMax = Math.round((maxCurrentPrice + 10) * 100) / 100;
                
                // Clamp historical data points (but preserve the last point which is the current price)
                const clampedDatasets = comparisonChartData.datasets.map((dataset, datasetIndex) => {
                  const currentPrice = comparisonChartData.entities[datasetIndex].currentPrice;
                  return {
                    ...dataset,
                    data: dataset.data.map((value, dataIndex) => {
                      // Keep the last point (current price) as-is, clamp all others
                      const isLastPoint = dataIndex === dataset.data.length - 1;
                      if (isLastPoint) {
                        return currentPrice; // Ensure last point is exactly current price
                      }
                      return Math.max(yMin, Math.min(yMax, value)); // Clamp historical points
                    }),
                  };
                });
                
                // Calculate the three Y-axis labels: top, middle, bottom
                const topLabel = yMax;
                const bottomLabel = yMin;
                const middleLabel = Math.round(((yMax + yMin) / 2) * 100) / 100;
                
                const chartConfig = {
                  backgroundColor: theme.card,
                  backgroundGradientFrom: theme.card,
                  backgroundGradientTo: theme.card,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
                  labelColor: (opacity = 1) => hexToRgba(theme.textSecondary, opacity),
                  style: {
                    borderRadius: 0,
                  },
                  fillShadowGradientOpacity: 0, // Remove fill shading
                  fillShadowGradientFromOpacity: 0,
                  fillShadowGradientToOpacity: 0,
                  propsForDots: {
                    r: '4', // Dot radius
                    strokeWidth: '2',
                  },
                  formatYLabel: () => '', // Hide Y-axis labels
                  yAxisMin: yMin,
                  yAxisMax: yMax,
                };

                return (
                  <View key={index} style={[styles.swipeablePage, { backgroundColor: theme.card }]}>
                    <View style={styles.comparisonChartContainer}>
                      {/* Header */}
                      <Text style={[styles.comparisonChartHeader, { color: theme.text }]}>
                        Influencers - Top 3
                      </Text>
                      
                      {/* Legend/Key showing entities horizontally */}
                      <View style={styles.chartLegend}>
                        {comparisonChartData.entities.map((entity, entityIndex) => (
                          <View key={entity.id} style={styles.legendItem}>
                            <View
                              style={[
                                styles.legendColorDot,
                                { backgroundColor: comparisonChartData.colors[entityIndex] },
                              ]}
                            />
                            <View style={styles.legendText}>
                              <Text style={[styles.legendName, { color: theme.text }]}>
                                {entity.name}
                              </Text>
                              <Text
                                style={[
                                  styles.legendPrice,
                                  { color: comparisonChartData.colors[entityIndex] },
                                ]}
                              >
                                {formatCurrency(entity.currentPrice)}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                      
                      {/* Chart - full width now */}
                      <View style={styles.chartWithLabelsWrapper}>
                        <View style={styles.chartContainerClipped}>
                          {/* Grid lines - horizontal dotted lines from Y-axis labels to left edge */}
                          {[
                            { label: topLabel, index: 0 },
                            { label: middleLabel, index: 1 },
                            { label: bottomLabel, index: 2 },
                          ].map(({ label, index }) => {
                            const chartHeight = 220;
                            const paddingTop = 20;
                            const paddingBottom = 20;
                            const plotHeight = chartHeight - paddingTop - paddingBottom;
                            const chartWidth = SCREEN_WIDTH;
                            const paddingRight = 100; // Space for Y-axis labels (for chart elements)
                            const paddingLeft = 32;
                            const gridLinePaddingRight = 60; // Grid lines extend closer to Y-axis labels (middle of 100 and 20)
                            
                            // Calculate Y position matching the label positions
                            // yAxisLabelsRight container: top: 20, bottom: 40, justifyContent: 'space-between'
                            // Container spans from 20px to (220 - 40) = 180px from top
                            // Labels are spaced between these points: top (20px), middle (~100px), bottom (180px)
                            let yPos: number;
                            if (index === 0) {
                              // Top label - moved down a bit from 20px
                              yPos = 28;
                            } else if (index === 1) {
                              // Middle label - middle of container (100px from chart top) - DO NOT CHANGE
                              yPos = 100;
                            } else {
                              // Bottom label - moved up a bit from 180px
                              yPos = 172;
                            }
                            
                            // Width spans from left padding to almost touching Y-axis labels
                            const gridLineWidth = chartWidth - paddingLeft - gridLinePaddingRight;
                            
                            // Create dashed line using multiple small Views
                            const dashLength = 4;
                            const dashGap = 4;
                            const numDashes = Math.floor(gridLineWidth / (dashLength + dashGap));
                            
                            return (
                              <View
                                key={`grid-${index}`}
                                style={{
                                  position: 'absolute',
                                  left: paddingLeft,
                                  top: yPos,
                                  width: gridLineWidth,
                                  height: 1,
                                  flexDirection: 'row',
                                }}
                              >
                                {Array.from({ length: numDashes }).map((_, dashIndex) => (
                                  <View
                                    key={dashIndex}
                                    style={{
                                      width: dashLength,
                                      height: 1,
                                      backgroundColor: '#9CA3AF',
                                      marginRight: dashIndex < numDashes - 1 ? dashGap : 0,
                                    }}
                                  />
                                ))}
                              </View>
                            );
                          })}
                          
                          {/* Custom lines using many points across the week */}
                          {clampedDatasets.map((dataset, datasetIndex) => {
                            const lastIndex = dataset.data.length - 1;
                            const lastValue = dataset.data[lastIndex];
                            const chartWidth = SCREEN_WIDTH;
                            const chartHeight = 220;
                            const paddingRight = 100;
                            const paddingTop = 20;
                            const paddingBottom = 20;
                            const paddingLeft = 32; // Align with date labels
                            const plotWidth = chartWidth - paddingLeft - paddingRight;
                            const plotHeight = chartHeight - paddingTop - paddingBottom;
                            
                            // Calculate end position (where dot will be)
                            const endX = paddingLeft + plotWidth;
                            const normalizedValue = (lastValue - yMin) / (yMax - yMin);
                            const endY = paddingTop + plotHeight - (normalizedValue * plotHeight);
                            
                            // Check if this is Alix Earle (entity id 11) - she should start in third and jump to first
                            const isAlixEarle = comparisonChartData.entities[datasetIndex]?.id === 11;
                            
                            // Start position (left side)
                            // For Alix Earle: start at third position (bottom), others start at varied positions
                            let startY: number;
                            if (isAlixEarle) {
                              // Start at third position (bottom of the three lines)
                              startY = paddingTop + plotHeight * 0.75;
                            } else {
                              const startYVariations = [
                                paddingTop + plotHeight * 0.25, // First position (top)
                                paddingTop + plotHeight * 0.45, // Second position (middle)
                              ];
                              startY = startYVariations[datasetIndex] || paddingTop + plotHeight * 0.35;
                            }
                            
                            // Generate many points across the week (7 days * multiple points per day)
                            const pointsPerDay = 8;
                            const totalPoints = 7 * pointsPerDay + 1; // +1 for the final point
                            const points: Array<{ x: number; y: number }> = [];
                            
                            // Generate points from left to right, ensuring the LAST point matches endY exactly
                            for (let i = 0; i < totalPoints; i++) {
                              const progress = i / (totalPoints - 1);
                              const x = paddingLeft + plotWidth * progress;
                              
                              // Calculate base Y position
                              let baseY: number;
                              if (isAlixEarle) {
                                // Alix: starts low, jumps up in second half
                                if (progress < 0.5) {
                                  baseY = startY; // Stay at bottom
                                } else {
                                  const jumpProgress = (progress - 0.5) / 0.5; // 0 to 1
                                  const jumpCurve = jumpProgress * jumpProgress;
                                  baseY = startY + (endY - startY) * jumpCurve;
                                }
                              } else {
                                // Normal interpolation - mostly flat with very subtle variation
                                baseY = startY + (endY - startY) * progress;
                              }
                              
                              // Add very small, less frequent variation for subtle movement
                              // Much smaller amplitude and less frequent oscillation
                              const dayProgress = progress * 7;
                              const sineVariation = Math.sin(dayProgress * Math.PI * 0.5) * 3; // Reduced frequency and amplitude
                              
                              let y = baseY + sineVariation;
                              
                              // CRITICAL: Last point must be exactly endY (where dot is)
                              if (i === totalPoints - 1) {
                                y = endY;
                              }
                              
                              points.push({ x, y });
                            }
                            
                            const lineColor = comparisonChartData.colors[datasetIndex];
                            
                            // Render line using many small View components connecting adjacent points
                            return (
                              <View key={`line-${datasetIndex}`} style={{ position: 'absolute', top: 0, left: 0 }}>
                                {points.map((point, pointIndex) => {
                                  if (pointIndex === 0) return null;
                                  const prevPoint = points[pointIndex - 1];
                                  const dx = point.x - prevPoint.x;
                                  const dy = point.y - prevPoint.y;
                                  const length = Math.sqrt(dx * dx + dy * dy);
                                  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                                  
                                  return (
                                    <View
                                      key={`segment-${pointIndex}`}
                                      style={{
                                        position: 'absolute',
                                        left: prevPoint.x,
                                        top: prevPoint.y,
                                        width: length,
                                        height: 2,
                                        backgroundColor: lineColor,
                                        transform: [{ rotate: `${angle}deg` }],
                                        transformOrigin: 'left center',
                                      }}
                                    />
                                  );
                                })}
                              </View>
                            );
                          })}
                        </View>
                        {/* Custom dots at the end of each line */}
                        {clampedDatasets.map((dataset, datasetIndex) => {
                          const lastIndex = dataset.data.length - 1;
                          const lastValue = dataset.data[lastIndex];
                          const chartWidth = SCREEN_WIDTH;
                          const chartHeight = 220;
                          const paddingRight = 100; // Space for Y-axis labels
                          const paddingTop = 20;
                          const paddingBottom = 20;
                          const paddingLeft = 0; // Start at left edge
                          const plotWidth = chartWidth - paddingLeft - paddingRight;
                          const plotHeight = chartHeight - paddingTop - paddingBottom;
                          
                          // Calculate X position of last point (rightmost edge of plot area)
                          const lastX = paddingLeft + plotWidth - 4;
                          
                          // Calculate Y position based on value and range
                          const normalizedValue = (lastValue - yMin) / (yMax - yMin);
                          const yPosition = paddingTop + plotHeight - (normalizedValue * plotHeight) - 4;
                          
                          const dotColor = comparisonChartData.colors[datasetIndex];
                          
                          return (
                            <View
                              key={datasetIndex}
                              style={[
                                styles.chartEndDot,
                                {
                                  left: lastX,
                                  top: yPosition,
                                  backgroundColor: dotColor,
                                  borderColor: theme.card,
                                },
                              ]}
                            />
                          );
                        })}
                        
                        {/* Custom Y-axis labels on the right side */}
                        <View style={styles.yAxisLabelsRight}>
                          <Text style={[styles.yAxisLabelText, { color: theme.textSecondary }]}>
                            {formatCurrency(topLabel)}
                          </Text>
                          <Text style={[styles.yAxisLabelText, { color: theme.textSecondary }]}>
                            {formatCurrency(middleLabel)}
                          </Text>
                          <Text style={[styles.yAxisLabelText, { color: theme.textSecondary }]}>
                            {formatCurrency(bottomLabel)}
                          </Text>
                        </View>
                      </View>
                      
                      {/* Date labels under x-axis */}
                      <View style={styles.xAxisDateLabels}>
                        {['12/21', '12/22', '12/23', '12/24', '12/25', '12/26', '12/27'].map((date, index) => {
                          const chartWidth = SCREEN_WIDTH;
                          const paddingRight = 100;
                          const leftPadding = 32; // More padding on the left
                          const plotWidth = chartWidth - paddingRight; // Full width minus right padding (where dots are)
                          const spacing = (plotWidth - leftPadding) / 6; // Space them out to align 12/27 with dots
                          const xPosition = leftPadding + spacing * index;
                          
                          return (
                            <Text
                              key={date}
                              style={[
                                styles.xAxisDateLabel,
                                { 
                                  color: theme.textSecondary,
                                  left: xPosition,
                                },
                              ]}
                            >
                              {date}
                            </Text>
                          );
                        })}
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
                  <View key={index} style={[styles.swipeablePage, { backgroundColor: theme.card }]}>
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
                            onPress={() => handleHoldingPress(entity.id, entity.displayCategory)}
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
                                  {entity.displayCategory}
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
                      categoryId: 'Startups' 
                    });
                  }
                };
                
                const renderTextWithMentions = (text: string) => {
                  const parts: React.ReactNode[] = [];
                  let lastIndex = 0;
                  const mentionRegex = /@([a-zA-Z0-9]+)/g;
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
                  <View key={index} style={[styles.swipeablePage, { backgroundColor: theme.card }]}>
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
                      if (entity.category === 'People') {
                        if (entity.id >= 11 && entity.id <= 20) {
                          categoryId = 'Influencers';
                        } else if (entity.id >= 21 && entity.id <= 30) {
                          categoryId = 'Music Artists';
                        }
                      } else {
                        const categoryMap: Record<string, string> = {
                          'Politics': 'Political Figures',
                          'Tech': 'Startups',
                          'Events': 'Sports',
                        };
                        categoryId = categoryMap[entity.category] || entity.category;
                      }
                    }
                    
                    navigation.navigate('Entity', {
                      entityId: post.entityId,
                      categoryId: categoryId,
                    });
                  }
                };

                return (
                  <View key={index} style={[styles.swipeablePage, { backgroundColor: theme.card }]}>
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
                const handleEntityPress = (entityId: number, displayCategory: string) => {
                  navigation.navigate('Entity', {
                    entityId,
                    categoryId: displayCategory,
                  });
                };

                const handleCategoryPress = (categoryId: string) => {
                  navigation.navigate('Category', {
                    categoryId,
                  });
                };

                return (
                  <View key={index} style={[styles.swipeablePage, { backgroundColor: theme.card }]}>
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
                          item.isCategory ? (
                            <TouchableOpacity
                              key="startups"
                              style={[styles.discoverCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                              onPress={() => handleCategoryPress('Startups')}
                            >
                              <View style={styles.discoverCardLeft}>
                                <View style={[styles.discoverIcon, { backgroundColor: theme.primaryLight }]}>
                                  <Ionicons name="rocket-outline" size={20} color={theme.primary} />
                                </View>
                                <View style={styles.discoverInfo}>
                                  <Text style={[styles.discoverName, { color: theme.text }]}>
                                    {item.name}
                                  </Text>
                                  <Text style={[styles.discoverCategory, { color: theme.textSecondary }]}>
                                    New Category
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.discoverCardRight}>
                                <Text style={[styles.discoverPrice, { color: theme.text }]}>
                                  {(item as any).volumePercentage?.toFixed(1)}%
                                </Text>
                                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                              </View>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              key={item.id}
                              style={[styles.discoverCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                              onPress={() => handleEntityPress(item.id, item.displayCategory)}
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
                                    {item.displayCategory}
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
                          )
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                );
              }
              
              // Other pages: placeholder
              return (
                <View key={index} style={[styles.swipeablePage, { backgroundColor: theme.card }]}>
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
            
            {/* Duplicate of page 1 at the end for circular scrolling */}
            <View key="duplicate-1" style={[styles.swipeablePage, { backgroundColor: theme.card }]}>
              <View style={styles.swipeablePageContent}>
                <Text style={[styles.swipeablePageLabel, { color: theme.textSecondary }]}>
                  Page 1
                </Text>
                <Text style={[styles.swipeablePageMessage, { color: theme.text }]}>
                  Content coming soon
                </Text>
              </View>
            </View>
          </ScrollView>
          
          {/* Page Indicator Dots */}
          <View style={[styles.pageIndicatorContainer, { backgroundColor: theme.card }]}>
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
                          {getDisplayCategory(item.entityId, item.category)}
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

          {portfolio.holdings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No open positions</Text>
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                Start trading to see your positions here
              </Text>
            </View>
          ) : (
            <>
              {portfolio.holdings.slice(0, 5).map((holding) => {
                const entity = MOCK_ENTITIES.find(e => e.id === holding.entityId);
                const entityCategory = entity?.category || '';
                return (
                  <TouchableOpacity
                    key={holding.entityId}
                    style={[styles.watchlistCard, { borderBottomColor: theme.borderLight }]}
                    onPress={() => handleHoldingPress(holding.entityId, entityCategory)}
                  >
                    <View style={styles.watchlistLeft}>
                      <View style={[styles.watchlistIcon, { backgroundColor: theme.primaryLight }]}>
                        <Text style={[styles.watchlistIconText, { color: theme.primary }]}>
                          {holding.entityName.substring(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.watchlistInfo}>
                        <Text style={[styles.watchlistName, { color: theme.text }]}>{holding.entityName}</Text>
                        <Text style={[styles.watchlistCategory, { color: theme.textSecondary }]}>
                          {getDisplayCategory(holding.entityId, entityCategory)}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.watchlistRight}>
                      <Text style={[styles.watchlistPrice, { color: theme.text }]}>
                        {formatCurrency(holding.totalValue)}
                      </Text>
                      <Text style={[styles.watchlistChange, { color: getChangeColor(holding.profitLoss) }]}>
                        {holding.profitLoss >= 0 ? '+' : ''}
                        {formatCurrency(holding.profitLoss)}
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
                const basePrice = getEntityById(entity.id)?.basePrice || entity.currentPrice;
                const liveChange = livePrice - basePrice;
                const liveChangePercent = (liveChange / basePrice) * 100;
                
                // Get initials from name (first 2 letters)
                const getInitials = (name: string) => {
                  return name.substring(0, 2).toUpperCase();
                };

                return (
                  <TouchableOpacity
                    key={entity.id}
                    style={[styles.miniCard, { backgroundColor: theme.backgroundSecondary }]}
                    onPress={() => {
                      const entityCategory = getEntityCategory(category);
                      navigation.navigate('Entity', { entityId: entity.id, categoryId: entityCategory });
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
                        <Text style={[styles.miniCategory, { color: theme.textSecondary }]}>{category}</Text>
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
                    <Text style={[styles.widgetIconText, { color: isAdded ? theme.textTertiary : theme.primary }]}>
                      {category.substring(0, 2).toUpperCase()}
                    </Text>
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
          entityTicker={selectedEntity.ticker}
          currentPrice={selectedEntity.price}
          category={selectedEntity.category}
          existingQuantity={portfolio.holdings.find(h => h.entityId === selectedEntity.id)?.quantity}
        />
      )}

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
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    fontStyle: 'italic',
    // Note: Bukhari Script font should be loaded via expo-font
    // For now using italic style as placeholder
    // fontFamily: 'BukhariScript', // Uncomment when font is loaded
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
    color: '#3B82F6',
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
    color: '#3B82F6',
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
    color: '#3B82F6',
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
    color: '#3B82F6',
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
    // backgroundColor applied dynamically via theme
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
    paddingTop: 4,
    paddingBottom: 12,
    gap: 8,
    // backgroundColor applied dynamically via theme
  },
  pageIndicatorDot: {
    borderRadius: 4,
  },
  comparisonChartContainer: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 0,
  },
  comparisonChartHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 16,
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
});
