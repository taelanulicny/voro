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
  Share,
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
import { Post, NewsArticle, Group } from '../types';
import { TextInput, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

<<<<<<< HEAD:src/screens/CommunityScreen.tsx
export default function CommunityScreen() {
=======
function FeedsScreen() {
>>>>>>> parent of ec2acad (Update token symbol to ⓜ, add page 6 with top trades, update entity screen buttons and category display, add skipAuth function):src/screens/FeedsScreen.tsx
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
    groups,
    myGroups,
    isLoadingGroups,
    isLoadingMyGroups,
    refreshGroups,
    refreshUserGroups,
    createGroup,
    joinGroup,
    leaveGroup,
  } = useSocial();
  const { news, isLoadingNews, breakingNews, refreshNews, getNewsByFilter } = useNews();
  const { theme } = useTheme();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'trending' | 'following'>('trending');
  const [refreshing, setRefreshing] = useState(false);
  const [newsRefreshing, setNewsRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'feed' | 'news' | 'groups'>('feed');
  const [newsFilter, setNewsFilter] = useState<'all' | 'breaking' | 'category' | 'sentiment'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedSentiment, setSelectedSentiment] = useState<'positive' | 'negative' | 'neutral' | undefined>();
  const [filteredNews, setFilteredNews] = useState<NewsArticle[]>(news);
  const [groupsRefreshing, setGroupsRefreshing] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupsTab, setGroupsTab] = useState<'my' | 'explore'>('my');
  const [searchQuery, setSearchQuery] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
<<<<<<< HEAD:src/screens/CommunityScreen.tsx
=======
  const slideAnim = useRef(new Animated.Value(0)).current; // 0 for Feed, 1 for News, 2 for Groups
>>>>>>> parent of ec2acad (Update token symbol to ⓜ, add page 6 with top trades, update entity screen buttons and category display, add skipAuth function):src/screens/FeedsScreen.tsx

  useEffect(() => {
    loadFeed();
    loadNews();
<<<<<<< HEAD:src/screens/CommunityScreen.tsx
=======
    loadGroups();
    // Initialize animation position based on selectedTab
    const animValue = selectedTab === 'feed' ? 0 : selectedTab === 'news' ? 1 : 2;
    slideAnim.setValue(animValue);
>>>>>>> parent of ec2acad (Update token symbol to ⓜ, add page 6 with top trades, update entity screen buttons and category display, add skipAuth function):src/screens/FeedsScreen.tsx
  }, []);

  const loadGroups = async () => {
    await Promise.all([
      refreshGroups(),
      refreshUserGroups(),
    ]);
  };

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

  const handleReferFriend = async () => {
    try {
      const shareMessage = `Join me on Moro! 🚀\n\nMoro is the social platform where you can trade, predict, and connect with others around the things you care about.\n\nCreate your account and start building your community today!\n\nDownload Moro now!`;
      
      await Share.share({
        message: shareMessage,
        title: 'Invite a Friend to Moro',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Map display categories to NewsContext category names
  const mapCategoryToNewsCategory = (displayCategory: string): string => {
    const categoryMap: Record<string, string> = {
      'Influencers': 'People',
      'Political Figures': 'Politics',
      'Startups': 'Tech',
      'NFL': 'Events',
      'NBA': 'Events',
      'College Basketball': 'Events',
      'Hip Hop': 'People',
      'Country Music': 'People',
      'Pop Music': 'People',
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

  const handleTabChange = (tab: 'feed' | 'news' | 'groups') => {
    setSelectedTab(tab);
    const scrollToX = tab === 'feed' ? 0 : tab === 'news' ? SCREEN_WIDTH : SCREEN_WIDTH * 2;
    scrollViewRef.current?.scrollTo({ x: scrollToX, animated: true });
<<<<<<< HEAD:src/screens/CommunityScreen.tsx
=======
    // Animate the sliding indicator
    const animValue = tab === 'feed' ? 0 : tab === 'news' ? 1 : 2;
    Animated.timing(slideAnim, {
      toValue: animValue,
      duration: 200,
      useNativeDriver: false, // We need to animate layout properties
    }).start();
>>>>>>> parent of ec2acad (Update token symbol to ⓜ, add page 6 with top trades, update entity screen buttons and category display, add skipAuth function):src/screens/FeedsScreen.tsx
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / SCREEN_WIDTH);
    const newTab = pageIndex === 0 ? 'feed' : pageIndex === 1 ? 'news' : 'groups';
    if (newTab !== selectedTab) {
      setSelectedTab(newTab);
<<<<<<< HEAD:src/screens/CommunityScreen.tsx
=======
      // Animate the sliding indicator
      const animValue = newTab === 'feed' ? 0 : newTab === 'news' ? 1 : 2;
      Animated.timing(slideAnim, {
        toValue: animValue,
        duration: 200,
        useNativeDriver: false,
      }).start();
>>>>>>> parent of ec2acad (Update token symbol to ⓜ, add page 6 with top trades, update entity screen buttons and category display, add skipAuth function):src/screens/FeedsScreen.tsx
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
<<<<<<< HEAD:src/screens/CommunityScreen.tsx
    return (
    <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={[styles.segmentedControl, { backgroundColor: 'transparent' }]}>
=======
    // Fixed button width for smaller, centered buttons
    const buttonWidth = 120;
    const gap = 8;
    
    const slidePosition = slideAnim.interpolate({
      inputRange: [0, 1, 2],
      outputRange: [0, buttonWidth + gap, (buttonWidth + gap) * 2],
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
>>>>>>> parent of ec2acad (Update token symbol to ⓜ, add page 6 with top trades, update entity screen buttons and category display, add skipAuth function):src/screens/FeedsScreen.tsx
          <TouchableOpacity
            style={styles.segmentButton}
            onPress={() => handleTabChange('feed')}
          >
            <Text style={[
              styles.segmentButtonText,
<<<<<<< HEAD:src/screens/CommunityScreen.tsx
              { color: theme.text },
=======
              {
                color: selectedTab === 'feed' ? theme.text : theme.textSecondary,
              },
>>>>>>> parent of ec2acad (Update token symbol to ⓜ, add page 6 with top trades, update entity screen buttons and category display, add skipAuth function):src/screens/FeedsScreen.tsx
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
<<<<<<< HEAD:src/screens/CommunityScreen.tsx
              { color: theme.text },
=======
              {
                color: selectedTab === 'news' ? theme.text : theme.textSecondary,
              },
>>>>>>> parent of ec2acad (Update token symbol to ⓜ, add page 6 with top trades, update entity screen buttons and category display, add skipAuth function):src/screens/FeedsScreen.tsx
              selectedTab === 'news' && styles.segmentButtonTextActive
            ]}>
              News
            </Text>
      </TouchableOpacity>
      <TouchableOpacity
            style={styles.segmentButton}
            onPress={() => handleTabChange('groups')}
      >
            <Text style={[
              styles.segmentButtonText,
<<<<<<< HEAD:src/screens/CommunityScreen.tsx
              { color: theme.text },
=======
              {
                color: selectedTab === 'groups' ? theme.text : theme.textSecondary,
              },
>>>>>>> parent of ec2acad (Update token symbol to ⓜ, add page 6 with top trades, update entity screen buttons and category display, add skipAuth function):src/screens/FeedsScreen.tsx
              selectedTab === 'groups' && styles.segmentButtonTextActive
            ]}>
              Groups
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
        removeClippedSubviews={true}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        windowSize={10}
        getItemLayout={(data, index) => ({
          length: 200, // Estimated item height
          offset: 200 * index,
          index,
        })}
      />
      )}
    </View>
  );

  const renderNewsFilterTabs = () => {
    const categories = ['Influencers', 'Political Figures', 'Startups', 'NFL', 'NBA', 'College Basketball', 'Hip Hop', 'Country Music', 'Pop Music'];
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

  // Filter groups for Explore tab based on search query
  const filteredExploreGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return groups;
    }
    const query = searchQuery.toLowerCase();
    return groups.filter(group => 
      group.name.toLowerCase().includes(query) ||
      group.description.toLowerCase().includes(query) ||
      group.category.toLowerCase().includes(query)
    );
  }, [groups, searchQuery]);

  const handleGroupsRefresh = async () => {
    setGroupsRefreshing(true);
    await Promise.all([
      refreshGroups(),
      refreshUserGroups(),
    ]);
    setGroupsRefreshing(false);
  };

  const renderGroupsContent = () => {
    const currentGroups = groupsTab === 'my' ? myGroups : filteredExploreGroups;
    const isLoading = groupsTab === 'my' ? isLoadingMyGroups : isLoadingGroups;

    const renderGroupCard = ({ item }: { item: Group }) => (
      <TouchableOpacity
        style={[styles.groupCard, { backgroundColor: theme.card }]}
        onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.groupHeader}>
          <View style={[styles.groupIcon, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="people" size={32} color={theme.primary} />
          </View>
          <View style={styles.groupInfo}>
            <View style={styles.groupTitleRow}>
              <Text style={[styles.groupName, { color: theme.text }]}>{item.name}</Text>
              {item.isPrivate && (
                <Ionicons name="lock-closed" size={14} color={theme.textSecondary} />
              )}
            </View>
            <Text style={[styles.groupCategory, { color: theme.primary }]}>{item.category}</Text>
            <Text style={[styles.groupMembers, { color: theme.textSecondary }]}>
              {item.memberCount.toLocaleString()} members
            </Text>
          </View>
        </View>

        <Text style={[styles.groupDescription, { color: theme.textSecondary }]} numberOfLines={2}>
          {item.description}
        </Text>

        {groupsTab === 'explore' && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: item.isMember ? theme.backgroundTertiary : theme.primary },
              item.isMember && { borderWidth: 1.5, borderColor: theme.border },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              item.isMember ? leaveGroup(item.id) : joinGroup(item.id);
            }}
          >
            <Text
              style={[
                styles.actionButtonText,
                { color: item.isMember ? theme.textSecondary : '#FFFFFF' },
              ]}
            >
              {item.isMember ? 'Leave' : 'Join'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );

    const renderGroupsEmptyState = () => {
      if (isLoading) {
        return (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>Loading groups...</Text>
          </View>
        );
      }

      return (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
            {groupsTab === 'my' 
              ? 'No groups yet' 
              : searchQuery.trim() 
                ? 'No groups found' 
                : 'No groups available'}
          </Text>
          <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
            {groupsTab === 'my'
              ? 'Join groups to connect with like-minded traders'
              : searchQuery.trim()
                ? 'Try a different search term'
                : 'Be the first to create a trading group!'}
          </Text>
          {groupsTab === 'my' && (
            <TouchableOpacity
              style={[styles.emptyStateButton, { backgroundColor: theme.primary }]}
              onPress={() => setGroupsTab('explore')}
            >
              <Text style={styles.emptyStateButtonText}>Explore Groups</Text>
            </TouchableOpacity>
          )}
          {groupsTab === 'explore' && (
            <TouchableOpacity
              style={[styles.emptyStateButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowCreateGroupModal(true)}
            >
              <Text style={styles.emptyStateButtonText}>Create Group</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    };

    return (
      <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
        {/* Groups Sub-tabs */}
        <View style={[styles.groupsTabsContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.groupsTab, groupsTab === 'my' && styles.groupsTabActive]}
            onPress={() => setGroupsTab('my')}
          >
            <Text
              style={[
                styles.groupsTabText,
                { color: groupsTab === 'my' ? theme.primary : theme.textSecondary },
                groupsTab === 'my' && { fontWeight: '600' },
              ]}
            >
              My Groups
            </Text>
            {groupsTab === 'my' && <View style={[styles.groupsTabIndicator, { backgroundColor: theme.primary }]} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.groupsTab, groupsTab === 'explore' && styles.groupsTabActive]}
            onPress={() => setGroupsTab('explore')}
          >
            <Text
              style={[
                styles.groupsTabText,
                { color: groupsTab === 'explore' ? theme.primary : theme.textSecondary },
                groupsTab === 'explore' && { fontWeight: '600' },
              ]}
            >
              Explore
            </Text>
            {groupsTab === 'explore' && <View style={[styles.groupsTabIndicator, { backgroundColor: theme.primary }]} />}
          </TouchableOpacity>
        </View>

        {/* Search Bar for Explore */}
        {groupsTab === 'explore' && (
          <View style={[styles.searchContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <View style={[styles.searchBar, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search groups..."
                placeholderTextColor={theme.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Create Group Button */}
        <View style={[styles.groupsHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <Text style={[styles.groupsTitle, { color: theme.text }]}>
            {groupsTab === 'my' ? 'My Groups' : 'Explore Groups'}
          </Text>
          <TouchableOpacity
            style={styles.createGroupButton}
            onPress={() => setShowCreateGroupModal(true)}
          >
            <Ionicons name="add-circle" size={28} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {isLoading && currentGroups.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading groups...</Text>
          </View>
        ) : (
          <FlatList
            data={currentGroups}
            renderItem={renderGroupCard}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={renderGroupsEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={groupsRefreshing}
                onRefresh={handleGroupsRefresh}
                tintColor={theme.primary}
              />
            }
            contentContainerStyle={[
              styles.listContent,
              currentGroups.length === 0 && styles.emptyListContent,
            ]}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            updateCellsBatchingPeriod={50}
            windowSize={10}
            getItemLayout={(data, index) => ({
              length: 180, // Estimated group card height
              offset: 180 * index,
              index,
            })}
          />
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
            removeClippedSubviews={true}
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            updateCellsBatchingPeriod={50}
            windowSize={10}
            getItemLayout={(data, index) => ({
              length: 250, // Estimated news card height
              offset: 250 * index,
              index,
            })}
          />
        )}
      </View>
    );
  };

  const renderGroupsContent = () => {
    return (
      <View style={{ width: SCREEN_WIDTH, flex: 1, backgroundColor: theme.backgroundSecondary }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.groupsContent}
        >
          {/* Build Your Community Header */}
          <View style={styles.groupsHeader}>
            <View style={[styles.groupsTitleContainer, { backgroundColor: theme.card }]}>
              <Text style={[styles.groupsTitle, { color: theme.text }]}>Build Your Community</Text>
            </View>
            <TouchableOpacity
              style={[styles.referFriendButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={handleReferFriend}
            >
              <Ionicons name="share-outline" size={20} color={theme.primary} />
              <Text style={[styles.referFriendButtonText, { color: theme.text }]}>Refer a Friend</Text>
            </TouchableOpacity>
          </View>

          {/* Getting Started Section */}
          <View style={styles.gettingStartedSection}>
            <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>GETTING STARTED</Text>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => {
                // TODO: Implement enter invite code functionality
              }}
            >
              <Ionicons name="search-outline" size={20} color={theme.text} />
              <Text style={[styles.actionButtonText, { color: theme.text }]}>Enter Invite Code</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => {
                // TODO: Implement create team functionality
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color={theme.text} />
              <Text style={[styles.actionButtonText, { color: theme.text }]}>Create Team</Text>
            </TouchableOpacity>
          </View>

          {/* Recommended Teams Section */}
          <View style={styles.recommendedTeamsSection}>
            <View style={styles.recommendedTeamsHeader}>
              <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>RECOMMENDED TEAMS</Text>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => {
                  // TODO: Implement view all teams functionality
                }}
              >
                <Text style={[styles.viewAllText, { color: theme.text }]}>VIEW ALL</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.teamsScrollContent}
            >
              {[
                { id: '1', name: 'UTAH', members: 6277, icon: 'flag-outline', color: '#1E40AF' },
                { id: '2', name: 'Brown University', members: 4234, icon: 'school-outline', color: '#7C3AED' },
                { id: '3', name: 'MEN', members: 203376, icon: 'people-outline', color: '#0EA5E9' },
                { id: '4', name: 'FITNESS', members: 45231, icon: 'fitness-outline', color: '#10B981' },
                { id: '5', name: 'TECH', members: 89123, icon: 'hardware-chip-outline', color: '#F59E0B' },
              ].map((team) => (
                <TouchableOpacity
                  key={team.id}
                  style={[styles.teamCard, { backgroundColor: theme.card }]}
                  onPress={() => {
                    // TODO: Navigate to team details
                  }}
                >
                  <View style={[styles.teamCardImage, { backgroundColor: team.color + '40' }]}>
                    <View style={[styles.teamCardIcon, { backgroundColor: team.color }]}>
                      <Ionicons name={team.icon as any} size={24} color="#FFFFFF" />
                    </View>
                  </View>
                  <Text style={[styles.teamCardName, { color: theme.text }]}>{team.name}</Text>
                  <Text style={[styles.teamCardMembers, { color: theme.textSecondary }]}>
                    {team.members.toLocaleString()} MEMBERS
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
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
        {renderGroupsContent()}
      </ScrollView>

      <CreatePostModal
        visible={showCreatePost}
        onClose={() => setShowCreatePost(false)}
      />

      <CreateGroupModal
        visible={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onCreate={createGroup}
        onSuccess={() => {
          refreshUserGroups();
          refreshGroups();
        }}
      />

      {/* Floating Action Button - Create Post */}
      <TouchableOpacity
        style={styles.floatingCreateButton}
        onPress={() => setShowCreatePost(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

export default React.memo(FeedsScreen);

// Create Group Modal Component
interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (params: { name: string; description: string; category: string; isPrivate: boolean }) => Promise<{ success: boolean; group?: Group; error?: string }>;
  onSuccess: () => void;
}

function CreateGroupModal({ visible, onClose, onCreate, onSuccess }: CreateGroupModalProps) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = ['Technology', 'Cryptocurrency', 'Trading', 'Investing', 'Other'];

  const handleSubmit = async () => {
    if (!name.trim() || !description.trim() || !category) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    const result = await onCreate({
      name: name.trim(),
      description: description.trim(),
      category,
      isPrivate,
    });
    setIsSubmitting(false);

    if (result.success) {
      setName('');
      setDescription('');
      setCategory('');
      setIsPrivate(false);
      onClose();
      onSuccess();
      Alert.alert('Success', 'Group created successfully!');
    } else {
      Alert.alert('Error', result.error || 'Failed to create group');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.modalContainer, { backgroundColor: theme.card }]}
      >
        <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
            <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Create Group</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || !name.trim() || !description.trim() || !category}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Text
                style={[
                  styles.modalCreateText,
                  { color: (!name.trim() || !description.trim() || !category) ? theme.textTertiary : theme.primary },
                ]}
              >
                Create
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: theme.text }]}>Group Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
            placeholder="e.g. Tech Stock Bulls"
            placeholderTextColor={theme.textTertiary}
            value={name}
            onChangeText={setName}
            maxLength={50}
          />

          <Text style={[styles.label, { color: theme.text }]}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
            placeholder="What's this group about?"
            placeholderTextColor={theme.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={200}
          />

          <Text style={[styles.label, { color: theme.text }]}>Category</Text>
          <View style={styles.categoryButtons}>
            {categories.map((cat) => {
              const isActive = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    {
                      backgroundColor: isActive ? theme.primary : theme.backgroundSecondary,
                      borderColor: isActive ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      { color: isActive ? '#FFFFFF' : theme.textSecondary },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.privacyToggle}
            onPress={() => setIsPrivate(!isPrivate)}
          >
            <View style={styles.privacyToggleInfo}>
              <Ionicons
                name={isPrivate ? 'lock-closed' : 'lock-open'}
                size={20}
                color={theme.textSecondary}
              />
              <Text style={[styles.privacyToggleText, { color: theme.text }]}>Private Group</Text>
            </View>
            <View style={[
              styles.switch,
              { backgroundColor: isPrivate ? theme.primary : theme.backgroundTertiary },
            ]}>
              <View style={[styles.switchThumb, isPrivate && styles.switchThumbActive]} />
            </View>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 0,
    borderBottomWidth: 1,
  },
  floatingCreateButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#60A5FA',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#60A5FA',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    zIndex: 1000,
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
<<<<<<< HEAD:src/screens/CommunityScreen.tsx
=======
  slidingIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 120,
    height: 36, // Match button height (paddingVertical 10 + text height ~16)
    borderRadius: 8,
    zIndex: 0,
  },
>>>>>>> parent of ec2acad (Update token symbol to ⓜ, add page 6 with top trades, update entity screen buttons and category display, add skipAuth function):src/screens/FeedsScreen.tsx
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
<<<<<<< HEAD:src/screens/CommunityScreen.tsx
    fontWeight: '700',
=======
    fontWeight: '600',
>>>>>>> parent of ec2acad (Update token symbol to ⓜ, add page 6 with top trades, update entity screen buttons and category display, add skipAuth function):src/screens/FeedsScreen.tsx
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
  // Groups styles
  groupsTabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  groupsTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  groupsTabActive: {
    // Active tab styling handled by indicator
  },
  groupsTabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  groupsTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  groupsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  groupsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  createGroupButton: {
    padding: 4,
  },
  groupCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  groupIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '600',
  },
  groupCategory: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  groupMembers: {
    fontSize: 13,
    marginTop: 2,
  },
  groupDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 16,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCancelText: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCreateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  privacyToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 16,
  },
  privacyToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privacyToggleText: {
    fontSize: 15,
    fontWeight: '500',
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
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
<<<<<<< HEAD:src/screens/CommunityScreen.tsx
  groupsContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  groupsHeader: {
    marginTop: 8,
    marginBottom: 32,
  },
  groupsTitleContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupsTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  referFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  referFriendButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  gettingStartedSection: {
    marginTop: 8,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  recommendedTeamsSection: {
    marginTop: 32,
  },
  recommendedTeamsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  teamsScrollContent: {
    paddingRight: 16,
    gap: 12,
  },
  teamCard: {
    width: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  teamCardImage: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamCardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamCardName: {
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  teamCardMembers: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 12,
    paddingBottom: 12,
=======
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
>>>>>>> parent of ec2acad (Update token symbol to ⓜ, add page 6 with top trades, update entity screen buttons and category display, add skipAuth function):src/screens/FeedsScreen.tsx
  },
});
