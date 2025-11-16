import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTrading } from '../context/TradingContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PortfolioScreen() {
  const { portfolio, transactions } = useTrading();
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<'holdings' | 'history'>('holdings');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate refresh - in real app would fetch updated prices
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleHoldingPress = (entityId: number, category: string) => {
    navigation.navigate('Entity', { entityId, categoryId: category });
  };

  const sortedHoldings = [...portfolio.holdings].sort((a, b) => b.totalValue - a.totalValue);
  const recentTransactions = transactions.slice(0, 20); // Last 20 transactions

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Portfolio Value Card */}
        <View style={styles.valueCard}>
          <Text style={styles.valueLabel}>Total Portfolio Value</Text>
          <Text style={styles.valueAmount}>{formatCurrency(portfolio.totalValue)}</Text>
          <View style={styles.changeContainer}>
            <Text style={[styles.changeText, { color: getChangeColor(portfolio.todayChange) }]}>
              {portfolio.todayChange >= 0 ? '+' : ''}
              {formatCurrency(portfolio.todayChange)}
            </Text>
            <Text style={[styles.changePercent, { color: getChangeColor(portfolio.todayChange) }]}>
              ({portfolio.todayChangePercent >= 0 ? '+' : ''}
              {portfolio.todayChangePercent.toFixed(2)}%)
            </Text>
          </View>
        </View>

        {/* Cash Balance Card */}
        <View style={styles.cashCard}>
          <View style={styles.cashRow}>
            <Text style={styles.cashLabel}>Cash Balance</Text>
            <Text style={styles.cashAmount}>{formatCurrency(portfolio.cashBalance)}</Text>
          </View>
          <View style={styles.cashRow}>
            <Text style={styles.cashLabel}>Invested</Text>
            <Text style={styles.cashAmount}>
              {formatCurrency(portfolio.totalValue - portfolio.cashBalance)}
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'holdings' && styles.tabActive]}
            onPress={() => setActiveTab('holdings')}
          >
            <Text style={[styles.tabText, activeTab === 'holdings' && styles.tabTextActive]}>
              Holdings ({portfolio.holdings.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              History ({transactions.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Holdings List */}
        {activeTab === 'holdings' && (
          <View style={styles.listContainer}>
            {sortedHoldings.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📊</Text>
                <Text style={styles.emptyTitle}>No Holdings Yet</Text>
                <Text style={styles.emptyText}>
                  Start trading to build your portfolio. Browse entities and make your first trade!
                </Text>
              </View>
            ) : (
              sortedHoldings.map((holding, index) => (
                <TouchableOpacity
                  key={`${holding.entityId}-${index}`}
                  style={styles.holdingCard}
                  onPress={() => handleHoldingPress(holding.entityId, holding.category)}
                >
                  <View style={styles.holdingHeader}>
                    <View>
                      <Text style={styles.holdingTicker}>{holding.entityTicker}</Text>
                      <Text style={styles.holdingName}>{holding.entityName}</Text>
                    </View>
                    <View style={styles.holdingRight}>
                      <Text style={styles.holdingValue}>{formatCurrency(holding.totalValue)}</Text>
                      <Text
                        style={[
                          styles.holdingPnL,
                          { color: getChangeColor(holding.profitLoss) },
                        ]}
                      >
                        {holding.profitLoss >= 0 ? '+' : ''}
                        {formatCurrency(holding.profitLoss)} ({holding.profitLossPercent.toFixed(1)}%)
                      </Text>
                    </View>
                  </View>
                  <View style={styles.holdingDetails}>
                    <View style={styles.holdingDetailItem}>
                      <Text style={styles.holdingDetailLabel}>Shares</Text>
                      <Text style={styles.holdingDetailValue}>{holding.quantity}</Text>
                    </View>
                    <View style={styles.holdingDetailItem}>
                      <Text style={styles.holdingDetailLabel}>Avg Cost</Text>
                      <Text style={styles.holdingDetailValue}>
                        ${holding.averageCost.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.holdingDetailItem}>
                      <Text style={styles.holdingDetailLabel}>Current</Text>
                      <Text style={styles.holdingDetailValue}>
                        ${holding.currentPrice.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Transaction History */}
        {activeTab === 'history' && (
          <View style={styles.listContainer}>
            {recentTransactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={styles.emptyTitle}>No Transactions Yet</Text>
                <Text style={styles.emptyText}>
                  Your trading history will appear here once you make your first trade.
                </Text>
              </View>
            ) : (
              recentTransactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionCard}>
                  <View style={styles.transactionHeader}>
                    <View style={styles.transactionLeft}>
                      <View
                        style={[
                          styles.transactionBadge,
                          transaction.type === 'buy' ? styles.buyBadge : styles.sellBadge,
                        ]}
                      >
                        <Text style={styles.transactionBadgeText}>
                          {transaction.type.toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.transactionInfo}>
                        <Text style={styles.transactionTicker}>{transaction.entityTicker}</Text>
                        <Text style={styles.transactionName}>{transaction.entityName}</Text>
                      </View>
                    </View>
                    <View style={styles.transactionRight}>
                      <Text
                        style={[
                          styles.transactionAmount,
                          transaction.type === 'buy' ? styles.buyText : styles.sellText,
                        ]}
                      >
                        {transaction.type === 'buy' ? '-' : '+'}
                        {formatCurrency(transaction.totalAmount)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionDetailText}>
                      {transaction.quantity} shares @ ${transaction.pricePerToken.toFixed(2)}
                    </Text>
                    <Text style={styles.transactionTime}>
                      {new Date(transaction.timestamp).toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  valueCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  valueLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  valueAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  changeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  changePercent: {
    fontSize: 16,
    fontWeight: '600',
  },
  cashCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cashRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cashLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  cashAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  holdingCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  holdingTicker: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  holdingName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  holdingPnL: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  holdingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  holdingDetailItem: {
    alignItems: 'center',
  },
  holdingDetailLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  holdingDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  transactionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  buyBadge: {
    backgroundColor: '#D1FAE5',
  },
  sellBadge: {
    backgroundColor: '#FEE2E2',
  },
  transactionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTicker: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  transactionName: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  buyText: {
    color: '#10B981',
  },
  sellText: {
    color: '#EF4444',
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionDetailText: {
    fontSize: 13,
    color: '#6B7280',
  },
  transactionTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
