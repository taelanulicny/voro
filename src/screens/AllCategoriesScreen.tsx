import React, { useState } from 'react';
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TREEMAP_HEIGHT = SCREEN_HEIGHT * 0.67; // 2/3 of screen height

// Hardcoded trade volume data (will be replaced with real data later)
// Colors: green = volume up, red = volume down
const categoryTradeVolumes = [
  { name: 'Influencers', percentage: 32.0, categoryId: 'Influencers', color: 'green' as const },
  { name: 'Music Artists', percentage: 24.5, categoryId: 'Music Artists', color: 'red' as const },
  { name: 'Sports', percentage: 18.3, categoryId: 'Sports', color: 'green' as const },
  { name: 'Political Figures', percentage: 15.2, categoryId: 'Political Figures', color: 'green' as const },
  { name: 'Startups', percentage: 10.0, categoryId: 'Startups', color: 'red' as const },
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AllCategoriesScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [viewType, setViewType] = useState<'treemap' | 'list'>('treemap');

  const handleCategoryPress = (categoryId: string) => {
    navigation.navigate('Category', { categoryId });
  };

  const renderFilterTabs = () => (
    <View style={[styles.filterTabs, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <TouchableOpacity
        style={styles.filterTab}
        onPress={() => setViewType('treemap')}
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
        onPress={() => setViewType('list')}
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

  const renderCategoryItem = ({ item }: { item: typeof categoryTradeVolumes[0] }) => (
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
      <Text style={[styles.categoryItemPercentage, { color: theme.textSecondary }]}>
        {item.percentage}%
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>All Categories</Text>
      </View>

      {renderFilterTabs()}

      {viewType === 'treemap' ? (
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
      ) : (
        <FlatList
          data={categoryTradeVolumes}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.categoryId}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  categoryItemPercentage: {
    fontSize: 16,
    fontWeight: '600',
  },
});

