import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useTrading } from '../context/TradingContext';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';
import { MOCK_ENTITIES, getEntitiesByCategory } from '../utils/mockEntities';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DiscoverNewAdditionsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { getEntityPrice } = useTrading();

  // Categories are now stored directly (no mapping needed)

  // Static dates from this week (newest to oldest: today to 6 days ago)
  // These dates are fixed and don't change
  const getDatesThisWeek = () => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i <= 6; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const year = date.getFullYear();
      dates.push(`${month}/${day}/${year}`);
    }
    return dates;
  };

  // Static entity selection for "Discover New Additions"
  // Same entities are always shown, sorted by date (newest first)
  const discoverNewAdditions = useMemo(() => {
    const weekDates = getDatesThisWeek();
    
    // Fixed entity IDs (not random - these stay the same)
    // Get 1 entity from Influencers (IDs 11-20) - using a fixed index
    const influencers = MOCK_ENTITIES.filter(e => e.id >= 11 && e.id <= 20);
    const fixedInfluencer = influencers[0]; // Always use first one
    
    // Get 1 entity from Music Artists (IDs 21-30) - using a fixed index
    const musicArtists = MOCK_ENTITIES.filter(e => e.id >= 21 && e.id <= 30);
    const fixedMusicArtist = musicArtists[0]; // Always use first one
    
    // Get 1 entity from Political Figures (IDs 31-39) - using a fixed index
    const politicalFigures = MOCK_ENTITIES.filter(e => e.category === 'Political Figures' && e.id >= 31 && e.id <= 39);
    const fixedPolitical = politicalFigures[0]; // Always use first one
    
    // Get 1 more entity from any of these categories - using a fixed index
    const allCandidates = [...influencers, ...musicArtists, ...politicalFigures];
    const fixedFourth = allCandidates[3]; // Always use same one
    
    const entities = [
      fixedInfluencer,
      fixedMusicArtist,
      fixedPolitical,
      fixedFourth,
    ].filter(Boolean); // Remove any undefined values
    
    // Assign dates from this week to each entity (newest dates first)
    const itemsWithDates = entities.map((entity, index) => ({
      id: entity.id,
      name: entity.name,
      ticker: entity.ticker,
      category: entity.category,
      displayCategory: entity.category,
      currentPrice: getEntityPrice(entity.id),
      change24h: getEntityPrice(entity.id) - entity.basePrice,
      changePercent24h: ((getEntityPrice(entity.id) - entity.basePrice) / entity.basePrice) * 100,
      addedDate: weekDates[index], // Assign dates in order (newest first)
      isCategory: false,
    }));
    
    // Add Startups category as 5th item
    itemsWithDates.push({
      id: -1, // Special ID for category
      name: 'Startups',
      ticker: '',
      category: 'Startups',
      displayCategory: 'Startups',
      currentPrice: 0,
      change24h: 0,
      changePercent24h: 0,
      addedDate: weekDates[4], // 5th date (5 days ago)
      isCategory: true,
      volumePercentage: 10.0, // Volume percentage like in treemap
    });
    
    // Sort by date (newest first) - this ensures the 5 most recent are at the top
    return itemsWithDates.sort((a, b) => {
      const dateA = new Date(a.addedDate);
      const dateB = new Date(b.addedDate);
      return dateB.getTime() - dateA.getTime();
    });
  }, []); // Empty dependency array - dates and entities are static

  const handleEntityPress = (entityId: number, displayCategory: string) => {
    navigation.navigate('Entity', {
      entityId,
      categoryId: displayCategory,
    });
  };

  const handleCategoryPress = (categoryId: string) => {
    navigation.navigate('Category', {
      categoryId,
    });
  };

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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Discover New Additions</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Show all items (4 entities + Startups category) */}
        {discoverNewAdditions.map((item) => (
          <View key={item.isCategory ? 'startups' : item.id} style={styles.itemContainer}>
            <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>
              {item.addedDate}
            </Text>
            {item.isCategory ? (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => handleCategoryPress('Startups')}
              >
                <View style={styles.cardLeft}>
                  <View style={[styles.icon, { backgroundColor: theme.primaryLight }]}>
                    <Ionicons name="rocket-outline" size={20} color={theme.primary} />
                  </View>
                  <View style={styles.info}>
                    <Text style={[styles.name, { color: theme.text }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.category, { color: theme.textSecondary }]}>
                      New Category
                    </Text>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <Text style={[styles.price, { color: theme.text }]}>
                    {item.volumePercentage?.toFixed(1)}%
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => handleEntityPress(item.id, item.displayCategory)}
              >
                <View style={styles.cardLeft}>
                  <View style={[styles.icon, { backgroundColor: theme.primaryLight }]}>
                    <Text style={[styles.iconText, { color: theme.primary }]}>
                      {item.name.substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={[styles.name, { color: theme.text }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.category, { color: theme.textSecondary }]}>
                      {item.displayCategory}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <Text style={[styles.price, { color: theme.text }]}>
                    {formatCurrency(item.currentPrice)}
                  </Text>
                  <Text style={[styles.change, { color: getChangeColor(item.change24h) }]}>
                    {item.change24h >= 0 ? '+' : ''}
                    {item.changePercent24h.toFixed(2)}%
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  itemContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 12,
    marginBottom: 6,
    marginLeft: 4,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  category: {
    fontSize: 12,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  change: {
    fontSize: 13,
    fontWeight: '600',
  },
});

