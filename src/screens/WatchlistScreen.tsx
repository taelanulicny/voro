import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, WatchlistSortOption } from '../types';
import { useWatchlist } from '../context/WatchlistContext';
import { useTrading } from '../context/TradingContext';
import { useTheme } from '../context/ThemeContext';
import { useSideMenu } from '../context/SideMenuContext';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';
import TradeModal from '../components/TradeModal';
import SideMenu from '../components/SideMenu';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function WatchlistScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { watchlist, removeFromWatchlist, priceAlerts, addPriceAlert, removePriceAlert, getAlertsForEntity } = useWatchlist();
  const { getHolding, getEntityPrice } = useTrading();
  const { theme } = useTheme();
  const [sortBy, setSortBy] = useState<WatchlistSortOption>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{
    id: number;
    ticker: string;
    name: string;
  } | null>(null);
  const [alertType, setAlertType] = useState<'above' | 'below'>('above');
  const [alertPrice, setAlertPrice] = useState('');
  const [tradeModalVisible, setTradeModalVisible] = useState(false);
  const [tradeEntity, setTradeEntity] = useState<{
    id: number;
    ticker: string;
    name: string;
    category: string;
    currentPrice: number;
  } | null>(null);
  const { isVisible: sideMenuVisible, setIsVisible: setSideMenuVisible } = useSideMenu();

  // Sort and filter watchlist
  const sortedWatchlist = useMemo(() => {
    let filtered = watchlist.filter(item =>
      item.entityTicker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.entityName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.entityName.localeCompare(b.entityName);
        case 'price_high':
          return b.currentPrice - a.currentPrice;
        case 'price_low':
          return a.currentPrice - b.currentPrice;
        case 'change_high':
          return b.changePercent24h - a.changePercent24h;
        case 'change_low':
          return a.changePercent24h - b.changePercent24h;
        case 'added':
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        default:
          return 0;
      }
    });

    return sorted;
  }, [watchlist, sortBy, searchQuery]);

  const handleRemove = (entityId: number, entityName: string) => {
    Alert.alert(
      'Remove from Watchlist',
      `Remove ${entityName} from your watchlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const result = await removeFromWatchlist(entityId);
            if (!result.success && result.error) {
              Alert.alert('Error', result.error);
            }
          },
        },
      ]
    );
  };

  const handleAddAlert = () => {
    if (!selectedEntity || !alertPrice) {
      Alert.alert('Error', 'Please enter a target price');
      return;
    }

    const price = parseFloat(alertPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    addPriceAlert(selectedEntity.id, alertType, price);
    setShowAlertModal(false);
    setAlertPrice('');
    setSelectedEntity(null);
    Alert.alert('Success', `Price alert set for ${selectedEntity.ticker}`);
  };

  const handleQuickBuy = (item: typeof sortedWatchlist[0]) => {
    const currentPrice = getEntityPrice(item.entityId);
    setTradeEntity({
      id: item.entityId,
      ticker: item.entityTicker,
      name: item.entityName,
      category: item.category,
      currentPrice,
    });
    setTradeModalVisible(true);
  };

  const handleQuickSell = (item: typeof sortedWatchlist[0]) => {
    const holding = getHolding(item.entityId);
    if (!holding) {
      Alert.alert('No Position', `You don't own any ${item.entityTicker}`);
      return;
    }

    const currentPrice = getEntityPrice(item.entityId);
    setTradeEntity({
      id: item.entityId,
      ticker: item.entityTicker,
      name: item.entityName,
      category: item.category,
      currentPrice,
    });
    setTradeModalVisible(true);
  };

  const handleEntityPress = (item: typeof sortedWatchlist[0]) => {
    navigation.navigate('Entity', {
      entityId: item.entityId,
      categoryId: item.category,
    });
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

  const sortOptions: { label: string; value: WatchlistSortOption }[] = [
    { label: 'Name (A-Z)', value: 'name' },
    { label: 'Price (High to Low)', value: 'price_high' },
    { label: 'Price (Low to High)', value: 'price_low' },
    { label: 'Change (High to Low)', value: 'change_high' },
    { label: 'Change (Low to High)', value: 'change_low' },
    { label: 'Recently Added', value: 'added' },
  ];

  const renderItem = ({ item }: { item: typeof sortedWatchlist[0] }) => {
    const holding = getHolding(item.entityId);
    const alerts = getAlertsForEntity(item.entityId);
    const hasAlerts = alerts.length > 0;

    return (
      <TouchableOpacity
        style={[styles.itemCard, { backgroundColor: theme.card, borderBottomColor: theme.borderLight }]}
        onPress={() => handleEntityPress(item)}
      >
        <View style={styles.itemLeft}>
          <View style={[styles.tickerIcon, { backgroundColor: theme.primaryLight }]}>
            <Text style={[styles.tickerIconText, { color: theme.primary }]}>
              {item.entityName.substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.itemInfo}>
            <View style={styles.itemHeader}>
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                {item.entityName}
              </Text>
              {hasAlerts && (
                <Ionicons name="notifications" size={16} color={theme.primary} style={styles.alertIcon} />
              )}
            </View>
            <Text style={[styles.categoryText, { color: theme.textSecondary }]}>
              {getDisplayCategory(item.entityId, item.category)}
            </Text>
          </View>
        </View>

        <View style={styles.itemRight}>
          <View style={styles.priceSection}>
            <Text style={[styles.price, { color: theme.text }]}>
              {formatCurrency(item.currentPrice)}
            </Text>
            <View style={styles.changeRow}>
              <Text
                style={[styles.change, { color: getChangeColor(item.change24h) }]}
              >
                {item.change24h >= 0 ? '+' : ''}
                {formatCurrency(item.change24h)}
              </Text>
              <Text
                style={[styles.changePercent, { color: getChangeColor(item.change24h) }]}
              >
                ({item.changePercent24h >= 0 ? '+' : ''}
                {item.changePercent24h.toFixed(2)}%)
              </Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            {holding ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.sellButton, { backgroundColor: theme.error + '20' }]}
                onPress={() => handleQuickSell(item)}
              >
                <Text style={[styles.actionButtonText, { color: theme.error }]}>Negative</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.buyButton, { backgroundColor: theme.primary + '20' }]}
                onPress={() => handleQuickBuy(item)}
              >
                <Text style={[styles.actionButtonText, { color: theme.primary }]}>Positive</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
              onPress={() => {
                setSelectedEntity({ id: item.entityId, ticker: item.entityTicker, name: item.entityName });
                setShowAlertModal(true);
              }}
            >
              <Ionicons name="notifications-outline" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
              onPress={() => handleRemove(item.entityId, item.entityName)}
            >
              <Ionicons name="trash-outline" size={18} color={theme.error} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
          
          <Text style={[styles.logoText, { color: theme.text }]}>Watchlist</Text>
        </View>
        
        <View style={styles.headerRight}>
        <TouchableOpacity
            style={styles.iconButton}
          onPress={() => setShowSortModal(true)}
        >
            <Ionicons name="swap-vertical" size={24} color={theme.text} />
        </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
        <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text, backgroundColor: theme.backgroundSecondary }]}
          placeholder="Search watchlist..."
          placeholderTextColor={theme.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Watchlist List */}
      {sortedWatchlist.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="star-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {searchQuery ? 'No results found' : 'Your watchlist is empty'}
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
            {searchQuery
              ? 'Try a different search term'
              : 'Add entities to track their prices and set alerts'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedWatchlist}
          renderItem={renderItem}
          keyExtractor={(item) => item.entityId.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Sort By</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.sortOption,
                  { borderBottomColor: theme.borderLight },
                  sortBy === option.value && { backgroundColor: theme.primaryLight },
                ]}
                onPress={() => {
                  setSortBy(option.value);
                  setShowSortModal(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    { color: sortBy === option.value ? theme.primary : theme.text },
                  ]}
                >
                  {option.label}
                </Text>
                {sortBy === option.value && (
                  <Ionicons name="checkmark" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Price Alert Modal */}
      <Modal
        visible={showAlertModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAlertModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Set Price Alert</Text>
              <TouchableOpacity onPress={() => setShowAlertModal(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedEntity && (
              <View style={styles.alertEntityInfo}>
                <Text style={[styles.alertEntityTicker, { color: theme.text }]}>
                  {selectedEntity.ticker}
                </Text>
                <Text style={[styles.alertEntityName, { color: theme.textSecondary }]}>
                  {selectedEntity.name}
                </Text>
              </View>
            )}

            <View style={styles.alertTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.alertTypeButton,
                  { backgroundColor: theme.backgroundSecondary },
                  alertType === 'above' && { backgroundColor: theme.primaryLight },
                ]}
                onPress={() => setAlertType('above')}
              >
                <Text
                  style={[
                    styles.alertTypeText,
                    { color: theme.textSecondary },
                    alertType === 'above' && { color: theme.primary },
                  ]}
                >
                  Price Above
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.alertTypeButton,
                  { backgroundColor: theme.backgroundSecondary },
                  alertType === 'below' && { backgroundColor: theme.primaryLight },
                ]}
                onPress={() => setAlertType('below')}
              >
                <Text
                  style={[
                    styles.alertTypeText,
                    { color: theme.textSecondary },
                    alertType === 'below' && { color: theme.primary },
                  ]}
                >
                  Price Below
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.alertInputContainer}>
              <Text style={[styles.alertLabel, { color: theme.textSecondary }]}>Target Price</Text>
              <TextInput
                style={[styles.alertInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
                placeholder="Enter price"
                placeholderTextColor={theme.textTertiary}
                value={alertPrice}
                onChangeText={setAlertPrice}
                keyboardType="decimal-pad"
              />
            </View>

            <TouchableOpacity
              style={[styles.alertButton, { backgroundColor: theme.primary }]}
              onPress={handleAddAlert}
            >
              <Text style={[styles.alertButtonText, { color: '#FFFFFF' }]}>Set Alert</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Trade Modal */}
      {tradeEntity && (
        <TradeModal
          visible={tradeModalVisible}
          onClose={() => {
            setTradeModalVisible(false);
            setTradeEntity(null);
          }}
          entityId={tradeEntity.id}
          entityTicker={tradeEntity.ticker}
          entityName={tradeEntity.name}
          category={tradeEntity.category}
          currentPrice={tradeEntity.currentPrice}
        />
      )}

      {/* Side Menu */}
      <SideMenu />
    </SafeAreaView>
  );
}

export default React.memo(WatchlistScreen);

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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  itemCard: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  tickerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tickerIconText: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemInfo: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIcon: {
    marginLeft: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  categoryText: {
    fontSize: 12,
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  priceSection: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  change: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  changePercent: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  buyButton: {
    // Styled via backgroundColor
  },
  sellButton: {
    // Styled via backgroundColor
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  sortOptionText: {
    fontSize: 16,
  },
  alertEntityInfo: {
    padding: 16,
    alignItems: 'center',
  },
  alertEntityTicker: {
    fontSize: 20,
    fontWeight: '700',
  },
  alertEntityName: {
    fontSize: 14,
    marginTop: 4,
  },
  alertTypeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  alertTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  alertTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  alertInputContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  alertLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  alertInput: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  alertButton: {
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  alertButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
