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
import { useTheme } from '../context/ThemeContext';
import { authenticatedRequest, isBackendConfigured } from '../config/api';

type FollowersListRouteProp = RouteProp<RootStackParamList, 'FollowersList'>;

function FollowersListScreen() {
  const navigation = useNavigation();
  const route = useRoute<FollowersListRouteProp>();
  const { userId, type, username } = route.params;
  const { user: currentUser, token, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, [type, userId]);

  const loadUsers = async () => {
    setIsLoading(true);
    
    if (!isBackendConfigured() || !token || !isAuthenticated) {
      // No mock data - just show empty
      setUsers([]);
      setIsLoading(false);
      return;
    }

    try {
      const endpoint = type === 'followers' 
        ? `/api/social/users/${userId}/followers`
        : `/api/social/users/${userId}/following`;
      
      const response = await authenticatedRequest<User[]>(endpoint, token, {
        method: 'GET',
      });

      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.debug('Error loading users:', error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isCurrentUser = item.id === currentUser?.id;

    return (
      <TouchableOpacity style={[styles.userItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.userLeft}>
          <View style={styles.avatar}>
            <Ionicons name="person-circle" size={48} color={theme.textTertiary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.displayName, { color: theme.text }]}>{item.displayName}</Text>
            <Text style={[styles.username, { color: theme.textSecondary }]}>@{item.username}</Text>
            <View style={styles.statsRow}>
              <Text style={[styles.statsText, { color: theme.textTertiary }]}>
                {item.followersCount} followers
              </Text>
              <View style={[styles.statsDot, { backgroundColor: theme.textTertiary }]} />
              <Text style={[styles.statsText, { color: theme.textTertiary }]}>
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
        color={theme.textTertiary}
      />
      <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
        {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
      </Text>
      <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
        {type === 'followers'
          ? 'When people follow this user, they\'ll appear here'
          : 'Start following traders to see their activity'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {type === 'followers' ? 'Followers' : 'Following'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>@{username}</Text>
        </View>

        <View style={styles.headerRight} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
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

export default React.memo(FollowersListScreen);

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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 13,
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
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
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
    marginBottom: 2,
  },
  username: {
    fontSize: 13,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
  },
  statsDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

