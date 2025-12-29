import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest, authenticatedRequest } from '../config/api';
import { LeaderboardEntry } from '../types';

type Timeframe = 'daily' | 'weekly' | 'monthly' | 'alltime';

export default function SeasonalCompetitionScreen() {
  const { theme } = useTheme();
  const { user, token, isAuthenticated } = useAuth();
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
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
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

    return (
      <View
        style={[
          styles.leaderboardItem,
          {
            backgroundColor: isCurrentUser ? theme.card : theme.backgroundSecondary,
            borderColor: isCurrentUser ? theme.primary : theme.border,
          },
          isCurrentUser && styles.currentUserItem,
        ]}
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
      </View>
    );
  };

  const timeframes: { key: Timeframe; label: string }[] = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'alltime', label: 'All Time' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Leaderboard</Text>
        {userRank && (
          <Text style={[styles.userRankText, { color: theme.textSecondary }]}>
            Your Rank: #{userRank}
          </Text>
        )}
      </View>

      {/* Timeframe Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.timeframeContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}
        contentContainerStyle={styles.timeframeContent}
      >
        {timeframes.map((tf) => (
          <TouchableOpacity
            key={tf.key}
            style={[
              styles.timeframeTab,
              {
                backgroundColor: selectedTimeframe === tf.key ? theme.primary : 'transparent',
                borderColor: selectedTimeframe === tf.key ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setSelectedTimeframe(tf.key)}
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
      </ScrollView>

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
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userRankText: {
    fontSize: 14,
    marginTop: 4,
  },
  timeframeContainer: {
    borderBottomWidth: 1,
  },
  timeframeContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  timeframeTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  timeframeTabText: {
    fontSize: 14,
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
});
