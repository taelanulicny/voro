import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useTrading } from '../context/TradingContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Holding, UserTransaction } from '../types';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';
import TradeModal from '../components/TradeModal';
import { ENTITIES } from '../utils/entities';
import { useScreenshotProtection } from '../utils/security';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SIMULATOR_STARTING_BALANCE = 10000;

interface SimulatorHolding {
  entityId: number;
  entityName: string;
  entityTicker: string;
  quantity: number;
  averageCost: number;
  totalCost: number;
  currentPrice: number;
  totalValue: number;
  profitLoss: number;
  profitLossPercent: number;
  category: string;
}

export default function SimulatorScreen() {
  const { theme } = useTheme();
  const { portfolio: realPortfolio, getEntityPrice } = useTrading();
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  
  // SECURITY: Enable screenshot protection for sensitive trading/financial data
  const { BlurOverlay } = useScreenshotProtection(true);

  // Simulator portfolio state
  const [simulatorCashBalance, setSimulatorCashBalance] = useState(SIMULATOR_STARTING_BALANCE);
  const [simulatorHoldings, setSimulatorHoldings] = useState<SimulatorHolding[]>([]);
  const [simulatorTransactions, setSimulatorTransactions] = useState<UserTransaction[]>([]);

  // Trade modal state
  const [tradeModalVisible, setTradeModalVisible] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{
    id: number;
    ticker: string;
    name: string;
    price: number;
    category: string;
  } | null>(null);

  // Calculate simulator portfolio values
  const simulatorPortfolio = useMemo(() => {
    const holdingsValue = simulatorHoldings.reduce((sum, h) => sum + h.totalValue, 0);
    const totalValue = simulatorCashBalance + holdingsValue;
    const totalCost = simulatorHoldings.reduce((sum, h) => sum + h.totalCost, 0);
    const totalProfitLoss = holdingsValue - totalCost;
    const todayChange = totalProfitLoss * 0.1; // Mock today's change
    const todayChangePercent = totalValue > 0 ? (todayChange / totalValue) * 100 : 0;

    return {
      cashBalance: simulatorCashBalance,
      totalValue,
      holdings: simulatorHoldings,
      todayChange,
      todayChangePercent,
    };
  }, [simulatorCashBalance, simulatorHoldings]);

  // Update holdings with current prices
  useEffect(() => {
    const updatedHoldings = simulatorHoldings.map((holding) => {
      const currentPrice = getEntityPrice(holding.entityId);
      const totalValue = holding.quantity * currentPrice;
      const profitLoss = totalValue - holding.totalCost;
      const profitLossPercent = (profitLoss / holding.totalCost) * 100;

      return {
        ...holding,
        currentPrice,
        totalValue,
        profitLoss,
        profitLossPercent,
      };
    });
    setSimulatorHoldings(updatedHoldings);
  }, [getEntityPrice]);

  const handleExecuteSimulatorTrade = async (
    entityId: number,
    entityName: string,
    entityTicker: string,
    type: 'buy' | 'sell',
    quantity: number,
    pricePerToken: number,
    category: string
  ): Promise<boolean> => {
    try {
      if (type === 'buy') {
        const totalCost = quantity * pricePerToken;
        if (totalCost > simulatorCashBalance) {
          Alert.alert('Insufficient Funds', 'You do not have enough virtual cash for this trade.');
          return false;
        }

        // Update holdings
        const existingHolding = simulatorHoldings.find((h) => h.entityId === entityId);
        if (existingHolding) {
          const newQuantity = existingHolding.quantity + quantity;
          const newTotalCost = existingHolding.totalCost + totalCost;
          const newAverageCost = newTotalCost / newQuantity;

          setSimulatorHoldings((prev) =>
            prev.map((h) =>
              h.entityId === entityId
                ? {
                    ...h,
                    quantity: newQuantity,
                    averageCost: newAverageCost,
                    totalCost: newTotalCost,
                  }
                : h
            )
          );
        } else {
          const newHolding: SimulatorHolding = {
            entityId,
            entityName,
            entityTicker,
            quantity,
            averageCost: pricePerToken,
            totalCost,
            currentPrice: pricePerToken,
            totalValue: totalCost,
            profitLoss: 0,
            profitLossPercent: 0,
            category,
          };
          setSimulatorHoldings((prev) => [...prev, newHolding]);
        }

        setSimulatorCashBalance((prev) => prev - totalCost);
      } else {
        // Sell
        const existingHolding = simulatorHoldings.find((h) => h.entityId === entityId);
        if (!existingHolding || existingHolding.quantity < quantity) {
          Alert.alert('Insufficient Holdings', 'You do not have enough shares to sell.');
          return false;
        }

        const totalValue = quantity * pricePerToken;
        const newQuantity = existingHolding.quantity - quantity;

        if (newQuantity === 0) {
          setSimulatorHoldings((prev) => prev.filter((h) => h.entityId !== entityId));
        } else {
          const newTotalCost = existingHolding.totalCost * (newQuantity / existingHolding.quantity);
          setSimulatorHoldings((prev) =>
            prev.map((h) =>
              h.entityId === entityId
                ? { ...h, quantity: newQuantity, totalCost: newTotalCost }
                : h
            )
          );
        }

        setSimulatorCashBalance((prev) => prev + totalValue);
      }

      // Add transaction
      const transaction: UserTransaction = {
        id: `sim-${Date.now()}-${Math.random()}`,
        entityId,
        entityName,
        entityTicker,
        type,
        quantity,
        pricePerToken,
        totalAmount: quantity * pricePerToken,
        timestamp: new Date().toISOString(),
        category,
      };
      setSimulatorTransactions((prev) => [transaction, ...prev]);

      return true;
    } catch (error) {
      console.error('Error executing simulator trade:', error);
      return false;
    }
  };

  const handleResetSimulator = () => {
    Alert.alert(
      'Reset Simulator',
      'Are you sure you want to reset your simulator portfolio? This will delete all trades and reset to $10,000.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setSimulatorCashBalance(SIMULATOR_STARTING_BALANCE);
            setSimulatorHoldings([]);
            setSimulatorTransactions([]);
          },
        },
      ]
    );
  };

  const handleOpenTradeModal = (entity: { id: number; ticker: string; name: string; price: number; category: string }) => {
    setSelectedEntity(entity);
    setTradeModalVisible(true);
  };

  const handleHoldingPress = (entityId: number, category: string) => {
    navigation.navigate('Entity', { entityId, categoryId: category });
  };

  const sortedHoldings = [...simulatorPortfolio.holdings].sort((a, b) => b.totalValue - a.totalValue);
  const recentTransactions = simulatorTransactions.slice(0, 20);

  // Performance comparison
  const performanceDiff = simulatorPortfolio.totalValue - SIMULATOR_STARTING_BALANCE;
  const realPerformanceDiff = realPortfolio.totalValue - SIMULATOR_STARTING_BALANCE;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      {BlurOverlay}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Paper Trading</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Practice trading without risk
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.resetButton, { backgroundColor: theme.backgroundSecondary }]}
          onPress={handleResetSimulator}
        >
          <Ionicons name="refresh" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => setRefreshing(false)}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}>
          <Ionicons name="information-circle" size={20} color={theme.primary} />
          <Text style={[styles.infoText, { color: theme.text }]}>
            This is a paper trading simulator. Trades here don't affect your real portfolio.
          </Text>
        </View>

        {/* Simulator Portfolio Value */}
        <View style={[styles.valueCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.valueLabel, { color: theme.textSecondary }]}>Simulator Portfolio</Text>
          <Text style={[styles.valueAmount, { color: theme.text }]}>
            {formatCurrency(simulatorPortfolio.totalValue)}
          </Text>
          <View style={styles.changeContainer}>
            <Text style={[styles.changeText, { color: getChangeColor(performanceDiff) }]}>
              {performanceDiff >= 0 ? '+' : ''}
              {formatCurrency(performanceDiff)}
            </Text>
            <Text style={[styles.changePercent, { color: getChangeColor(performanceDiff) }]}>
              ({((performanceDiff / SIMULATOR_STARTING_BALANCE) * 100).toFixed(2)}%)
            </Text>
          </View>
        </View>

        {/* Comparison Card */}
        <View style={[styles.comparisonCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.comparisonTitle, { color: theme.text }]}>vs Real Portfolio</Text>
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonItem}>
              <Text style={[styles.comparisonLabel, { color: theme.textSecondary }]}>Simulator</Text>
              <Text style={[styles.comparisonValue, { color: theme.text }]}>
                {formatCurrency(simulatorPortfolio.totalValue)}
              </Text>
              <Text style={[styles.comparisonChange, { color: getChangeColor(performanceDiff) }]}>
                {performanceDiff >= 0 ? '+' : ''}
                {formatCurrency(performanceDiff)}
              </Text>
            </View>
            <View style={[styles.comparisonDivider, { backgroundColor: theme.border }]} />
            <View style={styles.comparisonItem}>
              <Text style={[styles.comparisonLabel, { color: theme.textSecondary }]}>Real</Text>
              <Text style={[styles.comparisonValue, { color: theme.text }]}>
                {formatCurrency(realPortfolio.totalValue)}
              </Text>
              <Text style={[styles.comparisonChange, { color: getChangeColor(realPerformanceDiff) }]}>
                {realPerformanceDiff >= 0 ? '+' : ''}
                {formatCurrency(realPerformanceDiff)}
              </Text>
            </View>
          </View>
        </View>

        {/* Cash Balance */}
        <View style={[styles.cashCard, { backgroundColor: theme.card }]}>
          <View style={styles.cashRow}>
            <Text style={[styles.cashLabel, { color: theme.textSecondary }]}>Virtual Cash</Text>
            <Text style={[styles.cashAmount, { color: theme.text }]}>
              {formatCurrency(simulatorCashBalance)}
            </Text>
          </View>
          <View style={styles.cashRow}>
            <Text style={[styles.cashLabel, { color: theme.textSecondary }]}>Invested</Text>
            <Text style={[styles.cashAmount, { color: theme.text }]}>
              {formatCurrency(simulatorPortfolio.totalValue - simulatorCashBalance)}
            </Text>
          </View>
        </View>

        {/* Holdings List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Holdings ({simulatorHoldings.length})
            </Text>
          </View>

          {sortedHoldings.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
              <Ionicons name="pricetag-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Holdings Yet</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Start paper trading to build your simulator portfolio
              </Text>
              <TouchableOpacity
                style={[styles.browseButton, { backgroundColor: theme.primary }]}
                onPress={() => navigation.navigate('Categories' as never)}
              >
                <Text style={styles.browseButtonText}>Browse Entities</Text>
              </TouchableOpacity>
            </View>
          ) : (
            sortedHoldings.map((holding) => (
              <TouchableOpacity
                key={holding.entityId}
                style={[styles.holdingCard, { backgroundColor: theme.card }]}
                onPress={() => handleHoldingPress(holding.entityId, holding.category)}
              >
                <View style={styles.holdingHeader}>
                  <View>
                    <Text style={[styles.holdingTicker, { color: theme.text }]}>
                      {holding.entityTicker}
                    </Text>
                    <Text style={[styles.holdingName, { color: theme.textSecondary }]}>
                      {holding.entityName}
                    </Text>
                  </View>
                  <View style={styles.holdingRight}>
                    <Text style={[styles.holdingValue, { color: theme.text }]}>
                      {formatCurrency(holding.totalValue)}
                    </Text>
                    <Text
                      style={[styles.holdingPnL, { color: getChangeColor(holding.profitLoss) }]}
                    >
                      {holding.profitLoss >= 0 ? '+' : ''}
                      {formatCurrency(holding.profitLoss)} ({holding.profitLossPercent.toFixed(1)}%)
                    </Text>
                  </View>
                </View>
                <View style={[styles.holdingDetails, { borderTopColor: theme.borderLight }]}>
                  <View style={styles.holdingDetailItem}>
                    <Text style={[styles.holdingDetailLabel, { color: theme.textTertiary }]}>
                      Shares
                    </Text>
                    <Text style={[styles.holdingDetailValue, { color: theme.text }]}>
                      {holding.quantity}
                    </Text>
                  </View>
                  <View style={styles.holdingDetailItem}>
                    <Text style={[styles.holdingDetailLabel, { color: theme.textTertiary }]}>
                      Avg Cost
                    </Text>
                    <Text style={[styles.holdingDetailValue, { color: theme.text }]}>
                      {formatCurrency(holding.averageCost)}
                    </Text>
                  </View>
                  <View style={styles.holdingDetailItem}>
                    <Text style={[styles.holdingDetailLabel, { color: theme.textTertiary }]}>
                      Current
                    </Text>
                    <Text style={[styles.holdingDetailValue, { color: theme.text }]}>
                      {formatCurrency(holding.currentPrice)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Transaction History */}
        {simulatorTransactions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Recent Trades ({simulatorTransactions.length})
              </Text>
            </View>
            {recentTransactions.map((transaction) => (
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
                      <Text style={[styles.transactionTicker, { color: theme.text }]}>
                        {transaction.entityTicker}
                      </Text>
                      <Text style={[styles.transactionName, { color: theme.textSecondary }]}>
                        {transaction.entityName}
                      </Text>
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
            ))}
          </View>
        )}
      </ScrollView>

      {/* Trade Modal - Custom version for simulator */}
      {selectedEntity && (
        <Modal
          visible={tradeModalVisible}
          transparent
          animationType="none"
          onRequestClose={() => setTradeModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Paper Trade</Text>
                <TouchableOpacity onPress={() => setTradeModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                {selectedEntity.name} ({selectedEntity.ticker})
              </Text>
              <Text style={[styles.modalInfo, { color: theme.textSecondary }]}>
                This trade will only affect your simulator portfolio
              </Text>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  setTradeModalVisible(false);
                  navigation.navigate('Entity' as never, {
                    entityId: selectedEntity.id,
                    categoryId: selectedEntity.category,
                  } as never);
                }}
              >
                <Text style={styles.modalButtonText}>Go to Entity Page to Trade</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  resetButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
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
  comparisonCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  comparisonItem: {
    alignItems: 'center',
    flex: 1,
  },
  comparisonLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  comparisonChange: {
    fontSize: 14,
    fontWeight: '500',
  },
  comparisonDivider: {
    width: 1,
    marginHorizontal: 16,
  },
  cashCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
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
  section: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  browseButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  holdingCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  modalInfo: {
    fontSize: 14,
    marginBottom: 24,
  },
  modalButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

