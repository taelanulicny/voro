import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNews } from '../context/NewsContext';
import { useTheme } from '../context/ThemeContext';
import { NewsArticle, NewsFilter } from '../types';
import NewsCard from '../components/NewsCard';

function NewsScreen() {
  const { news, isLoadingNews, breakingNews, refreshNews, getNewsByFilter } = useNews();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'breaking' | 'category' | 'sentiment'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedSentiment, setSelectedSentiment] = useState<'positive' | 'negative' | 'neutral' | undefined>();
  const [filteredNews, setFilteredNews] = useState<NewsArticle[]>(news);

  useEffect(() => {
    loadNews();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [selectedFilter, selectedCategory, selectedSentiment, news]);

  const loadNews = async () => {
    await refreshNews();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshNews();
    setRefreshing(false);
  };

  const applyFilters = () => {
    if (selectedFilter === 'breaking') {
      setFilteredNews(breakingNews);
    } else if (selectedFilter === 'category' && selectedCategory) {
      setFilteredNews(getNewsByFilter({ category: selectedCategory }));
    } else if (selectedFilter === 'sentiment' && selectedSentiment) {
      setFilteredNews(getNewsByFilter({ sentiment: selectedSentiment }));
    } else {
      setFilteredNews(news);
    }
  };

  const categories = ['Tech', 'Politics', 'Events', 'People', 'General'];
  const sentiments = [
    { key: 'positive', label: 'Positive', color: '#10B981', icon: 'trending-up' },
    { key: 'negative', label: 'Negative', color: '#EF4444', icon: 'trending-down' },
    { key: 'neutral', label: 'Neutral', color: '#6B7280', icon: 'remove' },
  ] as const;

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.backgroundSecondary }]}>
      <Text style={[styles.title, { color: theme.text }]}>News</Text>
      {breakingNews.length > 0 && (
        <View style={styles.breakingCountBadge}>
          <Ionicons name="flash" size={12} color="#FFFFFF" />
          <Text style={styles.breakingCountText}>{breakingNews.length}</Text>
        </View>
      )}
    </View>
  );

  const renderFilterTabs = () => (
    <View style={[styles.filterSection, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterTabs}
      >
        <TouchableOpacity
          style={[
            styles.filterTab,
            { 
              backgroundColor: selectedFilter === 'all' ? theme.primaryLight : theme.backgroundSecondary,
              borderColor: selectedFilter === 'all' ? theme.primary : theme.border,
            },
          ]}
          onPress={() => {
            setSelectedFilter('all');
            setSelectedCategory(undefined);
            setSelectedSentiment(undefined);
          }}
        >
          <Text
            style={[
              styles.filterTabText,
              { color: selectedFilter === 'all' ? theme.primary : theme.textSecondary },
              selectedFilter === 'all' && { fontWeight: '600' },
            ]}
          >
            All News
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            { 
              backgroundColor: selectedFilter === 'breaking' ? theme.primaryLight : theme.backgroundSecondary,
              borderColor: selectedFilter === 'breaking' ? theme.primary : theme.border,
            },
          ]}
          onPress={() => {
            setSelectedFilter('breaking');
            setSelectedCategory(undefined);
            setSelectedSentiment(undefined);
          }}
        >
          <Ionicons
            name="flash"
            size={14}
            color={selectedFilter === 'breaking' ? theme.primary : theme.textSecondary}
          />
          <Text
            style={[
              styles.filterTabText,
              { color: selectedFilter === 'breaking' ? theme.primary : theme.textSecondary },
              selectedFilter === 'breaking' && { fontWeight: '600' },
            ]}
          >
            Breaking ({breakingNews.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            { 
              backgroundColor: selectedFilter === 'category' ? theme.primaryLight : theme.backgroundSecondary,
              borderColor: selectedFilter === 'category' ? theme.primary : theme.border,
            },
          ]}
          onPress={() => setSelectedFilter('category')}
        >
          <Ionicons
            name="grid-outline"
            size={14}
            color={selectedFilter === 'category' ? theme.primary : theme.textSecondary}
          />
          <Text
            style={[
              styles.filterTabText,
              { color: selectedFilter === 'category' ? theme.primary : theme.textSecondary },
              selectedFilter === 'category' && { fontWeight: '600' },
            ]}
          >
            Category
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            { 
              backgroundColor: selectedFilter === 'sentiment' ? theme.primaryLight : theme.backgroundSecondary,
              borderColor: selectedFilter === 'sentiment' ? theme.primary : theme.border,
            },
          ]}
          onPress={() => setSelectedFilter('sentiment')}
        >
          <Ionicons
            name="pulse-outline"
            size={14}
            color={selectedFilter === 'sentiment' ? theme.primary : theme.textSecondary}
          />
          <Text
            style={[
              styles.filterTabText,
              { color: selectedFilter === 'sentiment' ? theme.primary : theme.textSecondary },
              selectedFilter === 'sentiment' && { fontWeight: '600' },
            ]}
          >
            Sentiment
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Category Selector */}
      {selectedFilter === 'category' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subFilterContainer}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                { 
                  backgroundColor: selectedCategory === category ? theme.primary : theme.backgroundSecondary,
                  borderColor: selectedCategory === category ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setSelectedCategory(category === selectedCategory ? undefined : category)}
            >
              <Text
                style={[
                  styles.categoryChipText,
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
      {selectedFilter === 'sentiment' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subFilterContainer}
        >
          {sentiments.map((sentiment) => (
            <TouchableOpacity
              key={sentiment.key}
              style={[
                styles.sentimentChip,
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
                  styles.sentimentChipText,
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

  const renderNewsItem = ({ item }: { item: NewsArticle }) => (
    <NewsCard article={item} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="newspaper-outline" size={64} color={theme.textTertiary} />
      <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No news found</Text>
      <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
        Try adjusting your filters or check back later for updates
      </Text>
    </View>
  );

  if (isLoadingNews && news.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading news...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      <FlatList
        data={filteredNews}
        renderItem={renderNewsItem}
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
        contentContainerStyle={[
          styles.listContent,
          filteredNews.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

export default React.memo(NewsScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  breakingCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  breakingCountText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  filterSection: {
    paddingTop: 12,
    paddingBottom: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  filterTabs: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  subFilterContainer: {
    paddingHorizontal: 16,
    gap: 8,
    paddingTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sentimentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  sentimentChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  },
});
