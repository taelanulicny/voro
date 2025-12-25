import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Post } from '../types';
import { useTrading } from '../context/TradingContext';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';
import { getEntitiesByCategory } from '../utils/mockEntities';
import PostCard from '../components/PostCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type CategoryRouteProp = RouteProp<RootStackParamList, 'Category'>;

export default function CategoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CategoryRouteProp>();
  const { categoryId } = route.params;
  const { getEntityPrice } = useTrading();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'entities' | 'about' | 'feed'>('entities');

  // Category-specific feed posts
  const categoryFeedPosts = useMemo(() => {
    const now = Date.now();
    const basePosts: Record<string, Post[]> = {
      'Influencers': [
        {
          id: 'inf-1',
          userId: 'user-1',
          username: 'trading_pro',
          displayName: 'Trading Pro',
          content: '@Alix Earle Her engagement rates are through the roof! 📈',
          entityId: 11,
          entityTicker: 'ALIX',
          entityName: 'Alix Earle',
          sentiment: 'positive',
          likes: 142,
          comments: 23,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 15).toISOString(),
        },
        {
          id: 'inf-1b',
          userId: 'user-6',
          username: 'zuey',
          displayName: 'Zuey',
          content: 'can anyone explain to me where people are getting "you are just getting your money back" when this thing basically tracks the Nasdaq 🤔... it even does something better.... gives you the ability to use cash without selling shares 🙌',
          entityId: undefined,
          entityTicker: undefined,
          entityName: undefined,
          sentiment: undefined,
          likes: 89,
          comments: 12,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
        },
        {
          id: 'inf-6',
          userId: 'user-7',
          username: 'content_analyst',
          displayName: 'Content Analyst',
          content: 'The influencer market is really heating up right now. @Alix Earle seems to be leading the pack with her recent brand deals.',
          entityId: 11,
          entityTicker: 'ALIX',
          entityName: 'Alix Earle',
          sentiment: 'positive',
          likes: 156,
          comments: 28,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 30).toISOString(),
        },
        {
          id: 'inf-7',
          userId: 'user-8',
          username: 'social_media_guru',
          displayName: 'Social Media Guru',
          content: 'Just thinking about the state of influencer marketing these days. The landscape has changed so much.',
          entityId: undefined,
          entityTicker: undefined,
          entityName: undefined,
          sentiment: undefined,
          likes: 67,
          comments: 9,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
        },
        {
          id: 'inf-2',
          userId: 'user-2',
          username: 'market_watcher',
          displayName: 'Market Watcher',
          content: 'Not feeling great about @MrBeast lately. The content quality seems to be declining.',
          entityId: 12,
          entityTicker: 'MRBE',
          entityName: 'MrBeast',
          sentiment: 'negative',
          likes: 89,
          comments: 15,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 45).toISOString(),
        },
        {
          id: 'inf-3',
          userId: 'user-3',
          username: 'social_analyst',
          displayName: 'Social Analyst',
          content: '@Kai Cenat is on fire! His recent streams have been pulling insane numbers. This is a great buy opportunity.',
          entityId: 13,
          entityTicker: 'KAI',
          entityName: 'Kai Cenat',
          sentiment: 'positive',
          likes: 203,
          comments: 34,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
        },
        {
          id: 'inf-4',
          userId: 'user-4',
          username: 'content_king',
          displayName: 'Content King',
          content: '@Logan Paul might be overvalued. Too much controversy lately affecting his brand deals.',
          entityId: 15,
          entityTicker: 'LOGP',
          entityName: 'Logan Paul',
          sentiment: 'negative',
          likes: 67,
          comments: 12,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
        },
        {
          id: 'inf-5',
          userId: 'user-5',
          username: 'influencer_tracker',
          displayName: 'Influencer Tracker',
          content: '@Emma Chamberlain is still the queen of lifestyle content. Her brand partnerships are solid.',
          entityId: 16,
          entityTicker: 'EMMC',
          entityName: 'Emma Chamberlain',
          sentiment: 'positive',
          likes: 178,
          comments: 28,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
        },
      ],
      'Music Artists': [
        {
          id: 'music-1',
          userId: 'user-1',
          username: 'music_fan',
          displayName: 'Music Fan',
          content: '@Taylor Swift is unstoppable! The Eras Tour is generating massive revenue. This is a no-brainer.',
          entityId: 21,
          entityTicker: 'TSWI',
          entityName: 'Taylor Swift',
          sentiment: 'positive',
          likes: 312,
          comments: 45,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 20).toISOString(),
        },
        {
          id: 'music-2',
          userId: 'user-2',
          username: 'hiphop_head',
          displayName: 'Hip Hop Head',
          content: '@Drake\'s latest album didn\'t hit like the old ones. Streaming numbers are down.',
          entityId: 22,
          entityTicker: 'DRAK',
          entityName: 'Drake',
          sentiment: 'negative',
          likes: 156,
          comments: 29,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
        },
        {
          id: 'music-3',
          userId: 'user-3',
          username: 'chart_watcher',
          displayName: 'Chart Watcher',
          content: '@Bad Bunny is dominating the Latin market. His global appeal is incredible.',
          entityId: 24,
          entityTicker: 'BABU',
          entityName: 'Bad Bunny',
          sentiment: 'positive',
          likes: 234,
          comments: 38,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
        },
        {
          id: 'music-4',
          userId: 'user-4',
          username: 'pop_analyst',
          displayName: 'Pop Analyst',
          content: '@Olivia Rodrigo\'s sophomore album is underperforming. The hype might be fading.',
          entityId: 26,
          entityTicker: 'OLRO',
          entityName: 'Olivia Rodrigo',
          sentiment: 'negative',
          likes: 98,
          comments: 18,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
        },
        {
          id: 'music-5',
          userId: 'user-5',
          username: 'music_investor',
          displayName: 'Music Investor',
          content: '@Travis Scott\'s comeback is real. The festival performances are selling out everywhere.',
          entityId: 25,
          entityTicker: 'TRSC',
          entityName: 'Travis Scott',
          sentiment: 'positive',
          likes: 189,
          comments: 31,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
        },
        {
          id: 'music-6',
          userId: 'user-9',
          username: 'chart_analyst',
          displayName: 'Chart Analyst',
          content: 'Streaming numbers are through the roof this quarter. @Taylor Swift continues to dominate the charts.',
          entityId: 21,
          entityTicker: 'TSWI',
          entityName: 'Taylor Swift',
          sentiment: 'positive',
          likes: 245,
          comments: 42,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 45).toISOString(),
        },
        {
          id: 'music-7',
          userId: 'user-10',
          username: 'music_lover',
          displayName: 'Music Lover',
          content: 'What do you all think about the current state of the music industry? The streaming model seems to be evolving.',
          entityId: undefined,
          entityTicker: undefined,
          entityName: undefined,
          sentiment: undefined,
          likes: 112,
          comments: 18,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
        },
      ],
      'Sports': [
        {
          id: 'sports-1',
          userId: 'user-1',
          username: 'sports_fan',
          displayName: 'Sports Fan',
          content: '@Los Angeles Lakers are looking strong this season. LeBron\'s leadership is unmatched.',
          entityId: 1,
          entityTicker: 'LAL',
          entityName: 'Los Angeles Lakers',
          sentiment: 'positive',
          likes: 245,
          comments: 42,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 30).toISOString(),
        },
        {
          id: 'sports-2',
          userId: 'user-2',
          username: 'nba_analyst',
          displayName: 'NBA Analyst',
          content: '@Golden State Warriors are struggling with injuries. This season might be a wash for them.',
          entityId: 2,
          entityTicker: 'GSW',
          entityName: 'Golden State Warriors',
          sentiment: 'negative',
          likes: 134,
          comments: 22,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
        },
        {
          id: 'sports-3',
          userId: 'user-3',
          username: 'football_fan',
          displayName: 'Football Fan',
          content: '@Kansas City Chiefs are dominating! Mahomes is in MVP form. This is the team to watch.',
          entityId: 3,
          entityTicker: 'KC',
          entityName: 'Kansas City Chiefs',
          sentiment: 'positive',
          likes: 298,
          comments: 51,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
        },
        {
          id: 'sports-4',
          userId: 'user-4',
          username: 'sports_trader',
          displayName: 'Sports Trader',
          content: '@New York Yankees are having a rough year. The roster changes aren\'t working out.',
          entityId: 4,
          entityTicker: 'NYY',
          entityName: 'New York Yankees',
          sentiment: 'negative',
          likes: 112,
          comments: 19,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
        },
        {
          id: 'sports-5',
          userId: 'user-5',
          username: 'mlb_watcher',
          displayName: 'MLB Watcher',
          content: '@Los Angeles Dodgers are looking unstoppable. The pitching rotation is elite this year.',
          entityId: 5,
          entityTicker: 'LAD',
          entityName: 'Los Angeles Dodgers',
          sentiment: 'positive',
          likes: 167,
          comments: 27,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
        },
        {
          id: 'sports-6',
          userId: 'user-11',
          username: 'nfl_analyst',
          displayName: 'NFL Analyst',
          content: 'This season has been wild so far. @Kansas City Chiefs are showing why they\'re the team to beat.',
          entityId: 3,
          entityTicker: 'KC',
          entityName: 'Kansas City Chiefs',
          sentiment: 'positive',
          likes: 201,
          comments: 35,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 20).toISOString(),
        },
        {
          id: 'sports-7',
          userId: 'user-12',
          username: 'sports_enthusiast',
          displayName: 'Sports Enthusiast',
          content: 'The trade deadline is approaching. Curious to see which teams make moves this year.',
          entityId: undefined,
          entityTicker: undefined,
          entityName: undefined,
          sentiment: undefined,
          likes: 78,
          comments: 14,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
        },
      ],
      'Political Figures': [
        {
          id: 'pol-1',
          userId: 'user-1',
          username: 'political_analyst',
          displayName: 'Political Analyst',
          content: '@Donald Trump\'s polling numbers are strong. The base is energized and engaged.',
          entityId: 10,
          entityTicker: 'TRUMP',
          entityName: 'Donald Trump',
          sentiment: 'positive',
          likes: 423,
          comments: 67,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 25).toISOString(),
        },
        {
          id: 'pol-2',
          userId: 'user-2',
          username: 'election_watcher',
          displayName: 'Election Watcher',
          content: '@Nikki Haley is losing momentum. Her campaign isn\'t gaining traction with voters.',
          entityId: 1,
          entityTicker: 'NHAL',
          entityName: 'Nikki Haley',
          sentiment: 'negative',
          likes: 198,
          comments: 34,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
        },
        {
          id: 'pol-3',
          userId: 'user-3',
          username: 'politics_trader',
          displayName: 'Politics Trader',
          content: 'The political landscape is shifting. @Donald Trump\'s influence is undeniable right now.',
          entityId: 10,
          entityTicker: 'TRUMP',
          entityName: 'Donald Trump',
          sentiment: 'positive',
          likes: 356,
          comments: 58,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
        },
        {
          id: 'pol-4',
          userId: 'user-4',
          username: 'campaign_tracker',
          displayName: 'Campaign Tracker',
          content: '@Nikki Haley\'s messaging isn\'t resonating. She needs to pivot her strategy.',
          entityId: 1,
          entityTicker: 'NHAL',
          entityName: 'Nikki Haley',
          sentiment: 'negative',
          likes: 145,
          comments: 26,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
        },
        {
          id: 'pol-5',
          userId: 'user-5',
          username: 'political_insider',
          displayName: 'Political Insider',
          content: 'The debates are showing @Donald Trump\'s strength. He\'s clearly the frontrunner.',
          entityId: 10,
          entityTicker: 'TRUMP',
          entityName: 'Donald Trump',
          sentiment: 'positive',
          likes: 289,
          comments: 43,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
        },
        {
          id: 'pol-6',
          userId: 'user-13',
          username: 'election_analyst',
          displayName: 'Election Analyst',
          content: 'The polling data is really interesting this cycle. @Donald Trump seems to be gaining momentum in key swing states.',
          entityId: 10,
          entityTicker: 'TRUMP',
          entityName: 'Donald Trump',
          sentiment: 'positive',
          likes: 312,
          comments: 51,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 35).toISOString(),
        },
        {
          id: 'pol-7',
          userId: 'user-14',
          username: 'political_observer',
          displayName: 'Political Observer',
          content: 'The campaign strategies this year are fascinating. Both sides are trying new approaches to reach voters.',
          entityId: undefined,
          entityTicker: undefined,
          entityName: undefined,
          sentiment: undefined,
          likes: 134,
          comments: 22,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
        },
      ],
      'Startups': [
        {
          id: 'startup-1',
          userId: 'user-1',
          username: 'tech_investor',
          displayName: 'Tech Investor',
          content: '@Perplexity is revolutionizing search. Their AI approach is game-changing. This is a strong buy.',
          entityId: 32,
          entityTicker: 'PERP',
          entityName: 'Perplexity',
          sentiment: 'positive',
          likes: 267,
          comments: 39,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 18).toISOString(),
        },
        {
          id: 'startup-2',
          userId: 'user-2',
          username: 'ai_analyst',
          displayName: 'AI Analyst',
          content: '@Character.AI is struggling with monetization. The user growth is there but revenue isn\'t.',
          entityId: 36,
          entityTicker: 'CHAR',
          entityName: 'Character.AI',
          sentiment: 'negative',
          likes: 123,
          comments: 21,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 50).toISOString(),
        },
        {
          id: 'startup-3',
          userId: 'user-3',
          username: 'startup_tracker',
          displayName: 'Startup Tracker',
          content: '@Cursor is becoming essential for developers. The productivity gains are incredible.',
          entityId: 38,
          entityTicker: 'CURS',
          entityName: 'Cursor',
          sentiment: 'positive',
          likes: 312,
          comments: 48,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
        },
        {
          id: 'startup-4',
          userId: 'user-4',
          username: 'vc_insider',
          displayName: 'VC Insider',
          content: '@Replit\'s growth has slowed. The competition in the coding space is intense.',
          entityId: 34,
          entityTicker: 'REPL',
          entityName: 'Replit',
          sentiment: 'negative',
          likes: 156,
          comments: 28,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
        },
        {
          id: 'startup-5',
          userId: 'user-5',
          username: 'tech_enthusiast',
          displayName: 'Tech Enthusiast',
          content: '@Luma AI is pushing boundaries in video generation. The quality improvements are impressive.',
          entityId: 37,
          entityTicker: 'LUMA',
          entityName: 'Luma AI',
          sentiment: 'positive',
          likes: 234,
          comments: 35,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
        },
        {
          id: 'startup-6',
          userId: 'user-15',
          username: 'ai_researcher',
          displayName: 'AI Researcher',
          content: 'The AI space is moving so fast. @Cursor has really changed how developers work with code.',
          entityId: 38,
          entityTicker: 'CURS',
          entityName: 'Cursor',
          sentiment: 'positive',
          likes: 278,
          comments: 41,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 25).toISOString(),
        },
        {
          id: 'startup-7',
          userId: 'user-16',
          username: 'tech_thinker',
          displayName: 'Tech Thinker',
          content: 'What\'s everyone\'s take on the current startup funding environment? Seems like investors are being more selective.',
          entityId: undefined,
          entityTicker: undefined,
          entityName: undefined,
          sentiment: undefined,
          likes: 145,
          comments: 24,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
        },
      ],
    };

    return basePosts[categoryId] || [];
  }, [categoryId]);

  // Map category IDs to display names
  const categoryDisplayNames: Record<string, string> = {
    'Influencers': 'Influencers',
    'Music Artists': 'Music Artists',
    'Sports': 'Sports',
    'Political Figures': 'Political Figures',
    'Startups': 'Startups',
    // Map to actual entity categories if needed
    'People': 'Influencers',
    'Politics': 'Political Figures',
    'Tech': 'Startups',
    'Events': 'Sports',
  };

  const displayName = categoryDisplayNames[categoryId] || categoryId;
  
  // Get entities for this category
  // For now, we'll use a simple mapping. Later this can be replaced with real data
  const categoryToEntityCategory: Record<string, string> = {
    'Influencers': 'People',
    'Music Artists': 'People',
    'Sports': 'Events',
    'Political Figures': 'Politics',
    'Startups': 'Tech',
  };

  const entityCategory = categoryToEntityCategory[categoryId] || categoryId;
  
  // Mock previous day rankings (yesterday's ranks)
  // This would normally come from a backend/database
  const previousDayRanks = useMemo(() => {
    const mockRanks: Record<number, number> = {};
    let filteredEntities = getEntitiesByCategory(entityCategory);
    
    if (categoryId === 'Music Artists') {
      filteredEntities = filteredEntities.filter(entity => entity.id >= 21 && entity.id <= 30);
    } else if (categoryId === 'Influencers') {
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
    sortedPrevious.forEach((entity, index) => {
      mockRanks[entity.id] = index + 1;
    });
    
    return mockRanks;
  }, [entityCategory, categoryId, getEntityPrice]);
  
  const entities = useMemo(() => {
    let filteredEntities = getEntitiesByCategory(entityCategory);
    
    // Filter out influencers from Music Artists (both use 'People' category)
    // Influencers: IDs 11-20, Music Artists: IDs 21-30
    if (categoryId === 'Music Artists') {
      filteredEntities = filteredEntities.filter(entity => entity.id >= 21 && entity.id <= 30);
    } else if (categoryId === 'Influencers') {
      filteredEntities = filteredEntities.filter(entity => entity.id >= 11 && entity.id <= 20);
    }
    
    const mappedEntities = filteredEntities.map((entity) => {
      const currentPrice = getEntityPrice(entity.id);
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
  }, [entityCategory, categoryId, getEntityPrice, previousDayRanks]);

  const renderEmptyState = () => {
    const isSportsCategory = categoryId === 'Sports';
    return (
      <View style={styles.emptyState}>
        <Ionicons name="folder-outline" size={48} color={theme.textTertiary} />
        <Text style={[styles.emptyStateText, { color: theme.text }]}>
          {isSportsCategory ? 'Entities coming soon' : 'No entities in this category'}
        </Text>
      </View>
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleEntityPress = (entityId: number, entityCategory: string) => {
    navigation.navigate('Entity', {
      entityId,
      categoryId: entityCategory,
    });
  };

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
          {item.positionChange !== 0 && (
            <View style={styles.positionChangeContainer}>
              {item.positionChange > 0 ? (
                <View style={styles.positionChangeUp}>
                  <Ionicons name="arrow-up" size={10} color="#10B981" />
                  <Text style={styles.positionChangeTextUp}>{item.positionChange}</Text>
                </View>
              ) : (
                <View style={styles.positionChangeDown}>
                  <Ionicons name="arrow-down" size={10} color="#EF4444" />
                  <Text style={styles.positionChangeTextDown}>{Math.abs(item.positionChange)}</Text>
                </View>
              )}
            </View>
          )}
        </View>
        <View style={styles.entityLeft}>
          <View style={[styles.entityIcon, { backgroundColor: theme.primaryLight }]}>
            <Text style={[styles.entityIconText, { color: theme.primary }]}>
              {getInitials(item.name)}
            </Text>
          </View>
          <View style={styles.entityInfo}>
            <Text style={[styles.entityName, { color: theme.text }]}>{item.name}</Text>
          </View>
        </View>
        <View style={styles.entityRight}>
          <Text style={[styles.entityPrice, { color: theme.text }]}>
            {formatCurrency(item.currentPrice)}
          </Text>
          <Text style={[styles.entityChange, { color: getChangeColor(item.change24h) }]}>
            {item.change24h >= 0 ? '+' : ''}
            {item.changePercent24h.toFixed(2)}%
          </Text>
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
        <View style={{ width: 40 }} />
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
            onPress={() => setSelectedTab('entities')}
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
        </ScrollView>
      </View>

      {/* Content based on selected tab */}
      {selectedTab === 'entities' && (
        <FlatList
          data={entities}
          renderItem={renderEntity}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={renderEmptyState}
        />
      )}

      {selectedTab === 'about' && (
        <View style={styles.comingSoonContainer}>
          <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
            Coming soon
          </Text>
        </View>
      )}

      {selectedTab === 'feed' && (
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
  entityRight: {
    alignItems: 'flex-end',
  },
  entityPrice: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  entityChange: {
    fontSize: 13,
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
});


