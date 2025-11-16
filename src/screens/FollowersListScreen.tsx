import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, User } from '../types';
import FollowButton from '../components/FollowButton';
import { useAuth } from '../context/AuthContext';

type FollowersListRouteProp = RouteProp<RootStackParamList, 'FollowersList'>;

// Mock users data
const generateMockUsers = (count: number): User[] => {
  const usernames = [
    'sarah_trader', 'mike_investor', 'crypto_king', 'jane_doe', 
    'tech_bull', 'market_maven', 'day_trader_pro', 'warren_b',
    'value_hunter', 'growth_seeker', 'dividend_king', 'options_master'
  ];
  const displayNames = [
    'Sarah Chen', 'Mike Johnson', 'Alex Rivera', 'Jane Williams',
    'David Park', 'Emma Martinez', 'Ryan Smith', 'Lisa Anderson',
    'Tom Wilson', 'Maria Garcia', 'John Taylor', 'Sophie Brown'
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i + 2}`,
    email: `${usernames[i % usernames.length]}@example.com`,
    username: usernames[i % usernames.length],
    displayName: displayNames[i % displayNames.length],
    avatarUrl: undefined,
    bio: 'Trading confidence since 2024',
    followersCount: Math.floor(Math.random() * 5000) + 100,
    followingCount: Math.floor(Math.random() * 1000) + 50,
    isFollowing: Math.random() > 0.5,
  }));
};

export default function FollowersListScreen() {
  const navigation = useNavigation();
  const route = useRoute<FollowersListRouteProp>();
  const { userId, type, username } = route.params;
  const { user: currentUser } = useAuth();
  
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, [type]);

  const loadUsers = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    const count = type === 'followers' ? 12 : 8;
    setUsers(generateMockUsers(count));
    setIsLoading(false);
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isCurrentUser = item.id === currentUser?.id;

    return (
      <TouchableOpacity style={styles.userItem}>
        <View style={styles.userLeft}>
          <View style={styles.avatar}>
            <Ionicons name="person-circle" size={48} color="#9CA3AF" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.displayName}>{item.displayName}</Text>
            <Text style={styles.username}>@{item.username}</Text>
            <View style={styles.statsRow}>
              <Text style={styles.statsText}>
                {item.followersCount} followers
              </Text>
              <View style={styles.statsDot} />
              <Text style={styles.statsText}>
                {item.followingCount} following
              </Text>
            </View>
          </View>
        </View>

        {!isCurrentUser && (
          <FollowButton userId={item.id} size="small" />
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name={type === 'followers' ? 'people-outline' : 'person-add-outline'}
        size={64}
        color="#D1D5DB"
      />
      <Text style={styles.emptyStateTitle}>
        {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
      </Text>
      <Text style={styles.emptyStateText}>
        {type === 'followers'
          ? 'When people follow this user, they\'ll appear here'
          : 'Start following traders to see their activity'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {type === 'followers' ? 'Followers' : 'Following'}
          </Text>
          <Text style={styles.headerSubtitle}>@{username}</Text>
        </View>

        <View style={styles.headerRight} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>
            Loading {type === 'followers' ? 'followers' : 'following'}...
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            users.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  listContent: {
    padding: 16,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  username: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statsDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

