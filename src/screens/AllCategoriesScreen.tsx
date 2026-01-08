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
import Treemap from '../components/Treemap';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TREEMAP_HEIGHT = SCREEN_HEIGHT * 0.67; // 2/3 of screen height

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> parent of 2e5d44d (Merge remote backend changes with local frontend updates)
// Hardcoded trade volume data (will be replaced with real data later)
// Colors: green = volume up, red = volume down
// previousPercentage is yesterday's percentage to calculate the change
const categoryTradeVolumes = [
  { name: 'Influencers', percentage: 32.0, previousPercentage: 28.0, categoryId: 'Influencers', color: 'green' as const },
<<<<<<< HEAD
  { name: 'Political Figures', percentage: 15.2, previousPercentage: 14.8, categoryId: 'Political Figures', color: 'green' as const },
  { name: 'Startups', percentage: 10.0, previousPercentage: 13.7, categoryId: 'Startups', color: 'red' as const },
  { name: 'NFL', percentage: 8.5, previousPercentage: 8.8, categoryId: 'NFL', color: 'red' as const },
  { name: 'NBA', percentage: 7.3, previousPercentage: 7.1, categoryId: 'NBA', color: 'green' as const },
  { name: 'College Basketball', percentage: 5.8, previousPercentage: 5.5, categoryId: 'College Basketball', color: 'green' as const },
  { name: 'Hip Hop', percentage: 4.2, previousPercentage: 4.0, categoryId: 'Hip Hop', color: 'green' as const },
  { name: 'Country Music', percentage: 3.5, previousPercentage: 3.3, categoryId: 'Country Music', color: 'green' as const },
  { name: 'Pop Music', percentage: 2.8, previousPercentage: 2.6, categoryId: 'Pop Music', color: 'green' as const },
];
=======
// Type for category volume data from backend
interface CategoryVolume {
  name: string;
  categoryId: string;
  percentage: number;
  previousPercentage: number;
  color: 'green' | 'red';
  volume24h: number;
  previousVolume24h: number;
  entityCount: number;
}
>>>>>>> parent of ec2acad (Update token symbol to ⓜ, add page 6 with top trades, update entity screen buttons and category display, add skipAuth function)
=======
  { name: 'Music Artists', percentage: 24.5, previousPercentage: 26.0, categoryId: 'Music Artists', color: 'red' as const },
  { name: 'Sports', percentage: 18.3, previousPercentage: 17.5, categoryId: 'Sports', color: 'green' as const },
  { name: 'Political Figures', percentage: 15.2, previousPercentage: 14.8, categoryId: 'Political Figures', color: 'green' as const },
  { name: 'Startups', percentage: 10.0, previousPercentage: 13.7, categoryId: 'Startups', color: 'red' as const },
];
>>>>>>> parent of 2e5d44d (Merge remote backend changes with local frontend updates)

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AllCategoriesScreen() {
  const { theme } = useTheme();
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
    const isPositive = changePercent > 0;
    const changeColor = isPositive ? '#10B981' : '#EF4444';
    
    return (
      <TouchableOpacity
        style={[styles.categoryItem, { backgroundColor: theme.card, borderBottomColor: theme.border }]}
        onPress={() => handleCategoryPress(item.categoryId)}
      >
        <View style={styles.categoryItemLeft}>
          <View style={[
            styles.categoryIndicator,
            { backgroundColor: item.color === 'green' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }
          ]}>
            <View style={[
              styles.categoryDot,
              { backgroundColor: item.color === 'green' ? '#10B981' : '#EF4444' }
            ]} />
          </View>
          <Text style={[styles.categoryItemName, { color: theme.text }]}>{item.name}</Text>
        </View>
        <View style={styles.categoryItemRight}>
          <Text style={[styles.categoryItemPercentage, { color: theme.text }]}>
            {item.percentage}%
          </Text>
          <View style={styles.changeContainer}>
            <Text style={[styles.changeText, { color: changeColor }]}>(</Text>
            <Ionicons 
              name={isPositive ? 'arrow-up' : 'arrow-down'} 
              size={12} 
              color={changeColor} 
            />
            <Text style={[styles.changeText, { color: changeColor }]}>
              {Math.abs(changePercent).toFixed(1)}%)
            </Text>
          </View>
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
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.treemapWrapper}>
              <Treemap
                data={categoryTradeVolumes}
                onItemPress={handleCategoryPress}
                containerHeight={TREEMAP_HEIGHT}
                padding={8}
              />
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
  treemapWrapper: {
    // Padding is handled by Treemap component
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

