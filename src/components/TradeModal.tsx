import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useTrading } from '../context/TradingContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/dataGenerator';
import { isValidEntityId } from '../utils/idValidation';

const { height } = Dimensions.get('window');

interface TradeModalProps {
  visible: boolean;
  onClose: () => void;
  entityId: number;
  entityName: string;
  entityTicker: string;
  currentPrice: number;
  category: string;
  existingQuantity?: number;
}

export default function TradeModal({
  visible,
  onClose,
  entityId,
  entityName,
  entityTicker,
  currentPrice,
  category,
  existingQuantity = 0,
}: TradeModalProps) {
  const { portfolio, executeTrade, getHolding, isMarketOpen, marketStatusMessage, lastPriceUpdateTime, getEntityPrice } = useTrading();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [slideAnim] = useState(new Animated.Value(height));

  // Validate entityId
  if (!isValidEntityId(entityId)) {
    console.error('Invalid entityId in TradeModal:', entityId);
    return null;
  }

  const holding = useMemo(() => getHolding(entityId), [entityId, portfolio.holdings]);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const quantityNum = parseFloat(quantity) || 0;
  const totalCost = quantityNum * currentPrice;
  const hasSufficientFunds = totalCost <= portfolio.cashBalance;
  const hasSufficientShares = holding ? quantityNum <= holding.quantity : false;

  const canBuy = activeTab === 'buy' && quantityNum > 0 && hasSufficientFunds;
  const canSell = activeTab === 'sell' && quantityNum > 0 && hasSufficientShares;
  const isPriceStale = lastPriceUpdateTime ? (Date.now() - lastPriceUpdateTime) > 60000 : false;
  
  // Check if trade price differs significantly from current price (>2%)
  const latestPrice = getEntityPrice(entityId);
  const priceDifferencePercent = latestPrice > 0 ? Math.abs((currentPrice - latestPrice) / latestPrice) * 100 : 0;
  const isPriceSignificantlyDifferent = priceDifferencePercent > 2;
  
  const canExecute = (canBuy || canSell) && isMarketOpen;

  const handleQuantityChange = (text: string) => {
    // Only allow numbers and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setQuantity(cleaned);
  };

  const setPercentage = (percent: number) => {
    if (activeTab === 'buy') {
      const maxAffordable = portfolio.cashBalance / currentPrice;
      const qty = Math.floor((maxAffordable * percent) / 100);
      setQuantity(qty.toString());
    } else if (holding) {
      const qty = Math.floor((holding.quantity * percent) / 100);
      setQuantity(qty.toString());
    }
  };

  const handleExecuteTrade = async () => {
    if (!canExecute) return;

    if (!isMarketOpen) {
      Alert.alert('Market Closed', marketStatusMessage);
      return;
    }

    // Auto-refresh prices if they differ significantly
    if (isPriceSignificantlyDifferent && latestPrice > 0) {
      Alert.alert(
        'Price Updated',
        `The current price (${formatCurrency(latestPrice)}) differs from the displayed price. Using the latest price.`,
        [{ text: 'OK' }]
      );
      // Update the price used for the trade
      // Note: This will trigger a re-render, but we'll use latestPrice in the trade
    }

    setIsProcessing(true);

    try {
      // Validate user and entity IDs
      if (!user?.id) {
        Alert.alert('Error', 'User ID is required to execute trades.');
        return;
      }
      
      // Generate idempotency key to prevent duplicate trades
      const idempotencyKey = `${user.id}-${entityId}-${activeTab}-${quantityNum}-${Date.now()}`;

      // Use latest price if available and significantly different
      const tradePrice = (isPriceSignificantlyDifferent && latestPrice > 0) ? latestPrice : currentPrice;

      const result = await executeTrade(
        entityId,
        entityName,
        entityTicker,
        activeTab,
        quantityNum,
        tradePrice,
        category,
        idempotencyKey
      );

      if (result.success) {
        // Show success message with execution price if different
        const executionPrice = result.executionPrice || currentPrice;
        const message = result.error 
          ? `${activeTab === 'buy' ? 'Purchased' : 'Sold'} ${quantityNum} shares of ${entityTicker} at ${formatCurrency(executionPrice)}. ${result.error}`
          : `Successfully ${activeTab === 'buy' ? 'purchased' : 'sold'} ${quantityNum} shares of ${entityTicker} at ${formatCurrency(executionPrice)}`;
        
        Alert.alert(
          'Trade Executed',
          message,
          [{ text: 'OK', onPress: () => handleClose() }]
        );
      } else {
        // Show error message from server (e.g., slippage, market closed, etc.)
        Alert.alert(
          'Trade Failed',
          result.error || (activeTab === 'buy'
            ? 'Insufficient funds to complete this purchase.'
            : 'Insufficient shares to complete this sale.'),
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error executing trade:', error);
      Alert.alert(
        'Trade Failed',
        'An error occurred while executing the trade. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setQuantity('');
    setActiveTab('buy');
    onClose();
  };

  const expectedProceeds = useMemo(() => {
    if (activeTab === 'sell' && holding && quantityNum > 0) {
      const costBasis = holding.averageCost * quantityNum;
      const proceeds = currentPrice * quantityNum;
      const profitLoss = proceeds - costBasis;
      const profitLossPercent = (profitLoss / costBasis) * 100;
      return { proceeds, profitLoss, profitLossPercent };
    }
    return null;
  }, [activeTab, holding, quantityNum, currentPrice]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />

        <Animated.View
          style={[
            styles.modalContainer,
            { backgroundColor: theme.card },
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={[styles.handle, { backgroundColor: theme.textTertiary }]} />
            <View style={styles.headerContent}>
              <View>
                <Text style={[styles.entityName, { color: theme.text }]}>{entityName}</Text>
              </View>
              <View style={styles.priceContainer}>
                <Text style={[styles.price, { color: theme.text }]}>{formatCurrency(currentPrice)}</Text>
              </View>
            </View>
          </View>

          {/* Market Status & Staleness Warning */}
          {(!isMarketOpen || isPriceStale) && (
            <View style={{ marginHorizontal: 20, marginBottom: 12, padding: 8, backgroundColor: isMarketOpen ? '#FEF3C7' : '#FEE2E2', borderRadius: 8 }}>
              <Text style={{ color: isMarketOpen ? '#D97706' : '#DC2626', textAlign: 'center', fontSize: 12, fontWeight: '600' }}>
                {!isMarketOpen ? marketStatusMessage : '⚠️ Price may be outdated. Check connection.'}
              </Text>
            </View>
          )}

          {/* Buy/Sell Tabs */}
          <View style={[styles.tabs, { backgroundColor: theme.backgroundSecondary }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                { backgroundColor: activeTab === 'buy' ? theme.success : 'transparent' },
              ]}
              onPress={() => setActiveTab('buy')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'buy' ? '#FFFFFF' : theme.textSecondary }]}>
                Positive
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                { backgroundColor: activeTab === 'sell' ? theme.error : 'transparent' },
              ]}
              onPress={() => setActiveTab('sell')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'sell' ? '#FFFFFF' : theme.textSecondary }]}>
                Negative
              </Text>
            </TouchableOpacity>
          </View>

          {/* Current Position Info */}
          {holding && (
            <View style={[styles.positionInfo, { backgroundColor: theme.backgroundSecondary }]}>
              <Text style={[styles.positionLabel, { color: theme.textSecondary }]}>Your Position</Text>
              <View style={styles.positionRow}>
                <Text style={[styles.positionText, { color: theme.text }]}>Shares Owned: {holding.quantity}</Text>
                <Text style={[styles.positionText, { color: theme.text }]}>
                  Avg Cost: {formatCurrency(holding.averageCost)}
                </Text>
              </View>
            </View>
          )}

          {/* Quantity Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Quantity</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="0"
                placeholderTextColor={theme.textTertiary}
                value={quantity}
                onChangeText={handleQuantityChange}
                keyboardType="decimal-pad"
                maxLength={10}
              />
              <Text style={[styles.inputSuffix, { color: theme.textSecondary }]}>shares</Text>
            </View>

            {/* Quick Percentage Buttons */}
            <View style={styles.percentButtons}>
              {[25, 50, 75, 100].map((percent) => (
                <TouchableOpacity
                  key={percent}
                  style={[styles.percentButton, { backgroundColor: theme.backgroundTertiary }]}
                  onPress={() => setPercentage(percent)}
                >
                  <Text style={[styles.percentButtonText, { color: theme.text }]}>{percent}%</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Order Summary */}
          <View style={[styles.summary, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Price per Share</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{formatCurrency(currentPrice)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Quantity</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{quantityNum || 0}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabelBold, { color: theme.text }]}>
                {activeTab === 'buy' ? 'Total Cost' : 'Total Proceeds'}
              </Text>
              <Text style={[styles.summaryValueBold, { color: theme.text }]}>{formatCurrency(totalCost)}</Text>
            </View>

            {/* Sell - Show expected profit/loss */}
            {activeTab === 'sell' && expectedProceeds && quantityNum > 0 && (
              <View style={[styles.summaryRow, { marginTop: 8 }]}>
                <Text style={styles.summaryLabel}>Expected P&L</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color:
                        expectedProceeds.profitLoss >= 0 ? '#10B981' : '#EF4444',
                      fontWeight: '600',
                    },
                  ]}
                >
                  {expectedProceeds.profitLoss >= 0 ? '+' : ''}
                  {formatCurrency(expectedProceeds.profitLoss)} (
                  {expectedProceeds.profitLossPercent.toFixed(2)}%)
                </Text>
              </View>
            )}
          </View>

          {/* Available Balance / Shares */}
          <View style={[styles.balanceInfo, { backgroundColor: theme.backgroundSecondary }]}>
            {activeTab === 'buy' ? (
              <>
                <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Available Cash</Text>
                <Text style={[styles.balanceValue, { color: theme.text }]}>{formatCurrency(portfolio.cashBalance)}</Text>
                {!hasSufficientFunds && quantityNum > 0 && (
                  <Text style={styles.errorText}>Insufficient funds</Text>
                )}
              </>
            ) : (
              <>
                <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Shares Available to Sell</Text>
                <Text style={[styles.balanceValue, { color: theme.text }]}>{holding?.quantity || 0}</Text>
                {!hasSufficientShares && quantityNum > 0 && (
                  <Text style={styles.errorText}>Insufficient shares</Text>
                )}
              </>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.backgroundTertiary }]}
              onPress={handleClose}
            >
              <Text style={[styles.buttonTextSecondary, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: activeTab === 'buy' ? theme.success : theme.error },
                !canExecute && { opacity: 0.5 },
              ]}
              onPress={handleExecuteTrade}
              disabled={!canExecute || isProcessing}
            >
              <Text style={styles.buttonTextPrimary}>
                {isProcessing ? 'Processing...' : (!isMarketOpen ? 'Market Closed' : 'Confirm')}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.9,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entityName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActiveBuy: {
    backgroundColor: '#10B981',
  },
  tabActiveSell: {
    backgroundColor: '#EF4444',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  positionInfo: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  positionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  positionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  positionText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  inputSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    paddingVertical: 16,
  },
  inputSuffix: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 8,
  },
  percentButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  percentButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  percentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  summary: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  summaryLabelBold: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  summaryValueBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  balanceInfo: {
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#F3F4F6',
  },
  buttonBuy: {
    backgroundColor: '#10B981',
  },
  buttonSell: {
    backgroundColor: '#EF4444',
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  buttonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

