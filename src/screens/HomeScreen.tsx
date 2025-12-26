import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, MainTabParamList, Entity } from '../types';
import { useTrading } from '../context/TradingContext';
import { useTheme } from '../context/ThemeContext';
import { useWatchlist } from '../context/WatchlistContext';
import { useSideMenu } from '../context/SideMenuContext';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';
import { getEntityById, getAllEntities, MOCK_ENTITIES, getEntitiesByCategory } from '../utils/mockEntities';
import TradeModal from '../components/TradeModal';
import SideMenu from '../components/SideMenu';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { portfolio, getEntityPrice, getAllEntityPrices } = useTrading();
  const { theme } = useTheme();
  const { watchlist } = useWatchlist();
  const { isVisible: sideMenuVisible, setIsVisible: setSideMenuVisible } = useSideMenu();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Trending');
  const [addedCategories, setAddedCategories] = useState<string[]>([]);
  
  const categories = ['Trending', 'Influencers', 'Music Artists', 'Sports', 'Political Figures', 'Startups'];
  const customizableCategories = ['Influencers', 'Music Artists', 'Sports', 'Political Figures', 'Startups'];
  
  // Get live entity prices
  const entityPrices = getAllEntityPrices();
  const [previousPrices, setPreviousPrices] = useState<Record<number, number>>({});
  
  // Force chart update when portfolio value changes - DISABLED (keeping prices static)
  // useEffect(() => {
  //   setChartUpdateKey(prev => prev + 1);
  // }, [portfolio.totalValue, portfolioHistory.length]);
  
  // Update entities with live prices
  const entities = useMemo(() => {
    return MOCK_ENTITIES.map((entity) => {
      const currentPrice = getEntityPrice(entity.id);
      const previousPrice = previousPrices[entity.id] || entity.basePrice;
      // Calculate change from basePrice
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
  }, [entityPrices, previousPrices, getEntityPrice]);
  
  // Track previous prices for change calculations
  useEffect(() => {
    setPreviousPrices(entityPrices);
  }, [entityPrices]);
  
  // Trade modal states
  const [tradeModalVisible, setTradeModalVisible] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{
    id: number;
    ticker: string;
    name: string;
    price: number;
    category: string;
  } | null>(null);
  

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleHoldingPress = (entityId: number, category: string) => {
    navigation.navigate('Entity', { entityId, categoryId: category });
  };


  // Map entity categories to display category names
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
      'Tech': 'Startups',
      'Politics': 'Political Figures',
      'Events': 'Sports',
    };
    
    return categoryMap[category] || category;
  };

  // Map display category to entity category
  const getEntityCategory = (displayCategory: string): string => {
    const categoryMap: Record<string, string> = {
      'Influencers': 'People',
      'Music Artists': 'People',
      'Sports': 'Events',
      'Political Figures': 'Politics',
      'Startups': 'Tech',
    };
    return categoryMap[displayCategory] || displayCategory;
  };

  // Get previous day ranks for a category (mock data)
  const getPreviousDayRanks = (displayCategory: string): Record<number, number> => {
    const entityCategory = getEntityCategory(displayCategory);
    let filteredEntities = getEntitiesByCategory(entityCategory);
    
    if (displayCategory === 'Music Artists') {
      filteredEntities = filteredEntities.filter(entity => entity.id >= 21 && entity.id <= 30);
    } else if (displayCategory === 'Influencers') {
      filteredEntities = filteredEntities.filter(entity => entity.id >= 11 && entity.id <= 20);
    }
    
    // Create mock previous day prices (slightly different to simulate ranking changes)
    const previousDayEntities = filteredEntities.map((entity) => {
      const currentPrice = getEntityPrice(entity.id);
      // Simulate previous day price (add some randomness for ranking changes)
      const randomChange = (Math.random() - 0.5) * 0.1; // ±5% variation
      const previousPrice = currentPrice * (1 + randomChange);
      return {
        id: entity.id,
        previousPrice,
      };
    });
    
    // Sort by previous day price to get previous day ranks
    const sortedPrevious = [...previousDayEntities].sort((a, b) => b.previousPrice - a.previousPrice);
    
    // Map entity ID to previous day rank
    const mockRanks: Record<number, number> = {};
    sortedPrevious.forEach((entity, index) => {
      mockRanks[entity.id] = index + 1;
    });
    
    return mockRanks;
  };

  // Get top 5 entities for a category (ranked by price)
  const getTopEntitiesForCategory = (displayCategory: string) => {
    const entityCategory = getEntityCategory(displayCategory);
    let filteredEntities = getEntitiesByCategory(entityCategory);
    
    // Filter out influencers from Music Artists (both use 'People' category)
    if (displayCategory === 'Music Artists') {
      filteredEntities = filteredEntities.filter(entity => entity.id >= 21 && entity.id <= 30);
    } else if (displayCategory === 'Influencers') {
      filteredEntities = filteredEntities.filter(entity => entity.id >= 11 && entity.id <= 20);
    }
    
    const mappedEntities = filteredEntities.map((entity) => {
      const currentPrice = getEntityPrice(entity.id);
      // Calculate change from basePrice
      const change24h = currentPrice - entity.basePrice;
      const changePercent24h = (change24h / entity.basePrice) * 100;
      return {
        id: entity.id,
        ticker: entity.ticker,
        name: entity.name,
        currentPrice,
        change24h,
        changePercent24h,
        category: entity.category,
      };
    });
    
    // Sort by price (descending) - highest price = rank #1
    const sorted = [...mappedEntities].sort((a, b) => b.currentPrice - a.currentPrice);
    
    // Get previous day ranks for this category
    const previousDayRanks = getPreviousDayRanks(displayCategory);
    
    // Add rank and position change, return top 5
    return sorted.slice(0, 5).map((entity, index) => {
      const currentRank = index + 1;
      const previousRank = previousDayRanks[entity.id] || currentRank;
      const positionChange = previousRank - currentRank; // Positive = moved up, Negative = moved down
      
      return {
        ...entity,
        rank: currentRank,
        previousRank,
        positionChange,
      };
    });
  };

  // Handle adding a category to home screen
  const handleAddCategory = (category: string) => {
    if (!addedCategories.includes(category)) {
      setAddedCategories([...addedCategories, category]);
    }
  };

  // Handle removing a category from home screen
  const handleRemoveCategory = (category: string) => {
    setAddedCategories(addedCategories.filter(c => c !== category));
  };

  // Calculate trending entities (top 5 by absolute percentage change)
  const topGainers = useMemo(() => {
    const entitiesWithData = MOCK_ENTITIES.map(entity => {
      const livePrice = getEntityPrice(entity.id);
      const change = livePrice - entity.basePrice;
      const changePercent = (change / entity.basePrice) * 100;
      const displayCategory = getDisplayCategory(entity.id, entity.category);
      
      return {
        id: entity.id,
        ticker: entity.ticker,
        name: entity.name,
        category: entity.category,
        displayCategory,
        currentPrice: livePrice,
        changePercent24h: changePercent,
        change24h: change,
      };
    });
    
    // Sort by absolute percentage change and get top 5
    const top5 = entitiesWithData
      .sort((a, b) => Math.abs(b.changePercent24h) - Math.abs(a.changePercent24h))
      .slice(0, 5);
    
    // Calculate position changes within each entity's category
    return top5.map(entity => {
      const previousDayRanks = getPreviousDayRanks(entity.displayCategory);
      
      // Get all entities in this category to calculate current rank
      const entityCategory = getEntityCategory(entity.displayCategory);
      let categoryEntities = getEntitiesByCategory(entityCategory);
      
      if (entity.displayCategory === 'Music Artists') {
        categoryEntities = categoryEntities.filter(e => e.id >= 21 && e.id <= 30);
      } else if (entity.displayCategory === 'Influencers') {
        categoryEntities = categoryEntities.filter(e => e.id >= 11 && e.id <= 20);
      }
      
      // Calculate current rank in category (by price)
      const categoryEntitiesWithPrices = categoryEntities.map(e => ({
        id: e.id,
        currentPrice: getEntityPrice(e.id),
      }));
      const sortedCategory = [...categoryEntitiesWithPrices].sort((a, b) => b.currentPrice - a.currentPrice);
      const currentRank = sortedCategory.findIndex(e => e.id === entity.id) + 1;
      const previousRank = previousDayRanks[entity.id] || currentRank;
      const positionChange = previousRank - currentRank;
      
      return {
        ...entity,
        rank: currentRank,
        previousRank,
        positionChange,
      };
    });
  }, [entityPrices, getEntityPrice]);

  // Mock spotlight items - can be ads, entities, users, or events
  const spotlights = useMemo(() => [
    {
      id: '1',
      type: 'ad' as const,
      title: 'bonus',
      backgroundColor: '#000000',
      textColor: '#F5F5DC',
      subtitle: '',
      entityId: null,
      onPress: () => {
        // Handle ad click
      },
    },
    {
      id: '2',
      type: 'entity' as const,
      title: 'Cal AI',
      backgroundColor: '#E5E5E5',
      textColor: '#1E3A8A',
      subtitle: '',
      entityId: null,
      icon: '🍎',
      onPress: () => {
        // Handle entity click - could navigate to entity detail
      },
    },
    {
      id: '3',
      type: 'entity' as const,
      title: 'Dodgers',
      backgroundColor: '#1E3A8A',
      textColor: '#FFFFFF',
      subtitle: '',
      entityId: null,
      onPress: () => {
        // Handle entity click
      },
    },
  ], []);


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setSideMenuVisible(true)}
          >
            <Ionicons name="menu" size={24} color={theme.text} />
          </TouchableOpacity>
          
          <Text style={[styles.logoText, { color: theme.text }]}>moro</Text>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              // Will be linked later
            }}
          >
            <Ionicons name="gift-outline" size={24} color={theme.text} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Selector */}
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
                if (category === 'Trending') {
                  // Keep "Trending" on the home page
                  setSelectedCategory(category);
                } else {
                  // Navigate to the Category screen for other categories
                  navigation.navigate('Category', { categoryId: category });
                }
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

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >

        {/* Top Gainers Section */}
        {topGainers.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
                {topGainers.map((entity) => {
                      const livePrice = getEntityPrice(entity.id);
                      const basePrice = getEntityById(entity.id)?.basePrice || entity.currentPrice;
                      const liveChange = livePrice - basePrice;
                      const liveChangePercent = (liveChange / basePrice) * 100;
                      
                      // Get initials from name (first 2 letters)
                      const getInitials = (name: string) => {
                        return name.substring(0, 2).toUpperCase();
                      };

                      return (
                        <TouchableOpacity
                          key={entity.id}
                          style={[styles.miniCard, { backgroundColor: theme.backgroundSecondary }]}
                          onPress={() => handleHoldingPress(entity.id, entity.category)}
                        >
                          <View style={styles.miniCardLeft}>
                            <View style={[styles.miniIcon, { backgroundColor: theme.primaryLight }]}>
                              <Text style={[styles.miniIconText, { color: theme.primary }]}>
                                {getInitials(entity.name)}
                              </Text>
                            </View>
                            <View style={styles.miniNameContainer}>
                              <Text style={[styles.miniName, { color: theme.text }]}>{entity.name}</Text>
                              <Text style={[styles.miniCategory, { color: theme.textSecondary }]}>{entity.displayCategory}</Text>
                            </View>
                          </View>
                          <View style={styles.miniCardRight}>
                            <Text style={[styles.miniPrice, { color: theme.text }]}>{formatCurrency(livePrice)}</Text>
                            <Text style={[styles.miniChange, { color: getChangeColor(liveChange) }]}>
                              {liveChangePercent >= 0 ? '+' : ''}{liveChangePercent.toFixed(2)}%
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
          </View>
        )}

        {/* Spotlights Section */}
        <View style={[styles.section, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Spotlights</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.spotlightsScrollContent}
            style={styles.spotlightsScroll}
          >
            {spotlights.map((spotlight) => (
              <TouchableOpacity
                key={spotlight.id}
                style={[
                  styles.spotlightCard,
                  {
                    backgroundColor: spotlight.backgroundColor,
                  },
                ]}
                onPress={spotlight.onPress}
              >
                <View style={styles.spotlightCardContent}>
                  {spotlight.icon && (
                    <Text style={styles.spotlightIcon}>{spotlight.icon}</Text>
                  )}
                  <Text
                    style={[
                      styles.spotlightCardTitle,
                      {
                        color: spotlight.textColor,
                      },
                    ]}
                  >
                    {spotlight.title}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Watchlist Section */}
        <View style={[styles.section, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Watchlist</Text>
            <TouchableOpacity onPress={() => {
              // Navigate to Watchlist tab
              navigation.navigate('Watchlist');
            }}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {watchlist.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No watchlist items yet</Text>
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                Add entities to your watchlist to track them
              </Text>
            </View>
          ) : (
            <>
              {watchlist.slice(0, 5).map((item) => {
                return (
                  <TouchableOpacity
                    key={item.entityId}
                    style={[styles.watchlistCard, { borderBottomColor: theme.borderLight }]}
                    onPress={() => handleHoldingPress(item.entityId, item.category)}
                  >
                    <View style={styles.watchlistLeft}>
                      <View style={[styles.watchlistIcon, { backgroundColor: theme.primaryLight }]}>
                        <Text style={[styles.watchlistIconText, { color: theme.primary }]}>
                          {item.entityName.substring(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.watchlistInfo}>
                        <Text style={[styles.watchlistName, { color: theme.text }]}>{item.entityName}</Text>
                        <Text style={[styles.watchlistCategory, { color: theme.textSecondary }]}>
                          {getDisplayCategory(item.entityId, item.category)}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.watchlistRight}>
                      <Text style={[styles.watchlistPrice, { color: theme.text }]}>
                        {formatCurrency(item.currentPrice)}
                      </Text>
                      <Text style={[styles.watchlistChange, { color: getChangeColor(item.change24h) }]}>
                        {item.change24h >= 0 ? '+' : ''}
                        {item.changePercent24h.toFixed(2)}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </View>

        {/* Open Positions Section */}
        <View style={[styles.section, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Open Positions</Text>
            <TouchableOpacity onPress={() => {
              // Navigate to Portfolio tab
              navigation.navigate('Portfolio');
            }}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {portfolio.holdings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No open positions</Text>
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                Start trading to see your positions here
              </Text>
            </View>
          ) : (
            <>
              {portfolio.holdings.slice(0, 5).map((holding) => {
                const entity = MOCK_ENTITIES.find(e => e.id === holding.entityId);
                const entityCategory = entity?.category || '';
                return (
                  <TouchableOpacity
                    key={holding.entityId}
                    style={[styles.watchlistCard, { borderBottomColor: theme.borderLight }]}
                    onPress={() => handleHoldingPress(holding.entityId, entityCategory)}
                  >
                    <View style={styles.watchlistLeft}>
                      <View style={[styles.watchlistIcon, { backgroundColor: theme.primaryLight }]}>
                        <Text style={[styles.watchlistIconText, { color: theme.primary }]}>
                          {holding.entityName.substring(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.watchlistInfo}>
                        <Text style={[styles.watchlistName, { color: theme.text }]}>{holding.entityName}</Text>
                        <Text style={[styles.watchlistCategory, { color: theme.textSecondary }]}>
                          {getDisplayCategory(holding.entityId, entityCategory)}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.watchlistRight}>
                      <Text style={[styles.watchlistPrice, { color: theme.text }]}>
                        {formatCurrency(holding.totalValue)}
                      </Text>
                      <Text style={[styles.watchlistChange, { color: getChangeColor(holding.profitLoss) }]}>
                        {holding.profitLoss >= 0 ? '+' : ''}
                        {formatCurrency(holding.profitLoss)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </View>

        {/* Added Category Modules */}
        {addedCategories.map((category) => {
          const topEntities = getTopEntitiesForCategory(category);
          return (
            <View key={category} style={[styles.section, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{category}</Text>
                <TouchableOpacity onPress={() => handleRemoveCategory(category)}>
                  <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              {topEntities.map((entity) => {
                const livePrice = getEntityPrice(entity.id);
                const basePrice = getEntityById(entity.id)?.basePrice || entity.currentPrice;
                const liveChange = livePrice - basePrice;
                const liveChangePercent = (liveChange / basePrice) * 100;
                
                // Get initials from name (first 2 letters)
                const getInitials = (name: string) => {
                  return name.substring(0, 2).toUpperCase();
                };

                return (
                  <TouchableOpacity
                    key={entity.id}
                    style={[styles.miniCard, { backgroundColor: theme.backgroundSecondary }]}
                    onPress={() => {
                      const entityCategory = getEntityCategory(category);
                      navigation.navigate('Entity', { entityId: entity.id, categoryId: entityCategory });
                    }}
                  >
                    <View style={styles.rankContainer}>
                      <Text style={[styles.categoryRankNumber, { color: theme.textSecondary }]}>{entity.rank}</Text>
                      {entity.positionChange !== 0 && (
                        <View style={styles.positionChangeContainer}>
                          {entity.positionChange > 0 ? (
                            <View style={styles.positionChangeUp}>
                              <Ionicons name="arrow-up" size={10} color="#10B981" />
                              <Text style={styles.positionChangeTextUp}>{entity.positionChange}</Text>
                            </View>
                          ) : (
                            <View style={styles.positionChangeDown}>
                              <Ionicons name="arrow-down" size={10} color="#EF4444" />
                              <Text style={styles.positionChangeTextDown}>{Math.abs(entity.positionChange)}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                    <View style={styles.miniCardLeft}>
                      <View style={[styles.miniIcon, { backgroundColor: theme.primaryLight }]}>
                        <Text style={[styles.miniIconText, { color: theme.primary }]}>
                          {getInitials(entity.name)}
                        </Text>
                      </View>
                      <View style={styles.miniNameContainer}>
                        <Text style={[styles.miniName, { color: theme.text }]}>{entity.name}</Text>
                        <Text style={[styles.miniCategory, { color: theme.textSecondary }]}>{category}</Text>
                      </View>
                    </View>
                    <View style={styles.miniCardRight}>
                      <Text style={[styles.miniPrice, { color: theme.text }]}>{formatCurrency(livePrice)}</Text>
                      <Text style={[styles.miniChange, { color: getChangeColor(liveChange) }]}>
                        {liveChangePercent >= 0 ? '+' : ''}{liveChangePercent.toFixed(2)}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        {/* Customize Section */}
        <View style={[styles.section, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Customize Your Home Screen</Text>
          <View style={styles.widgetIconsContainer}>
            {customizableCategories.map((category) => {
              const isAdded = addedCategories.includes(category);
              return (
                <TouchableOpacity
                  key={category}
                  style={styles.widgetItem}
                  onPress={() => {
                    if (isAdded) {
                      handleRemoveCategory(category);
                    } else {
                      handleAddCategory(category);
                    }
                  }}
                  disabled={isAdded}
                >
                  <View style={[styles.widgetIcon, { borderColor: isAdded ? theme.textTertiary : theme.primary, opacity: isAdded ? 0.5 : 1 }]}>
                    <Text style={[styles.widgetIconText, { color: isAdded ? theme.textTertiary : theme.primary }]}>
                      {category.substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.widgetLabel, { color: isAdded ? theme.textTertiary : theme.text }]}>
                    {isAdded ? '✓ Added' : `+ ${category}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Bottom Padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

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

      {/* Side Menu */}
      <SideMenu />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    fontStyle: 'italic',
    // Note: Bukhari Script font should be loaded via expo-font
    // For now using italic style as placeholder
    // fontFamily: 'BukhariScript', // Uncomment when font is loaded
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 8,
    borderBottomColor: '#F9FAFB',
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  section: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#F9FAFB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  spotlightsScroll: {
    marginHorizontal: -16,
  },
  spotlightsScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
  },
  spotlightCard: {
    width: 140,
    height: 140,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginRight: 12,
  },
  spotlightCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spotlightIcon: {
    fontSize: 24,
  },
  spotlightCardTitle: {
    fontSize: 18,
    fontWeight: '400',
    fontStyle: 'italic',
    // For a cursive look, you may want to use a custom font
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
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
  holdingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  holdingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  holdingIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  holdingIconText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  holdingInfo: {
    flex: 1,
  },
  holdingTicker: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  holdingQuantity: {
    fontSize: 13,
    color: '#6B7280',
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  holdingChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  holdingChange: {
    fontSize: 13,
    fontWeight: '600',
  },
  holdingChangePercent: {
    fontSize: 13,
    fontWeight: '600',
  },
  miniCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: 50,
    marginRight: 12,
    position: 'relative',
  },
  categoryRankNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  trendingRankNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  positionChangeContainer: {
    position: 'absolute',
    top: -2,
    left: 18,
    alignItems: 'flex-start',
  },
  positionChangeUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  positionChangeDown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  positionChangeTextUp: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
    lineHeight: 10,
  },
  positionChangeTextDown: {
    fontSize: 9,
    fontWeight: '700',
    color: '#EF4444',
    lineHeight: 10,
  },
  miniCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  miniIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  miniIconText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  miniNameContainer: {
    flex: 1,
  },
  miniName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  miniCategory: {
    fontSize: 12,
    marginTop: 2,
    color: '#6B7280',
  },
  miniCardRight: {
    alignItems: 'flex-end',
  },
  miniPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  miniChange: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  watchlistCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  watchlistLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  watchlistIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  watchlistIconText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  watchlistInfo: {
    flex: 1,
  },
  watchlistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  watchlistCategory: {
    fontSize: 12,
    marginTop: 2,
    color: '#6B7280',
  },
  watchlistRight: {
    alignItems: 'flex-end',
  },
  watchlistPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  watchlistChange: {
    fontSize: 13,
    fontWeight: '600',
  },
  cashCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  cashLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cashInfo: {
    gap: 4,
  },
  cashLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  cashValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCancelText: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
  },
  selectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  selectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionIconText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  selectionInfo: {
    flex: 1,
  },
  selectionTicker: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  selectionName: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectionRight: {
    alignItems: 'flex-end',
  },
  selectionPrice: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  selectionChange: {
    fontSize: 14,
    fontWeight: '600',
  },
  balanceDisplay: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
  },
  balanceDisplayLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  balanceDisplayValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  modalButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  quickAmountsLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
  },
  quickAmountsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAmountButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  quickAmountText: {
    fontSize: 18,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  widgetIconsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  widgetItem: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 20,
  },
  widgetIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  widgetIconText: {
    fontSize: 14,
    fontWeight: '600',
  },
  widgetLabel: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  trendingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  trendingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankNumber: {
    width: 24,
    marginRight: 12,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: '600',
  },
  trendingIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trendingIconText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  trendingInfo: {
    flex: 1,
  },
  trendingName: {
    fontSize: 16,
    fontWeight: '600',
  },
  trendingCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  trendingRight: {
    alignItems: 'flex-end',
  },
  trendingPrice: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  trendingChange: {
    fontSize: 13,
    fontWeight: '600',
  },
});
