import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useTrading } from '../context/TradingContext';
import Treemap from '../components/Treemap';
import { Ionicons } from '@expo/vector-icons';
import { ENTITIES } from '../utils/entities';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TREEMAP_HEIGHT = SCREEN_HEIGHT * 0.67; // 2/3 of screen height

// Color calculation helper
const getCategoryColor = (percentage: number, previousPercentage: number): 'green' | 'red' | 'grey' => {
  if (percentage > previousPercentage) return 'green';
  if (percentage < previousPercentage) return 'red';
  return 'grey';
};

// Get all unique categories from entities
const getAllCategories = (): string[] => {
  const allCategories = new Set<string>();
  ENTITIES.forEach((entity) => {
    if (entity.category) {
      allCategories.add(entity.category);
    }
  });
  return Array.from(allCategories).sort();
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AllCategoriesScreen() {
  const { theme } = useTheme();
  const { getCategoryVolumes, transactions } = useTrading();
  const navigation = useNavigation<NavigationProp>();
  const [viewType, setViewType] = useState<'treemap' | 'list'>('treemap');
  const [sortFilter, setSortFilter] = useState<'alphabetical' | 'volume-high-low' | 'volume-low-high' | 'trending'>('volume-high-low');
  const scrollViewRef = useRef<ScrollView>(null);

  const handleCategoryPress = (categoryId: string) => {
    navigation.navigate('Category', { categoryId });
  };

  const handleViewChange = (view: 'treemap' | 'list') => {
    setViewType(view);
    const scrollToX = view === 'treemap' ? 0 : SCREEN_WIDTH;
    scrollViewRef.current?.scrollTo({ x: scrollToX, animated: true });
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / SCREEN_WIDTH);
    const newView = pageIndex === 0 ? 'treemap' : 'list';
    if (newView !== viewType) {
      setViewType(newView);
    }
  };

  // Initialize scroll position based on viewType
  useEffect(() => {
    // Small delay to ensure ScrollView is mounted
    const timer = setTimeout(() => {
      const scrollToX = viewType === 'treemap' ? 0 : SCREEN_WIDTH;
      scrollViewRef.current?.scrollTo({ x: scrollToX, animated: false });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const renderFilterTabs = () => (
    <View style={[styles.filterTabs, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <TouchableOpacity
        style={styles.filterTab}
        onPress={() => handleViewChange('treemap')}
      >
        <Text
          style={[
            styles.filterTabText,
            { color: viewType === 'treemap' ? theme.primary : theme.textSecondary },
            viewType === 'treemap' && { fontWeight: '600' },
          ]}
        >
          Treemap
        </Text>
        {viewType === 'treemap' && <View style={[styles.filterTabIndicator, { backgroundColor: theme.primary }]} />}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.filterTab}
        onPress={() => handleViewChange('list')}
      >
        <Text
          style={[
            styles.filterTabText,
            { color: viewType === 'list' ? theme.primary : theme.textSecondary },
            viewType === 'list' && { fontWeight: '600' },
          ]}
        >
          List View
        </Text>
        {viewType === 'list' && <View style={[styles.filterTabIndicator, { backgroundColor: theme.primary }]} />}
      </TouchableOpacity>
    </View>
  );

  // Define People and Teams subcategories
  const peopleSubcategories = [
    'Actors',
    'NBA Players',
    'NFL Players',
    'Soccer Players',
    'Influencers',
    'Political Figures',
    'Rap Music',
    'Country Music',
    'Pop Music',
  ];

  const teamsSubcategories = [
    'NFL Teams',
    'NBA Teams',
    'College Basketball Teams',
  ];

  // All categories from home page slider (excluding 'For You' as it's not a real category)
  const allCategoriesList = [
    'People',
    'Teams',
    'Actors',
    'NBA Players',
    'NFL Players',
    'Soccer Players',
    'Influencers',
    'Political Figures',
    'NFL Teams',
    'NBA Teams',
    'College Basketball Teams',
    'Rap Music',
    'Country Music',
    'Pop Music',
  ];

  // Get real category volumes from transactions and calculate category data
  const categoryTradeVolumes = useMemo(() => {
    const categoryVolumes = getCategoryVolumes();
    const allCategories = getAllCategories();
    // Store previous day's percentages (for now, use 0 as we don't have historical data)
    // TODO: Store previous day's percentages in state/localStorage when backend supports it
    const previousDayPercentages: Record<string, number> = {};
    
    return allCategories.map(category => {
      const volumeData = categoryVolumes[category] || { volume: 0, percentage: 0 };
      const previousPercentage = previousDayPercentages[category] || 0;
      
      return {
        name: category,
        percentage: volumeData.percentage,
        previousPercentage,
        categoryId: category,
        color: getCategoryColor(volumeData.percentage, previousPercentage) as 'green' | 'red' | 'grey',
      };
    });
  }, [getCategoryVolumes, transactions]);

  // Calculate total volumes for People and Teams categories
  const hierarchicalTreemapData = useMemo(() => {
    const peopleSubcategoryData = categoryTradeVolumes.filter(cat => 
      peopleSubcategories.includes(cat.categoryId)
    );
    const teamsSubcategoryData = categoryTradeVolumes.filter(cat => 
      teamsSubcategories.includes(cat.categoryId)
    );

    // Calculate total percentages for People and Teams
    const peopleTotal = peopleSubcategoryData.reduce((sum, cat) => sum + cat.percentage, 0);
    const teamsTotal = teamsSubcategoryData.reduce((sum, cat) => sum + cat.percentage, 0);
    const grandTotal = peopleTotal + teamsTotal;

    // Calculate percentages relative to grand total (for height allocation)
    // If both are 0, give equal heights (50/50) so sections are visible, but displayed percentage will be 0%
    // Otherwise, use proportional heights based on actual trade volumes
    const peoplePercentage = grandTotal > 0 ? (peopleTotal / grandTotal) * 100 : 50;
    const teamsPercentage = grandTotal > 0 ? (teamsTotal / grandTotal) * 100 : 50;
    
    // Note: peopleTotal and teamsTotal will be 0 when there's no volume,
    // so subcategorySum will correctly show 0.0% in the UI

    return {
      people: {
        totalPercentage: peoplePercentage,
        subcategorySum: peopleTotal, // Total percentage of all People subcategories
        subcategories: peopleSubcategoryData.filter(cat => cat.percentage > 0),
      },
      teams: {
        totalPercentage: teamsPercentage,
        subcategorySum: teamsTotal, // Total percentage of all Teams subcategories
        subcategories: teamsSubcategoryData.filter(cat => cat.percentage > 0),
      },
    };
  }, [categoryTradeVolumes]);

  // Filter out categories with 0% volume for treemap (but keep them for list view)
  const categoriesWithVolume = useMemo(() => {
    return categoryTradeVolumes.filter(cat => cat.percentage > 0);
  }, [categoryTradeVolumes]);

  // Sort categories based on selected filter
  const sortedCategories = useMemo(() => {
    const sorted = [...categoryTradeVolumes];
    
    switch (sortFilter) {
      case 'alphabetical':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      
      case 'volume-high-low':
        // Default - already sorted by percentage (trade volume) high to low
        return sorted.sort((a, b) => b.percentage - a.percentage);
      
      case 'volume-low-high':
        return sorted.sort((a, b) => a.percentage - b.percentage);
      
      case 'trending':
        // Sort by absolute percentage change (trending = biggest moves, positive or negative)
        return sorted.sort((a, b) => {
          const changeA = Math.abs(a.percentage - a.previousPercentage);
          const changeB = Math.abs(b.percentage - b.previousPercentage);
          return changeB - changeA; // High to low
        });
      
      default:
        return sorted;
    }
  }, [sortFilter]);

  const renderFilterButtons = () => (
    <View style={[styles.filterSection, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortFilterTabs}
      >
        <TouchableOpacity
          style={[
            styles.sortFilterTab,
            {
              backgroundColor: sortFilter === 'volume-high-low' ? theme.primaryLight : theme.backgroundSecondary,
              borderColor: sortFilter === 'volume-high-low' ? theme.primary : theme.border,
            },
          ]}
          onPress={() => setSortFilter('volume-high-low')}
        >
          <Text
            style={[
              styles.sortFilterTabText,
              { color: sortFilter === 'volume-high-low' ? theme.primary : theme.textSecondary },
              sortFilter === 'volume-high-low' && { fontWeight: '600' },
            ]}
          >
            Trade Volume High to Low
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sortFilterTab,
            {
              backgroundColor: sortFilter === 'volume-low-high' ? theme.primaryLight : theme.backgroundSecondary,
              borderColor: sortFilter === 'volume-low-high' ? theme.primary : theme.border,
            },
          ]}
          onPress={() => setSortFilter('volume-low-high')}
        >
          <Text
            style={[
              styles.sortFilterTabText,
              { color: sortFilter === 'volume-low-high' ? theme.primary : theme.textSecondary },
              sortFilter === 'volume-low-high' && { fontWeight: '600' },
            ]}
          >
            Trade Volume Low to High
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sortFilterTab,
            {
              backgroundColor: sortFilter === 'trending' ? theme.primaryLight : theme.backgroundSecondary,
              borderColor: sortFilter === 'trending' ? theme.primary : theme.border,
            },
          ]}
          onPress={() => setSortFilter('trending')}
        >
          <Text
            style={[
              styles.sortFilterTabText,
              { color: sortFilter === 'trending' ? theme.primary : theme.textSecondary },
              sortFilter === 'trending' && { fontWeight: '600' },
            ]}
          >
            Trending
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sortFilterTab,
            {
              backgroundColor: sortFilter === 'alphabetical' ? theme.primaryLight : theme.backgroundSecondary,
              borderColor: sortFilter === 'alphabetical' ? theme.primary : theme.border,
            },
          ]}
          onPress={() => setSortFilter('alphabetical')}
        >
          <Text
            style={[
              styles.sortFilterTabText,
              { color: sortFilter === 'alphabetical' ? theme.primary : theme.textSecondary },
              sortFilter === 'alphabetical' && { fontWeight: '600' },
            ]}
          >
            Alphabetical
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderCategoryItem = ({ item }: { item: string }) => {
    return (
      <TouchableOpacity
        style={[styles.categoryItem, { backgroundColor: theme.card, borderBottomColor: theme.border }]}
        onPress={() => handleCategoryPress(item)}
      >
        <View style={styles.categoryItemLeft}>
          <Text style={[styles.categoryItemName, { color: theme.text }]}>{item}</Text>
        </View>
        <View style={styles.categoryItemRight}>
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={theme.textSecondary} 
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>All Categories</Text>
      </View>

      {renderFilterTabs()}

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
        {/* Treemap View */}
        <View style={[styles.pageContainer, { width: SCREEN_WIDTH }]}>
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.treemapScrollContent}
      >
        <View style={styles.treemapWrapper}>
          <View style={[styles.hierarchicalTreemap, { height: TREEMAP_HEIGHT }]}>
            {/* People Section */}
            <View 
              style={[
                styles.categorySection,
                { 
                  height: TREEMAP_HEIGHT * (hierarchicalTreemapData.people.totalPercentage / 100),
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                  borderColor: theme.border,
                }
              ]}
            >
              <TouchableOpacity 
                style={[styles.categoryLabelContainer, { borderRightColor: theme.border }]}
                onPress={() => handleCategoryPress('People')}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryLabel, { color: theme.text }]}>People</Text>
                <Text style={[styles.categoryPercentage, { color: theme.textSecondary }]}>
                  {hierarchicalTreemapData.people.subcategorySum.toFixed(1)}%
                </Text>
              </TouchableOpacity>
              <View style={styles.categoryTreemapContainer}>
                {hierarchicalTreemapData.people.subcategories.length > 0 ? (
                  <Treemap
                    data={hierarchicalTreemapData.people.subcategories}
                    onItemPress={handleCategoryPress}
                    containerWidth={SCREEN_WIDTH - 120}
                    containerHeight={TREEMAP_HEIGHT * (hierarchicalTreemapData.people.totalPercentage / 100)}
                    padding={8}
                  />
                ) : (
                  <View style={styles.emptyTreemap}>
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                      No trading activity
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Teams Section */}
            <View 
              style={[
                styles.categorySection,
                { 
                  height: TREEMAP_HEIGHT * (hierarchicalTreemapData.teams.totalPercentage / 100),
                  borderColor: theme.border,
                }
              ]}
            >
              <TouchableOpacity 
                style={[styles.categoryLabelContainer, { borderRightColor: theme.border }]}
                onPress={() => handleCategoryPress('Teams')}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryLabel, { color: theme.text }]}>Teams</Text>
                <Text style={[styles.categoryPercentage, { color: theme.textSecondary }]}>
                  {hierarchicalTreemapData.teams.subcategorySum.toFixed(1)}%
                </Text>
              </TouchableOpacity>
              <View style={[styles.categoryTreemapContainer, { paddingBottom: 8 }]}>
                {hierarchicalTreemapData.teams.subcategories.length > 0 ? (
                  <Treemap
                    data={hierarchicalTreemapData.teams.subcategories}
                    onItemPress={handleCategoryPress}
                    containerWidth={SCREEN_WIDTH - 120}
                    containerHeight={TREEMAP_HEIGHT * (hierarchicalTreemapData.teams.totalPercentage / 100)}
                    padding={8}
                  />
                ) : (
                  <View style={styles.emptyTreemap}>
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                      No trading activity
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
          </ScrollView>
        </View>

        {/* List View */}
        <View style={[styles.pageContainer, { width: SCREEN_WIDTH }]}>
          <FlatList
            data={allCategoriesList}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
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
  horizontalScroll: {
    flex: 1,
  },
  horizontalScrollContent: {
    flexDirection: 'row',
  },
  pageContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  treemapScrollContent: {
    paddingBottom: 20,
  },
  treemapWrapper: {
    paddingBottom: 16,
  },
  hierarchicalTreemap: {
    width: '100%',
  },
  categorySection: {
    flexDirection: 'row',
    width: '100%',
    borderWidth: 1,
  },
  categoryLabelContainer: {
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRightWidth: 1,
    flexDirection: 'column',
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  categoryPercentage: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  categoryTreemapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  emptyTreemap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 120,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  categoryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryItemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  categoryItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryItemPercentage: {
    fontSize: 16,
    fontWeight: '600',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterSection: {
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  sortFilterTabs: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  sortFilterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  sortFilterTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

