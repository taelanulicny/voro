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
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';
import { MOCK_ENTITIES } from '../utils/mockEntities';
import TradeModal from '../components/TradeModal';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Generate entity list with price changes
const generateEntityList = () => {
  return MOCK_ENTITIES.map((entity) => {
    const change = (Math.random() - 0.5) * 15;
    const changePercent = (change / entity.basePrice) * 100;
    return {
      id: entity.id,
      ticker: entity.ticker,
      name: entity.name,
      type: 'stock' as const,
      currentPrice: entity.basePrice + change,
      change24h: change,
      changePercent24h: changePercent,
      volume24h: Math.floor(Math.random() * 50000000) + 5000000,
      marketCap: Math.floor(Math.random() * 10000000000) + 1000000000,
      description: entity.description,
      category: entity.category,
    };
  });
};

type SortOption = 'name' | 'price_high' | 'price_low' | 'gainers' | 'losers';

export default function BuyScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { portfolio } = useTrading();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('gainers');
  const [entities] = useState(() => generateEntityList());
  
  // Trade modal
  const [tradeModalVisible, setTradeModalVisible] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{
    id: number;
    ticker: string;
    name: string;
    price: number;
    category: string;
  } | null>(null);

  const categories = ['All', 'Tech', 'Crypto', 'Politics', 'Events', 'People'];

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
      filtered = filtered.filter((e) => e.category === selectedCategory);
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
    setSelectedEntity({
      id: entity.id,
      ticker: entity.ticker,
      name: entity.name,
      price: entity.currentPrice,
      category: entity.category,
    });
    setTradeModalVisible(true);
  };

  const renderSortOption = (option: SortOption, label: string, icon: string) => (
    <TouchableOpacity
      style={[styles.sortChip, sortBy === option && styles.sortChipActive]}
      onPress={() => setSortBy(option)}
    >
      <Ionicons
        name={icon as any}
        size={14}
        color={sortBy === option ? '#3B82F6' : '#6B7280'}
      />
      <Text style={[styles.sortChipText, sortBy === option && styles.sortChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderEntityItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.entityCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => handleSelectEntity(item)}
    >
      <View style={styles.entityLeft}>
        <View style={[styles.entityIcon, { backgroundColor: theme.primaryLight }]}>
          <Text style={[styles.entityIconText, { color: theme.primary }]}>{item.ticker.substring(0, 2)}</Text>
        </View>
        <View style={styles.entityInfo}>
          <Text style={[styles.entityTicker, { color: theme.text }]}>{item.ticker}</Text>
          <Text style={[styles.entityName, { color: theme.textSecondary }]}>{item.name}</Text>
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Buy</Text>
        <View style={styles.headerRight}>
          <Text style={[styles.buyingPower, { color: theme.success }]}>
            {formatCurrency(portfolio.cashBalance)}
          </Text>
        </View>
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              (category === 'All' ? selectedCategory === null : selectedCategory === category) &&
                styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(category === 'All' ? null : category)}
          >
            <Text
              style={[
                styles.categoryChipText,
                (category === 'All' ? selectedCategory === null : selectedCategory === category) &&
                  styles.categoryChipTextActive,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sort Options */}
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

      {/* Results Count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
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
            <Ionicons name="search-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No results found</Text>
            <Text style={styles.emptyStateText}>
              Try adjusting your search or filters
            </Text>
          </View>
        }
      />

      {/* Trade Modal */}
      {selectedEntity && (
        <TradeModal
          visible={tradeModalVisible}
          onClose={() => {
            setTradeModalVisible(false);
            setSelectedEntity(null);
          }}
          entityId={selectedEntity.id}
          entityName={selectedEntity.name}
          entityTicker={selectedEntity.ticker}
          currentPrice={selectedEntity.price}
          category={selectedEntity.category}
          existingQuantity={portfolio.holdings.find(h => h.entityId === selectedEntity.id)?.quantity}
        />
      )}
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
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  buyingPower: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
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
  categoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 60,
    alignItems: 'center',
  },
  categoryChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  sortScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  sortChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  sortChipTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  resultsBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
  },
  resultsText: {
    fontSize: 13,
    color: '#6B7280',
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
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  entityIconText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  entityInfo: {
    flex: 1,
  },
  entityTicker: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  entityName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  entityRight: {
    alignItems: 'flex-end',
  },
  entityPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
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
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});

