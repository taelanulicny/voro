import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function NewsFeedScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const [selectedTab, setSelectedTab] = useState<'feed' | 'news'>('news');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  const categories = ['All', 'People', 'Teams', 'Actors', 'NBA Players', 'NFL Players', 'Soccer Players', 'Influencers', 'Political Figures', 'NFL Teams', 'NBA Teams', 'College Basketball Teams', 'Rap Music', 'Country Music', 'Pop Music'];

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <View style={[styles.segmentedControl, { backgroundColor: '#E8E8F5' }]}>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            selectedTab === 'feed' && styles.segmentButtonActive
          ]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[
            styles.segmentButtonText,
            selectedTab === 'feed' && styles.segmentButtonTextActive
          ]}>
            Feed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            selectedTab === 'news' && styles.segmentButtonActive
          ]}
          onPress={() => {}}
        >
          <Text style={[
            styles.segmentButtonText,
            selectedTab === 'news' && styles.segmentButtonTextActive
          ]}>
            News
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFilterTabs = () => (
    <View style={[styles.filterTabs, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <TouchableOpacity
        style={styles.filterTab}
        onPress={() => {}}
      >
        <Text
          style={[
            styles.filterTabText,
            { color: theme.primary },
            { fontWeight: '600' },
          ]}
        >
          Trending
        </Text>
        <View style={[styles.filterTabIndicator, { backgroundColor: theme.primary }]} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.filterTab}
        onPress={() => {}}
      >
        <Text
          style={[
            styles.filterTabText,
            { color: theme.textSecondary },
          ]}
        >
          Following
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCategorySelector = () => (
    <View style={[styles.categorySelectorContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categorySelector}
        contentContainerStyle={styles.categorySelectorContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={styles.categoryButton}
            onPress={() => {
              setSelectedCategory(category);
            }}
          >
            <Text
              style={[
                styles.categoryButtonText,
                {
                  color: selectedCategory === category ? theme.text : theme.textSecondary,
                  fontWeight: selectedCategory === category ? '600' : '400',
                }
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      {renderHeader()}
      {renderFilterTabs()}
      {renderCategorySelector()}
      <View style={styles.emptyState}>
        <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
          News feed coming soon
        </Text>
      </View>
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
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    borderBottomWidth: 1,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 0,
    padding: 4,
    alignSelf: 'stretch',
    width: '100%',
    gap: 8,
    justifyContent: 'center',
  },
  segmentButton: {
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 0,
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  segmentButtonText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#374151',
  },
  segmentButtonTextActive: {
    fontWeight: '600',
    color: '#111827',
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
  categorySelectorContainer: {
    borderBottomWidth: 1,
    paddingTop: 4,
    paddingBottom: 4,
  },
  categorySelector: {
    maxHeight: 20,
  },
  categorySelectorContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 0,
    alignItems: 'flex-end',
  },
  categoryButton: {
    marginRight: 18,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryButtonText: {
    fontSize: 15,
    lineHeight: 18,
  },
});
