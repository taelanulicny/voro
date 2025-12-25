import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import { Post } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function FeedsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { activityFeed, isLoadingFeed, refreshActivityFeed } = useSocial();
  const { theme } = useTheme();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'trending' | 'following'>('trending');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'feed' | 'news'>('feed');

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    await refreshActivityFeed();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshActivityFeed();
    setRefreshing(false);
  };

  const filteredFeed = activityFeed; // In a real app, filter by followed users when selectedFilter === 'following'

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <View style={[styles.segmentedControl, { backgroundColor: '#E8E8F5' }]}>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            selectedTab === 'feed' && styles.segmentButtonActive
          ]}
          onPress={() => setSelectedTab('feed')}
        >
          <Text style={[
            styles.segmentButtonText,
            selectedTab === 'feed' && styles.segmentButtonTextActive
          ]}>
            Feed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            selectedTab === 'news' && styles.segmentButtonActive
          ]}
          onPress={() => navigation.navigate('NewsFeed')}
        >
          <Text style={[
            styles.segmentButtonText,
            selectedTab === 'news' && styles.segmentButtonTextActive
          ]}>
            News
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFilterTabs = () => (
    <View style={[styles.filterTabs, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <TouchableOpacity
        style={styles.filterTab}
        onPress={() => setSelectedFilter('trending')}
      >
        <Text
          style={[
            styles.filterTabText,
            { color: selectedFilter === 'trending' ? theme.primary : theme.textSecondary },
            selectedFilter === 'trending' && { fontWeight: '600' },
          ]}
        >
          Trending
        </Text>
        {selectedFilter === 'trending' && <View style={[styles.filterTabIndicator, { backgroundColor: theme.primary }]} />}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.filterTab}
        onPress={() => setSelectedFilter('following')}
      >
        <Text
          style={[
            styles.filterTabText,
            { color: selectedFilter === 'following' ? theme.primary : theme.textSecondary },
            selectedFilter === 'following' && { fontWeight: '600' },
          ]}
        >
          Following
        </Text>
        {selectedFilter === 'following' && <View style={[styles.filterTabIndicator, { backgroundColor: theme.primary }]} />}
      </TouchableOpacity>
    </View>
  );

  const renderPost = ({ item }: { item: Post }) => (
    <PostCard post={item} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color={theme.textTertiary} />
      <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No posts yet</Text>
      <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
        {selectedFilter === 'following'
          ? 'Posts from people you follow will appear here'
          : 'Trending posts will appear here'}
      </Text>
      <TouchableOpacity
        style={[styles.emptyStateButton, { backgroundColor: theme.primary }]}
        onPress={() => setShowCreatePost(true)}
      >
        <Text style={styles.emptyStateButtonText}>Create Post</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoadingFeed && activityFeed.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading feed...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      <FlatList
        data={filteredFeed}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {renderFilterTabs()}
          </>
        }
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        contentContainerStyle={
          filteredFeed.length === 0 && styles.emptyListContent
        }
        showsVerticalScrollIndicator={false}
      />

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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    borderBottomWidth: 1,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 0,
    padding: 4,
    alignSelf: 'stretch',
    width: '100%',
    gap: 8,
    justifyContent: 'center',
  },
  segmentButton: {
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 0,
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  segmentButtonText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#374151',
  },
  segmentButtonTextActive: {
    fontWeight: '600',
    color: '#111827',
  },
  filterTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  filterTabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  filterTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
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
  emptyListContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 100,
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
    marginBottom: 24,
  },
  emptyStateButton: {
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
