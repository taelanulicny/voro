import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNews } from '../context/NewsContext';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import NewsCard from '../components/NewsCard';
import { Post, NewsArticle } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function FeedsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { 
    activityFeed, 
    isLoadingFeed, 
    refreshActivityFeed, 
    followedUsers, 
    isFollowingUser,
    loadMorePosts,
    hasMorePosts,
    isLoadingMore,
  } = useSocial();
  const { news, isLoadingNews, breakingNews, refreshNews, getNewsByFilter } = useNews();
  const { theme } = useTheme();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'trending' | 'following'>('trending');
  const [refreshing, setRefreshing] = useState(false);
  const [newsRefreshing, setNewsRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'feed' | 'news'>('feed');
  const [newsFilter, setNewsFilter] = useState<'all' | 'breaking' | 'category' | 'sentiment'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedSentiment, setSelectedSentiment] = useState<'positive' | 'negative' | 'neutral' | undefined>();
  const [filteredNews, setFilteredNews] = useState<NewsArticle[]>(news);
  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current; // 0 for Feed, 1 for News

  useEffect(() => {
    loadFeed();
    loadNews();
    // Initialize animation position based on selectedTab
    slideAnim.setValue(selectedTab === 'feed' ? 0 : 1);
  }, []);

  useEffect(() => {
    applyNewsFilters();
  }, [newsFilter, selectedCategory, selectedSentiment, news, breakingNews]);

  const loadFeed = async () => {
    await refreshActivityFeed();
  };

  const loadNews = async () => {
    await refreshNews();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshActivityFeed();
    setRefreshing(false);
  };

  const handleNewsRefresh = async () => {
    setNewsRefreshing(true);
    await refreshNews();
    setNewsRefreshing(false);
  };

  // Map display categories to NewsContext category names
  const mapCategoryToNewsCategory = (displayCategory: string): string => {
    const categoryMap: Record<string, string> = {
      'Influencers': 'People',
      'Music Artists': 'People',
      'Sports': 'Events',
      'Political Figures': 'Politics',
      'Startups': 'Tech',
    };
    return categoryMap[displayCategory] || displayCategory;
  };

  const applyNewsFilters = () => {
    if (newsFilter === 'breaking') {
      setFilteredNews(breakingNews);
    } else if (newsFilter === 'category' && selectedCategory) {
      const newsCategory = mapCategoryToNewsCategory(selectedCategory);
      setFilteredNews(getNewsByFilter({ category: newsCategory }));
    } else if (newsFilter === 'sentiment' && selectedSentiment) {
      setFilteredNews(getNewsByFilter({ sentiment: selectedSentiment }));
    } else {
      setFilteredNews(news);
    }
  };

  const handleTabChange = (tab: 'feed' | 'news') => {
    setSelectedTab(tab);
    const scrollToX = tab === 'feed' ? 0 : SCREEN_WIDTH;
    scrollViewRef.current?.scrollTo({ x: scrollToX, animated: true });
    // Animate the sliding indicator
    Animated.timing(slideAnim, {
      toValue: tab === 'feed' ? 0 : 1,
      duration: 200,
      useNativeDriver: false, // We need to animate layout properties
    }).start();
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / SCREEN_WIDTH);
    const newTab = pageIndex === 0 ? 'feed' : 'news';
    if (newTab !== selectedTab) {
      setSelectedTab(newTab);
      // Animate the sliding indicator
      Animated.timing(slideAnim, {
        toValue: newTab === 'feed' ? 0 : 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  };

  // Filter feed based on selected filter
  const filteredFeed = useMemo(() => {
    if (selectedFilter === 'following') {
      return activityFeed.filter(post => isFollowingUser(post.userId));
    }
    return activityFeed;
  }, [activityFeed, selectedFilter, isFollowingUser]);
  
  const hasFollowedUsers = followedUsers.size > 0;

  const renderHeader = () => {
    // Fixed button width for smaller, centered buttons
    const buttonWidth = 120;
    const gap = 8;
    
    const slidePosition = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, buttonWidth + gap],
    });

    return (
    <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={[styles.segmentedControl, { backgroundColor: 'transparent' }]}>
          {/* Sliding background indicator */}
          <Animated.View
            style={[
              styles.slidingIndicator,
              {
                backgroundColor: theme.backgroundSecondary,
                transform: [{ translateX: slidePosition }],
              },
            ]}
          />
          <TouchableOpacity
            style={styles.segmentButton}
            onPress={() => handleTabChange('feed')}
          >
            <Text style={[
              styles.segmentButtonText,
              {
                color: selectedTab === 'feed' ? theme.text : theme.textSecondary,
              },
              selectedTab === 'feed' && styles.segmentButtonTextActive
            ]}>
              Feed
            </Text>
          </TouchableOpacity>
      <TouchableOpacity
            style={styles.segmentButton}
            onPress={() => handleTabChange('news')}
      >
            <Text style={[
              styles.segmentButtonText,
              {
                color: selectedTab === 'news' ? theme.text : theme.textSecondary,
              },
              selectedTab === 'news' && styles.segmentButtonTextActive
            ]}>
              News
            </Text>
      </TouchableOpacity>
        </View>
    </View>
  );
  };

  const renderFilterTabs = () => {
    // Only show filter tabs on Feed tab
    if (selectedTab !== 'feed') return null;

    return (
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
  };

  const renderPost = ({ item }: { item: Post }) => (
    <PostCard post={item} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color={theme.textTertiary} />
      <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No posts yet</Text>
      <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
        {selectedFilter === 'following'
          ? (hasFollowedUsers 
          ? 'Posts from people you follow will appear here'
              : 'Once you start following people, their comments will be shown here')
          : 'Trending posts will appear here'}
      </Text>
      {selectedFilter === 'trending' && (
      <TouchableOpacity
        style={[styles.emptyStateButton, { backgroundColor: theme.primary }]}
        onPress={() => setShowCreatePost(true)}
      >
        <Text style={styles.emptyStateButtonText}>Create Post</Text>
      </TouchableOpacity>
      )}
    </View>
  );

  const renderFooter = () => {
    // Show loading indicator when loading more posts
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.footerLoaderText, { color: theme.textSecondary }]}>Loading more...</Text>
        </View>
      );
    }
    
    // Show end of feed message when no more posts available (only for trending feed)
    if (selectedFilter === 'trending' && !hasMorePosts && filteredFeed.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <Text style={[styles.footerEndText, { color: theme.textSecondary }]}>You're all caught up!</Text>
        </View>
      );
    }
    
    return null;
  };

  const handleEndReached = () => {
    // Only load more when on trending feed (not following filter, as that's client-side filtered)
    // Also check that we have posts to avoid loading on empty feed
    if (
      selectedFilter === 'trending' && 
      hasMorePosts && 
      !isLoadingMore && 
      !isLoadingFeed &&
      filteredFeed.length > 0
    ) {
      loadMorePosts();
    }
  };

  const renderFeedContent = () => (
    <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
      {renderFilterTabs()}
      {isLoadingFeed && activityFeed.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading feed...</Text>
        </View>
      ) : (
      <FlatList
        data={filteredFeed}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
          contentContainerStyle={[
            filteredFeed.length === 0 && styles.emptyListContent,
            filteredFeed.length > 0 && { paddingBottom: 100 }
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  const renderNewsFilterTabs = () => {
    const categories = ['Influencers', 'Music Artists', 'Sports', 'Political Figures', 'Startups'];
    const sentiments = [
      { key: 'positive', label: 'Positive', color: '#10B981', icon: 'trending-up' },
      { key: 'negative', label: 'Negative', color: '#EF4444', icon: 'trending-down' },
      { key: 'neutral', label: 'Neutral', color: '#6B7280', icon: 'remove' },
    ] as const;

    return (
      <View style={[styles.newsFilterSection, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.newsFilterTabs}
        >
          <TouchableOpacity
            style={[
              styles.newsFilterTab,
              { 
                backgroundColor: newsFilter === 'all' ? theme.primaryLight : theme.backgroundSecondary,
                borderColor: newsFilter === 'all' ? theme.primary : theme.border,
              },
            ]}
            onPress={() => {
              setNewsFilter('all');
              setSelectedCategory(undefined);
              setSelectedSentiment(undefined);
            }}
          >
            <Text
              style={[
                styles.newsFilterTabText,
                { color: newsFilter === 'all' ? theme.primary : theme.textSecondary },
                newsFilter === 'all' && { fontWeight: '600' },
              ]}
            >
              All News
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.newsFilterTab,
              { 
                backgroundColor: newsFilter === 'breaking' ? theme.primaryLight : theme.backgroundSecondary,
                borderColor: newsFilter === 'breaking' ? theme.primary : theme.border,
              },
            ]}
            onPress={() => {
              setNewsFilter('breaking');
              setSelectedCategory(undefined);
              setSelectedSentiment(undefined);
            }}
          >
            <Ionicons
              name="flash"
              size={14}
              color={newsFilter === 'breaking' ? theme.primary : theme.textSecondary}
            />
            <Text
              style={[
                styles.newsFilterTabText,
                { color: newsFilter === 'breaking' ? theme.primary : theme.textSecondary },
                newsFilter === 'breaking' && { fontWeight: '600' },
              ]}
            >
              Breaking ({breakingNews.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.newsFilterTab,
              { 
                backgroundColor: newsFilter === 'category' ? theme.primaryLight : theme.backgroundSecondary,
                borderColor: newsFilter === 'category' ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setNewsFilter('category')}
          >
            <Ionicons
              name="grid-outline"
              size={14}
              color={newsFilter === 'category' ? theme.primary : theme.textSecondary}
            />
            <Text
              style={[
                styles.newsFilterTabText,
                { color: newsFilter === 'category' ? theme.primary : theme.textSecondary },
                newsFilter === 'category' && { fontWeight: '600' },
              ]}
            >
              Category
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.newsFilterTab,
              { 
                backgroundColor: newsFilter === 'sentiment' ? theme.primaryLight : theme.backgroundSecondary,
                borderColor: newsFilter === 'sentiment' ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setNewsFilter('sentiment')}
          >
            <Ionicons
              name="pulse-outline"
              size={14}
              color={newsFilter === 'sentiment' ? theme.primary : theme.textSecondary}
            />
            <Text
              style={[
                styles.newsFilterTabText,
                { color: newsFilter === 'sentiment' ? theme.primary : theme.textSecondary },
                newsFilter === 'sentiment' && { fontWeight: '600' },
              ]}
            >
              Sentiment
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Category Selector */}
        {newsFilter === 'category' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.newsSubFilterContainer}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.newsCategoryChip,
                  { 
                    backgroundColor: selectedCategory === category ? theme.primary : theme.backgroundSecondary,
                    borderColor: selectedCategory === category ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setSelectedCategory(category === selectedCategory ? undefined : category)}
              >
                <Text
                  style={[
                    styles.newsCategoryChipText,
                    { color: selectedCategory === category ? '#FFFFFF' : theme.textSecondary },
                    selectedCategory === category && { fontWeight: '600' },
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Sentiment Selector */}
        {newsFilter === 'sentiment' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.newsSubFilterContainer}
          >
            {sentiments.map((sentiment) => (
              <TouchableOpacity
                key={sentiment.key}
                style={[
                  styles.newsSentimentChip,
                  { 
                    backgroundColor: selectedSentiment === sentiment.key ? sentiment.color + '20' : theme.backgroundSecondary,
                    borderColor: selectedSentiment === sentiment.key ? sentiment.color : theme.border,
                  },
                ]}
                onPress={() => setSelectedSentiment(sentiment.key === selectedSentiment ? undefined : sentiment.key)}
              >
                <Ionicons
                  name={sentiment.icon}
                  size={14}
                  color={selectedSentiment === sentiment.key ? sentiment.color : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.newsSentimentChipText,
                    { color: selectedSentiment === sentiment.key ? sentiment.color : theme.textSecondary },
                  ]}
                >
                  {sentiment.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderNewsContent = () => {
    return (
      <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
        {renderNewsFilterTabs()}
        {isLoadingNews && news.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading news...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredNews}
            renderItem={({ item }) => <NewsCard article={item} />}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="newspaper-outline" size={64} color={theme.textTertiary} />
                <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No news found</Text>
                <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                  Try adjusting your filters or check back later for updates
                </Text>
              </View>
            )}
            refreshControl={
              <RefreshControl
                refreshing={newsRefreshing}
                onRefresh={handleNewsRefresh}
                tintColor={theme.primary}
              />
            }
            contentContainerStyle={[
              filteredNews.length === 0 && styles.emptyListContent,
              filteredNews.length > 0 && { paddingBottom: 100, paddingHorizontal: 16 }
            ]}
        showsVerticalScrollIndicator={false}
      />
        )}
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
        {renderFeedContent()}
        {renderNewsContent()}
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
    gap: 8,
    justifyContent: 'center',
    position: 'relative',
  },
  slidingIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 120,
    height: 36, // Match button height (paddingVertical 10 + text height ~16)
    borderRadius: 8,
    zIndex: 0,
  },
  segmentButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 0,
    width: 120,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: 'transparent',
    borderRadius: 8,
  },
  segmentButtonText: {
    fontSize: 17,
    fontWeight: '400',
  },
  segmentButtonTextActive: {
    fontWeight: '600',
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
  horizontalScroll: {
    flex: 1,
  },
  horizontalScrollContent: {
    flexDirection: 'row',
  },
  newsFilterSection: {
    paddingTop: 12,
    paddingBottom: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  newsFilterTabs: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  newsFilterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  newsFilterTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  newsSubFilterContainer: {
    paddingHorizontal: 16,
    gap: 8,
    paddingTop: 8,
  },
  newsCategoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  newsCategoryChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  newsSentimentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  newsSentimentChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 14,
  },
  footerEnd: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerEndText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});
