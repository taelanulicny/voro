import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList, UserProfile } from '../types';
import PostCard from '../components/PostCard';
import FollowButton from '../components/FollowButton';
import { authenticatedRequest, isBackendConfigured } from '../config/api';
import { getUserGroups } from '../services/socialService';
import { formatCurrency } from '../utils/dataGenerator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProp = {
  key: string;
  name: 'UserProfile';
  params: { userId: string };
};

function UserProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { userId } = route.params;
  const { user: currentUser, token, isAuthenticated } = useAuth();
  const { activityFeed, isFollowingUser, checkMutualFollow, groups } = useSocial();
  const { theme } = useTheme();
  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [groupsCount, setGroupsCount] = useState<number>(0);
  const [accountValueVisible, setAccountValueVisible] = useState<boolean>(true);
  const [mutualStatus, setMutualStatus] = useState<{
    isMutual: boolean;
    userFollowsOther: boolean;
    otherFollowsUser: boolean;
  } | null>(null);

  const isOwnProfile = currentUser?.id === userId;

  // Note: Own profile navigation is handled in PostCard component
  // This screen should only be accessed for other users' profiles

  // Fetch user profile data
  const fetchUserProfile = useCallback(async () => {
    setIsLoading(true);
    
    let profileLoaded = false;

    // If backend is configured, fetch from API
    if (isBackendConfigured() && token && isAuthenticated && !isOwnProfile) {
      try {
        const response = await authenticatedRequest<UserProfile>(
          `/api/user/${userId}`,
          token,
          {
            method: 'GET',
          }
        );

        if (response.success && response.data) {
          setProfileUser(response.data);
          profileLoaded = true;
          // Get groups count
          const groupsResponse = await getUserGroups(userId);
          if (groupsResponse.success && groupsResponse.data) {
            setGroupsCount(groupsResponse.data.length);
          }
          setAccountValueVisible(true);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    }

    // Fallback to mock data from activity feed if backend didn't load
    if (!profileLoaded) {
      const userPost = activityFeed.find(post => post.userId === userId);
      if (userPost) {
        const mockProfile: UserProfile = {
          id: userId,
          email: '',
          username: userPost.username,
          displayName: userPost.displayName,
          avatarUrl: userPost.avatarUrl,
          bio: undefined,
          followersCount: 0,
          followingCount: 0,
          postsCount: activityFeed.filter(p => p.userId === userId).length,
          portfolioValue: undefined,
          joinedDate: new Date().toISOString(),
        };
        setProfileUser(mockProfile);
      }

      if (isBackendConfigured() && token) {
        try {
          const groupsResponse = await getUserGroups(userId);
          if (groupsResponse.success && groupsResponse.data) {
            setGroupsCount(groupsResponse.data.length);
          } else {
            setGroupsCount(0);
          }
        } catch (error) {
          setGroupsCount(0);
        }
      } else {
        setGroupsCount(0);
      }
      setAccountValueVisible(true);
    }
    
    setIsLoading(false);
  }, [userId, token, isAuthenticated, isOwnProfile, activityFeed, groups]);

  // Check mutual follow status
  const fetchMutualStatus = useCallback(async () => {
    if (!isOwnProfile && userId) {
      const status = await checkMutualFollow(userId);
      setMutualStatus(status);
    }
  }, [userId, isOwnProfile, checkMutualFollow]);

  // Refresh profile when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
      fetchMutualStatus();
    }, [fetchUserProfile, fetchMutualStatus])
  );

  // Get user's posts
  const userPosts = activityFeed.filter(post => post.userId === userId);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profileUser) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.errorTitle, { color: theme.text }]}>User not found</Text>
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>
            This user doesn't exist or you don't have permission to view their profile.
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const followersCount = profileUser.followersCount || 0;
  const followingCount = profileUser.followingCount || 0;
  const postsCount = userPosts.length;
  const accountValue = profileUser.portfolioValue;

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
      <View style={styles.headerTop}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButtonHeader}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <FollowButton 
            userId={userId}
            size="medium"
            showMutualStatus={true}
          />
        </View>
      </View>

      <View style={styles.avatarContainer}>
        {profileUser.avatarUrl ? (
          <Image source={{ uri: profileUser.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Ionicons name="person" size={40} color="#FFFFFF" />
          </View>
        )}
      </View>

      <Text style={[styles.displayName, { color: theme.text }]}>{profileUser.displayName}</Text>
      <Text style={[styles.username, { color: theme.textSecondary }]}>@{profileUser.username}</Text>
      
      {profileUser.bio && (
        <Text style={[styles.bio, { color: theme.textSecondary }]}>{profileUser.bio}</Text>
      )}

      {/* Mutual follow indicator */}
      {mutualStatus?.isMutual && (
        <View style={[styles.mutualBadge, { backgroundColor: theme.backgroundSecondary }]}>
          <Ionicons name="people" size={14} color={theme.primary} />
          <Text style={[styles.mutualText, { color: theme.primary }]}>Mutual Follow</Text>
        </View>
      )}

      {/* Account Value Module - only show if user has set it to visible and value exists */}
      {accountValue !== undefined && accountValueVisible && (
        <View style={[styles.accountValueContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <View style={styles.accountValueContent}>
            <View style={styles.accountValueHeader}>
              <Text style={[styles.accountValueLabel, { color: theme.textSecondary }]}>Account Value</Text>
            </View>
            <Text style={[styles.accountValueAmount, { color: theme.text }]}>
              {formatCurrency(accountValue)}
            </Text>
          </View>
        </View>
      )}

      {/* Stats */}
      <View style={[styles.stats, { borderTopColor: theme.borderLight }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text }]}>{postsCount}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Posts</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => {
            navigation.navigate('FollowersList', {
              userId: userId,
              type: 'followers',
              username: profileUser.username,
            });
          }}
        >
          <Text style={[styles.statValue, { color: theme.text }]}>{followersCount}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Followers</Text>
        </TouchableOpacity>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => {
            navigation.navigate('FollowersList', {
              userId: userId,
              type: 'following',
              username: profileUser.username,
            });
          }}
        >
          <Text style={[styles.statValue, { color: theme.text }]}>{followingCount}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Following</Text>
        </TouchableOpacity>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text }]}>{groupsCount}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Groups</Text>
        </View>
      </View>
    </View>
  );

  const renderPostsTab = () => {
    if (userPosts.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No posts yet</Text>
          <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
            This user hasn't shared anything yet.
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={userPosts}
        renderItem={({ item }) => <PostCard post={item} />}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        {renderPostsTab()}
      </ScrollView>
    </SafeAreaView>
  );
}

export default React.memo(UserProfileScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingBottom: 24,
    borderBottomWidth: 8,
    borderBottomColor: '#F9FAFB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonHeader: {
    padding: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#775a96',
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  username: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  bio: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  mutualBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginBottom: 12,
  },
  mutualText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },
  accountValueContainer: {
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accountValueContent: {
    padding: 16,
  },
  accountValueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  accountValueLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  accountValueAmount: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
