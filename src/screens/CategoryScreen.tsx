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
import { RootStackParamList, Post } from '../types';
import { useTrading } from '../context/TradingContext';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';
import { getEntitiesByCategory } from '../utils/mockEntities';
import PostCard from '../components/PostCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type CategoryRouteProp = RouteProp<RootStackParamList, 'Category'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CategoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CategoryRouteProp>();
  const { categoryId } = route.params;
  const { getEntityPrice } = useTrading();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'entities' | 'about' | 'feed' | 'news'>('entities');
  const scrollViewRef = useRef<ScrollView>(null);

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
      'Startups': [
        {
          id: 'startup-1',
          userId: 'user-1',
          username: 'tech_investor',
          displayName: 'Tech Investor',
          content: '@Perplexity just closed a huge funding round. Their AI search is legitimately better than Google for research tasks.',
          entityId: 41,
          entityTicker: 'PERP',
          entityName: 'Perplexity',
          sentiment: 'positive',
          likes: 389,
          comments: 58,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 15).toISOString(),
        },
        {
          id: 'startup-2',
          userId: 'user-2',
          username: 'ai_analyst',
          displayName: 'AI Analyst',
          content: '@Character.AI has millions of users but can\'t monetize. The subscription model isn\'t working and ads would kill the experience.',
          entityId: 45,
          entityTicker: 'CHRAC',
          entityName: 'Character.AI',
          sentiment: 'negative',
          likes: 234,
          comments: 42,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 38).toISOString(),
        },
        {
          id: 'startup-3',
          userId: 'user-3',
          username: 'startup_tracker',
          displayName: 'Startup Tracker',
          content: '@Cursor just hit 100k paying customers. Developers can\'t work without it now. The productivity boost is insane.',
          entityId: 47,
          entityTicker: 'CURSO',
          entityName: 'Cursor',
          sentiment: 'positive',
          likes: 445,
          comments: 72,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 22).toISOString(),
        },
        {
          id: 'startup-4',
          userId: 'user-4',
          username: 'vc_insider',
          displayName: 'VC Insider',
          content: '@Replit\'s user growth stalled after the education push. The market is getting crowded with @Cursor and other AI coding tools.',
          entityId: 33,
          entityTicker: 'REPL',
          entityName: 'Replit',
          sentiment: 'negative',
          likes: 198,
          comments: 35,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
        },
        {
          id: 'startup-5',
          userId: 'user-5',
          username: 'tech_enthusiast',
          displayName: 'Tech Enthusiast',
          content: '@LumaAI\'s video generation quality is getting scary good. The latest update handles motion way better than before.',
          entityId: 46,
          entityTicker: 'LUMAI',
          entityName: 'Luma AI',
          sentiment: 'positive',
          likes: 312,
          comments: 48,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
        },
        {
          id: 'startup-6',
          userId: 'user-15',
          username: 'ai_researcher',
          displayName: 'AI Researcher',
          content: 'The AI coding assistant space is exploding. @Cursor and @Perplexity are leading but @Character.AI shows you can pivot quickly.',
          entityId: 47,
          entityTicker: 'CURSO',
          entityName: 'Cursor',
          sentiment: 'positive',
          likes: 356,
          comments: 61,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 50).toISOString(),
        },
        {
          id: 'startup-7',
          userId: 'user-16',
          username: 'tech_thinker',
          displayName: 'Tech Thinker',
          content: 'VC funding is way down but AI startups are still raising big rounds. @Cursor, @Perplexity, and @LumaAI all closed recently.',
          entityId: undefined,
          entityTicker: undefined,
          entityName: undefined,
          sentiment: undefined,
          likes: 189,
          comments: 34,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
        },
        {
          id: 'startup-8',
          userId: 'user-17',
          username: 'startup_founder',
          displayName: 'Startup Founder',
          content: '@Vapi\'s voice API is being adopted by everyone. The quality is so good that companies are switching from traditional providers.',
          entityId: 48,
          entityTicker: 'VAPI',
          entityName: 'Vapi',
          sentiment: 'positive',
          likes: 267,
          comments: 39,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
        },
      ],
      'NFL': [
        {
          id: 'nfl-1',
          userId: 'user-1',
          username: 'sports_analyst',
          displayName: 'Sports Analyst',
          content: '@KansasCityChiefs looking dominant in the playoffs. Their defense is shutting down every offense they face. Super Bowl bound?',
          entityId: 50,
          entityTicker: 'KCCHF',
          entityName: 'Kansas City Chiefs',
          sentiment: 'positive',
          likes: 456,
          comments: 78,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 18).toISOString(),
        },
        {
          id: 'nfl-2',
          userId: 'user-2',
          username: 'nfl_fan',
          displayName: 'NFL Fan',
          content: '@BuffaloBills offense is unstoppable right now. Josh Allen is in MVP form and the receiving corps is deep.',
          entityId: 51,
          entityTicker: 'BUFBI',
          entityName: 'Buffalo Bills',
          sentiment: 'positive',
          likes: 389,
          comments: 62,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 32).toISOString(),
        },
        {
          id: 'nfl-3',
          userId: 'user-3',
          username: 'football_tracker',
          displayName: 'Football Tracker',
          content: 'The NFC is wide open this year. @SanFrancisco49ers, @DallasCowboys, and @PhiladelphiaEagles all looking strong.',
          entityId: 53,
          entityTicker: 'SF49E',
          entityName: 'San Francisco 49ers',
          sentiment: 'positive',
          likes: 312,
          comments: 54,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
        },
        {
          id: 'nfl-4',
          userId: 'user-4',
          username: 'sports_watcher',
          displayName: 'Sports Watcher',
          content: '@DetroitLions finally breaking through. The culture change is real and they\'re winning games they used to lose.',
          entityId: 56,
          entityTicker: 'DETLI',
          entityName: 'Detroit Lions',
          sentiment: 'positive',
          likes: 445,
          comments: 71,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 25).toISOString(),
        },
        {
          id: 'nfl-5',
          userId: 'user-5',
          username: 'nfl_insider',
          displayName: 'NFL Insider',
          content: 'Injury reports are killing @NewYorkJets\' season. The QB situation is a disaster and the defense can\'t carry them alone.',
          entityId: 62,
          entityTicker: 'NYJET',
          entityName: 'New York Jets',
          sentiment: 'negative',
          likes: 234,
          comments: 48,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 45).toISOString(),
        },
        {
          id: 'nfl-6',
          userId: 'user-6',
          username: 'football_analyst',
          displayName: 'Football Analyst',
          content: 'The AFC North is brutal this year. @BaltimoreRavens, @CincinnatiBengals, @ClevelandBrowns all playoff caliber teams.',
          entityId: 52,
          entityTicker: 'BALRA',
          entityName: 'Baltimore Ravens',
          sentiment: 'positive',
          likes: 367,
          comments: 59,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 50).toISOString(),
        },
        {
          id: 'nfl-7',
          userId: 'user-7',
          username: 'sports_talk',
          displayName: 'Sports Talk',
          content: 'Rookie QBs are struggling across the league. The learning curve is steeper than ever with these complex defensive schemes.',
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
          id: 'nfl-8',
          userId: 'user-8',
          username: 'gridiron_guru',
          displayName: 'Gridiron Guru',
          content: '@GreenBayPackers rebuilding faster than expected. The young receivers are developing and the defense is improving.',
          entityId: 59,
          entityTicker: 'GBPA',
          entityName: 'Green Bay Packers',
          sentiment: 'positive',
          likes: 289,
          comments: 43,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 15).toISOString(),
        },
      ],
      'NBA': [
        {
          id: 'nba-1',
          userId: 'user-1',
          username: 'hoops_analyst',
          displayName: 'Hoops Analyst',
          content: '@BostonCeltics are on fire. The depth is insane and they\'re dominating on both ends. Championship favorites?',
          entityId: 83,
          entityTicker: 'BOSCE',
          entityName: 'Boston Celtics',
          sentiment: 'positive',
          likes: 523,
          comments: 87,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 22).toISOString(),
        },
        {
          id: 'nba-2',
          userId: 'user-2',
          username: 'basketball_fan',
          displayName: 'Basketball Fan',
          content: '@DenverNuggets defending the title well. Jokic is playing at an MVP level and the team chemistry is unmatched.',
          entityId: 84,
          entityTicker: 'DENNU',
          entityName: 'Denver Nuggets',
          sentiment: 'positive',
          likes: 467,
          comments: 72,
          isLiked: true,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 38).toISOString(),
        },
        {
          id: 'nba-3',
          userId: 'user-3',
          username: 'nba_tracker',
          displayName: 'NBA Tracker',
          content: '@LosAngelesLakers need to figure it out. The roster looks good on paper but the chemistry isn\'t clicking yet.',
          entityId: 87,
          entityTicker: 'LALAK',
          entityName: 'Los Angeles Lakers',
          sentiment: 'negative',
          likes: 345,
          comments: 61,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 55).toISOString(),
        },
        {
          id: 'nba-4',
          userId: 'user-4',
          username: 'hoops_watcher',
          displayName: 'Hoops Watcher',
          content: '@MilwaukeeBucks with Giannis are always dangerous. The addition of Dame could make them unstoppable in the playoffs.',
          entityId: 85,
          entityTicker: 'MILBU',
          entityName: 'Milwaukee Bucks',
          sentiment: 'positive',
          likes: 412,
          comments: 68,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 28).toISOString(),
        },
        {
          id: 'nba-5',
          userId: 'user-5',
          username: 'basketball_insider',
          displayName: 'Basketball Insider',
          content: 'The Western Conference is stacked. @PhoenixSuns, @GoldenStateWarriors, @DallasMavericks all looking strong.',
          entityId: 86,
          entityTicker: 'PHO SU',
          entityName: 'Phoenix Suns',
          sentiment: 'positive',
          likes: 389,
          comments: 64,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 42).toISOString(),
        },
        {
          id: 'nba-6',
          userId: 'user-6',
          username: 'nba_analyst',
          displayName: 'NBA Analyst',
          content: '@Philadelphia76ers are inconsistent. Embiid is dominant but they need more from the supporting cast.',
          entityId: 89,
          entityTicker: 'PHI76',
          entityName: 'Philadelphia 76ers',
          sentiment: 'negative',
          likes: 298,
          comments: 52,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
        },
        {
          id: 'nba-7',
          userId: 'user-7',
          username: 'hoops_talk',
          displayName: 'Hoops Talk',
          content: 'The load management debate is heating up. Stars resting during the regular season is hurting the product but teams say it\'s necessary.',
          entityId: undefined,
          entityTicker: undefined,
          entityName: undefined,
          sentiment: undefined,
          likes: 234,
          comments: 41,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
        },
        {
          id: 'nba-8',
          userId: 'user-8',
          username: 'court_vision',
          displayName: 'Court Vision',
          content: '@MiamiHeat culture is real. They develop players better than anyone and always compete regardless of talent level.',
          entityId: 90,
          entityTicker: 'MIAHE',
          entityName: 'Miami Heat',
          sentiment: 'positive',
          likes: 356,
          comments: 58,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 20).toISOString(),
        },
      ],
      'College Basketball': [
        {
          id: 'cbb-1',
          userId: 'user-1',
          username: 'hoops_analyst',
          displayName: 'Hoops Analyst',
          content: '@Duke looks like a Final Four team. The freshmen class is loaded and Coach K\'s legacy continues to attract top talent.',
          entityId: 113,
          entityTicker: 'DUKE',
          entityName: 'Duke',
          sentiment: 'positive',
          likes: 445,
          comments: 73,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 24).toISOString(),
        },
        {
          id: 'cbb-2',
          userId: 'user-2',
          username: 'college_hoops',
          displayName: 'College Hoops',
          content: '@Kentucky always reloads. The recruiting class is strong and they should compete for the SEC title.',
          entityId: 114,
          entityTicker: 'KENT',
          entityName: 'Kentucky',
          sentiment: 'positive',
          likes: 389,
          comments: 62,
          isLiked: true,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 41).toISOString(),
        },
        {
          id: 'cbb-3',
          userId: 'user-3',
          username: 'ncaa_tracker',
          displayName: 'NCAA Tracker',
          content: '@NorthCarolina\'s offense is clicking. The ball movement is crisp and they\'re hitting shots from everywhere.',
          entityId: 115,
          entityTicker: 'UNC',
          entityName: 'North Carolina',
          sentiment: 'positive',
          likes: 367,
          comments: 58,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 58).toISOString(),
        },
        {
          id: 'cbb-4',
          userId: 'user-4',
          username: 'bracket_watcher',
          displayName: 'Bracket Watcher',
          content: '@Kansas is struggling with injuries. When healthy they\'re Final Four caliber but depth is a concern.',
          entityId: 116,
          entityTicker: 'KAN',
          entityName: 'Kansas',
          sentiment: 'negative',
          likes: 298,
          comments: 49,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 35).toISOString(),
        },
        {
          id: 'cbb-5',
          userId: 'user-5',
          username: 'march_madness',
          displayName: 'March Madness',
          content: '@UCLA\'s defense is suffocating teams. The length and athleticism on that roster is elite.',
          entityId: 117,
          entityTicker: 'UCLA',
          entityName: 'UCLA',
          sentiment: 'positive',
          likes: 412,
          comments: 66,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 19).toISOString(),
        },
        {
          id: 'cbb-6',
          userId: 'user-6',
          username: 'college_analyst',
          displayName: 'College Analyst',
          content: '@Gonzaga continues to dominate the WCC. The program has built something special in Spokane.',
          entityId: 128,
          entityTicker: 'GONZ',
          entityName: 'Gonzaga',
          sentiment: 'positive',
          likes: 334,
          comments: 54,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
        },
        {
          id: 'cbb-7',
          userId: 'user-7',
          username: 'hoops_talk',
          displayName: 'Hoops Talk',
          content: 'The transfer portal is changing college basketball. Teams can rebuild overnight with the right transfers.',
          entityId: undefined,
          entityTicker: undefined,
          entityName: undefined,
          sentiment: undefined,
          likes: 267,
          comments: 43,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
        },
        {
          id: 'cbb-8',
          userId: 'user-8',
          username: 'ncaa_insider',
          displayName: 'NCAA Insider',
          content: '@Purdue has the best big man in the country. If the guards can step up they could make a deep run.',
          entityId: 129,
          entityTicker: 'PUR',
          entityName: 'Purdue',
          sentiment: 'positive',
          likes: 356,
          comments: 59,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 31).toISOString(),
        },
      ],
      'Hip Hop': [
        {
          id: 'hiphop-1',
          userId: 'user-1',
          username: 'music_analyst',
          displayName: 'Music Analyst',
          content: '@KendrickLamar\'s latest album is a masterpiece. The production and lyricism are on another level.',
          entityId: 163,
          entityTicker: 'KENDR',
          entityName: 'Kendrick Lamar',
          sentiment: 'positive',
          likes: 567,
          comments: 94,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 16).toISOString(),
        },
        {
          id: 'hiphop-2',
          userId: 'user-2',
          username: 'rap_fan',
          displayName: 'Rap Fan',
          content: '@JCole\'s Dreamville festival lineup is stacked. He always puts on for the culture.',
          entityId: 164,
          entityTicker: 'JCOLE',
          entityName: 'J. Cole',
          sentiment: 'positive',
          likes: 445,
          comments: 72,
          isLiked: true,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 33).toISOString(),
        },
        {
          id: 'hiphop-3',
          userId: 'user-3',
          username: 'hiphop_tracker',
          displayName: 'Hip Hop Tracker',
          content: '@Drake dropping surprise singles and they\'re all hitting. The man never misses on streaming numbers.',
          entityId: 172,
          entityTicker: 'DRAKE',
          entityName: 'Drake',
          sentiment: 'positive',
          likes: 523,
          comments: 87,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 48).toISOString(),
        },
        {
          id: 'hiphop-4',
          userId: 'user-4',
          username: 'music_watcher',
          displayName: 'Music Watcher',
          content: '@Eminem\'s verse on that feature was fire. Still one of the best lyricists in the game.',
          entityId: 165,
          entityTicker: 'EMINE',
          entityName: 'Eminem',
          sentiment: 'positive',
          likes: 389,
          comments: 64,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 27).toISOString(),
        },
        {
          id: 'hiphop-5',
          userId: 'user-5',
          username: 'rap_insider',
          displayName: 'Rap Insider',
          content: '@NickiMinaj\'s album rollout is strategic. She knows how to build hype and keep fans engaged.',
          entityId: 166,
          entityTicker: 'NICKI',
          entityName: 'Nicki Minaj',
          sentiment: 'positive',
          likes: 412,
          comments: 68,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 52).toISOString(),
        },
        {
          id: 'hiphop-6',
          userId: 'user-6',
          username: 'music_analyst',
          displayName: 'Music Analyst',
          content: '@TylerTheCreator\'s creative direction is unmatched. Every album is a new artistic evolution.',
          entityId: 169,
          entityTicker: 'TYLER',
          entityName: 'Tyler, The Creator',
          sentiment: 'positive',
          likes: 367,
          comments: 59,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
        },
        {
          id: 'hiphop-7',
          userId: 'user-7',
          username: 'hiphop_talk',
          displayName: 'Hip Hop Talk',
          content: 'The underground scene is thriving right now. So much talent bubbling up through SoundCloud and TikTok.',
          entityId: undefined,
          entityTicker: undefined,
          entityName: undefined,
          sentiment: undefined,
          likes: 298,
          comments: 51,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
        },
        {
          id: 'hiphop-8',
          userId: 'user-8',
          username: 'rap_enthusiast',
          displayName: 'Rap Enthusiast',
          content: '@ASAPRocky\'s fashion collabs are legendary. He\'s built a brand beyond just music.',
          entityId: 170,
          entityTicker: 'ASAPR',
          entityName: 'A$AP Rocky',
          sentiment: 'positive',
          likes: 334,
          comments: 56,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 21).toISOString(),
        },
      ],
      'Country Music': [
        {
          id: 'country-1',
          userId: 'user-1',
          username: 'music_analyst',
          displayName: 'Music Analyst',
          content: '@MorganWallen\'s tour is selling out stadiums. The country music scene is bigger than ever.',
          entityId: 173,
          entityTicker: 'MORGA',
          entityName: 'Morgan Wallen',
          sentiment: 'positive',
          likes: 478,
          comments: 79,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 18).toISOString(),
        },
        {
          id: 'country-2',
          userId: 'user-2',
          username: 'country_fan',
          displayName: 'Country Fan',
          content: '@LukeCombs can\'t miss. Every single he drops goes straight to number one on country radio.',
          entityId: 174,
          entityTicker: 'LUKE',
          entityName: 'Luke Combs',
          sentiment: 'positive',
          likes: 423,
          comments: 68,
          isLiked: true,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 36).toISOString(),
        },
        {
          id: 'country-3',
          userId: 'user-3',
          username: 'music_tracker',
          displayName: 'Music Tracker',
          content: '@ZachBryan\'s authenticity is resonating. Fans love that he writes his own songs and stays true to his roots.',
          entityId: 175,
          entityTicker: 'ZACH',
          entityName: 'Zach Bryan',
          sentiment: 'positive',
          likes: 456,
          comments: 74,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 51).toISOString(),
        },
        {
          id: 'country-4',
          userId: 'user-4',
          username: 'country_watcher',
          displayName: 'Country Watcher',
          content: '@CarrieUnderwood\'s live shows are incredible. Her voice is powerful and the stage production is top tier.',
          entityId: 179,
          entityTicker: 'CARRIE',
          entityName: 'Carrie Underwood',
          sentiment: 'positive',
          likes: 389,
          comments: 62,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 29).toISOString(),
        },
        {
          id: 'country-5',
          userId: 'user-5',
          username: 'music_insider',
          displayName: 'Music Insider',
          content: '@ChrisStapleton\'s voice is unmatched. Every performance gives you chills.',
          entityId: 182,
          entityTicker: 'CHRIS',
          entityName: 'Chris Stapleton',
          sentiment: 'positive',
          likes: 412,
          comments: 67,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 44).toISOString(),
        },
        {
          id: 'country-6',
          userId: 'user-6',
          username: 'country_analyst',
          displayName: 'Country Analyst',
          content: '@JasonAldean\'s controversy didn\'t hurt his numbers. His fanbase is loyal and streaming is strong.',
          entityId: 176,
          entityTicker: 'JASON',
          entityName: 'Jason Aldean',
          sentiment: 'positive',
          likes: 334,
          comments: 55,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
        },
        {
          id: 'country-7',
          userId: 'user-7',
          username: 'music_talk',
          displayName: 'Music Talk',
          content: 'Country music festivals are getting bigger every year. The genre\'s popularity is expanding beyond traditional markets.',
          entityId: undefined,
          entityTicker: undefined,
          entityName: undefined,
          sentiment: undefined,
          likes: 267,
          comments: 44,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
        },
        {
          id: 'country-8',
          userId: 'user-8',
          username: 'country_enthusiast',
          displayName: 'Country Enthusiast',
          content: '@KennyChesney\'s summer tour is a tradition. Fans plan their vacations around his concerts.',
          entityId: 177,
          entityTicker: 'KENNY',
          entityName: 'Kenny Chesney',
          sentiment: 'positive',
          likes: 356,
          comments: 58,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 23).toISOString(),
        },
      ],
      'Pop Music': [
        {
          id: 'pop-1',
          userId: 'user-1',
          username: 'music_analyst',
          displayName: 'Music Analyst',
          content: '@HarryStyles\' tour production is next level. The stage design and choreography are incredible.',
          entityId: 183,
          entityTicker: 'HARRY',
          entityName: 'Harry Styles',
          sentiment: 'positive',
          likes: 534,
          comments: 89,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 17).toISOString(),
        },
        {
          id: 'pop-2',
          userId: 'user-2',
          username: 'pop_fan',
          displayName: 'Pop Fan',
          content: '@BillieEilish\'s new album is experimental and bold. She\'s not afraid to evolve her sound.',
          entityId: 184,
          entityTicker: 'BILLIE',
          entityName: 'Billie Eilish',
          sentiment: 'positive',
          likes: 489,
          comments: 81,
          isLiked: true,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 34).toISOString(),
        },
        {
          id: 'pop-3',
          userId: 'user-3',
          username: 'music_tracker',
          displayName: 'Music Tracker',
          content: '@DuaLipa\'s dance-pop hits are perfect for the club. She knows how to make music that gets people moving.',
          entityId: 185,
          entityTicker: 'DUA',
          entityName: 'Dua Lipa',
          sentiment: 'positive',
          likes: 445,
          comments: 73,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 49).toISOString(),
        },
        {
          id: 'pop-4',
          userId: 'user-4',
          username: 'pop_watcher',
          displayName: 'Pop Watcher',
          content: '@ArianaGrande\'s vocal range is insane. Every song showcases her incredible talent.',
          entityId: 186,
          entityTicker: 'ARIAN',
          entityName: 'Ariana Grande',
          sentiment: 'positive',
          likes: 512,
          comments: 84,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 26).toISOString(),
        },
        {
          id: 'pop-5',
          userId: 'user-5',
          username: 'music_insider',
          displayName: 'Music Insider',
          content: '@EdSheeran\'s acoustic sets are magical. The way he loops and builds songs live is impressive.',
          entityId: 187,
          entityTicker: 'ED',
          entityName: 'Ed Sheeran',
          sentiment: 'positive',
          likes: 423,
          comments: 69,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 43).toISOString(),
        },
        {
          id: 'pop-6',
          userId: 'user-6',
          username: 'pop_analyst',
          displayName: 'Pop Analyst',
          content: '@BrunoMars\' live performances are legendary. The energy and showmanship are unmatched.',
          entityId: 188,
          entityTicker: 'BRUNO',
          entityName: 'Bruno Mars',
          sentiment: 'positive',
          likes: 456,
          comments: 75,
          isLiked: false,
          isBookmarked: true,
          timestamp: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
        },
        {
          id: 'pop-7',
          userId: 'user-7',
          username: 'music_talk',
          displayName: 'Music Talk',
          content: 'Pop music is evolving. We\'re seeing more genre-blending and artists experimenting with different sounds.',
          entityId: undefined,
          entityTicker: undefined,
          entityName: undefined,
          sentiment: undefined,
          likes: 312,
          comments: 52,
          isLiked: true,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
        },
        {
          id: 'pop-8',
          userId: 'user-8',
          username: 'pop_enthusiast',
          displayName: 'Pop Enthusiast',
          content: '@LadyGaga\'s versatility is incredible. She can do pop, jazz, country - there\'s nothing she can\'t do.',
          entityId: 192,
          entityTicker: 'LADY',
          entityName: 'Lady Gaga',
          sentiment: 'positive',
          likes: 389,
          comments: 64,
          isLiked: false,
          isBookmarked: false,
          timestamp: new Date(now - 1000 * 60 * 22).toISOString(),
        },
      ],
    };

    return basePosts[categoryId] || [];
  }, [categoryId]);

  // Categories are now stored directly (no mapping needed)
  const displayName = categoryId;
  const entityCategory = categoryId;
  
  // Mock previous day rankings (yesterday's ranks)
  // This would normally come from a backend/database
  const previousDayRanks = useMemo(() => {
    const mockRanks: Record<number, number> = {};
    const filteredEntities = getEntitiesByCategory(entityCategory);
    
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
    
    // Categories are now stored directly (no filtering needed)
    
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
    return (
      <View style={styles.emptyState}>
        <Ionicons name="folder-outline" size={48} color={theme.textTertiary} />
        <Text style={[styles.emptyStateText, { color: theme.text }]}>
          No entities in this category
        </Text>
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
});


