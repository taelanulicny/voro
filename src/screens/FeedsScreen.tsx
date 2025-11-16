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
import { Ionicons } from '@expo/vector-icons';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import { Post } from '../types';

export default function FeedsScreen() {
  const { user } = useAuth();
  const { activityFeed, isLoadingFeed, refreshActivityFeed } = useSocial();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'following'>('all');
  const [refreshing, setRefreshing] = useState(false);

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
    <View style={styles.header}>
      <Text style={styles.title}>Feed</Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setShowCreatePost(true)}
      >
        <Ionicons name="add-circle" size={28} color="#3B82F6" />
      </TouchableOpacity>
    </View>
  );

  const renderFilterTabs = () => (
    <View style={styles.filterTabs}>
      <TouchableOpacity
        style={[
          styles.filterTab,
          selectedFilter === 'all' && styles.filterTabActive,
        ]}
        onPress={() => setSelectedFilter('all')}
      >
        <Text
          style={[
            styles.filterTabText,
            selectedFilter === 'all' && styles.filterTabTextActive,
          ]}
        >
          All Posts
        </Text>
        {selectedFilter === 'all' && <View style={styles.filterTabIndicator} />}
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filterTab,
          selectedFilter === 'following' && styles.filterTabActive,
        ]}
        onPress={() => setSelectedFilter('following')}
      >
        <Text
          style={[
            styles.filterTabText,
            selectedFilter === 'following' && styles.filterTabTextActive,
          ]}
        >
          Following
        </Text>
        {selectedFilter === 'following' && <View style={styles.filterTabIndicator} />}
      </TouchableOpacity>
    </View>
  );

  const renderPost = ({ item }: { item: Post }) => (
    <PostCard post={item} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyStateTitle}>No posts yet</Text>
      <Text style={styles.emptyStateText}>
        {selectedFilter === 'following'
          ? 'Posts from people you follow will appear here'
          : 'Be the first to share your thoughts!'}
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={() => setShowCreatePost(true)}
      >
        <Text style={styles.emptyStateButtonText}>Create Post</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoadingFeed && activityFeed.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading feed...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
            tintColor="#3B82F6"
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
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  createButton: {
    padding: 4,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  filterTabActive: {
    // Active state
  },
  filterTabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  filterTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#3B82F6',
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
    color: '#6B7280',
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
