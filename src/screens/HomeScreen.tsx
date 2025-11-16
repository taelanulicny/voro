import React, { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { RootStackParamList, Entity } from '../types';
import { useTrading } from '../context/TradingContext';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';
import { getEntityById, getAllEntities, MOCK_ENTITIES } from '../utils/mockEntities';
import TradeModal from '../components/TradeModal';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Generate entity list with price changes
const generateEntityList = () => {
  return MOCK_ENTITIES.map((entity) => {
    const change = (Math.random() - 0.5) * 15;
    const changePercent = (change / entity.basePrice) * 100;
    return {
      id: entity.id,
      ticker: entity.ticker,
      name: entity.name,
      type: 'stock' as const,
      currentPrice: entity.basePrice + change,
      change24h: change,
      changePercent24h: changePercent,
      volume24h: Math.floor(Math.random() * 50000000) + 5000000,
      marketCap: Math.floor(Math.random() * 10000000000) + 1000000000,
      description: entity.description,
      category: entity.category,
    };
  });
};

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { portfolio } = useTrading();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'>('1D');
  const [entities] = useState(() => generateEntityList());
  
  // Trade modal states
  const [tradeModalVisible, setTradeModalVisible] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{
    id: number;
    ticker: string;
    name: string;
    price: number;
    category: string;
  } | null>(null);
  
  // Selection modal
  const [showSellSelectionModal, setShowSellSelectionModal] = useState(false);
  
  // Other modal states
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);

  // Generate mock chart data for portfolio trend
  const generateChartData = () => {
    const points = 30;
    const baseValue = portfolio.totalValue;
    const volatility = baseValue * 0.02; // 2% volatility
    
    return Array.from({ length: points }, (_, i) => {
      const variation = (Math.random() - 0.5) * volatility;
      const trendValue = (portfolio.todayChange / points) * i; // Gradual trend
      return {
        x: i,
        y: baseValue - (portfolio.todayChange * 0.5) + trendValue + variation,
      };
    });
  };

  const chartData = generateChartData();
  const isPositive = portfolio.todayChange >= 0;

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleHoldingPress = (entityId: number, category: string) => {
    navigation.navigate('Entity', { entityId, categoryId: category });
  };

  const handleBuyPress = () => {
    navigation.navigate('BuyScreen');
  };

  const handleSellPress = () => {
    if (portfolio.holdings.length > 0) {
      setShowSellSelectionModal(true);
    } else {
      Alert.alert('No Holdings', 'You don\'t have any positions to sell');
    }
  };

  const handleSelectHoldingToSell = (holding: any) => {
    setShowSellSelectionModal(false);
    const entity = getEntityById(holding.entityId);
    setSelectedEntity({
      id: holding.entityId,
      ticker: entity?.ticker || holding.entityTicker,
      name: entity?.name || holding.entityName,
      price: holding.currentPrice,
      category: holding.category,
    });
    setTradeModalVisible(true);
  };

  const topGainers = [...entities]
    .filter((e) => e.changePercent24h > 0)
    .sort((a, b) => b.changePercent24h - a.changePercent24h)
    .slice(0, 3);

  const topLosers = [...entities]
    .filter((e) => e.changePercent24h < 0)
    .sort((a, b) => a.changePercent24h - b.changePercent24h)
    .slice(0, 3);

  const periods = ['1D', '1W', '1M', '3M', '1Y', 'ALL'] as const;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Portfolio Value Header */}
        <View style={[styles.portfolioHeader, { backgroundColor: theme.card }]}>
          <View style={styles.portfolioValueContainer}>
            <Text style={[styles.portfolioValue, { color: theme.text }]}>
              {formatCurrency(portfolio.totalValue)}
            </Text>
            <View style={styles.changeContainer}>
              <Ionicons
                name={isPositive ? 'trending-up' : 'trending-down'}
                size={16}
                color={isPositive ? '#10B981' : '#EF4444'}
              />
              <Text style={[styles.changeText, { color: isPositive ? '#10B981' : '#EF4444' }]}>
                {formatCurrency(Math.abs(portfolio.todayChange))} ({Math.abs(portfolio.todayChangePercent).toFixed(2)}%)
              </Text>
              <Text style={styles.changePeriod}>Today</Text>
            </View>
          </View>

          {/* Portfolio Trend Chart */}
          <View style={styles.chartContainer}>
            <LineChart
              data={{
                labels: [],
                datasets: [{ data: chartData.map(d => d.y) }],
              }}
              width={SCREEN_WIDTH}
              height={200}
              withDots={false}
              withInnerLines={false}
              withOuterLines={false}
              withVerticalLabels={false}
              withHorizontalLabels={false}
              chartConfig={{
                backgroundColor: '#FFFFFF',
                backgroundGradientFrom: '#FFFFFF',
                backgroundGradientTo: '#FFFFFF',
                decimalPlaces: 0,
                color: (opacity = 1) => isPositive 
                  ? `rgba(16, 185, 129, ${opacity})` 
                  : `rgba(239, 68, 68, ${opacity})`,
                style: { borderRadius: 0 },
                propsForBackgroundLines: { strokeWidth: 0 },
              }}
              bezier
              style={{ marginLeft: -16 }}
            />
          </View>

          {/* Time Period Selector */}
          <View style={styles.periodSelector}>
            {periods.map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === period && styles.periodButtonTextActive,
                  ]}
                >
                  {period}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={[styles.quickActions, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleBuyPress}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="trending-up" size={20} color={theme.primary} />
            </View>
            <Text style={[styles.actionButtonText, { color: theme.textSecondary }]}>Buy</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleSellPress}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="trending-down" size={20} color={theme.primary} />
            </View>
            <Text style={[styles.actionButtonText, { color: theme.textSecondary }]}>Sell</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowTransferModal(true)}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="swap-horizontal" size={20} color={theme.primary} />
            </View>
            <Text style={[styles.actionButtonText, { color: theme.textSecondary }]}>Transfer</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowDepositModal(true)}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="card" size={20} color={theme.primary} />
            </View>
            <Text style={[styles.actionButtonText, { color: theme.textSecondary }]}>Deposit</Text>
          </TouchableOpacity>
        </View>

        {/* Top Gainers Section */}
        {topGainers.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>📈 Top Gainers</Text>
            </View>
            {topGainers.map((entity) => (
              <TouchableOpacity
                key={entity.id}
                style={[styles.miniCard, { backgroundColor: theme.backgroundSecondary }]}
                onPress={() => handleHoldingPress(entity.id, entity.category)}
              >
                <View style={styles.miniCardLeft}>
                  <Text style={[styles.miniTicker, { color: theme.text }]}>{entity.ticker}</Text>
                  <Text style={[styles.miniName, { color: theme.textSecondary }]}>{entity.name}</Text>
                </View>
                <View style={styles.miniCardRight}>
                  <Text style={[styles.miniPrice, { color: theme.text }]}>{formatCurrency(entity.currentPrice)}</Text>
                  <Text style={[styles.miniChange, { color: '#10B981' }]}>
                    +{entity.changePercent24h.toFixed(2)}%
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Top Losers Section */}
        {topLosers.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>📉 Top Losers</Text>
            </View>
            {topLosers.map((entity) => (
              <TouchableOpacity
                key={entity.id}
                style={[styles.miniCard, { backgroundColor: theme.backgroundSecondary }]}
                onPress={() => handleHoldingPress(entity.id, entity.category)}
              >
                <View style={styles.miniCardLeft}>
                  <Text style={[styles.miniTicker, { color: theme.text }]}>{entity.ticker}</Text>
                  <Text style={[styles.miniName, { color: theme.textSecondary }]}>{entity.name}</Text>
                </View>
                <View style={styles.miniCardRight}>
                  <Text style={[styles.miniPrice, { color: theme.text }]}>{formatCurrency(entity.currentPrice)}</Text>
                  <Text style={[styles.miniChange, { color: '#EF4444' }]}>
                    {entity.changePercent24h.toFixed(2)}%
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Holdings Section */}
        <View style={[styles.section, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Holdings</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Portfolio' as never)}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {portfolio.holdings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No holdings yet</Text>
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                Start trading to build your portfolio
              </Text>
            </View>
          ) : (
            <>
              {portfolio.holdings.map((holding) => {
                const entity = getEntityById(holding.entityId);
                const displayTicker = entity?.ticker || holding.entityTicker;
                const displayName = entity?.name || holding.entityName;
                
                return (
                  <TouchableOpacity
                    key={holding.entityId}
                    style={[styles.holdingCard, { borderBottomColor: theme.borderLight }]}
                    onPress={() => handleHoldingPress(holding.entityId, holding.category)}
                  >
                    <View style={styles.holdingLeft}>
                      <View style={[styles.holdingIcon, { backgroundColor: theme.primaryLight }]}>
                        <Text style={[styles.holdingIconText, { color: theme.primary }]}>
                          {displayTicker.substring(0, 2)}
                        </Text>
                      </View>
                      <View style={styles.holdingInfo}>
                        <Text style={[styles.holdingTicker, { color: theme.text }]}>{displayTicker}</Text>
                        <Text style={[styles.holdingQuantity, { color: theme.textSecondary }]}>
                          {holding.quantity} {holding.quantity === 1 ? 'share' : 'shares'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.holdingRight}>
                      <Text style={[styles.holdingValue, { color: theme.text }]}>
                        {formatCurrency(holding.totalValue)}
                      </Text>
                      <View style={styles.holdingChangeRow}>
                        <Text
                          style={[
                            styles.holdingChange,
                            { color: getChangeColor(holding.profitLoss) },
                          ]}
                        >
                          {holding.profitLoss >= 0 ? '+' : ''}
                          {formatCurrency(holding.profitLoss)}
                        </Text>
                        <Text
                          style={[
                            styles.holdingChangePercent,
                            { color: getChangeColor(holding.profitLoss) },
                          ]}
                        >
                          ({holding.profitLossPercent >= 0 ? '+' : ''}
                          {holding.profitLossPercent.toFixed(2)}%)
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );

              })}
            </>
          )}
        </View>

        {/* Cash Balance Card */}
        <View style={[styles.section, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
          <View style={[styles.cashCard, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={styles.cashLeft}>
              <Ionicons name="wallet" size={24} color={theme.primary} />
              <View style={styles.cashInfo}>
                <Text style={[styles.cashLabel, { color: theme.textSecondary }]}>Buying Power</Text>
                <Text style={[styles.cashValue, { color: theme.text }]}>{formatCurrency(portfolio.cashBalance)}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </View>
        </View>

        {/* Bottom Padding */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Sell Selection Modal */}
      <Modal
        visible={showSellSelectionModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSellSelectionModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Position to Sell</Text>
            <View style={{ width: 60 }} />
          </View>

          <FlatList
            data={portfolio.holdings}
            keyExtractor={(item) => item.entityId.toString()}
            renderItem={({ item }) => {
              const entity = getEntityById(item.entityId);
              return (
                <TouchableOpacity
                  style={styles.selectionItem}
                  onPress={() => handleSelectHoldingToSell(item)}
                >
                  <View style={styles.selectionLeft}>
                    <View style={styles.selectionIcon}>
                      <Text style={styles.selectionIconText}>
                        {(entity?.ticker || item.entityTicker).substring(0, 2)}
                      </Text>
                    </View>
                    <View style={styles.selectionInfo}>
                      <Text style={styles.selectionTicker}>
                        {entity?.ticker || item.entityTicker}
                      </Text>
                      <Text style={styles.selectionName}>
                        {item.quantity} {item.quantity === 1 ? 'share' : 'shares'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.selectionRight}>
                    <Text style={styles.selectionPrice}>{formatCurrency(item.totalValue)}</Text>
                    <Text style={[
                      styles.selectionChange,
                      { color: getChangeColor(item.profitLoss) }
                    ]}>
                      {item.profitLoss >= 0 ? '+' : ''}{formatCurrency(item.profitLoss)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </Modal>

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

      {/* Transfer Modal */}
      <TransferModal
        visible={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        cashBalance={portfolio.cashBalance}
      />

      {/* Deposit Modal */}
      <DepositModal
        visible={showDepositModal}
        onClose={() => setShowDepositModal(false)}
      />
    </SafeAreaView>
  );
}

// Transfer Modal Component
function TransferModal({ visible, onClose, cashBalance }: {
  visible: boolean;
  onClose: () => void;
  cashBalance: number;
}) {
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');

  const handleTransfer = () => {
    if (!amount || !recipient) {
      Alert.alert('Error', 'Please enter both amount and recipient');
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (transferAmount > cashBalance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    Alert.alert(
      'Transfer Confirmed',
      `Transfer ${formatCurrency(transferAmount)} to @${recipient}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            Alert.alert('Success', 'Transfer completed!');
            setAmount('');
            setRecipient('');
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Transfer Funds</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
          <View style={styles.balanceDisplay}>
            <Text style={styles.balanceDisplayLabel}>Available Balance</Text>
            <Text style={styles.balanceDisplayValue}>{formatCurrency(cashBalance)}</Text>
          </View>

          <Text style={styles.inputLabel}>Recipient Username</Text>
          <TextInput
            style={styles.textInput}
            placeholder="@username"
            placeholderTextColor="#9CA3AF"
            value={recipient}
            onChangeText={setRecipient}
            autoCapitalize="none"
          />

          <Text style={styles.inputLabel}>Amount</Text>
          <TextInput
            style={styles.textInput}
            placeholder="0.00"
            placeholderTextColor="#9CA3AF"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />

          <TouchableOpacity
            style={[
              styles.modalButton,
              (!amount || !recipient) && styles.modalButtonDisabled,
            ]}
            onPress={handleTransfer}
            disabled={!amount || !recipient}
          >
            <Text style={styles.modalButtonText}>Transfer</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// Deposit Modal Component
function DepositModal({ visible, onClose }: {
  visible: boolean;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState('');

  const handleDeposit = () => {
    if (!amount) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    Alert.alert(
      'Deposit',
      `This is a demo app. In production, this would connect to a payment processor to deposit ${formatCurrency(depositAmount)}.`,
      [
        {
          text: 'OK',
          onPress: () => {
            setAmount('');
            onClose();
          },
        },
      ]
    );
  };

  const quickAmounts = [100, 500, 1000, 5000];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Deposit Funds</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.inputLabel}>Amount</Text>
          <TextInput
            style={styles.textInput}
            placeholder="0.00"
            placeholderTextColor="#9CA3AF"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />

          <Text style={styles.quickAmountsLabel}>Quick Amounts</Text>
          <View style={styles.quickAmountsContainer}>
            {quickAmounts.map((quickAmount) => (
              <TouchableOpacity
                key={quickAmount}
                style={styles.quickAmountButton}
                onPress={() => setAmount(quickAmount.toString())}
              >
                <Text style={styles.quickAmountText}>{formatCurrency(quickAmount)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
            <Text style={styles.infoText}>
              This is a demo app using virtual tokens. No real money is involved.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.modalButton,
              !amount && styles.modalButtonDisabled,
            ]}
            onPress={handleDeposit}
            disabled={!amount}
          >
            <Text style={styles.modalButtonText}>Continue to Payment</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  portfolioHeader: {
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
    paddingBottom: 16,
  },
  portfolioValueContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  portfolioValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#111827',
    letterSpacing: -0.5,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  changeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  changePeriod: {
    fontSize: 16,
    color: '#6B7280',
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: -10,
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  periodButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  periodButtonActive: {
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
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
  miniCardLeft: {
    flex: 1,
  },
  miniTicker: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  miniName: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
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
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
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
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  balanceDisplayLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  balanceDisplayValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  modalButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  modalButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  quickAmountsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
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
    backgroundColor: '#EFF6FF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
  },
  quickAmountText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3B82F6',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#1E40AF',
  },
});
