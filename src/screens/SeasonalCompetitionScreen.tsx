import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export default function SeasonalCompetitionScreen() {
  const { theme } = useTheme();
<<<<<<< HEAD
  const { user, token, isAuthenticated } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('alltime');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, [selectedTimeframe]);

  const loadLeaderboard = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        timeframe: selectedTimeframe,
        limit: '100',
      });

      const endpoint = `/api/leaderboard?${params}`;
      const response = isAuthenticated && token
        ? await authenticatedRequest<{
            leaderboard: LeaderboardEntry[];
            userRank: number | null;
            timeframe: string;
            totalUsers: number;
          }>(endpoint, token)
        : await apiRequest<{
            leaderboard: LeaderboardEntry[];
            userRank: number | null;
            timeframe: string;
            totalUsers: number;
          }>(endpoint);

      if (response.success && response.data) {
        setLeaderboard(response.data.leaderboard || []);
        setUserRank(response.data.userRank || null);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboard();
  };

  const formatCurrency = (value: number) => {
    const { TOKEN_SYMBOL } = require('../utils/dataGenerator');
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M ${TOKEN_SYMBOL}`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}K ${TOKEN_SYMBOL}`;
    }
    return `${value.toFixed(2)} ${TOKEN_SYMBOL}`;
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return <Ionicons name="trophy" size={24} color="#FFD700" />;
    }
    if (rank === 2) {
      return <Ionicons name="medal" size={24} color="#C0C0C0" />;
    }
    if (rank === 3) {
      return <Ionicons name="medal" size={24} color="#CD7F32" />;
    }
    return (
      <Text style={[styles.rankNumber, { color: theme.textSecondary }]}>
        #{rank}
      </Text>
    );
  };

  const renderLeaderboardItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isCurrentUser = user && item.userId === user.id;
    const isTopThree = item.rank <= 3;

    const handlePress = () => {
      navigation.navigate('UserProfile', { userId: item.userId });
    };

    return (
      <TouchableOpacity
        style={[
          styles.leaderboardItem,
          {
            backgroundColor: isCurrentUser ? theme.card : theme.backgroundSecondary,
            borderColor: isCurrentUser ? theme.primary : theme.border,
          },
          isCurrentUser && styles.currentUserItem,
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.rankContainer}>
          {renderRankBadge(item.rank)}
        </View>

        <View style={styles.avatarContainer}>
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarInitial}>
                {item.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.userInfo}>
          <Text style={[styles.displayName, { color: theme.text }]} numberOfLines={1}>
            {item.displayName}
            {isCurrentUser && ' (You)'}
          </Text>
          <Text style={[styles.username, { color: theme.textSecondary }]}>@{item.username}</Text>
        </View>

        <View style={styles.statsContainer}>
          <Text style={[styles.portfolioValue, { color: theme.text }]}>
            {formatCurrency(item.portfolioValue)}
          </Text>
          <View style={styles.profitContainer}>
            <Text
              style={[
                styles.profitText,
                {
                  color: item.profitPercent >= 0 ? theme.success : theme.error,
                },
              ]}
            >
              {formatPercent(item.profitPercent)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const timeframes: { key: Timeframe; label: string }[] = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'alltime', label: 'All Time' },
  ];
=======
>>>>>>> parent of 2e5d44d (Merge remote backend changes with local frontend updates)

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Seasonal Competition</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.placeholderContainer}>
          <Text style={[styles.placeholder, { color: theme.textSecondary }]}>
            Coming Soon...
          </Text>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  placeholder: {
    fontSize: 18,
    textAlign: 'center',
  },
});


