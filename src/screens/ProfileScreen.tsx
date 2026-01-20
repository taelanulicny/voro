import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { useTheme } from '../context/ThemeContext';
import { useTrading } from '../context/TradingContext';
import { RootStackParamList } from '../types';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import { formatCurrency } from '../utils/dataGenerator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAuth();
  const { activityFeed, followedUsers } = useSocial();
  const { theme } = useTheme();
  const { portfolio } = useTrading();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [accountValueVisible, setAccountValueVisible] = useState(true);

  // Get current user's posts
  const userPosts = activityFeed.filter(post => post.userId === user?.id);

  // Mock follower/following counts based on followedUsers
  const followersCount = 245; // Mock count
  const followingCount = followedUsers.size;
  const postsCount = userPosts.length;
  const groupsCount = 0; // Mock count - will be replaced with actual data later

  // Load account value visibility preference
  useEffect(() => {
    const loadVisibilityPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem('accountValueVisible');
        if (saved !== null) {
          setAccountValueVisible(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Error loading account value visibility:', error);
      }
    };
    loadVisibilityPreference();
  }, []);

  // Save account value visibility preference
  const toggleAccountValueVisibility = async () => {
    const newVisibility = !accountValueVisible;
    setAccountValueVisible(newVisibility);
    try {
      await AsyncStorage.setItem('accountValueVisible', JSON.stringify(newVisibility));
    } catch (error) {
      console.error('Error saving account value visibility:', error);
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
      <View style={styles.headerTop}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color="#FFFFFF" />
        </View>
        <View style={styles.headerRightButtons}>
          <TouchableOpacity
            style={styles.headerAddPostButton}
            onPress={() => setShowCreatePost(true)}
          >
            <Ionicons name="add" size={24} color={theme.text} />
          </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerSettingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.displayName, { color: theme.text }]}>{user?.displayName}</Text>
      <Text style={[styles.username, { color: theme.textSecondary }]}>@{user?.username}</Text>
      
      <View style={styles.bioContainer}>
      {user?.bio && (
        <Text style={[styles.bio, { color: theme.textSecondary }]}>{user.bio}</Text>
      )}
        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={() => {
            // TODO: Navigate to edit profile screen or open edit modal
            console.log('Edit profile pressed');
          }}
        >
          <Ionicons name="pencil-outline" size={16} color={theme.text} />
          <Text style={[styles.editProfileText, { color: theme.text }]}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Account Value Module */}
      <View style={[styles.accountValueContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
        <TouchableOpacity
          style={styles.accountValueContent}
          onPress={() => navigation.navigate('AccountValue')}
          activeOpacity={0.7}
        >
          <View style={styles.accountValueHeader}>
            <Text style={[styles.accountValueLabel, { color: theme.textSecondary }]}>Account Value</Text>
            <View style={styles.accountValueHeaderRight}>
              <TouchableOpacity
                onPress={() => toggleAccountValueVisibility()}
                style={styles.visibilityButton}
              >
                <Ionicons
                  name={accountValueVisible ? 'eye' : 'eye-off'}
                  size={20}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.textSecondary}
                style={styles.chevronIcon}
              />
            </View>
          </View>
          <Text style={[styles.accountValueAmount, { color: theme.text }]}>
            {accountValueVisible ? formatCurrency(portfolio.totalValue) : '••••••'}
          </Text>
          <Text style={[styles.accountValuePositions, { color: theme.textTertiary }]}>
            {portfolio.holdings.length} {portfolio.holdings.length === 1 ? 'open position' : 'open positions'}
          </Text>
        </TouchableOpacity>
      </View>

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
            if (user) {
              navigation.navigate('FollowersList', {
                userId: user.id,
                type: 'followers',
                username: user.username,
              });
            }
          }}
        >
          <Text style={[styles.statValue, { color: theme.text }]}>{followersCount}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Followers</Text>
        </TouchableOpacity>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => {
            if (user) {
              navigation.navigate('FollowersList', {
                userId: user.id,
                type: 'following',
                username: user.username,
              });
            }
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
            Share your first thought with the community!
          </Text>
          <TouchableOpacity
            style={[styles.emptyStateButton, { backgroundColor: theme.primary }]}
            onPress={() => setShowCreatePost(true)}
          >
            <Text style={styles.emptyStateButtonText}>Create Post</Text>
          </TouchableOpacity>
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

      <CreatePostModal
        visible={showCreatePost}
        onClose={() => setShowCreatePost(false)}
      />
    </SafeAreaView>
  );
}

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
    alignItems: 'flex-start',
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
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAddPostButton: {
    padding: 4,
  },
  headerSettingsButton: {
    padding: 4,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  username: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 8,
  },
  bioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bio: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    flex: 1,
    marginRight: 12,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '500',
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
  accountValueHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountValueLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  visibilityButton: {
    padding: 4,
  },
  chevronIcon: {
    opacity: 0.6,
  },
  accountValueAmount: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  accountValuePositions: {
    fontSize: 13,
    marginTop: 4,
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
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#775a96',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
