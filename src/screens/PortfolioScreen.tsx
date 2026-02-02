import React, { useState, useMemo } from 'react';
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
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';
import { useScreenshotProtection } from '../utils/security';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function PortfolioScreen() {
  const { portfolio, transactions } = useTrading();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<'holdings' | 'history'>('holdings');
  const [refreshing, setRefreshing] = useState(false);

  // SECURITY: Enable screenshot protection for sensitive financial data
  const { BlurOverlay } = useScreenshotProtection(true);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate refresh - in real app would fetch updated prices
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleHoldingPress = (entityId: number, category: string) => {
    navigation.navigate('Entity', { entityId, categoryId: category });
  };

  // Sort by highest share price (currentPrice) descending
  const sortedHoldings = useMemo(
    () => [...portfolio.holdings].sort((a, b) => (b.currentPrice ?? 0) - (a.currentPrice ?? 0)),
    [portfolio.holdings]
  );

  const recentTransactions = useMemo(
    () => transactions.slice(0, 20),
    [transactions]
  );

  const investedAmount = useMemo(
    () => portfolio.totalValue - portfolio.cashBalance,
    [portfolio.totalValue, portfolio.cashBalance]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      {BlurOverlay}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Portfolio Value Card */}
        <View style={[styles.valueCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.valueLabel, { color: theme.textSecondary }]}>Total Portfolio Value</Text>
          <Text style={[styles.valueAmount, { color: theme.text }]}>{formatCurrency(portfolio.totalValue)}</Text>
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
        <View style={[styles.cashCard, { backgroundColor: theme.card }]}>
          <View style={styles.cashRow}>
            <Text style={[styles.cashLabel, { color: theme.textSecondary }]}>Cash Balance</Text>
            <Text style={[styles.cashAmount, { color: theme.text }]}>{formatCurrency(portfolio.cashBalance)}</Text>
          </View>
          <View style={styles.cashRow}>
            <Text style={[styles.cashLabel, { color: theme.textSecondary }]}>Invested</Text>
            <Text style={[styles.cashAmount, { color: theme.text }]}>
              {formatCurrency(investedAmount)}
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[
              styles.tab,
              { backgroundColor: activeTab === 'holdings' ? theme.primary : theme.card },
            ]}
            onPress={() => setActiveTab('holdings')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'holdings' ? '#FFFFFF' : theme.textSecondary }]}>
              Holdings ({portfolio.holdings.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              { backgroundColor: activeTab === 'history' ? theme.primary : theme.card },
            ]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'history' ? '#FFFFFF' : theme.textSecondary }]}>
              History ({transactions.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Holdings List */}
        {activeTab === 'holdings' && (
          <View style={styles.listContainer}>
            {sortedHoldings.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
                <Text style={styles.emptyIcon}>📊</Text>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Holdings Yet</Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Start trading to build your portfolio. Browse entities and make your first trade!
                </Text>
              </View>
            ) : (
              sortedHoldings.map((holding, index) => (
                <TouchableOpacity
                  key={`${holding.entityId}-${index}`}
                  style={[styles.holdingCard, { backgroundColor: theme.card }]}
                  onPress={() => handleHoldingPress(holding.entityId, holding.category)}
                >
                  <View style={styles.holdingHeader}>
                    <View>
                      <Text style={[styles.holdingTicker, { color: theme.text }]}>{holding.entityTicker}</Text>
                      <Text style={[styles.holdingName, { color: theme.textSecondary }]}>{holding.entityName}</Text>
                    </View>
                    <View style={styles.holdingRight}>
                      <Text style={[styles.holdingValue, { color: theme.text }]}>{formatCurrency(holding.totalValue)}</Text>
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
                  <View style={[styles.holdingDetails, { borderTopColor: theme.borderLight }]}>
                    <View style={styles.holdingDetailItem}>
                      <Text style={[styles.holdingDetailLabel, { color: theme.textTertiary }]}>Shares</Text>
                      <Text style={[styles.holdingDetailValue, { color: theme.text }]}>{holding.quantity}</Text>
                    </View>
                    <View style={styles.holdingDetailItem}>
                      <Text style={[styles.holdingDetailLabel, { color: theme.textTertiary }]}>Avg Cost</Text>
                      <Text style={[styles.holdingDetailValue, { color: theme.text }]}>
                        {formatCurrency(holding.averageCost)}
                      </Text>
                    </View>
                    <View style={styles.holdingDetailItem}>
                      <Text style={[styles.holdingDetailLabel, { color: theme.textTertiary }]}>Current</Text>
                      <Text style={[styles.holdingDetailValue, { color: theme.text }]}>
                        {formatCurrency(holding.currentPrice)}
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
              <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Transactions Yet</Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Your trading history will appear here once you make your first trade.
                </Text>
              </View>
            ) : (
              recentTransactions.map((transaction) => (
                <View key={transaction.id} style={[styles.transactionCard, { backgroundColor: theme.card }]}>
                  <View style={styles.transactionHeader}>
                    <View style={styles.transactionLeft}>
                      <View
                        style={[
                          styles.transactionBadge,
                          { backgroundColor: transaction.type === 'buy' ? '#D1FAE5' : '#FEE2E2' },
                        ]}
                      >
                        <Text style={styles.transactionBadgeText}>
                          {transaction.type.toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.transactionInfo}>
                        <Text style={[styles.transactionTicker, { color: theme.text }]}>{transaction.entityTicker}</Text>
                        <Text style={[styles.transactionName, { color: theme.textSecondary }]}>{transaction.entityName}</Text>
                      </View>
                    </View>
                    <View style={styles.transactionRight}>
                      <Text
                        style={[
                          styles.transactionAmount,
                          { color: transaction.type === 'buy' ? '#10B981' : '#EF4444' },
                        ]}
                      >
                        {transaction.type === 'buy' ? '-' : '+'}
                        {formatCurrency(transaction.totalAmount)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={[styles.transactionDetailText, { color: theme.textSecondary }]}>
                      {transaction.quantity} shares @ {formatCurrency(transaction.pricePerToken)}
                    </Text>
                    <Text style={[styles.transactionTime, { color: theme.textTertiary }]}>
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

export default React.memo(PortfolioScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  valueCard: {
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
    marginBottom: 8,
  },
  valueAmount: {
    fontSize: 36,
    fontWeight: 'bold',
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
  },
  cashAmount: {
    fontSize: 14,
    fontWeight: '600',
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
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyState: {
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
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  holdingCard: {
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
  },
  holdingName: {
    fontSize: 14,
    marginTop: 2,
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    fontSize: 18,
    fontWeight: 'bold',
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
  },
  holdingDetailItem: {
    alignItems: 'center',
  },
  holdingDetailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  holdingDetailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  transactionCard: {
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
  },
  transactionName: {
    fontSize: 12,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionDetailText: {
    fontSize: 13,
  },
  transactionTime: {
    fontSize: 12,
  },
});
