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
import { useTheme } from '../context/ThemeContext';
import { useTrading } from '../context/TradingContext';
import { RootStackParamList } from '../types';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AccountValueScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { portfolio, transactions } = useTrading();

  // Calculate open P/L (unrealized profit/loss from current holdings)
  const openPL = useMemo(() => {
    return portfolio.holdings.reduce((sum, holding) => sum + holding.profitLoss, 0);
  }, [portfolio.holdings]);

  // Calculate realized tokens (profit/loss from closed positions)
  // This is a simplified calculation - in a real app, you'd match buy/sell pairs
  const realizedTokens = useMemo(() => {
    // For now, we'll calculate based on sell transactions
    // In a full implementation, you'd match buys and sells to calculate actual realized P/L
    let realized = 0;
    
    // Group transactions by entity to match buys and sells
    const entityTransactions: Record<number, Array<{ type: 'buy' | 'sell'; quantity: number; price: number; timestamp: string }>> = {};
    
    transactions.forEach(tx => {
      if (!entityTransactions[tx.entityId]) {
        entityTransactions[tx.entityId] = [];
      }
      entityTransactions[tx.entityId].push({
        type: tx.type,
        quantity: tx.quantity,
        price: tx.pricePerToken,
        timestamp: tx.timestamp,
      });
    });

    // Calculate realized P/L by matching buys and sells (FIFO)
    Object.keys(entityTransactions).forEach(entityIdStr => {
      const entityId = parseInt(entityIdStr);
      const txs = entityTransactions[entityId].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const buyQueue: Array<{ quantity: number; price: number }> = [];

      txs.forEach(tx => {
        if (tx.type === 'buy') {
          buyQueue.push({ quantity: tx.quantity, price: tx.price });
        } else if (tx.type === 'sell') {
          let remainingSell = tx.quantity;
          let sellPrice = tx.price;

          while (remainingSell > 0 && buyQueue.length > 0) {
            const buy = buyQueue[0];
            if (buy.quantity <= remainingSell) {
              // Entire buy is sold
              const profit = (sellPrice - buy.price) * buy.quantity;
              realized += profit;
              remainingSell -= buy.quantity;
              buyQueue.shift();
            } else {
              // Partial buy is sold
              const profit = (sellPrice - buy.price) * remainingSell;
              realized += profit;
              buy.quantity -= remainingSell;
              remainingSell = 0;
            }
          }
        }
      });
    });

    return realized;
  }, [transactions]);

  const openPLPercent = portfolio.totalValue > 0 
    ? (openPL / (portfolio.totalValue - openPL)) * 100 
    : 0;

  const realizedPercent = portfolio.totalValue > 0
    ? (realizedTokens / portfolio.totalValue) * 100
    : 0;

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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Account Value</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Total Account Value */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>Total Account Value</Text>
          <Text style={[styles.cardValue, { color: theme.text }]}>
            {formatCurrency(portfolio.totalValue)}
          </Text>
          <View style={[styles.changeRow, { marginTop: 8 }]}>
            <Text style={[styles.changeText, { color: getChangeColor(portfolio.todayChange, theme) }]}>
              {portfolio.todayChange >= 0 ? '+' : ''}{formatCurrency(portfolio.todayChange)}
            </Text>
            <Text style={[styles.changePercent, { color: getChangeColor(portfolio.todayChange, theme) }]}>
              ({portfolio.todayChangePercent >= 0 ? '+' : ''}{portfolio.todayChangePercent.toFixed(2)}%)
            </Text>
          </View>
        </View>

        {/* Open P/L */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>Open P/L</Text>
          <Text style={[styles.cardValue, { color: getChangeColor(openPL, theme) }]}>
            {openPL >= 0 ? '+' : ''}{formatCurrency(openPL)}
          </Text>
          <View style={[styles.changeRow, { marginTop: 8 }]}>
            <Text style={[styles.changePercent, { color: getChangeColor(openPL, theme) }]}>
              {openPLPercent >= 0 ? '+' : ''}{openPLPercent.toFixed(2)}%
            </Text>
          </View>
          <Text style={[styles.cardDescription, { color: theme.textTertiary }]}>
            Unrealized profit/loss from your current positions
          </Text>
        </View>

        {/* Realized Tokens */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>Realized Tokens</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('TradeHistory')}
              style={styles.seeHistoryButton}
            >
              <Text style={[styles.seeHistoryButtonText, { color: theme.primary }]}>See Trade History</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.cardValue, { color: getChangeColor(realizedTokens, theme) }]}>
            {realizedTokens >= 0 ? '+' : ''}{formatCurrency(realizedTokens)}
          </Text>
          <View style={[styles.changeRow, { marginTop: 8 }]}>
            <Text style={[styles.changePercent, { color: getChangeColor(realizedTokens, theme) }]}>
              {realizedPercent >= 0 ? '+' : ''}{realizedPercent.toFixed(2)}%
            </Text>
          </View>
          <Text style={[styles.cardDescription, { color: theme.textTertiary }]}>
            Profit/loss from closed positions
          </Text>
        </View>

        {/* Breakdown Section */}
        <View style={[styles.breakdownSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Breakdown</Text>
          
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>Cash Balance</Text>
            <Text style={[styles.breakdownValue, { color: theme.text }]}>
              {formatCurrency(portfolio.cashBalance)}
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>Holdings Value</Text>
            <Text style={[styles.breakdownValue, { color: theme.text }]}>
              {formatCurrency(portfolio.holdings.reduce((sum, h) => sum + h.totalValue, 0))}
            </Text>
          </View>

          <View style={[styles.breakdownDivider, { backgroundColor: theme.border }]} />

          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>Total Value</Text>
            <Text style={[styles.breakdownValue, { color: theme.text, fontWeight: '600' }]}>
              {formatCurrency(portfolio.totalValue)}
            </Text>
          </View>
        </View>
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
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  seeHistoryButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  seeHistoryButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  changeRow: {
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
    fontWeight: '500',
  },
  cardDescription: {
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  breakdownSection: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakdownLabel: {
    fontSize: 15,
  },
  breakdownValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  breakdownDivider: {
    height: 1,
    marginVertical: 12,
  },
});


