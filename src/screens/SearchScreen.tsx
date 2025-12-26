import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
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
import { MOCK_ENTITIES } from '../utils/mockEntities';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type SortOption = 'name' | 'price_high' | 'price_low' | 'gainers' | 'losers';

export default function SearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { getEntityPrice, getAllEntityPrices } = useTrading();
  const { theme } = useTheme();
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('gainers');
  
  // Get live entity prices
  const entityPrices = getAllEntityPrices();
  
  // Generate entity list with live prices
  const entities = useMemo(() => {
    return MOCK_ENTITIES.map((entity) => {
      const currentPrice = getEntityPrice(entity.id);
      const change24h = currentPrice - entity.basePrice;
      const changePercent24h = (change24h / entity.basePrice) * 100;
      return {
        id: entity.id,
        ticker: entity.ticker,
        name: entity.name,
        type: 'stock' as const,
        currentPrice,
        change24h,
        changePercent24h,
        volume24h: Math.floor(Math.random() * 50000000) + 5000000,
        marketCap: Math.floor(Math.random() * 10000000000) + 1000000000,
        description: entity.description,
        category: entity.category,
      };
    });
  }, [entityPrices, getEntityPrice]);
  

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

  // Filter and sort entities
  const filteredEntities = useMemo(() => {
    let filtered = entities;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.ticker.toLowerCase().includes(query) ||
          e.name.toLowerCase().includes(query) ||
          e.category.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (selectedCategory && selectedCategory !== 'All') {
      const entityCategory = getEntityCategory(selectedCategory);
      if (entityCategory) {
        // For People category, need to distinguish between Influencers and Music Artists
        if (entityCategory === 'People') {
          if (selectedCategory === 'Influencers') {
            filtered = filtered.filter((e) => e.category === 'People' && e.id >= 11 && e.id <= 20);
          } else if (selectedCategory === 'Music Artists') {
            filtered = filtered.filter((e) => e.category === 'People' && e.id >= 21 && e.id <= 30);
          }
        } else {
          filtered = filtered.filter((e) => e.category === entityCategory);
        }
      }
    }

    // Apply sorting
    const sorted = [...filtered];
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

    return sorted;
  }, [entities, searchQuery, selectedCategory, sortBy]);

  const handleSelectEntity = (entity: any) => {
    navigation.navigate('Entity', {
      entityId: entity.id,
      categoryId: entity.category,
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

  const renderEntityItem = ({ item }: { item: any }) => {
    // Get initials from name (first 2 letters)
    const getInitials = (name: string) => {
      return name.substring(0, 2).toUpperCase();
    };

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
              <Text style={[styles.entityName, { color: theme.text }]}>{item.name}</Text>
              <TouchableOpacity
                style={styles.watchlistIconButton}
                onPress={(e) => {
                  e.stopPropagation();
                  if (isInWatchlist(item.id)) {
                    removeFromWatchlist(item.id);
                  } else {
                    addToWatchlist(item.id);
                  }
                }}
              >
                <Ionicons
                  name={isInWatchlist(item.id) ? 'star' : 'star-outline'}
                  size={18}
                  color={isInWatchlist(item.id) ? theme.primary : theme.textTertiary}
                />
              </TouchableOpacity>
            </View>
            <View style={[styles.categoryBadge, { backgroundColor: theme.backgroundTertiary }]}>
              <Text style={[styles.categoryBadgeText, { color: theme.textSecondary }]}>{item.category}</Text>
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
      <View style={[styles.resultsBar, { backgroundColor: theme.card }]}>
        <Text style={[styles.resultsText, { color: theme.textSecondary }]}>
          {filteredEntities.length} {filteredEntities.length === 1 ? 'entity' : 'entities'}
        </Text>
      </View>

      {/* Entity List */}
      <FlatList
        data={filteredEntities}
        renderItem={renderEntityItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color={theme.textTertiary} />
            <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No results found</Text>
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
              Try adjusting your search or filters
            </Text>
          </View>
        }
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
});

