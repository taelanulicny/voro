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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Ellipse, Line, Rect } from 'react-native-svg';
import { RootStackParamList, Post } from '../types';
import { useTrading } from '../context/TradingContext';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';
import { getEntitiesByCategory, getEntityById } from '../utils/mockEntities';
import PostCard from '../components/PostCard';
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
  const { getEntityPrice, getAllEntityPrices } = useTrading();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'entities' | 'about' | 'feed' | 'news'>('entities');
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentGamePageIndex, setCurrentGamePageIndex] = useState(0);
  const gamesScrollRef = useRef<ScrollView>(null);

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
          content: '@AlixEarle just signed a massive deal with a skincare brand. Her engagement metrics are through the roof! 📈',
          entityId: 11,
          entityTicker: 'ALIX',
          entityName: 'Alix Earle',
          sentiment: 'positive',
          likes: 267,
          comments: 38,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 12).toISOString(),
        },
        {
          id: 'inf-1b',
          userId: 'user-6',
          username: 'zuey',
          displayName: 'Zuey',
          content: 'The influencer marketing landscape is shifting. TikTok creators are getting bigger brand deals than ever before. What do you all think?',
          entityId: undefined,
          entityTicker: undefined,
          entityName: undefined,
          sentiment: undefined,
          likes: 145,
          comments: 28,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 45).toISOString(),
        },
        {
          id: 'inf-2',
          userId: 'user-2',
          username: 'market_watcher',
          displayName: 'Market Watcher',
          content: '@MrBeast\'s recent video didn\'t hit the same. Views are down and the engagement feels off. Maybe oversaturation?',
          entityId: 12,
          entityTicker: 'MRBST',
          entityName: 'MrBeast',
          sentiment: 'negative',
          likes: 189,
          comments: 42,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 30).toISOString(),
        },
        {
          id: 'inf-3',
          userId: 'user-3',
          username: 'social_analyst',
          displayName: 'Social Analyst',
          content: '@KaiCenat is absolutely crushing it on Kick. His stream numbers are insane and he\'s pulling in new sponsorships every week.',
          entityId: 14,
          entityTicker: 'KACEN',
          entityName: 'Kai Cenat',
          sentiment: 'positive',
          likes: 312,
          comments: 51,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
        },
        {
          id: 'inf-4',
          userId: 'user-4',
          username: 'content_king',
          displayName: 'Content King',
          content: 'Not a good look for @LoganPaul. The recent drama is affecting his brand partnerships. @JakePaul might be the better bet right now.',
          entityId: 15,
          entityTicker: 'LPAUL',
          entityName: 'Logan Paul',
          sentiment: 'negative',
          likes: 234,
          comments: 39,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
        },
        {
          id: 'inf-5',
          userId: 'user-5',
          username: 'influencer_tracker',
          displayName: 'Influencer Tracker',
          content: '@EmmaChamberlain just launched her coffee brand and it\'s already sold out. The lifestyle content queen strikes again!',
          entityId: 16,
          entityTicker: 'ECHAM',
          entityName: 'Emma Chamberlain',
          sentiment: 'positive',
          likes: 298,
          comments: 45,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
        },
        {
          id: 'inf-6',
          userId: 'user-7',
          username: 'content_analyst',
          displayName: 'Content Analyst',
          content: '@AdinRoss and @KaiCenat collabing was huge. Both of their stocks went up after that stream. Smart move by both.',
          entityId: 17,
          entityTicker: 'AROSS',
          entityName: 'Adin Ross',
          sentiment: 'positive',
          likes: 356,
          comments: 62,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
        },
        {
          id: 'inf-7',
          userId: 'user-8',
          username: 'social_media_guru',
          displayName: 'Social Media Guru',
          content: 'The shift from Instagram to TikTok for influencer marketing is real. Engagement rates are way higher on short-form video platforms.',
          entityId: undefined,
          entityTicker: undefined,
          entityName: undefined,
          sentiment: undefined,
          likes: 112,
          comments: 18,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
        },
        {
          id: 'inf-8',
          userId: 'user-9',
          username: 'brand_deals',
          displayName: 'Brand Deals',
          content: '@CharliDAmelio\'s comeback is real. Her recent partnerships are bringing back the engagement she had during peak TikTok.',
          entityId: 20,
          entityTicker: 'CDAME',
          entityName: 'Charli D\'Amelio',
          sentiment: 'positive',
          likes: 278,
          comments: 41,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 20).toISOString(),
        },
      ],
      'Political Figures': [
        {
          id: 'pol-1',
          userId: 'user-1',
          username: 'political_analyst',
          displayName: 'Political Analyst',
          content: '@DonaldTrump\'s rally turnout numbers are massive. The base enthusiasm is off the charts compared to previous cycles.',
          entityId: 10,
          entityTicker: 'TRUMP',
          entityName: 'Donald Trump',
          sentiment: 'positive',
          likes: 534,
          comments: 89,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 20).toISOString(),
        },
        {
          id: 'pol-2',
          userId: 'user-2',
          username: 'election_watcher',
          displayName: 'Election Watcher',
          content: '@NikkiHaley\'s campaign is struggling to find its footing. The fundraising numbers aren\'t where they need to be.',
          entityId: 11,
          entityTicker: 'NHAL',
          entityName: 'Nikki Haley',
          sentiment: 'negative',
          likes: 234,
          comments: 45,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 45).toISOString(),
        },
        {
          id: 'pol-3',
          userId: 'user-3',
          username: 'politics_trader',
          displayName: 'Politics Trader',
          content: 'The social media engagement for @DonaldTrump is crushing everyone else. His reach is unmatched right now.',
          entityId: 10,
          entityTicker: 'TRUMP',
          entityName: 'Donald Trump',
          sentiment: 'positive',
          likes: 412,
          comments: 67,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
        },
        {
          id: 'pol-4',
          userId: 'user-4',
          username: 'campaign_tracker',
          displayName: 'Campaign Tracker',
          content: '@GavinNewsom\'s approval ratings are taking a hit. The policy decisions aren\'t landing well with voters.',
          entityId: 12,
          entityTicker: 'GNEW',
          entityName: 'Gavin Newsom',
          sentiment: 'negative',
          likes: 189,
          comments: 38,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
        },
        {
          id: 'pol-5',
          userId: 'user-5',
          username: 'political_insider',
          displayName: 'Political Insider',
          content: 'The debate performance by @DonaldTrump changed the whole narrative. Media coverage shifted overnight.',
          entityId: 10,
          entityTicker: 'TRUMP',
          entityName: 'Donald Trump',
          sentiment: 'positive',
          likes: 356,
          comments: 58,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
        },
        {
          id: 'pol-6',
          userId: 'user-13',
          username: 'election_analyst',
          displayName: 'Election Analyst',
          content: 'Swing state polling shows @DonaldTrump gaining ground in key battlegrounds. The electoral map is shifting.',
          entityId: 10,
          entityTicker: 'TRUMP',
          entityName: 'Donald Trump',
          sentiment: 'positive',
          likes: 389,
          comments: 62,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 30).toISOString(),
        },
        {
          id: 'pol-7',
          userId: 'user-14',
          username: 'political_observer',
          displayName: 'Political Observer',
          content: 'The use of AI and social media in campaigns this cycle is unprecedented. Both sides are pushing boundaries.',
          entityId: undefined,
          entityTicker: undefined,
          entityName: undefined,
          sentiment: undefined,
          likes: 167,
          comments: 29,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
        },
        {
          id: 'pol-8',
          userId: 'user-15',
          username: 'politics_tracker',
          displayName: 'Politics Tracker',
          content: '@GavinNewsom and @NikkiHaley both struggling with independent voters. The middle ground is shrinking.',
          entityId: 12,
          entityTicker: 'GNEW',
          entityName: 'Gavin Newsom',
          sentiment: 'negative',
          likes: 278,
          comments: 51,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
        },
      ],
      'Actors': [
        {
          id: 'actor-1',
          userId: 'user-1',
          username: 'film_critic',
          displayName: 'Film Critic',
          content: '@Zendaya just won another Emmy. Her range from Euphoria to Dune shows she\'s one of the most versatile actors working today.',
          entityId: 50,
          entityTicker: 'ZENDA',
          entityName: 'Zendaya',
          sentiment: 'positive',
          likes: 445,
          comments: 72,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 15).toISOString(),
        },
        {
          id: 'actor-2',
          userId: 'user-2',
          username: 'movie_buff',
          displayName: 'Movie Buff',
          content: '@TimothéeChalamet\'s performance in Dune 2 was incredible. He\'s becoming the face of this generation of actors.',
          entityId: 51,
          entityTicker: 'TIMCH',
          entityName: 'Timothée Chalamet',
          sentiment: 'positive',
          likes: 389,
          comments: 58,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 30).toISOString(),
        },
        {
          id: 'actor-3',
          userId: 'user-3',
          username: 'tv_watcher',
          displayName: 'TV Watcher',
          content: '@SydneySweeney is everywhere right now. Euphoria, White Lotus, and now producing her own projects. She\'s building an empire.',
          entityId: 52,
          entityTicker: 'SYDSW',
          entityName: 'Sydney Sweeney',
          sentiment: 'positive',
          likes: 356,
          comments: 61,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 45).toISOString(),
        },
        {
          id: 'actor-4',
          userId: 'user-4',
          username: 'spider_fan',
          displayName: 'Spider Fan',
          content: '@TomHolland\'s next Spider-Man movie is going to be huge. The franchise is in great hands with him.',
          entityId: 53,
          entityTicker: 'TOMHO',
          entityName: 'Tom Holland',
          sentiment: 'positive',
          likes: 512,
          comments: 89,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 20).toISOString(),
        },
        {
          id: 'actor-5',
          userId: 'user-5',
          username: 'tv_enthusiast',
          displayName: 'TV Enthusiast',
          content: '@PedroPascal is having a moment. The Last of Us, The Mandalorian, and now Gladiator 2. He\'s the most in-demand actor right now.',
          entityId: 54,
          entityTicker: 'PEDPA',
          entityName: 'Pedro Pascal',
          sentiment: 'positive',
          likes: 423,
          comments: 67,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 10).toISOString(),
        },
        {
          id: 'actor-6',
          userId: 'user-15',
          username: 'entertainment_analyst',
          displayName: 'Entertainment Analyst',
          content: 'The box office is struggling but these actors are still drawing audiences. @Zendaya, @TomHolland, and @TimothéeChalamet are the new A-list.',
          entityId: undefined,
          entityTicker: undefined,
          entityName: undefined,
          sentiment: undefined,
          likes: 234,
          comments: 42,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
        },
        {
          id: 'actor-7',
          userId: 'user-16',
          username: 'casting_director',
          displayName: 'Casting Director',
          content: '@SydneySweeney and @PedroPascal both have incredible range. They can do drama, comedy, action - everything. That\'s rare.',
          entityId: undefined,
          entityTicker: undefined,
          entityName: undefined,
          sentiment: undefined,
          likes: 198,
          comments: 35,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
        },
        {
          id: 'actor-8',
          userId: 'user-17',
          username: 'film_producer',
          displayName: 'Film Producer',
          content: 'Studios are betting big on @Zendaya and @TimothéeChalamet. They\'re the future of Hollywood. Smart investments.',
          entityId: undefined,
          entityTicker: undefined,
          entityName: undefined,
          sentiment: undefined,
          likes: 267,
          comments: 48,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
        },
      ],
      'NBA Players': [
        {
          id: 'nba-1',
          userId: 'user-1',
          username: 'nba_analyst',
          displayName: 'NBA Analyst',
          content: '@LeBronJames is still playing at an elite level in year 21. The longevity is unmatched. GOAT conversation is real.',
          entityId: 55,
          entityTicker: 'LEBRJ',
          entityName: 'LeBron James',
          sentiment: 'positive',
          likes: 523,
          comments: 89,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 12).toISOString(),
        },
        {
          id: 'nba-2',
          userId: 'user-2',
          username: 'warriors_fan',
          displayName: 'Warriors Fan',
          content: '@StephenCurry just hit another game-winner. The man is clutch. Warriors are back in championship form.',
          entityId: 56,
          entityTicker: 'STCUR',
          entityName: 'Stephen Curry',
          sentiment: 'positive',
          likes: 467,
          comments: 76,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 25).toISOString(),
        },
        {
          id: 'nba-3',
          userId: 'user-3',
          username: 'spurs_fan',
          displayName: 'Spurs Fan',
          content: '@VictorWembanyama is a generational talent. The defense, the shooting, the passing - he\'s the real deal. Future MVP.',
          entityId: 57,
          entityTicker: 'VICWE',
          entityName: 'Victor Wembanyama',
          sentiment: 'positive',
          likes: 389,
          comments: 64,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 35).toISOString(),
        },
        {
          id: 'nba-4',
          userId: 'user-4',
          username: 'nuggets_fan',
          displayName: 'Nuggets Fan',
          content: '@NikolaJokic is the best passing big man ever. The vision is incredible. Another triple-double tonight.',
          entityId: 58,
          entityTicker: 'NIKJO',
          entityName: 'Nikola Jokic',
          sentiment: 'positive',
          likes: 445,
          comments: 72,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 18).toISOString(),
        },
        {
          id: 'nba-5',
          userId: 'user-5',
          username: 'mavs_fan',
          displayName: 'Mavs Fan',
          content: '@LukaDoncic dropped 50 tonight. The step-back threes are automatic. He\'s carrying the Mavs to the playoffs.',
          entityId: 59,
          entityTicker: 'LUKDO',
          entityName: 'Luka Dončić',
          sentiment: 'positive',
          likes: 512,
          comments: 91,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 8).toISOString(),
        },
        {
          id: 'nba-6',
          userId: 'user-15',
          username: 'wolves_fan',
          displayName: 'Wolves Fan',
          content: '@AnthonyEdwards is the future of the league. The athleticism and scoring ability is off the charts. All-Star bound.',
          entityId: 60,
          entityTicker: 'ANTED',
          entityName: 'Anthony Edwards',
          sentiment: 'positive',
          likes: 356,
          comments: 58,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 42).toISOString(),
        },
        {
          id: 'nba-7',
          userId: 'user-16',
          username: 'thunder_fan',
          displayName: 'Thunder Fan',
          content: '@ShaiGilgeousAlexander is having an MVP-caliber season. The scoring, the efficiency, the leadership. Thunder are building something special.',
          entityId: 61,
          entityTicker: 'SHGIL',
          entityName: 'Shai Gilgeous-Alexander',
          sentiment: 'positive',
          likes: 423,
          comments: 67,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 28).toISOString(),
        },
        {
          id: 'nba-8',
          userId: 'user-17',
          username: 'basketball_expert',
          displayName: 'Basketball Expert',
          content: 'The league is stacked with talent. @LeBronJames, @StephenCurry, @LukaDoncic, @NikolaJokic - we\'re witnessing greatness.',
          entityId: undefined,
          entityTicker: undefined,
          entityName: undefined,
          sentiment: undefined,
          likes: 278,
          comments: 45,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
        },
        {
          id: 'nba-9',
          userId: 'user-18',
          username: 'draft_analyst',
          displayName: 'Draft Analyst',
          content: '@VictorWembanyama and @AnthonyEdwards represent the new generation. The future of the NBA is in good hands.',
          entityId: undefined,
          entityTicker: undefined,
          entityName: undefined,
          sentiment: undefined,
          likes: 234,
          comments: 38,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
        },
      ],
      'NFL Players': [
        {
          id: 'nfl-1',
          userId: 'user-1',
          username: 'chiefs_fan',
          displayName: 'Chiefs Fan',
          content: '@PatrickMahomes is the best quarterback in the league. The arm talent and clutch factor is unmatched. Another Super Bowl run incoming.',
          entityId: 62,
          entityTicker: 'PATMA',
          entityName: 'Patrick Mahomes',
          sentiment: 'positive',
          likes: 567,
          comments: 94,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 10).toISOString(),
        },
        {
          id: 'nfl-2',
          userId: 'user-2',
          username: 'draft_expert',
          displayName: 'Draft Expert',
          content: '@DrakeMaye has all the tools to be a franchise QB. The arm strength and mobility combo is rare. Top 5 pick for sure.',
          entityId: 63,
          entityTicker: 'DRAMA',
          entityName: 'Drake Maye',
          sentiment: 'positive',
          likes: 312,
          comments: 52,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 30).toISOString(),
        },
        {
          id: 'nfl-3',
          userId: 'user-3',
          username: 'bengals_fan',
          displayName: 'Bengals Fan',
          content: '@JoeBurrow is back and looking sharp. The accuracy and decision-making is elite. Bengals are Super Bowl contenders again.',
          entityId: 64,
          entityTicker: 'JOEBU',
          entityName: 'Joe Burrow',
          sentiment: 'positive',
          likes: 489,
          comments: 78,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 15).toISOString(),
        },
        {
          id: 'nfl-4',
          userId: 'user-4',
          username: 'tight_end_fan',
          displayName: 'Tight End Fan',
          content: '@TravisKelce is still the best tight end in football. The chemistry with Mahomes is unreal. Record-breaking season incoming.',
          entityId: 65,
          entityTicker: 'TRAKE',
          entityName: 'Travis Kelce',
          sentiment: 'positive',
          likes: 445,
          comments: 71,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 22).toISOString(),
        },
        {
          id: 'nfl-5',
          userId: 'user-5',
          username: 'college_football_fan',
          displayName: 'College Football Fan',
          content: '@CalebWilliams is the most NFL-ready QB in the draft. The playmaking ability and arm talent will translate immediately.',
          entityId: 66,
          entityTicker: 'CALWI',
          entityName: 'Caleb Williams',
          sentiment: 'positive',
          likes: 378,
          comments: 63,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 18).toISOString(),
        },
        {
          id: 'nfl-6',
          userId: 'user-15',
          username: 'nfl_analyst',
          displayName: 'NFL Analyst',
          content: 'The quarterback position is stacked. @PatrickMahomes, @JoeBurrow, and the next generation with @CalebWilliams and @DrakeMaye.',
          entityId: undefined,
          entityTicker: undefined,
          entityName: undefined,
          sentiment: undefined,
          likes: 234,
          comments: 41,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
        },
        {
          id: 'nfl-7',
          userId: 'user-16',
          username: 'fantasy_expert',
          displayName: 'Fantasy Expert',
          content: '@TravisKelce and @PatrickMahomes connection is automatic. Best QB-TE duo in NFL history. Fantasy gold.',
          entityId: undefined,
          entityTicker: undefined,
          entityName: undefined,
          sentiment: undefined,
          likes: 267,
          comments: 45,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
        },
        {
          id: 'nfl-8',
          userId: 'user-17',
          username: 'draft_scout',
          displayName: 'Draft Scout',
          content: 'This QB class is special. @CalebWilliams and @DrakeMaye both have franchise-changing potential. Teams are going to be aggressive.',
          entityId: undefined,
          entityTicker: undefined,
          entityName: undefined,
          sentiment: undefined,
          likes: 198,
          comments: 34,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
        },
      ],
      'NFL': [],
      'NBA': [],
      'College Basketball': [],
      'Hip Hop': [],
      'Country Music': [],
      'Pop Music': [],
    };

    return basePosts[categoryId] || [];
  }, [categoryId]);

  // Categories are now stored directly (no mapping needed)
  const displayName = categoryId;
  const entityCategory = categoryId;
  
  // Mock previous day rankings (yesterday's ranks)
  // Reset to match current ranks (no position changes)
  const previousDayRanks = useMemo(() => {
    const mockRanks: Record<number, number> = {};
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
    let filteredEntities = getEntitiesByCategory(entityCategory);
    
    // Categories are now stored directly (no filtering needed)
    
    const mappedEntities = filteredEntities.map((entity) => {
      // Calculate price change from BASE_PRICE (100)
      const currentPrice = allEntityPrices[entity.id] || getEntityPrice(entity.id) || BASE_PRICE;
      const change24h = currentPrice - BASE_PRICE;
      const changePercent24h = (change24h / BASE_PRICE) * 100;
      
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
  }, [entityCategory, categoryId, allEntityPrices, getEntityPrice, previousDayRanks]);

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
    const isNBA = sportCategory === 'NBA';
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
                {game.teamTicker.substring(0, 3)}
              </Text>
            </View>
            
            <Text style={[styles.liveGameScoreSeparator, { color: theme.text }]}>-</Text>
            
            <View style={styles.liveGameTeamScore}>
              <Text style={[styles.liveGameScoreValue, { color: theme.text }]}>
                {game.opponentScore}
              </Text>
              <Text style={[styles.liveGameTeamAbbr, { color: theme.textSecondary }]}>
                {game.opponentTicker.substring(0, 3)}
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
    navigation.navigate('Entity' as never, {
      entityId: teamId,
      categoryId: sportCategory,
    } as never);
  };

  // Generate all live game data for top 5 teams (NFL or NBA)
  const allLiveGames = useMemo(() => {
    if (categoryId === 'NFL') {
      // Top 5 NFL teams by basePrice: Chiefs (100), Cowboys (114), Eagles (116), 49ers (127), Bills (101)
      const top5Teams = [
        { id: 100, name: 'Kansas City Chiefs', ticker: 'KCCHI' },
        { id: 114, name: 'Dallas Cowboys', ticker: 'DALCO' },
        { id: 116, name: 'Philadelphia Eagles', ticker: 'PHIEA' },
        { id: 127, name: 'San Francisco 49ers', ticker: 'SF49' },
        { id: 101, name: 'Buffalo Bills', ticker: 'BUFBI' },
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
        teamTicker: game.team.ticker,
        teamId: game.team.id,
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
      }));
    } else if (categoryId === 'NBA') {
      // Top 5 NBA teams by basePrice: Celtics (200), Bucks (201), Nuggets (202), Suns (203), Lakers (204)
      const top5Teams = [
        { id: 200, name: 'Boston Celtics', ticker: 'BOSCE' },
        { id: 201, name: 'Milwaukee Bucks', ticker: 'MILBU' },
        { id: 202, name: 'Denver Nuggets', ticker: 'DENNU' },
        { id: 203, name: 'Phoenix Suns', ticker: 'PHOEN' },
        { id: 204, name: 'Los Angeles Lakers', ticker: 'LALAK' },
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
        teamTicker: game.team.ticker,
        teamId: game.team.id,
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
            {(categoryId === 'NFL' || categoryId === 'NBA') && allLiveGames.length > 0 && (
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
});


