import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Dimensions,
  Modal,
  Share,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Ellipse, Line, Rect } from 'react-native-svg';
import { RootStackParamList, Post } from '../types';
import { useTrading } from '../context/TradingContext';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';
import { getEntitiesByCategory, getEntityById, extractEntityMentions } from '../utils/entities';
import { extractCategoryMentions } from '../utils/categories';
import { getAllCategoryFeedPosts } from '../utils/categoryFeedPosts';
import { useSocial } from '../context/SocialContext';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import { BASE_PRICE } from '../utils/sentimentTrading';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type CategoryRouteProp = RouteProp<RootStackParamList, 'Category'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

export default function CategoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CategoryRouteProp>();
  const { categoryId } = route.params;
  const { getEntityPrice, getAllEntityPrices, getPosition, getPositionOpenPnL } = useTrading();
  const { theme } = useTheme();
  const { activityFeed } = useSocial();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'entities' | 'about' | 'feed' | 'news'>('entities');
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentGamePageIndex, setCurrentGamePageIndex] = useState(0);
  const gamesScrollRef = useRef<ScrollView>(null);
  const [shareOpinionModalVisible, setShareOpinionModalVisible] = useState(false);
  const [positionsModalVisible, setPositionsModalVisible] = useState(false);

  // Category-specific feed posts
  const categoryFeedPosts = useMemo(() => {
    // No hardcoded posts - all posts come from backend/activityFeed
    const basePosts: Record<string, Post[]> = {
      'Influencers': [],
      'Political Figures': [],
      'Actors': [],
      'NBA Players': [],
      'NFL Players': [],
      'Soccer Players': [],
      'NFL Teams': [],
      'NBA Teams': [],
      'College Basketball Teams': [],
      'Teams': [],
      'Rap Music': [],
      'Country Music': [],
      'Pop Music': [],
      'People': [],
    };

    // For People category, aggregate posts from all People subcategories
    if (categoryId === 'People') {
      const peopleSubcategories = [
        'Actors',
        'NBA Players',
        'NFL Players',
        'Soccer Players',
        'Influencers',
        'Political Figures',
        'Rap Music',
        'Country Music',
        'Pop Music',
      ];
      const aggregatedPosts: Post[] = [];
      const seenPostIds = new Set<string>();
      
      // Get all entities that belong to People subcategories
      const allPeopleEntities = new Set<string>();
      peopleSubcategories.forEach(subcategory => {
        const subcategoryEntities = getEntitiesByCategory(subcategory);
        subcategoryEntities.forEach(entity => {
          allPeopleEntities.add(entity.name);
        });
      });
      
      // Get posts from each subcategory
      peopleSubcategories.forEach(subcategory => {
        const subcategoryPosts = basePosts[subcategory] || [];
        subcategoryPosts.forEach(post => {
          if (!seenPostIds.has(post.id)) {
            aggregatedPosts.push(post);
            seenPostIds.add(post.id);
          }
        });
      });
      
      // Include posts from activityFeed that tag People entities directly (even without subcategory mention)
      activityFeed.forEach(post => {
        // Check if post's entity belongs to any People subcategory
        const entityBelongsToPeople = post.entityName && allPeopleEntities.has(post.entityName);
        
        // Or check if post mentions a People entity in content
        const mentionedEntities = extractEntityMentions(post.content);
        const mentionsPeopleEntity = mentionedEntities.some(entity => 
          allPeopleEntities.has(entity.name)
        );
        
        if ((entityBelongsToPeople || mentionsPeopleEntity) && !seenPostIds.has(post.id)) {
          aggregatedPosts.push(post);
          seenPostIds.add(post.id);
        }
      });
      
      // Include posts that mention @People
      const allCategoryFeedPosts = getAllCategoryFeedPosts();
      allCategoryFeedPosts.forEach(post => {
        const mentionedCategories = extractCategoryMentions(post.content);
        const mentionsPeople = mentionedCategories.some(cat => cat === 'People');
        
        if (mentionsPeople && !seenPostIds.has(post.id)) {
          aggregatedPosts.push(post);
          seenPostIds.add(post.id);
        }
      });
      
      // Also check activityFeed for posts that mention @People
      activityFeed.forEach(post => {
        const mentionedCategories = extractCategoryMentions(post.content);
        const mentionsPeople = mentionedCategories.some(cat => cat === 'People');
        
        if (mentionsPeople && !seenPostIds.has(post.id)) {
          aggregatedPosts.push(post);
          seenPostIds.add(post.id);
        }
      });
      
      // Sort by timestamp (newest first)
      return aggregatedPosts.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }

    // For Teams category, aggregate posts from all Teams subcategories
    if (categoryId === 'Teams') {
      const teamsSubcategories = [
        'NFL Teams',
        'NBA Teams',
        'College Basketball Teams',
      ];
      const aggregatedPosts: Post[] = [];
      const seenPostIds = new Set<string>();
      
      // Get all entities that belong to Teams subcategories
      const allTeamsEntities = new Set<string>();
      teamsSubcategories.forEach(subcategory => {
        const subcategoryEntities = getEntitiesByCategory(subcategory);
        subcategoryEntities.forEach(entity => {
          allTeamsEntities.add(entity.name);
        });
      });
      
      // Get posts from getAllCategoryFeedPosts (centralized source with all Teams posts)
      const allCategoryFeedPosts = getAllCategoryFeedPosts();
      
      // Get posts from each subcategory
      teamsSubcategories.forEach(subcategory => {
        // First check local basePosts
        const localSubcategoryPosts = basePosts[subcategory] || [];
        localSubcategoryPosts.forEach(post => {
          if (!seenPostIds.has(post.id)) {
            aggregatedPosts.push(post);
            seenPostIds.add(post.id);
          }
        });
        
        // Then check getAllCategoryFeedPosts for posts in this subcategory
        allCategoryFeedPosts.forEach(post => {
          // Check if post mentions this subcategory
          const mentionedCategories = extractCategoryMentions(post.content);
          const mentionsThisSubcategory = mentionedCategories.some(cat => cat === subcategory);
          
          // Or check if post's entity belongs to this subcategory
          const entityBelongsToSubcategory = post.entityName && 
            getEntitiesByCategory(subcategory).some(e => e.name === post.entityName);
          
          if ((mentionsThisSubcategory || entityBelongsToSubcategory) && !seenPostIds.has(post.id)) {
            aggregatedPosts.push(post);
            seenPostIds.add(post.id);
          }
        });
      });
      
      // Include posts that mention @Teams
      allCategoryFeedPosts.forEach(post => {
        const mentionedCategories = extractCategoryMentions(post.content);
        const mentionsTeams = mentionedCategories.some(cat => cat === 'Teams');
        
        if (mentionsTeams && !seenPostIds.has(post.id)) {
          aggregatedPosts.push(post);
          seenPostIds.add(post.id);
        }
      });
      
      // Also include posts from activityFeed that tag Teams entities directly (even without subcategory mention)
      activityFeed.forEach(post => {
        // Check if post's entity belongs to any Teams subcategory
        const entityBelongsToTeams = post.entityName && allTeamsEntities.has(post.entityName);
        
        // Or check if post mentions a Teams entity in content
        const mentionedEntities = extractEntityMentions(post.content);
        const mentionsTeamsEntity = mentionedEntities.some(entity => 
          allTeamsEntities.has(entity.name)
        );
        
        if ((entityBelongsToTeams || mentionsTeamsEntity) && !seenPostIds.has(post.id)) {
          aggregatedPosts.push(post);
          seenPostIds.add(post.id);
        }
      });
      
      // Also check getAllCategoryFeedPosts for posts that tag Teams entities directly
      allCategoryFeedPosts.forEach(post => {
        // Check if post's entity belongs to any Teams subcategory
        const entityBelongsToTeams = post.entityName && allTeamsEntities.has(post.entityName);
        
        // Or check if post mentions a Teams entity in content
        const mentionedEntities = extractEntityMentions(post.content);
        const mentionsTeamsEntity = mentionedEntities.some(entity => 
          allTeamsEntities.has(entity.name)
        );
        
        if ((entityBelongsToTeams || mentionsTeamsEntity) && !seenPostIds.has(post.id)) {
          aggregatedPosts.push(post);
          seenPostIds.add(post.id);
        }
      });
      
      // Sort by timestamp (newest first)
      return aggregatedPosts.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }

    const baseCategoryPosts = basePosts[categoryId] || [];
    
    // Also include posts from activityFeed and other category feeds that mention this category
    const additionalPosts: Post[] = [];
    const seenPostIds = new Set<string>(baseCategoryPosts.map(p => p.id));
    
    // Check activityFeed for posts that mention this category
    activityFeed.forEach(post => {
      const mentionedCategories = extractCategoryMentions(post.content);
      const mentionsThisCategory = mentionedCategories.some(cat => 
        cat === categoryId
      );
      
      if (mentionsThisCategory && !seenPostIds.has(post.id)) {
        additionalPosts.push(post);
        seenPostIds.add(post.id);
      }
    });
    
    // Check all category feed posts for posts that mention this category
    const allCategoryFeedPosts = getAllCategoryFeedPosts();
    allCategoryFeedPosts.forEach(post => {
      const mentionedCategories = extractCategoryMentions(post.content);
      const mentionsThisCategory = mentionedCategories.some(cat => 
        cat === categoryId
      );
      
      if (mentionsThisCategory && !seenPostIds.has(post.id)) {
        additionalPosts.push(post);
        seenPostIds.add(post.id);
      }
    });
    
    // Combine base posts with additional posts and sort by timestamp
    const allPosts = [...baseCategoryPosts, ...additionalPosts];
    return allPosts.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [categoryId, activityFeed]);

  // Categories are now stored directly (no mapping needed)
  const displayName = categoryId;
  const entityCategory = categoryId;
  
  const handleShare = async () => {
    try {
      const shareMessage = `${displayName}\n\nCheck out this category on Moro!`;
      
      await Share.share({
        message: shareMessage,
        title: `${displayName} - Moro`,
      });
    } catch (error) {
      // User cancelled or error occurred
    }
  };
  
  // Mock previous day rankings (yesterday's ranks)
  // Reset to match current ranks (no position changes)
  const previousDayRanks = useMemo(() => {
    const mockRanks: Record<number, number> = {};
    // For People category, aggregate from all subcategories
    const filteredEntities = getEntitiesByCategory(entityCategory);
    
    // All entities start at price 100, so use current prices for ranking
    const entitiesWithPrices = filteredEntities.map((entity) => {
      const currentPrice = getEntityPrice(entity.id);
      return {
        id: entity.id,
        price: currentPrice,
      };
    });
    
    // Sort by price to get ranks (same as current since all prices are 100)
    const sorted = [...entitiesWithPrices].sort((a, b) => b.price - a.price);
    
    // Map entity ID to rank (will be same as current rank since all prices are 100)
    sorted.forEach((entity, index) => {
      mockRanks[entity.id] = index + 1;
    });
    
    return mockRanks;
  }, [entityCategory, categoryId, getEntityPrice]);
  
  // Get all entity prices to track changes for reactivity
  const allEntityPrices = getAllEntityPrices();
  
  const entities = useMemo(() => {
    // For People category, aggregate from all subcategories
    let filteredEntities = getEntitiesByCategory(entityCategory);
    
    const mappedEntities = filteredEntities.map((entity) => {
      // Calculate price change from BASE_PRICE (100)
      const currentPrice = allEntityPrices[entity.id] || getEntityPrice(entity.id) || BASE_PRICE;
      const change24h = currentPrice - BASE_PRICE;
      const changePercent24h = (change24h / BASE_PRICE) * 100;
      
      return {
        id: entity.id,
        name: entity.name,
        currentPrice,
        change24h,
        changePercent24h,
        category: entity.category, // Keep the actual subcategory for trading
      };
    });
    
    // Stable sort by price (descending) for all categories so the list doesn't jump on re-renders.
    // People and Teams used to randomize order, which caused the list to jump when prices updated.
    const sorted = [...mappedEntities].sort((a, b) => b.currentPrice - a.currentPrice);
    
    // Add rank and position change to each entity
    return sorted.map((entity, index) => {
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
  }, [entityCategory, categoryId, allEntityPrices, getEntityPrice, previousDayRanks]);

  // Get all positions for entities in this category
  const categoryPositions = useMemo(() => {
    const positions: Array<{
      entityId: number;
      entityName: string;
      position: { direction: 'positive' | 'negative'; tokensCommitted: number; trancheCount: number };
      openPnL: number;
      currentPrice: number;
    }> = [];
    
    entities.forEach(entity => {
      const position = getPosition(entity.id);
      if (position) {
        const openPnL = getPositionOpenPnL(entity.id);
        const currentPrice = getEntityPrice(entity.id) || BASE_PRICE;
        positions.push({
          entityId: entity.id,
          entityName: entity.name,
          position,
          openPnL,
          currentPrice,
        });
      }
    });
    
    return positions;
  }, [entities, getPosition, getPositionOpenPnL, getEntityPrice]);

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="folder-outline" size={48} color={theme.textTertiary} />
        <Text style={[styles.emptyStateText, { color: theme.text }]}>
          No entities in this category
        </Text>
      </View>
    );
  };

  // Render a single live game module
  const renderLiveGameModule = (game: typeof allLiveGames[0]) => {
    const awayTeamTag = `@${formatTeamTag(game.isAway ? game.teamName : game.opponentName)}`;
    const homeTeamTag = `@${formatTeamTag(game.isAway ? game.opponentName : game.teamName)}`;
    const fullTitle = `${awayTeamTag} at ${homeTeamTag}`;
    const shouldWrap = fullTitle.length > 32;
    const awayTeamId = game.isAway ? game.teamId : game.opponentId;
    const homeTeamId = game.isAway ? game.opponentId : game.teamId;
    const sportCategory = game.sportCategory || categoryId;
    const isNBA = sportCategory === 'NBA Teams';
    const iconColor = isNBA ? '#C8102E' : '#1E40AF'; // Red for NBA, Blue for NFL
    
    return (
      <View key={`${game.teamId}-${game.opponentId}`} style={[styles.liveGameModule, { backgroundColor: theme.card }]}>
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
                {sportCategory}
              </Text>
              {shouldWrap ? (
                <View style={styles.liveGameTitleContainerWrapped}>
                  <TouchableOpacity onPress={() => handleTeamPress(awayTeamId, sportCategory)}>
                    <Text style={[styles.liveGameTitle, { color: theme.primary }]}>
                      {awayTeamTag}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.liveGameTitleRow}>
                    <Text style={[styles.liveGameTitle, { color: theme.text }]}>at </Text>
                    <TouchableOpacity onPress={() => handleTeamPress(homeTeamId, sportCategory)}>
                      <Text style={[styles.liveGameTitle, { color: theme.primary }]}>
                        {homeTeamTag}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.liveGameTitleContainer}>
                  <TouchableOpacity onPress={() => handleTeamPress(awayTeamId, sportCategory)}>
                    <Text style={[styles.liveGameTitle, { color: theme.primary }]}>
                      {awayTeamTag}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.liveGameTitle, { color: theme.text }]}> at </Text>
                  <TouchableOpacity onPress={() => handleTeamPress(homeTeamId, sportCategory)}>
                    <Text style={[styles.liveGameTitle, { color: theme.primary }]}>
                      {homeTeamTag}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
        
        <View style={styles.liveGameScoreSection}>
          <View style={styles.liveGameStatusRow}>
            <View style={styles.liveGameStatusLeft}>
              <View style={[styles.liveGameStatusDot, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.liveGameStatus, { color: theme.text }]}>
                {game.status} · {game.quarter} - {game.time}
              </Text>
            </View>
          </View>
          
          <View style={styles.liveGameScoreRow}>
            <View style={styles.liveGameTeamScore}>
              <Text style={[styles.liveGameScoreValue, { color: theme.text }]}>
                {game.teamScore}
              </Text>
              <Text style={[styles.liveGameTeamAbbr, { color: theme.textSecondary }]}>
                {game.teamName.substring(0, 3).toUpperCase()}
              </Text>
            </View>
            
            <Text style={[styles.liveGameScoreSeparator, { color: theme.text }]}>-</Text>
            
            <View style={styles.liveGameTeamScore}>
              <Text style={[styles.liveGameScoreValue, { color: theme.text }]}>
                {game.opponentScore}
              </Text>
              <Text style={[styles.liveGameTeamAbbr, { color: theme.textSecondary }]}>
                {game.opponentName.substring(0, 3).toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Reset tab when categoryId changes
  useEffect(() => {
    setSelectedTab('entities');
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: 0, animated: false });
    }, 100);
    return () => clearTimeout(timer);
  }, [categoryId]);

  const handleTabChange = (tab: 'entities' | 'about' | 'feed' | 'news') => {
    setSelectedTab(tab);
    const tabIndex = tab === 'entities' ? 0 : tab === 'about' ? 1 : tab === 'feed' ? 2 : 3;
    const scrollToX = tabIndex * SCREEN_WIDTH;
    scrollViewRef.current?.scrollTo({ x: scrollToX, animated: true });
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / SCREEN_WIDTH);
    const tabs: ('entities' | 'about' | 'feed' | 'news')[] = ['entities', 'about', 'feed', 'news'];
    const newTab = tabs[pageIndex];
    if (newTab && newTab !== selectedTab) {
      setSelectedTab(newTab);
    }
  };

  const handleEntityPress = (entityId: number, entityCategory: string) => {
    navigation.navigate('Entity', {
      entityId,
      categoryId: entityCategory,
    });
  };

  // Handle games scroll for page indicators
  const handleGamesScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentGamePageIndex(pageIndex);
  };

  // Helper function to convert team name to camelCase format for @tag
  const formatTeamTag = (teamName: string): string => {
    return teamName.replace(/\s+/g, '');
  };

  // Handler to navigate to team entity page
  const handleTeamPress = (teamId: number, sportCategory: string) => {
    (navigation as NavigationProp).navigate('Entity', {
      entityId: teamId,
      categoryId: sportCategory,
    });
  };

  // Generate all live game data for top 5 teams (NFL or NBA)
  const allLiveGames = useMemo(() => {
    if (categoryId === 'NFL Teams') {
      // Top 5 NFL teams by basePrice: Chiefs (100), Cowboys (114), Eagles (116), 49ers (127), Bills (101)
      const top5Teams = [
        { id: 100, name: 'Kansas City Chiefs' },
        { id: 114, name: 'Dallas Cowboys' },
        { id: 116, name: 'Philadelphia Eagles' },
        { id: 127, name: 'San Francisco 49ers' },
        { id: 101, name: 'Buffalo Bills' },
      ];
      
      // Create matchups for each top 5 team
      const matchups = [
        { team: top5Teams[0], opponent: top5Teams[4], teamScore: 24, opponentScore: 21, quarter: 'Q3', time: '8:45', status: 'LIVE', isAway: true }, // Chiefs at Bills
        { team: top5Teams[1], opponent: top5Teams[3], teamScore: 31, opponentScore: 28, quarter: 'Q4', time: '2:15', status: 'LIVE', isAway: true }, // Cowboys at 49ers
        { team: top5Teams[2], opponent: top5Teams[0], teamScore: 17, opponentScore: 14, quarter: 'Q2', time: '5:32', status: 'LIVE', isAway: true }, // Eagles at Chiefs
      ];
      
      // Return all games
      return matchups.map(game => ({
        teamName: game.team.name,
        teamId: game.team.id,
        teamScore: game.teamScore,
        opponentName: game.opponent.name,
        opponentId: game.opponent.id,
        opponentScore: game.opponentScore,
        quarter: game.quarter,
        time: game.time,
        status: game.status,
        isAway: game.isAway,
        sportCategory: 'NFL Teams',
      }));
    } else if (categoryId === 'NBA Teams') {
      // Top 5 NBA teams by basePrice: Celtics (200), Bucks (201), Nuggets (202), Suns (203), Lakers (204)
      const top5Teams = [
        { id: 200, name: 'Boston Celtics' },
        { id: 201, name: 'Milwaukee Bucks' },
        { id: 202, name: 'Denver Nuggets' },
        { id: 203, name: 'Phoenix Suns' },
        { id: 204, name: 'Los Angeles Lakers' },
      ];
      
      // Create matchups with realistic NBA scores (typically 90-130 range)
      const matchups = [
        { team: top5Teams[0], opponent: top5Teams[4], teamScore: 112, opponentScore: 108, quarter: 'Q4', time: '3:24', status: 'LIVE', isAway: true }, // Celtics at Lakers
        { team: top5Teams[1], opponent: top5Teams[2], teamScore: 98, opponentScore: 105, quarter: 'Q3', time: '7:15', status: 'LIVE', isAway: true }, // Bucks at Nuggets
        { team: top5Teams[3], opponent: top5Teams[0], teamScore: 119, opponentScore: 115, quarter: 'Q4', time: '1:42', status: 'LIVE', isAway: true }, // Suns at Celtics
        { team: top5Teams[4], opponent: top5Teams[1], teamScore: 102, opponentScore: 109, quarter: 'Q3', time: '5:33', status: 'LIVE', isAway: false }, // Lakers vs Bucks (home)
        { team: top5Teams[2], opponent: top5Teams[3], teamScore: 124, opponentScore: 118, quarter: 'Q4', time: '2:18', status: 'LIVE', isAway: false }, // Nuggets vs Suns (home)
      ];
      
      // Return all games
      return matchups.map(game => ({
        teamName: game.team.name,
        teamId: game.team.id,
        teamScore: game.teamScore,
        opponentName: game.opponent.name,
        opponentId: game.opponent.id,
        opponentScore: game.opponentScore,
        quarter: game.quarter,
        time: game.time,
        status: game.status,
        isAway: game.isAway,
        sportCategory: 'NBA Teams',
      }));
    }
    
    return [];
  }, [categoryId]);

  const renderEntity = ({ item }: { item: typeof entities[0] }) => {
    // Get initials from name (first 2 letters)
    const getInitials = (name: string) => {
      return name.substring(0, 2).toUpperCase();
    };

    return (
      <TouchableOpacity
        style={[styles.entityCard, { backgroundColor: theme.card, borderBottomColor: theme.border }]}
        onPress={() => handleEntityPress(item.id, item.category)}
      >
        <View style={styles.rankContainer}>
          <Text style={[styles.rankNumber, { color: theme.textSecondary }]}>{item.rank}</Text>
        </View>
        <View style={styles.entityLeft}>
          <View style={[styles.entityIcon, { backgroundColor: theme.primaryLight }]}>
            <Text style={[styles.entityIconText, { color: theme.primary }]}>
              {getInitials(item.name)}
            </Text>
          </View>
          <View style={styles.entityInfo}>
            <Text style={[styles.entityName, { color: theme.text }]}>{item.name}</Text>
            {(categoryId === 'People' || categoryId === 'Teams') && (
              <Text style={[styles.entitySubcategory, { color: theme.textSecondary }]}>
                {item.category}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.entityRight}>
          <Text style={[styles.entityPrice, { color: theme.text }]}>
            {formatCurrency(item.currentPrice)}
          </Text>
          <View style={styles.entityChangeContainer}>
          <Text style={[styles.entityChange, { color: getChangeColor(item.change24h) }]}>
              {item.change24h === 0 ? '' : item.change24h >= 0 ? '+' : ''}
              {formatCurrency(Math.abs(item.change24h))}
            </Text>
            <Text style={[styles.entityChangePercent, { color: getChangeColor(item.change24h) }]}>
              {' '}({item.changePercent24h === 0 ? '' : item.changePercent24h >= 0 ? '+' : ''}
              {item.changePercent24h.toFixed(2)}%)
          </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{displayName}</Text>
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
            style={styles.addButton}
            onPress={async () => {
              try {
                // Get current added categories from AsyncStorage
                const stored = await AsyncStorage.getItem('addedCategories');
                const currentCategories = stored ? JSON.parse(stored) : [];
                
                // Add category if not already added
                if (!currentCategories.includes(categoryId)) {
                  const updated = [...currentCategories, categoryId];
                  await AsyncStorage.setItem('addedCategories', JSON.stringify(updated));
                  Alert.alert('Added', `Top 5 entities from ${categoryId} have been added to your home screen.`);
                } else {
                  Alert.alert('Already Added', `${categoryId} is already on your home screen.`);
                }
              } catch (error) {
                console.error('Error adding category:', error);
                Alert.alert('Error', 'Failed to add category. Please try again.');
              }
            }}
          >
            <Ionicons name="add" size={28} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={[styles.tabSelectorContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabSelector}
          contentContainerStyle={styles.tabSelectorContent}
        >
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => handleTabChange('entities')}
          >
            <Text
              style={[
                styles.tabButtonText,
                {
                  color: selectedTab === 'entities' ? theme.text : theme.textSecondary,
                  fontWeight: selectedTab === 'entities' ? '600' : '400',
                }
              ]}
            >
              Entities
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
        {/* Entities Tab */}
        <View style={{ width: SCREEN_WIDTH }}>
      <FlatList
        data={entities}
        renderItem={renderEntity}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={renderEmptyState}
          />
        </View>

        {/* About Tab */}
        <View style={{ width: SCREEN_WIDTH }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.comingSoonContainer}>
              <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
                Coming soon
              </Text>
            </View>
          </ScrollView>
        </View>

        {/* Feed Tab */}
        <View style={{ width: SCREEN_WIDTH }}>
          <FlatList
            data={categoryFeedPosts}
            renderItem={({ item }) => <PostCard post={item} isCategoryFeed={true} categoryId={categoryId} categoryName={displayName} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.feedContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={() => (
          <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color={theme.textTertiary} />
                <Text style={[styles.emptyStateText, { color: theme.text }]}>
                  No posts yet in this category
                </Text>
          </View>
            )}
      />
        </View>

        {/* News Tab */}
        <View style={{ width: SCREEN_WIDTH }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {(categoryId === 'NFL Teams' || categoryId === 'NBA Teams') && allLiveGames.length > 0 && (
              <View>
                {/* Swipeable Games Section */}
                <View style={styles.gamesSwipeableContainer}>
                  <ScrollView
                    ref={gamesScrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleGamesScroll}
                    scrollEventThrottle={16}
                    style={styles.gamesScrollView}
                    contentContainerStyle={styles.gamesScrollContent}
                  >
                    {allLiveGames.map((game, index) => (
                      <View key={`${game.teamId}-${game.opponentId}`} style={styles.gamePage}>
                        {renderLiveGameModule(game)}
                      </View>
                    ))}
                  </ScrollView>
                  
                  {/* Page Indicator Dots */}
                  <View style={styles.pageIndicatorContainer}>
                    {allLiveGames.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.pageIndicatorDot,
                          {
                            backgroundColor: currentGamePageIndex === index ? theme.primary : theme.border,
                            width: currentGamePageIndex === index ? 8 : 6,
                            height: currentGamePageIndex === index ? 8 : 6,
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </View>
            )}
            <View style={styles.comingSoonContainer}>
              <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
                {displayName} news coming soon
              </Text>
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      {/* Fixed Bottom Buttons - Only show on Feed tab */}
      {selectedTab === 'feed' && (
        <View style={[styles.bottomBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <View style={styles.bottomButtonsContainer}>
            {/* Left Side: Post Button */}
            <TouchableOpacity
              style={styles.postButton}
              onPress={() => setShareOpinionModalVisible(true)}
            >
              <Text style={styles.postButtonText}>Post</Text>
            </TouchableOpacity>

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
                onPress={() => {
                  Alert.alert(
                    'Category Alerts',
                    'Category-level alerts are coming soon. For now, you can set alerts for individual entities within this category.',
                    [{ text: 'OK' }]
                  );
                }}
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
      )}

      {/* Share Opinion Modal */}
      <CreatePostModal
        visible={shareOpinionModalVisible}
        onClose={() => setShareOpinionModalVisible(false)}
        categoryId={categoryId}
        categoryName={displayName}
        slideFromBottom={true}
        prefillCategoryTag={true}
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
                Positions - {displayName}
              </Text>
              <TouchableOpacity
                onPress={() => setPositionsModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            {categoryPositions.length > 0 ? (
              <ScrollView style={styles.positionsModalBody} showsVerticalScrollIndicator={false}>
                {categoryPositions.map(({ entityId, entityName, position, openPnL, currentPrice }) => (
                  <View key={entityId} style={[styles.positionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.positionEntityName, { color: theme.text }]}>{entityName}</Text>
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
                      <Text style={[styles.positionLabel, { color: theme.textSecondary }]}>Open P&L</Text>
                      <Text style={[styles.positionValue, { color: openPnL >= 0 ? '#10B981' : '#EF4444' }]}>
                        {openPnL >= 0 ? '+' : ''}{formatCurrency(openPnL)}
                      </Text>
                    </View>
                    <View style={[styles.positionDivider, { backgroundColor: theme.border }]} />
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyPositionsContainer}>
                <Text style={[styles.emptyPositionsText, { color: theme.textSecondary }]}>
                  You don't have any open positions in this category
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 40,
    justifyContent: 'flex-end',
  },
  searchButton: {
    padding: 4,
    marginRight: 8,
  },
  addButton: {
    padding: 4,
  },
  listContent: {
    paddingVertical: 8,
  },
  entityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: 50,
    marginRight: 8,
    position: 'relative',
  },
  rankNumber: {
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
  entityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  entityIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  entityIconText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  entityInfo: {
    flex: 1,
  },
  entityName: {
    fontSize: 16,
    fontWeight: '600',
  },
  entitySubcategory: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  entityRight: {
    alignItems: 'flex-end',
  },
  entityPrice: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  entityChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  entityChange: {
    fontSize: 12,
    fontWeight: '600',
  },
  entityChangePercent: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 16,
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
  },
  comingSoonText: {
    fontSize: 16,
  },
  feedContent: {
    paddingBottom: 16,
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
    flex: 1,
    justifyContent: 'center',
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
  gamesSwipeableContainer: {
    height: 280,
    marginTop: 16,
  },
  gamesScrollView: {
    flex: 1,
  },
  gamesScrollContent: {
    flexDirection: 'row',
  },
  gamePage: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  pageIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
  pageIndicatorDot: {
    borderRadius: 4,
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
  postButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#775a96',
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  postButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#775a96',
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
    maxHeight: '80%',
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  positionsModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionsModalBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  positionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  positionEntityName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  positionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  positionLabel: {
    fontSize: 14,
  },
  positionValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  positionDivider: {
    height: 1,
    marginTop: 8,
  },
  emptyPositionsContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPositionsText: {
    fontSize: 16,
  },
});


