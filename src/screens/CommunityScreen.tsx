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
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { RootStackParamList, MainTabParamList } from '../types';
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

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

export default function CommunityScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { activityFeed, isLoadingFeed, refreshActivityFeed, followedUsers, isFollowingUser, myGroups, groups } = useSocial();
  const { news, isLoadingNews, breakingNews, refreshNews, getNewsByFilter } = useNews();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
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
      'People': 'People',
      'Actors': 'People',
      'NBA Players': 'Events',
      'NFL Players': 'Events',
      'Soccer Players': 'Events',
      'Influencers': 'People',
      'Political Figures': 'Politics',
      'NFL Teams': 'Events',
      'NBA Teams': 'Events',
      'College Basketball Teams': 'Events',
      'Teams': 'Events',
      'Rap Music': 'People',
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
    const categories = ['People', 'Teams', 'Actors', 'NBA Players', 'NFL Players', 'Soccer Players', 'Influencers', 'Political Figures', 'NFL Teams', 'NBA Teams', 'College Basketball Teams', 'Rap Music', 'Country Music', 'Pop Music'];
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

  // Get recommended groups (groups user is not a member of)
  const recommendedGroups = useMemo(() => {
    const recommendedNames = ['Brown University', 'Top NYC Traders', 'Influencer Focused'];
    const recommendedMemberCounts = [714, undefined, undefined] as const;

    return groups
      .filter(group => !group.isMember)
      .slice(0, recommendedNames.length)
      .map((group, index) => ({
        ...group,
        name: recommendedNames[index] ?? group.name,
        memberCount: recommendedMemberCounts[index] ?? group.memberCount,
      }));
  }, [groups]);

  // Generate color based on category for visual consistency
  const getCategoryColor = (category: string): string => {
    const colorMap: Record<string, string> = {
      'Technology': '#775a96', // blue
      'Cryptocurrency': '#8B5CF6', // purple
      'Trading': '#10B981', // green
      'Investing': '#F59E0B', // amber
      'Other': '#EF4444', // red
    };
    return colorMap[category] || '#6B7280'; // gray default
  };

  const renderGroupsContent = () => {
    return (
      <View style={{ width: SCREEN_WIDTH, flex: 1, backgroundColor: theme.backgroundSecondary }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.groupsContent}
        >
          {/* Your Moro Community Header */}
          <View style={styles.groupsHeader}>
            <Text style={[styles.groupsTitle, { color: theme.text }]}>Your Moro Community</Text>
            </View>

          {/* My Groups Section */}
          <View style={styles.myGroupsSection}>
            <Text style={[styles.myGroupsTitle, { color: theme.text }]}>My Groups</Text>
            
            {/* Groups List */}
            {myGroups.length > 0 && (
              <>
                {myGroups.map((group) => (
            <TouchableOpacity
                    key={group.id}
                    style={[styles.groupActionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => {
                      navigation.navigate('GroupDetail', { groupId: group.id });
                    }}
                  >
                    <View style={[styles.groupActionIcon, { backgroundColor: theme.primaryLight }]}>
                      <Ionicons name="people" size={20} color={theme.primary} />
                    </View>
                    <Text style={[styles.groupActionText, { color: theme.text }]}>{group.name}</Text>
                    <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
                ))}
              </>
            )}
          </View>

          {/* Divider Line */}
          {myGroups.length > 0 && (
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
          )}

          {/* Action Buttons Section */}
          <View style={styles.actionButtonsSection}>
            <Text style={[styles.actionButtonsTitle, { color: theme.text }]}>Actions</Text>
            
            <TouchableOpacity
              style={[styles.groupActionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => {
                navigation.navigate('Main', { screen: 'Groups' });
              }}
            >
              <View style={[styles.groupActionIcon, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="people-outline" size={20} color={theme.primary} />
              </View>
              <Text style={[styles.groupActionText, { color: theme.text }]}>
                {myGroups.length === 0 ? 'Join a group' : 'Join another group'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.groupActionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => {
                navigation.navigate('CreateGroup');
              }}
            >
              <View style={[styles.groupActionIcon, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
              </View>
              <Text style={[styles.groupActionText, { color: theme.text }]}>Create a group</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Recommended Groups Section */}
          <View style={styles.recommendedTeamsSection}>
            <View style={styles.recommendedTeamsHeader}>
              <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>RECOMMENDED GROUPS</Text>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => {
                  navigation.navigate('RecommendedGroups');
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
              {recommendedGroups.map((group) => {
                const categoryColor = getCategoryColor(group.category);
                return (
                  <TouchableOpacity
                    key={group.id}
                    style={[styles.teamCard, { backgroundColor: theme.card }]}
                    onPress={() => {
                      navigation.navigate('GroupDetail', { groupId: group.id });
                    }}
                  >
                    {group.coverImage ? (
                      <Image source={{ uri: group.coverImage }} style={styles.teamCardImage} />
                    ) : (
                      <View style={[styles.teamCardImage, { backgroundColor: categoryColor + '40' }]}>
                        <View style={[styles.teamCardIcon, { backgroundColor: categoryColor }]}>
                          <Ionicons name="people" size={24} color="#FFFFFF" />
                        </View>
                      </View>
                    )}
                    <Text style={[styles.teamCardName, { color: theme.text }]}>{group.name}</Text>
                    <Text style={[styles.teamCardMembers, { color: theme.textSecondary }]}>
                      {group.memberCount.toLocaleString()} MEMBERS
                    </Text>
                  </TouchableOpacity>
                );
              })}
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
        slideFromBottom={true}
      />

      {/* Floating Action Button - Only show on Feed tab */}
      {selectedTab === 'feed' && (
        <TouchableOpacity
          style={[
            styles.fab,
            {
              backgroundColor: theme.primary,
              bottom: Math.max(insets.bottom, 12) + 48 + 20, // Above profile button (48px) + 20px gap
              right: 16 + 12, // Same as nav padding + offset to be diagonally up and left
            }
          ]}
          onPress={() => setShowCreatePost(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}
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
    paddingTop: 8,
    paddingBottom: 100,
  },
  groupsHeader: {
    marginTop: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  groupsTitle: {
    fontSize: 34,
    fontWeight: '700',
    paddingHorizontal: 0,
    textAlign: 'center',
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
    marginTop: 16,
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
    borderRadius: 12,
    overflow: 'hidden',
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
  myGroupsSection: {
    marginTop: 8,
    paddingBottom: 16,
  },
  myGroupsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  actionButtonsSection: {
    marginTop: 8,
    paddingBottom: 8,
  },
  actionButtonsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  groupActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  groupActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupActionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
