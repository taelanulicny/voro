import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useTrading } from '../context/TradingContext';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';

interface PortfolioSummaryProps {
  onPress?: () => void;
}

export default React.memo(function PortfolioSummary({ onPress }: PortfolioSummaryProps) {
  const { theme } = useTheme();
  const { portfolio } = useTrading();

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.content}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Portfolio Value</Text>
        <Text style={[styles.value, { color: theme.text }]}>
          {formatCurrency(portfolio.totalValue)}
        </Text>
        <View style={styles.changeRow}>
          <Text style={[styles.changeText, { color: getChangeColor(portfolio.todayChange) }]}>
            {portfolio.todayChange >= 0 ? '+' : ''}
            {formatCurrency(portfolio.todayChange)}
          </Text>
          <Text style={[styles.changePercent, { color: getChangeColor(portfolio.todayChange) }]}>
            ({portfolio.todayChangePercent >= 0 ? '+' : ''}
            {portfolio.todayChangePercent.toFixed(2)}%)
          </Text>
        </View>
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownItem}>
            <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>Cash</Text>
            <Text style={[styles.breakdownValue, { color: theme.text }]}>
              {formatCurrency(portfolio.cashBalance)}
            </Text>
          </View>
          <View style={[styles.breakdownDivider, { backgroundColor: theme.border }]} />
          <View style={styles.breakdownItem}>
            <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>Holdings</Text>
            <Text style={[styles.breakdownValue, { color: theme.text }]}>
              {formatCurrency(portfolio.holdings.reduce((sum, h) => sum + h.totalValue, 0))}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 8,
  },
  content: {
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  value: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    gap: 16,
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  breakdownDivider: {
    width: 1,
    height: 24,
  },
});



