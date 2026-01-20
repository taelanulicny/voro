import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTrading } from '../context/TradingContext';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList, UserTransaction } from '../types';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';
import { getEntityById } from '../utils/entities';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TradeHistoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { transactions } = useTrading();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  // Sort transactions by timestamp (newest first)
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [transactions]);

  // Filter transactions by search query
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return sortedTransactions;
    
    const query = searchQuery.toLowerCase();
    return sortedTransactions.filter(tx => 
      tx.entityTicker.toLowerCase().includes(query) ||
      tx.entityName.toLowerCase().includes(query)
    );
  }, [sortedTransactions, searchQuery]);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderTransaction = ({ item }: { item: UserTransaction }) => {
    const isBuy = item.type === 'buy';
    const entity = getEntityById(item.entityId);
    
    return (
      <View style={[styles.tableRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        {/* Symbol Column */}
        <View style={styles.symbolColumn}>
          <Text style={[styles.symbolText, { color: theme.text }]}>{item.entityTicker}</Text>
          <Text style={[styles.companyName, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.entityName}
          </Text>
        </View>

        {/* Side/Status Column */}
        <View style={styles.sideStatusColumn}>
          <Text style={[
            styles.sideText,
            { color: isBuy ? '#10B981' : '#EF4444' }
          ]}>
            {isBuy ? 'Buy' : 'Sell'}
          </Text>
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>Filled</Text>
        </View>

        {/* Filled/Total Column */}
        <View style={styles.filledColumn}>
          <Text style={[styles.filledText, { color: theme.text }]}>
            {item.quantity}/{item.quantity}
          </Text>
        </View>

        {/* Price/Avg Column */}
        <View style={styles.priceColumn}>
          <Text style={[styles.priceText, { color: theme.text }]}>
            @{formatCurrency(item.pricePerToken)}
          </Text>
          <Text style={[styles.avgText, { color: theme.textSecondary }]}>
            @{formatCurrency(item.pricePerToken)}
          </Text>
        </View>
      </View>
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
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Trade History</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={[styles.filterButton, { backgroundColor: theme.backgroundSecondary }]}
            onPress={() => setShowFilter(!showFilter)}
          >
            <Text style={[styles.filterButtonText, { color: theme.text }]}>Filter</Text>
            <Ionicons name="chevron-down" size={16} color={theme.text} style={styles.chevronIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.downloadButton}>
            <Ionicons name="download-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.backgroundSecondary }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Q Search"
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Text style={[styles.searchLabel, { color: theme.textSecondary }]}>Symbol</Text>
        </View>
      </View>

      {/* Table Header */}
      <View style={[styles.tableHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerText, { color: theme.textSecondary }]}>Symbol</Text>
        <Text style={[styles.headerText, { color: theme.textSecondary }]}>Side/Status</Text>
        <Text style={[styles.headerText, { color: theme.textSecondary }]}>Filled/Total</Text>
        <Text style={[styles.headerText, { color: theme.textSecondary }]}>Price/Avg</Text>
      </View>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No Transactions</Text>
          <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
            {searchQuery ? 'No transactions match your search.' : 'Your trading history will appear here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  downloadButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronIcon: {
    marginLeft: 2,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  searchLabel: {
    fontSize: 14,
    marginLeft: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  symbolColumn: {
    width: SCREEN_WIDTH * 0.25,
  },
  symbolText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  companyName: {
    fontSize: 11,
  },
  sideStatusColumn: {
    width: SCREEN_WIDTH * 0.25,
  },
  sideText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusText: {
    fontSize: 11,
  },
  filledColumn: {
    width: SCREEN_WIDTH * 0.2,
  },
  filledText: {
    fontSize: 14,
    fontWeight: '500',
  },
  priceColumn: {
    width: SCREEN_WIDTH * 0.3,
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  avgText: {
    fontSize: 11,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
});

