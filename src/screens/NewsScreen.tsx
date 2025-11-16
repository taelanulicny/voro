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
import { NewsArticle, NewsFilter } from '../types';
import NewsCard from '../components/NewsCard';

export default function NewsScreen() {
  const { news, isLoadingNews, breakingNews, refreshNews, getNewsByFilter } = useNews();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'breaking' | 'category' | 'sentiment'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedSentiment, setSelectedSentiment] = useState<'bullish' | 'bearish' | 'neutral' | undefined>();
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

  const categories = ['Tech', 'Crypto', 'Politics', 'Events', 'People', 'General'];
  const sentiments = [
    { key: 'bullish', label: 'Bullish', color: '#10B981', icon: 'trending-up' },
    { key: 'bearish', label: 'Bearish', color: '#EF4444', icon: 'trending-down' },
    { key: 'neutral', label: 'Neutral', color: '#6B7280', icon: 'remove' },
  ] as const;

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>News</Text>
      {breakingNews.length > 0 && (
        <View style={styles.breakingCountBadge}>
          <Ionicons name="flash" size={12} color="#FFFFFF" />
          <Text style={styles.breakingCountText}>{breakingNews.length}</Text>
        </View>
      )}
    </View>
  );

  const renderFilterTabs = () => (
    <View style={styles.filterSection}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterTabs}
      >
        <TouchableOpacity
          style={[
            styles.filterTab,
            selectedFilter === 'all' && styles.filterTabActive,
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
              selectedFilter === 'all' && styles.filterTabTextActive,
            ]}
          >
            All News
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            selectedFilter === 'breaking' && styles.filterTabActive,
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
            color={selectedFilter === 'breaking' ? '#3B82F6' : '#6B7280'}
          />
          <Text
            style={[
              styles.filterTabText,
              selectedFilter === 'breaking' && styles.filterTabTextActive,
            ]}
          >
            Breaking ({breakingNews.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            selectedFilter === 'category' && styles.filterTabActive,
          ]}
          onPress={() => setSelectedFilter('category')}
        >
          <Ionicons
            name="grid-outline"
            size={14}
            color={selectedFilter === 'category' ? '#3B82F6' : '#6B7280'}
          />
          <Text
            style={[
              styles.filterTabText,
              selectedFilter === 'category' && styles.filterTabTextActive,
            ]}
          >
            Category
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            selectedFilter === 'sentiment' && styles.filterTabActive,
          ]}
          onPress={() => setSelectedFilter('sentiment')}
        >
          <Ionicons
            name="pulse-outline"
            size={14}
            color={selectedFilter === 'sentiment' ? '#3B82F6' : '#6B7280'}
          />
          <Text
            style={[
              styles.filterTabText,
              selectedFilter === 'sentiment' && styles.filterTabTextActive,
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
                selectedCategory === category && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(category === selectedCategory ? undefined : category)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === category && styles.categoryChipTextActive,
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
                selectedSentiment === sentiment.key && {
                  backgroundColor: sentiment.color + '20',
                  borderColor: sentiment.color,
                },
              ]}
              onPress={() => setSelectedSentiment(sentiment.key === selectedSentiment ? undefined : sentiment.key)}
            >
              <Ionicons
                name={sentiment.icon}
                size={14}
                color={selectedSentiment === sentiment.key ? sentiment.color : '#6B7280'}
              />
              <Text
                style={[
                  styles.sentimentChipText,
                  selectedSentiment === sentiment.key && { color: sentiment.color },
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
      <Ionicons name="newspaper-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyStateTitle}>No news found</Text>
      <Text style={styles.emptyStateText}>
        Try adjusting your filters or check back later for updates
      </Text>
    </View>
  );

  if (isLoadingNews && news.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading news...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
            tintColor="#3B82F6"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
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
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  categoryChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sentimentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: 4,
  },
  sentimentChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
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
  },
});
