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
  const { activityFeed, isLoadingFeed, refreshActivityFeed, followedUsers, isFollowingUser } = useSocial();
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
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadFeed();
    loadNews();
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
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / SCREEN_WIDTH);
    const newTab = pageIndex === 0 ? 'feed' : pageIndex === 1 ? 'news' : 'groups';
    if (newTab !== selectedTab) {
      setSelectedTab(newTab);
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
    return (
    <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={[styles.segmentedControl, { backgroundColor: 'transparent' }]}>
          <TouchableOpacity
            style={styles.segmentButton}
            onPress={() => handleTabChange('feed')}
          >
            <Text style={[
              styles.segmentButtonText,
              { color: theme.text },
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
              { color: theme.text },
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
              { color: theme.text },
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
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
              onPress={() => {
                // TODO: Implement invite code functionality
              }}
            >
              <Ionicons name="gift-outline" size={20} color={theme.primary} />
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
    fontWeight: '700',
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
  groupsContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  groupsHeader: {
    marginTop: 24,
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
  },
});
