import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { VictoryLine, VictoryChart, VictoryAxis } from 'victory-native';
import { RootStackParamList } from '../types';
import { useTrading } from '../context/TradingContext';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { portfolio } = useTrading();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'>('1D');

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

  const periods = ['1D', '1W', '1M', '3M', '1Y', 'ALL'] as const;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Portfolio Value Header */}
        <View style={styles.portfolioHeader}>
          <View style={styles.portfolioValueContainer}>
            <Text style={styles.portfolioValue}>
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
            <VictoryChart
              width={SCREEN_WIDTH}
              height={200}
              padding={{ top: 20, bottom: 30, left: 0, right: 0 }}
            >
              <VictoryAxis
                style={{
                  axis: { stroke: 'transparent' },
                  ticks: { stroke: 'transparent' },
                  tickLabels: { fill: 'transparent' },
                  grid: { stroke: 'transparent' },
                }}
              />
              <VictoryLine
                data={chartData}
                style={{
                  data: {
                    stroke: isPositive ? '#10B981' : '#EF4444',
                    strokeWidth: 2.5,
                  },
                }}
                interpolation="natural"
              />
            </VictoryChart>
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
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="trending-up" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.actionButtonText}>Buy</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="trending-down" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.actionButtonText}>Sell</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="swap-horizontal" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.actionButtonText}>Transfer</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="card" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.actionButtonText}>Deposit</Text>
          </TouchableOpacity>
        </View>

        {/* Holdings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Holdings</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Portfolio' as never)}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {portfolio.holdings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No holdings yet</Text>
              <Text style={styles.emptyStateText}>
                Start trading to build your portfolio
              </Text>
            </View>
          ) : (
            <>
              {portfolio.holdings.map((holding) => (
                <TouchableOpacity
                  key={holding.entityId}
                  style={styles.holdingCard}
                  onPress={() => handleHoldingPress(holding.entityId, holding.category)}
                >
                  <View style={styles.holdingLeft}>
                    <View style={styles.holdingIcon}>
                      <Text style={styles.holdingIconText}>
                        {holding.entityTicker.substring(0, 2)}
                      </Text>
                    </View>
                    <View style={styles.holdingInfo}>
                      <Text style={styles.holdingTicker}>{holding.entityTicker}</Text>
                      <Text style={styles.holdingQuantity}>
                        {holding.quantity} {holding.quantity === 1 ? 'share' : 'shares'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.holdingRight}>
                    <Text style={styles.holdingValue}>
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
              ))}
            </>
          )}
        </View>

        {/* Cash Balance Card */}
        <View style={styles.section}>
          <View style={styles.cashCard}>
            <View style={styles.cashLeft}>
              <Ionicons name="wallet" size={24} color="#3B82F6" />
              <View style={styles.cashInfo}>
                <Text style={styles.cashLabel}>Buying Power</Text>
                <Text style={styles.cashValue}>{formatCurrency(portfolio.cashBalance)}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </View>
        </View>

        {/* Bottom Padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
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
});
