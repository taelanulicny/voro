import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useTrading } from '../context/TradingContext';
import { useTheme } from '../context/ThemeContext';
import { useWatchlist } from '../context/WatchlistContext';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';
import { apiRequest, isBackendConfigured } from '../config/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type SortOption = 'name' | 'price_high' | 'price_low' | 'gainers' | 'losers';

interface SearchEntity {
  entityId: number;
  ticker: string;
  name: string;
  category: string;
  description?: string;
  basePrice: number;
  currentPrice: number;
  change24h: number;
  changePercent24h: number;
  searchScore?: number;
  matchType?: 'exact' | 'fuzzy' | 'partial';
  matchedFields?: string[];
}

function SearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { getEntityPrice } = useTrading();
  const { theme } = useTheme();
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('gainers');
  const [entities, setEntities] = useState<SearchEntity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  

  const categories = ['All', 'Influencers', 'Music Artists', 'Sports', 'Political Figures', 'Startups'];

  // Map display categories to entity categories
  const getEntityCategory = (displayCategory: string): string | null => {
    const categoryMap: Record<string, string> = {
      'Influencers': 'People',
      'Music Artists': 'People',
      'Sports': 'Events',
      'Political Figures': 'Politics',
      'Startups': 'Tech',
    };
    return categoryMap[displayCategory] || null;
  };

  // Get display category helper (converts entity categories to display categories)
  const getDisplayCategory = (entityId: number, category: string): string => {
    // Distinguish between Influencers (IDs 11-20) and Music Artists (IDs 21-30) in People category
    if (category === 'People') {
      if (entityId >= 11 && entityId <= 20) {
        return 'Influencers';
      } else if (entityId >= 21 && entityId <= 30) {
        return 'Music Artists';
      }
      return 'Influencers'; // Default for other People entities
    }
    
    const categoryMap: Record<string, string> = {
      'Politics': 'Political Figures',
      'Tech': 'Startups',
      'Events': 'Sports',
    };
    
    return categoryMap[category] || category;
  };

  // Search entities from backend
  const searchEntities = useCallback(async (query: string, category?: string | null) => {
    if (!isBackendConfigured()) {
      setError('Backend not configured. Search requires a backend connection.');
      setEntities([]);
      return;
    }

    if (!query || query.trim().length === 0) {
      setEntities([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Map sortBy to backend sortBy
      const backendSortBy = sortBy === 'gainers' ? 'change_high' : 
                           sortBy === 'losers' ? 'change_low' :
                           sortBy === 'name' ? 'name' :
                           sortBy === 'price_high' ? 'price_high' :
                           sortBy === 'price_low' ? 'price_low' : 'relevance';

      // Map display category to entity category
      const entityCategory = category && category !== 'All' ? getEntityCategory(category) : undefined;

      const queryParams = new URLSearchParams({
        q: query.trim(),
        limit: '50',
        sortBy: backendSortBy,
      });

      if (entityCategory) {
        queryParams.append('category', entityCategory);
      }

      const response = await apiRequest<{
        success: boolean;
        data: SearchEntity[];
        count: number;
      }>(`/api/search?${queryParams.toString()}`, {
        method: 'GET',
      });

      if (response.success && response.data) {
        setEntities(response.data);
      } else {
        setError(response.error || 'Failed to search entities');
        setEntities([]);
      }
    } catch (err: any) {
      console.error('Error searching entities:', err);
      setError(err.message || 'Failed to search entities');
      setEntities([]);
    } finally {
      setIsLoading(false);
    }
  }, [sortBy]);

  // Debounced search
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If query is empty, clear results
    if (!searchQuery.trim()) {
      setEntities([]);
      setIsLoading(false);
      return;
    }

    // Set loading state immediately
    setIsLoading(true);

    // Debounce the search
    debounceTimerRef.current = setTimeout(() => {
      searchEntities(searchQuery, selectedCategory);
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, selectedCategory, searchEntities]);

  // Filter entities by category (client-side for People subcategories)
  const filteredEntities = useMemo(() => {
    let filtered = entities;

    // Apply category filter for People subcategories (client-side)
    if (selectedCategory && selectedCategory !== 'All') {
      const entityCategory = getEntityCategory(selectedCategory);
      if (entityCategory === 'People') {
        if (selectedCategory === 'Influencers') {
          filtered = filtered.filter((e) => e.category === 'People' && e.entityId >= 11 && e.entityId <= 20);
        } else if (selectedCategory === 'Music Artists') {
          filtered = filtered.filter((e) => e.category === 'People' && e.entityId >= 21 && e.entityId <= 30);
        }
      }
    }

    // Apply client-side sorting if needed (backend already sorts, but we can re-sort for People subcategories)
    const sorted = [...filtered];
    if (selectedCategory && getEntityCategory(selectedCategory) === 'People') {
      // Re-sort after client-side filtering
      switch (sortBy) {
        case 'name':
          sorted.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'price_high':
          sorted.sort((a, b) => b.currentPrice - a.currentPrice);
          break;
        case 'price_low':
          sorted.sort((a, b) => a.currentPrice - b.currentPrice);
          break;
        case 'gainers':
          sorted.sort((a, b) => b.changePercent24h - a.changePercent24h);
          break;
        case 'losers':
          sorted.sort((a, b) => a.changePercent24h - b.changePercent24h);
          break;
      }
    }

    return sorted;
  }, [entities, selectedCategory, sortBy]);

  const handleSelectEntity = (entity: SearchEntity) => {
    navigation.navigate('Entity', {
      entityId: entity.entityId,
      categoryId: getDisplayCategory(entity.entityId, entity.category),
    });
  };

  const renderSortOption = (option: SortOption, label: string, icon: string) => (
    <TouchableOpacity
      style={[
        styles.sortChip,
        {
          backgroundColor: sortBy === option ? theme.primaryLight : theme.backgroundSecondary,
          borderColor: sortBy === option ? theme.primary : theme.border,
          width: 120,
        },
      ]}
      onPress={() => setSortBy(option)}
    >
      <Ionicons
        name={icon as any}
        size={14}
        color={sortBy === option ? theme.primary : theme.textSecondary}
      />
      <Text
        style={[
          styles.sortChipText,
          {
            color: sortBy === option ? theme.primary : theme.textSecondary,
            fontWeight: '600',
          },
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderEntityItem = ({ item }: { item: SearchEntity }) => {
    // Get initials from name (first 2 letters)
    const getInitials = (name: string) => {
      return name.substring(0, 2).toUpperCase();
    };

    // Truncate text to 15 characters with ellipsis
    const truncateText = (text: string) => {
      if (text.length > 15) {
        return text.substring(0, 15) + '...';
      }
      return text;
    };

    const displayName = truncateText(item.name);
    const displayCategory = truncateText(getDisplayCategory(item.entityId, item.category));

    return (
    <TouchableOpacity
      style={[styles.entityCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => handleSelectEntity(item)}
    >
      <View style={styles.entityLeft}>
        <View style={[styles.entityIcon, { backgroundColor: theme.primaryLight }]}>
            <Text style={[styles.entityIconText, { color: theme.primary }]}>{getInitials(item.name)}</Text>
        </View>
        <View style={styles.entityInfo}>
          <View style={styles.entityHeaderRow}>
              <Text style={[styles.entityName, { color: theme.text }]}>{displayName}</Text>
            <TouchableOpacity
              style={styles.watchlistIconButton}
              onPress={async (e) => {
                e.stopPropagation();
                if (isInWatchlist(item.entityId)) {
                  const result = await removeFromWatchlist(item.entityId);
                  if (!result.success && result.error) {
                    Alert.alert('Error', result.error);
                  }
                } else {
                  const result = await addToWatchlist(item.entityId);
                  if (!result.success && result.error) {
                    Alert.alert('Error', result.error);
                  }
                }
              }}
            >
              <Ionicons
                name={isInWatchlist(item.entityId) ? 'star' : 'star-outline'}
                size={18}
                color={isInWatchlist(item.entityId) ? theme.primary : theme.textTertiary}
              />
            </TouchableOpacity>
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: theme.backgroundTertiary }]}>
            <Text style={[styles.categoryBadgeText, { color: theme.textSecondary }]}>{displayCategory}</Text>
          </View>
        </View>
      </View>
      <View style={styles.entityRight}>
        <Text style={[styles.entityPrice, { color: theme.text }]}>{formatCurrency(item.currentPrice)}</Text>
        <Text style={[styles.entityChange, { color: getChangeColor(item.change24h) }]}>
          {item.change24h >= 0 ? '+' : ''}
          {item.changePercent24h.toFixed(2)}%
        </Text>
      </View>
    </TouchableOpacity>
  );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Search</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.backgroundSecondary }]}>
          <Ionicons name="search" size={20} color={theme.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search entities..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter */}
      <View style={[styles.categoryContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={true}
          directionalLockEnabled={true}
          alwaysBounceVertical={false}
          alwaysBounceHorizontal={true}
          bounces={false}
          contentContainerStyle={styles.categoryScroll}
        >
        {categories.map((category) => {
          const isActive = category === 'All' ? selectedCategory === null : selectedCategory === category;
          return (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: isActive ? theme.primary : theme.backgroundSecondary,
                  borderColor: isActive ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setSelectedCategory(category === 'All' ? null : category)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  { color: isActive ? '#FFFFFF' : theme.textSecondary },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {category}
              </Text>
            </TouchableOpacity>
          );
        })}
        </ScrollView>
      </View>

      {/* Sort Options */}
      <View style={[styles.sortContainer, { backgroundColor: theme.card }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortScroll}
        >
        {renderSortOption('gainers', 'Top Gainers', 'trending-up')}
        {renderSortOption('losers', 'Top Losers', 'trending-down')}
        {renderSortOption('price_high', 'Price: High', 'arrow-down')}
        {renderSortOption('price_low', 'Price: Low', 'arrow-up')}
        {renderSortOption('name', 'A-Z', 'text')}
        </ScrollView>
      </View>

      {/* Results Count */}
      {!isLoading && searchQuery.trim() && (
        <View style={[styles.resultsBar, { backgroundColor: theme.card }]}>
          <Text style={[styles.resultsText, { color: theme.textSecondary }]}>
            {filteredEntities.length} {filteredEntities.length === 1 ? 'entity' : 'entities'} found
          </Text>
        </View>
      )}

      {/* Entity List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Searching...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.error} />
          <Text style={[styles.emptyStateTitle, { color: theme.text }]}>Search Error</Text>
          <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEntities}
          renderItem={renderEntityItem}
          keyExtractor={(item) => item.entityId.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color={theme.textTertiary} />
              <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
                {searchQuery.trim() ? 'No results found' : 'Start searching...'}
              </Text>
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                {searchQuery.trim()
                  ? 'Try adjusting your search or filters'
                  : 'Enter a search query to find entities'}
              </Text>
            </View>
          }
        />
      )}

    </SafeAreaView>
  );
}

export default React.memo(SearchScreen);

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
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    position: 'relative',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  headerRight: {
    width: 40,
    height: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  categoryContainer: {
    borderBottomWidth: 1,
    height: 60,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    height: 60,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 80,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  sortContainer: {
    minHeight: 60,
  },
  sortScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    height: 36,
    gap: 6,
    overflow: 'hidden',
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultsBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resultsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  entityCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  entityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  entityIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entityIconText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  entityInfo: {
    flex: 1,
  },
  entityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  watchlistIconButton: {
    padding: 4,
  },
  entityName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  entityRight: {
    alignItems: 'flex-end',
  },
  entityPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  entityChange: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
});

