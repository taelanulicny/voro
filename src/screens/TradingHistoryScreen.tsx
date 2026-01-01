import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTrading } from '../context/TradingContext';
import { useTheme } from '../context/ThemeContext';
import { UserTransaction } from '../types';
import { formatCurrency } from '../utils/dataGenerator';

export default function TradingHistoryScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { transactions } = useTrading();

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };


  const renderTransaction = ({ item }: { item: UserTransaction }) => {
    const isBuy = item.type === 'buy';
    const iconName = isBuy ? 'arrow-down-circle' : 'arrow-up-circle';
    const iconColor = isBuy ? '#10B981' : '#EF4444';

    return (
      <View style={[styles.transactionItem, { backgroundColor: theme.card, borderBottomColor: theme.borderLight }]}>
        <View style={styles.transactionLeft}>
          <View style={[styles.iconContainer, { backgroundColor: isBuy ? '#D1FAE5' : '#FEE2E2' }]}>
            <Ionicons name={iconName} size={24} color={iconColor} />
          </View>
          <View style={styles.transactionInfo}>
            <Text style={[styles.transactionType, { color: theme.text }]}>
              {isBuy ? 'Bought' : 'Sold'} {item.quantity} {item.ticker}
            </Text>
            <Text style={[styles.transactionDate, { color: theme.textSecondary }]}>
              {formatDate(item.timestamp)}
            </Text>
          </View>
        </View>
        <View style={styles.transactionRight}>
          <Text style={[styles.transactionAmount, { color: theme.text }]}>
            {formatCurrency(item.totalAmount)}
          </Text>
          <Text style={[styles.transactionPrice, { color: theme.textSecondary }]}>
            @ {formatCurrency(item.pricePerToken)}
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Trading History</Text>
        <View style={{ width: 40 }} />
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No Transactions</Text>
          <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
            Your trading history will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
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
    paddingVertical: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 13,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionPrice: {
    fontSize: 13,
  },
});

