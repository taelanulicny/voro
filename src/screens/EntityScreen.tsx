import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LineChart } from 'react-native-chart-kit';
import { RootStackParamList, PriceDataPoint } from '../types';
import { useTrading } from '../context/TradingContext';
import { useNews } from '../context/NewsContext';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';
import { getEntityById } from '../utils/mockEntities';
import TradeModal from '../components/TradeModal';
import NewsCard from '../components/NewsCard';

type EntityScreenRouteProp = RouteProp<RootStackParamList, 'Entity'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

const chartConfig = {
  backgroundColor: '#FFFFFF',
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#FFFFFF',
  decimalPlaces: 2,
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '0',
  },
};

// Mock data generator for entity details
const generateMockEntityData = (entityId: number, categoryId: string) => {
  // Get entity from centralized data
  const entityData = getEntityById(entityId);
  
  // Fallback if entity not found
  if (!entityData) {
    const basePrice = 100 + entityId * 10;
    const change = (Math.random() - 0.5) * 10;
    const changePercent = (change / basePrice) * 100;

    const priceHistory: PriceDataPoint[] = [];
    let price = basePrice - change;
    const now = Date.now();

    for (let i = 30; i >= 0; i--) {
      const variance = (Math.random() - 0.5) * 5;
      price = Math.max(price + variance, basePrice * 0.8);
      priceHistory.push({
        timestamp: now - i * 24 * 60 * 60 * 1000,
        price,
        volume: Math.floor(Math.random() * 10000000) + 1000000,
      });
    }

    priceHistory[priceHistory.length - 1].price = basePrice;

    return {
      entity: {
        id: entityId,
        ticker: `ENTITY${entityId}`,
        name: `Entity ${entityId}`,
        type: 'stock' as const,
        currentPrice: basePrice,
        change24h: change,
        changePercent24h: changePercent,
        volume24h: Math.floor(Math.random() * 100000000) + 10000000,
        marketCap: Math.floor(Math.random() * 10000000000) + 1000000000,
        description: `Entity ${entityId} in the ${categoryId} category.`,
      },
      priceHistory,
      stats: {
        high24h: basePrice + Math.abs(change) * 0.5,
        low24h: basePrice - Math.abs(change) * 0.5,
        volume24h: Math.floor(Math.random() * 100000000) + 10000000,
        marketCap: Math.floor(Math.random() * 10000000000) + 1000000000,
        holdersCount: Math.floor(Math.random() * 50000) + 1000,
        rank: Math.floor(Math.random() * 100) + 1,
      },
    };
  }

  // Use centralized entity data
  const basePrice = entityData.basePrice;
  const change = (Math.random() - 0.5) * 10;
  const changePercent = (change / basePrice) * 100;

  // Generate 30 days of price history
  const priceHistory: PriceDataPoint[] = [];
  let price = basePrice - change;
  const now = Date.now();

  for (let i = 30; i >= 0; i--) {
    const variance = (Math.random() - 0.5) * 5;
    price = Math.max(price + variance, basePrice * 0.8);
    priceHistory.push({
      timestamp: now - i * 24 * 60 * 60 * 1000,
      price,
      volume: Math.floor(Math.random() * 10000000) + 1000000,
    });
  }

  // Update last price to match current
  priceHistory[priceHistory.length - 1].price = basePrice;

  return {
    entity: {
      id: entityId,
      ticker: entityData.ticker,
      name: entityData.name,
      type: 'stock' as const,
      currentPrice: basePrice,
      change24h: change,
      changePercent24h: changePercent,
      volume24h: Math.floor(Math.random() * 100000000) + 10000000,
      marketCap: Math.floor(Math.random() * 10000000000) + 1000000000,
      description: entityData.description,
    },
    priceHistory,
    stats: {
      high24h: basePrice + Math.abs(change) * 0.5,
      low24h: basePrice - Math.abs(change) * 0.5,
      volume24h: Math.floor(Math.random() * 100000000) + 10000000,
      marketCap: Math.floor(Math.random() * 10000000000) + 1000000000,
      holdersCount: Math.floor(Math.random() * 50000) + 1000,
      rank: Math.floor(Math.random() * 100) + 1,
    },
  };
};

export default function EntityScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EntityScreenRouteProp>();
  const { entityId, categoryId } = route.params;
  const { getHolding, updatePrices } = useTrading();
  const { getNewsByEntity } = useNews();

  const [entityData] = useState(() => generateMockEntityData(entityId, categoryId));
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M' | 'ALL'>('1M');
  const [tradeModalVisible, setTradeModalVisible] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(entityData.entity.currentPrice);

  const holding = getHolding(entityId);
  const entityNews = getNewsByEntity(entityId);

  // Simulate real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      const variance = (Math.random() - 0.5) * 0.5;
      setCurrentPrice((prev) => {
        const newPrice = Math.max(prev + variance, entityData.entity.currentPrice * 0.95);
        updatePrices(entityId, newPrice);
        return newPrice;
      });
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [entityId]);

  const chartData = {
    labels: entityData.priceHistory
      .filter((_, index) => index % 5 === 0)
      .map((point) => {
        const date = new Date(point.timestamp);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
    datasets: [
      {
        data: entityData.priceHistory.map((point) => point.price),
      },
    ],
  };

  const priceChange = currentPrice - entityData.entity.currentPrice;
  const priceChangePercent = (priceChange / entityData.entity.currentPrice) * 100;
  const isPositive = priceChange >= 0;

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.ticker}>{entityData.entity.ticker}</Text>
            <Text style={styles.entityName}>{entityData.entity.name}</Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Price Section */}
        <View style={styles.priceSection}>
          <Text style={styles.price}>{formatCurrency(currentPrice)}</Text>
          <View style={styles.changeContainer}>
            <Text style={[styles.change, { color: getChangeColor(priceChange) }]}>
              {isPositive ? '+' : ''}
              {formatCurrency(priceChange)}
            </Text>
            <Text style={[styles.changePercent, { color: getChangeColor(priceChange) }]}>
              ({isPositive ? '+' : ''}
              {priceChangePercent.toFixed(2)}%)
            </Text>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartContainer}>
          <LineChart
            data={chartData}
            width={width}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => 
                isPositive ? `rgba(16, 185, 129, ${opacity})` : `rgba(239, 68, 68, ${opacity})`,
            }}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLabels={true}
            withHorizontalLabels={true}
          />

          {/* Time Range Selector */}
          <View style={styles.timeRangeSelector}>
            {(['1D', '1W', '1M', 'ALL'] as const).map((range) => (
              <TouchableOpacity
                key={range}
                style={[styles.timeRangeButton, timeRange === range && styles.timeRangeButtonActive]}
                onPress={() => setTimeRange(range)}
              >
                <Text
                  style={[
                    styles.timeRangeText,
                    timeRange === range && styles.timeRangeTextActive,
                  ]}
                >
                  {range}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Your Position (if any) */}
        {holding && (
          <View style={styles.positionCard}>
            <Text style={styles.sectionTitle}>Your Position</Text>
            <View style={styles.positionGrid}>
              <View style={styles.positionItem}>
                <Text style={styles.positionLabel}>Shares</Text>
                <Text style={styles.positionValue}>{holding.quantity}</Text>
              </View>
              <View style={styles.positionItem}>
                <Text style={styles.positionLabel}>Avg Cost</Text>
                <Text style={styles.positionValue}>{formatCurrency(holding.averageCost)}</Text>
              </View>
              <View style={styles.positionItem}>
                <Text style={styles.positionLabel}>Total Value</Text>
                <Text style={styles.positionValue}>{formatCurrency(holding.totalValue)}</Text>
              </View>
              <View style={styles.positionItem}>
                <Text style={styles.positionLabel}>P&L</Text>
                <Text
                  style={[
                    styles.positionValue,
                    { color: getChangeColor(holding.profitLoss) },
                  ]}
                >
                  {holding.profitLoss >= 0 ? '+' : ''}
                  {formatCurrency(holding.profitLoss)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>24h High</Text>
              <Text style={styles.statValue}>{formatCurrency(entityData.stats.high24h)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>24h Low</Text>
              <Text style={styles.statValue}>{formatCurrency(entityData.stats.low24h)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Volume</Text>
              <Text style={styles.statValue}>{formatVolume(entityData.stats.volume24h)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Market Cap</Text>
              <Text style={styles.statValue}>{formatVolume(entityData.stats.marketCap)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Holders</Text>
              <Text style={styles.statValue}>
                {entityData.stats.holdersCount.toLocaleString()}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Rank</Text>
              <Text style={styles.statValue}>#{entityData.stats.rank}</Text>
            </View>
          </View>
        </View>

        {/* About */}
        <View style={styles.aboutCard}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{entityData.entity.description}</Text>
        </View>

        {/* Related News */}
        {entityNews.length > 0 && (
          <View style={styles.newsSection}>
            <View style={styles.newsSectionHeader}>
              <Text style={styles.sectionTitle}>Related News</Text>
              <Text style={styles.newsCount}>{entityNews.length} articles</Text>
            </View>
            {entityNews.slice(0, 5).map((article) => (
              <NewsCard
                key={article.id}
                article={article}
                showEntity={false}
              />
            ))}
          </View>
        )}

        {/* Spacer for bottom buttons */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Bottom Trade Buttons */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.tradeButton, styles.tradeButtonBuy]}
          onPress={() => setTradeModalVisible(true)}
        >
          <Text style={styles.tradeButtonText}>Trade {entityData.entity.ticker}</Text>
        </TouchableOpacity>
      </View>

      {/* Trade Modal */}
      <TradeModal
        visible={tradeModalVisible}
        onClose={() => setTradeModalVisible(false)}
        entityId={entityId}
        entityName={entityData.entity.name}
        entityTicker={entityData.entity.ticker}
        currentPrice={currentPrice}
        category={categoryId}
        existingQuantity={holding?.quantity}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#111827',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  ticker: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  entityName: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  priceSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
  },
  price: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#111827',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  change: {
    fontSize: 18,
    fontWeight: '600',
  },
  changePercent: {
    fontSize: 18,
    fontWeight: '600',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: 1,
    paddingBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 0,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  timeRangeButtonActive: {
    backgroundColor: '#3B82F6',
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  timeRangeTextActive: {
    color: '#FFFFFF',
  },
  positionCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  positionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  positionItem: {
    width: '47%',
  },
  positionLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  positionValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    width: '47%',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  aboutCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  newsSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  newsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  newsCount: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  tradeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  tradeButtonBuy: {
    backgroundColor: '#3B82F6',
  },
  tradeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

