import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  PanResponder,
} from 'react-native';
import { useTrading } from '../context/TradingContext';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/dataGenerator';

const { height } = Dimensions.get('window');

interface TradeModalProps {
  visible: boolean;
  onClose: () => void;
  entityId: number;
  entityName: string;
  category: string;
}

export default function TradeModal({
  visible,
  onClose,
  entityId,
  entityName,
  category,
}: TradeModalProps) {
  const { portfolio, openPosition, executeTrade, getPosition, getEntityPrice, getPositionOpenPnL, getAllEntityPrices } = useTrading();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'open' | 'close'>('open');
  const [direction, setDirection] = useState<'positive' | 'negative'>('positive');
  const [tokensCommitted, setTokensCommitted] = useState('');
  const [tokensToSell, setTokensToSell] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [slideAnim] = useState(new Animated.Value(height));

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          handleClose();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
    })
  ).current;

  const existingPosition = getPosition(entityId);
  const currentPrice = getEntityPrice(entityId);
  
  // Calculate open P&L for the position (only when on close tab)
  // This recalculates on every render, so it will update when prices change
  const openPnL = activeTab === 'close' && existingPosition ? getPositionOpenPnL(entityId) : 0;

  // Reset modal state when it opens/closes
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
      // If there's an existing position, default to open tab (Add to position), otherwise open tab
      const position = getPosition(entityId);
      if (position) {
        setActiveTab('open');
        // Auto-select the direction of existing position when adding
        setDirection(position.direction);
      } else {
        setActiveTab('open');
        setDirection('positive');
      }
      setTokensCommitted('');
      setTokensToSell('');
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start();
      // Reset when closing
      setTokensCommitted('');
      setTokensToSell('');
      setActiveTab('open');
      setDirection('positive');
    }
  }, [visible, entityId]);

  const tokensCommittedNum = parseFloat(tokensCommitted) || 0;
  const tokensToSellNum = parseFloat(tokensToSell) || 0;
  const hasSufficientFunds = tokensCommittedNum <= portfolio.cashBalance;
  const hasSufficientTokens = existingPosition ? tokensToSellNum <= existingPosition.tokensCommitted : false;
  const isSellingAll = existingPosition ? tokensToSellNum === existingPosition.tokensCommitted : false;

  const canOpen = activeTab === 'open' && tokensCommittedNum > 0 && hasSufficientFunds;
  const canAdd = activeTab === 'open' && existingPosition && tokensCommittedNum > 0 && hasSufficientFunds && existingPosition.direction === direction;
  const canClose = activeTab === 'close' && existingPosition !== null && tokensToSellNum > 0 && hasSufficientTokens;
  const canExecute = canOpen || canAdd || canClose;

  const handleTokensChange = (text: string) => {
    // Only allow numbers and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setTokensCommitted(cleaned);
  };

  const handleTokensToSellChange = (text: string) => {
    // Only allow numbers and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setTokensToSell(cleaned);
  };

  const setPercentage = (percent: number) => {
    if (activeTab === 'open') {
      const maxAffordable = portfolio.cashBalance;
      const tokens = Math.floor((maxAffordable * percent) / 100);
      setTokensCommitted(tokens.toString());
    } else if (existingPosition) {
      // For close tab, set percentage of current position
      const tokens = percent === 100
        ? existingPosition.tokensCommitted // Use exact value for 100%
        : Math.floor((existingPosition.tokensCommitted * percent) / 100);
      setTokensToSell(tokens.toString());
    }
  };

  const handleExecuteTrade = async () => {
    if (!canExecute) return;

    setIsProcessing(true);

    try {
      let success = false;
      if (activeTab === 'open') {
        success = await openPosition(
          entityId,
          entityName,
          direction,
          tokensCommittedNum,
          category
        );
      } else { // activeTab === 'close'
        // Use executeTrade directly for partial or full close
        success = await executeTrade(
          entityId,
          entityName,
          'close',
          existingPosition!.direction,
          tokensToSellNum,
          category
        );
      }

      setIsProcessing(false);

      if (success) {
        let message = '';
        if (activeTab === 'open') {
          if (existingPosition) {
            message = `Successfully added ${tokensCommittedNum} tokens to your ${direction} position on ${entityName}. New total: ${existingPosition.tokensCommitted + tokensCommittedNum} tokens.`;
          } else {
            message = `Successfully opened ${direction} position with ${tokensCommittedNum} tokens on ${entityName}`;
          }
        } else {
          if (isSellingAll) {
            message = `Successfully closed your ${existingPosition?.direction} position on ${entityName}`;
          } else {
            const remaining = existingPosition!.tokensCommitted - tokensToSellNum;
            message = `Successfully sold ${tokensToSellNum} tokens from your ${existingPosition?.direction} position on ${entityName}. Remaining: ${remaining} tokens.`;
          }
        }

        Alert.alert(
          'Trade Executed',
          message,
          [{ text: 'OK', onPress: () => handleClose() }]
        );
      } else {
        // Error message shown by executeTrade function
        // No need to show generic error here
      }
    } catch (error) {
      console.error('Error executing trade:', error);
      // Error is shown via TradingContext tradeError modal (TradeErrorModal)
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setTokensCommitted('');
    setTokensToSell('');
    setActiveTab('open');
    setDirection('positive');
    onClose();
  };


  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
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
          {/* Header: name at top, price below */}
          <View style={[styles.header, { borderBottomColor: theme.border }]} {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: theme.textTertiary }]} />
            <View style={styles.headerContent}>
              <Text style={[styles.entityName, { color: theme.text }]}>{entityName}</Text>
              <Text style={[styles.price, { color: theme.textSecondary }]}>{formatCurrency(currentPrice)}</Text>
            </View>
          </View>

            {/* Open/Close Tabs */}
          <View style={[styles.tabs, { backgroundColor: theme.backgroundSecondary }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                  { backgroundColor: activeTab === 'open' ? theme.backgroundTertiary : 'transparent' },
              ]}
                onPress={() => {
                  setActiveTab('open');
                  if (existingPosition) {
                    // Auto-select the direction of existing position when switching to open tab
                    setDirection(existingPosition.direction);
                  }
                }}
              >
                <Text style={[styles.tabText, { color: activeTab === 'open' ? theme.text : theme.textSecondary }]}>
                  {existingPosition ? 'Add' : 'Open'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  { backgroundColor: activeTab === 'close' ? theme.backgroundTertiary : 'transparent' },
                  !existingPosition && { opacity: 0.5 },
                ]}
                onPress={() => existingPosition && setActiveTab('close')}
                disabled={!existingPosition}
            >
                <Text style={[styles.tabText, { color: activeTab === 'close' ? theme.text : theme.textSecondary }]}>
                  Sell
                </Text>
              </TouchableOpacity>
            </View>

          {/* Direction Selection (only for Open when no existing position, or disabled when adding) */}
          {activeTab === 'open' && (
            <View style={[styles.directionTabs, { backgroundColor: theme.backgroundSecondary }]}>
              <TouchableOpacity
                style={[
                  styles.directionTab,
                  { backgroundColor: direction === 'positive' ? theme.success : 'transparent' },
                  existingPosition && existingPosition.direction !== 'positive' && { opacity: 0.5 },
                ]}
                onPress={() => {
                  if (!existingPosition || existingPosition.direction === 'positive') {
                    setDirection('positive');
                  }
                }}
                disabled={existingPosition && existingPosition.direction !== 'positive'}
              >
                <Text style={[styles.directionTabText, { color: direction === 'positive' ? '#FFFFFF' : theme.textSecondary }]}>
                Positive
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                  styles.directionTab,
                  { backgroundColor: direction === 'negative' ? theme.error : 'transparent' },
                  existingPosition && existingPosition.direction !== 'negative' && { opacity: 0.5 },
              ]}
                onPress={() => {
                  if (!existingPosition || existingPosition.direction === 'negative') {
                    setDirection('negative');
                  }
                }}
                disabled={existingPosition && existingPosition.direction !== 'negative'}
            >
                <Text style={[styles.directionTabText, { color: direction === 'negative' ? '#FFFFFF' : theme.textSecondary }]}>
                Negative
              </Text>
            </TouchableOpacity>
          </View>
          )}

          {/* Current Position Info */}
          {existingPosition && (
            <View style={[styles.positionInfo, { backgroundColor: theme.backgroundSecondary }]}>
              <Text style={[styles.positionLabel, { color: theme.textSecondary }]}>
                {activeTab === 'open' ? 'Your Current Position' : 'Your Open Position'}
              </Text>
              <View style={styles.positionRow}>
                <Text style={[styles.positionText, { color: theme.text }]}>
                  Direction: {existingPosition.direction === 'positive' ? 'Positive' : 'Negative'}
                </Text>
                <Text style={[styles.positionText, { color: theme.text }]}>
                  Tokens: {existingPosition.tokensCommitted}
                </Text>
              </View>
              {activeTab === 'open' && tokensCommittedNum > 0 && (
                <View style={[styles.positionRow, { marginTop: 8 }]}>
                  <Text style={[styles.positionText, { color: theme.textSecondary }]}>
                    After adding: {existingPosition.tokensCommitted + tokensCommittedNum} tokens total
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Tokens Input (only for Open) */}
          {activeTab === 'open' && (
          <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                {existingPosition ? 'Tokens to Add' : 'Tokens to Commit'}
              </Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="0"
                placeholderTextColor={theme.textTertiary}
                  value={tokensCommitted}
                  onChangeText={handleTokensChange}
                keyboardType="decimal-pad"
                maxLength={10}
              />
                <Text style={[styles.inputSuffix, { color: theme.textSecondary }]}>tokens</Text>
            </View>

            {/* Quick Percentage Buttons */}
              {activeTab === 'open' && (
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
              )}
          </View>
          )}

          {/* Order Summary */}
          {activeTab === 'open' && (
          <View style={[styles.summary, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Current Price</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{formatCurrency(currentPrice)}</Text>
            </View>
            <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Direction</Text>
                <Text style={[styles.summaryValue, { color: direction === 'positive' ? '#10B981' : '#EF4444' }]}>
                  {direction === 'positive' ? 'Positive' : 'Negative'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Tokens to Commit</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>{tokensCommittedNum || 0}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
            <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabelBold, { color: theme.text }]}>Total Cost</Text>
                <Text style={[styles.summaryValueBold, { color: theme.text }]}>{formatCurrency(tokensCommittedNum)}</Text>
              </View>
            </View>
          )}

          {/* Tokens to Sell Input (only for Close) */}
          {activeTab === 'close' && existingPosition && (
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Tokens to Sell</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="0"
                  placeholderTextColor={theme.textTertiary}
                  value={tokensToSell}
                  onChangeText={handleTokensToSellChange}
                  keyboardType="decimal-pad"
                  maxLength={10}
                />
                <Text style={[styles.inputSuffix, { color: theme.textSecondary }]}>tokens</Text>
              </View>

              {/* Quick Percentage Buttons */}
              <View style={styles.percentButtons}>
                {[25, 50, 75, 100].map((percent) => (
                  <TouchableOpacity
                    key={percent}
                    style={[styles.percentButton, { backgroundColor: theme.backgroundTertiary }]}
                    onPress={() => setPercentage(percent)}
                  >
                    <Text style={[styles.percentButtonText, { color: theme.text }]}>
                      {percent === 100 ? 'All' : `${percent}%`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Close Summary */}
          {activeTab === 'close' && existingPosition && (
            <View style={[styles.summary, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Position Direction</Text>
                <Text style={[styles.summaryValue, { color: existingPosition.direction === 'positive' ? '#10B981' : '#EF4444' }]}>
                  {existingPosition.direction === 'positive' ? 'Positive' : 'Negative'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Your Position</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>{existingPosition.tokensCommitted} tokens</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Tokens to Sell</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>{tokensToSellNum || 0} tokens</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Current Price</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>{formatCurrency(currentPrice)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Open P&L (full position)</Text>
                <Text style={[styles.summaryValue, { color: openPnL >= 0 ? '#10B981' : '#EF4444' }]}>
                  {openPnL >= 0 ? '+' : ''}{formatCurrency(openPnL)}
                </Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabelBold, { color: theme.text }]}>After Selling</Text>
                <Text style={[styles.summaryValueBold, { color: theme.text }]}>
                  {isSellingAll ? 'Position closed' : `${existingPosition.tokensCommitted - tokensToSellNum} tokens remaining`}
                </Text>
              </View>
              {!hasSufficientTokens && tokensToSellNum > 0 && (
                <Text style={[styles.errorText, { color: theme.error, marginTop: 8 }]}>
                  Cannot sell more tokens than you own
                </Text>
              )}
            </View>
          )}

          {/* Available Balance / Position Info */}
          <View style={[styles.balanceInfo, { backgroundColor: theme.backgroundSecondary }]}>
            {activeTab === 'open' ? (
              <>
                <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Available Cash</Text>
                <Text style={[styles.balanceValue, { color: theme.text }]}>{formatCurrency(portfolio.cashBalance)}</Text>
                {!hasSufficientFunds && tokensCommittedNum > 0 && (
                  <Text style={[styles.errorText, { color: theme.error }]}>
                    You don't have enough cash for this amount
                  </Text>
                )}
                {existingPosition && existingPosition.direction !== direction && (
                  <Text style={[styles.errorText, { color: theme.warning }]}>
                    You have a {existingPosition.direction} position. Add to it or close it first.
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Available to Sell</Text>
                <Text style={[styles.balanceValue, { color: theme.text }]}>
                  {existingPosition ? `${existingPosition.tokensCommitted} tokens` : 'No position'}
                </Text>
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
                { backgroundColor: activeTab === 'open' ? theme.success : theme.error },
                !canExecute && { opacity: 0.5 },
              ]}
              onPress={handleExecuteTrade}
              disabled={!canExecute || isProcessing}
            >
              <Text style={styles.buttonTextPrimary}>
                {isProcessing
                  ? 'Processing...'
                  : activeTab === 'open'
                    ? (existingPosition ? 'Add to Position' : 'Open Position')
                    : (isSellingAll ? 'Close Position' : 'Sell Tokens')}
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
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  entityName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
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
  directionTabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  directionTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  directionTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
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
  summaryNote: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
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

