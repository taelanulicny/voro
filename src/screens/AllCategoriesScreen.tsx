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
    'Hip Hop',
    'Country Music',
    'Pop Music',
  ];

  const teamsSubcategories = [
    'NFL Teams',
    'NBA Teams',
    'College Basketball Teams',
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
  // TEMPORARY: Using hardcoded example data for visualization
  const hierarchicalTreemapData = useMemo(() => {
    // Example data: People = 65% of total, Teams = 35% of total
    const peoplePercentage = 65;
    const teamsPercentage = 35;

    // Example People subcategories (percentages relative to People total)
    const peopleSubcategoryData = [
      { name: 'Actors', percentage: 15, categoryId: 'Actors', color: 'green' as const },
      { name: 'NBA Players', percentage: 20, categoryId: 'NBA Players', color: 'green' as const },
      { name: 'NFL Players', percentage: 12, categoryId: 'NFL Players', color: 'red' as const },
      { name: 'Soccer Players', percentage: 8, categoryId: 'Soccer Players', color: 'green' as const },
      { name: 'Influencers', percentage: 18, categoryId: 'Influencers', color: 'green' as const },
      { name: 'Political Figures', percentage: 10, categoryId: 'Political Figures', color: 'grey' as const },
      { name: 'Hip Hop', percentage: 7, categoryId: 'Hip Hop', color: 'green' as const },
      { name: 'Country Music', percentage: 5, categoryId: 'Country Music', color: 'red' as const },
      { name: 'Pop Music', percentage: 5, categoryId: 'Pop Music', color: 'green' as const },
    ];

    // Example Teams subcategories (percentages relative to Teams total)
    const teamsSubcategoryData = [
      { name: 'NFL Teams', percentage: 18, categoryId: 'NFL Teams', color: 'green' as const },
      { name: 'NBA Teams', percentage: 12, categoryId: 'NBA Teams', color: 'green' as const },
      { name: 'College Basketball Teams', percentage: 5, categoryId: 'College Basketball Teams', color: 'red' as const },
    ];

    // Calculate sum of subcategory percentages for each section
    const peopleSubcategorySum = peopleSubcategoryData.reduce((sum, cat) => sum + cat.percentage, 0);
    const teamsSubcategorySum = teamsSubcategoryData.reduce((sum, cat) => sum + cat.percentage, 0);

    return {
      people: {
        totalPercentage: peoplePercentage,
        subcategorySum: peopleSubcategorySum,
        subcategories: peopleSubcategoryData,
      },
      teams: {
        totalPercentage: teamsPercentage,
        subcategorySum: teamsSubcategorySum,
        subcategories: teamsSubcategoryData,
      },
    };
  }, []);

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
      </ScrollView>
    </View>
  );

  const renderCategoryItem = ({ item }: { item: typeof categoryTradeVolumes[0] }) => {
    const changePercent = item.percentage - item.previousPercentage;
    // Determine color based on change: green = up, red = down, grey = no change
    const isPositive = changePercent > 0;
    const isNegative = changePercent < 0;
    const isNeutral = changePercent === 0;
    
    // Color values
    const greenColor = '#10B981';
    const redColor = '#EF4444';
    const greyColor = '#6B7280';
    
    const changeColor = isPositive ? greenColor : isNegative ? redColor : greyColor;
    const indicatorBgColor = isPositive 
      ? 'rgba(16, 185, 129, 0.2)' 
      : isNegative 
      ? 'rgba(239, 68, 68, 0.2)' 
      : 'rgba(107, 114, 128, 0.2)';
    const dotColor = isPositive ? greenColor : isNegative ? redColor : greyColor;
    const arrowIcon = isPositive ? 'arrow-up' : isNegative ? 'arrow-down' : 'remove';
    
    return (
      <TouchableOpacity
        style={[styles.categoryItem, { backgroundColor: theme.card, borderBottomColor: theme.border }]}
        onPress={() => handleCategoryPress(item.categoryId)}
      >
        <View style={styles.categoryItemLeft}>
          <View style={[
            styles.categoryIndicator,
            { backgroundColor: indicatorBgColor }
          ]}>
            <View style={[
              styles.categoryDot,
              { backgroundColor: dotColor }
            ]} />
          </View>
          <Text style={[styles.categoryItemName, { color: theme.text }]}>{item.name}</Text>
        </View>
        <View style={styles.categoryItemRight}>
          <Text style={[styles.categoryItemPercentage, { color: theme.text }]}>
            {item.percentage}%
          </Text>
          {!isNeutral && (
            <View style={styles.changeContainer}>
              <Text style={[styles.changeText, { color: changeColor }]}>(</Text>
              <Ionicons 
                name={arrowIcon as any}
                size={12} 
                color={changeColor} 
              />
              <Text style={[styles.changeText, { color: changeColor }]}>
                {Math.abs(changePercent).toFixed(1)}%)
              </Text>
            </View>
          )}
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
                  {hierarchicalTreemapData.people.totalPercentage.toFixed(1)}%
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
                  {hierarchicalTreemapData.teams.totalPercentage.toFixed(1)}%
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
          {renderFilterButtons()}
          <FlatList
            data={sortedCategories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.categoryId}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
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

