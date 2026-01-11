import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest, authenticatedRequest } from '../config/api';
import { LeaderboardEntry, RootStackParamList } from '../types';

type Timeframe = 'daily' | 'weekly' | 'monthly' | 'alltime';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SeasonalCompetitionScreen() {
  const { theme } = useTheme();
  const { user, token, isAuthenticated } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('daily');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [selectedTab, setSelectedTab] = useState<'leaderboards' | 'seasons'>('leaderboards');
  const scrollViewRef = useRef<ScrollView>(null);

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

  const handleTabChange = (tab: 'leaderboards' | 'seasons') => {
    setSelectedTab(tab);
    const scrollToX = tab === 'leaderboards' ? 0 : SCREEN_WIDTH;
    scrollViewRef.current?.scrollTo({ x: scrollToX, animated: true });
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / SCREEN_WIDTH);
    const newTab = pageIndex === 0 ? 'leaderboards' : 'seasons';
    if (newTab !== selectedTab) {
      setSelectedTab(newTab);
    }
  };

  const timeframes: { key: Timeframe; label: string }[] = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'alltime', label: 'All Time' },
  ];

  const renderHeader = () => {
  return (
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={[styles.segmentedControl, { backgroundColor: 'transparent' }]}>
          <TouchableOpacity
            style={styles.segmentButton}
            onPress={() => handleTabChange('leaderboards')}
          >
            <Text
              style={[
                styles.segmentButtonText,
                {
                  color: selectedTab === 'leaderboards' ? theme.primary : theme.text,
                  fontWeight: selectedTab === 'leaderboards' ? '700' : '400',
                },
              ]}
              numberOfLines={1}
            >
              Leaderboards
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.segmentButton}
            onPress={() => handleTabChange('seasons')}
          >
            <Text
              style={[
                styles.segmentButtonText,
                {
                  color: selectedTab === 'seasons' ? theme.primary : theme.text,
                  fontWeight: selectedTab === 'seasons' ? '700' : '400',
                },
              ]}
              numberOfLines={1}
            >
              Seasons
          </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderLeaderboardsContent = () => {
    return (
      <View style={{ width: SCREEN_WIDTH, flex: 1, backgroundColor: theme.backgroundSecondary }}>
      {/* Timeframe Selector */}
      <View style={[styles.timeframeContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.timeframeContent}>
          {timeframes.map((tf) => (
            <TouchableOpacity
              key={tf.key}
              style={[
                styles.timeframeTab,
                {
                  backgroundColor: selectedTimeframe === tf.key ? theme.primary : 'transparent',
                  borderColor: selectedTimeframe === tf.key ? theme.primary : theme.border,
                  width: (SCREEN_WIDTH - 32 - 24) / 4, // Screen width minus padding and gaps, divided by 4
                },
              ]}
              onPress={() => setSelectedTimeframe(tf.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.timeframeTabText,
                  {
                    color: selectedTimeframe === tf.key ? '#FFFFFF' : theme.textSecondary,
                  },
                ]}
              >
                {tf.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Leaderboard List */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading leaderboard...
          </Text>
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          renderItem={renderLeaderboardItem}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={64} color={theme.textSecondary} />
              <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
                No Rankings Yet
              </Text>
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                Start trading to appear on the leaderboard!
              </Text>
            </View>
          }
        />
      )}
      </View>
    );
  };

  const renderSeasonsContent = () => {
    return (
      <View style={{ width: SCREEN_WIDTH, flex: 1, backgroundColor: theme.backgroundSecondary, justifyContent: 'center', alignItems: 'center' }}>
        <View style={styles.seasonsComingSoon}>
          <Ionicons name="calendar-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.seasonsComingSoonTitle, { color: theme.text }]}>
            Seasons Coming Soon
          </Text>
          <Text style={[styles.seasonsComingSoonText, { color: theme.textSecondary }]}>
            Compete in seasonal competitions and win prizes!
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      {renderHeader()}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.horizontalScroll}
        contentContainerStyle={styles.horizontalScrollContent}
      >
        {renderLeaderboardsContent()}
        {renderSeasonsContent()}
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 0,
    borderBottomWidth: 1,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 0,
    padding: 4,
    alignSelf: 'center',
    gap: 0,
    justifyContent: 'space-between',
    position: 'relative',
    width: '100%',
  },
  segmentButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 0,
    flex: 1,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonText: {
    fontSize: 16,
    fontWeight: '400',
  },
  segmentButtonTextActive: {
    fontWeight: '700',
  },
  horizontalScroll: {
    flex: 1,
  },
  horizontalScrollContent: {
    flexDirection: 'row',
  },
  timeframeContainer: {
    borderBottomWidth: 1,
    maxHeight: 50,
  },
  timeframeContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeframeTab: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  timeframeTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
  },
  currentUserItem: {
    borderWidth: 2,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  avatarContainer: {
    marginLeft: 12,
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
    marginLeft: 8,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  portfolioValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  profitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profitText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
  },
  seasonsComingSoon: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  seasonsComingSoonTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
  },
  seasonsComingSoonText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});
