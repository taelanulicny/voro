import React, { useState } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAuth();
  const { activityFeed, followedUsers } = useSocial();
  const { theme } = useTheme();
  const [showCreatePost, setShowCreatePost] = useState(false);

  // Get current user's posts
  const userPosts = activityFeed.filter(post => post.userId === user?.id);

  // Mock follower/following counts based on followedUsers
  const followersCount = 245; // Mock count
  const followingCount = followedUsers.size;
  const postsCount = userPosts.length;

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
      <View style={styles.headerTop}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color="#FFFFFF" />
        </View>
        <TouchableOpacity
          style={styles.headerSettingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.displayName, { color: theme.text }]}>{user?.displayName}</Text>
      <Text style={[styles.username, { color: theme.textSecondary }]}>@{user?.username}</Text>
      
      {user?.bio && (
        <Text style={[styles.bio, { color: theme.textSecondary }]}>{user.bio}</Text>
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

      {/* Floating Action Button - Create Post */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => setShowCreatePost(true)}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

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
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
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
  bio: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 16,
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    backgroundColor: '#3B82F6',
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
