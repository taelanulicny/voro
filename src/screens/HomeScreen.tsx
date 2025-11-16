import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useTrading } from '../context/TradingContext';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface EntityListItem {
  id: number;
  ticker: string;
  name: string;
  currentPrice: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  category: string;
}

// Mock data for entities
const generateMockEntities = (): EntityListItem[] => {
  const entities = [
    { ticker: 'OPENAI', name: 'OpenAI', category: 'Tech', basePrice: 180 },
    { ticker: 'CAND-X', name: 'Candidate X', category: 'Politics', basePrice: 120 },
    { ticker: 'AISAFE', name: 'AI Safety Initiative', category: 'Tech', basePrice: 95 },
    { ticker: 'BTCHLV', name: 'Bitcoin Halving 2028', category: 'Crypto', basePrice: 145 },
    { ticker: 'MUSK', name: 'Elon Musk', category: 'People', basePrice: 165 },
    { ticker: 'AGI', name: 'Artificial General Intelligence', category: 'Tech', basePrice: 210 },
    { ticker: 'STARSH', name: 'Starship Success', category: 'Events', basePrice: 135 },
    { ticker: 'NEURL', name: 'Neuralink IPO', category: 'Tech', basePrice: 88 },
    { ticker: 'SOLANA', name: 'Solana Ecosystem', category: 'Crypto', basePrice: 115 },
    { ticker: 'TRUMP', name: 'Donald Trump', category: 'Politics', basePrice: 142 },
  ];

  return entities.map((entity, index) => {
    const change = (Math.random() - 0.5) * 15;
    const changePercent = (change / entity.basePrice) * 100;
    return {
      id: index + 1,
      ticker: entity.ticker,
      name: entity.name,
      currentPrice: entity.basePrice + change,
      change24h: change,
      changePercent24h: changePercent,
      volume24h: Math.floor(Math.random() * 50000000) + 5000000,
      category: entity.category,
    };
  });
};

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { portfolio } = useTrading();
  const [refreshing, setRefreshing] = useState(false);
  const [entities] = useState(() => generateMockEntities());

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleEntityPress = (entityId: number, category: string) => {
    navigation.navigate('Entity', { entityId, categoryId: category });
  };

  const topGainers = [...entities]
    .filter((e) => e.changePercent24h > 0)
    .sort((a, b) => b.changePercent24h - a.changePercent24h)
    .slice(0, 3);

  const topLosers = [...entities]
    .filter((e) => e.changePercent24h < 0)
    .sort((a, b) => a.changePercent24h - b.changePercent24h)
    .slice(0, 3);

  const formatVolume = (value: number) => {
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.title}>Market Overview</Text>
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Portfolio</Text>
            <Text style={styles.balanceValue}>{formatCurrency(portfolio.totalValue)}</Text>
          </View>
        </View>

        {/* Top Movers Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Top Gainers</Text>
          {topGainers.map((entity) => (
            <TouchableOpacity
              key={entity.id}
              style={styles.miniCard}
              onPress={() => handleEntityPress(entity.id, entity.category)}
            >
              <View style={styles.miniCardLeft}>
                <Text style={styles.miniTicker}>{entity.ticker}</Text>
                <Text style={styles.miniName}>{entity.name}</Text>
              </View>
              <View style={styles.miniCardRight}>
                <Text style={styles.miniPrice}>{formatCurrency(entity.currentPrice)}</Text>
                <Text style={[styles.miniChange, { color: getChangeColor(entity.change24h) }]}>
                  +{entity.changePercent24h.toFixed(2)}%
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Top Losers Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📉 Top Losers</Text>
          {topLosers.map((entity) => (
            <TouchableOpacity
              key={entity.id}
              style={styles.miniCard}
              onPress={() => handleEntityPress(entity.id, entity.category)}
            >
              <View style={styles.miniCardLeft}>
                <Text style={styles.miniTicker}>{entity.ticker}</Text>
                <Text style={styles.miniName}>{entity.name}</Text>
              </View>
              <View style={styles.miniCardRight}>
                <Text style={styles.miniPrice}>{formatCurrency(entity.currentPrice)}</Text>
                <Text style={[styles.miniChange, { color: getChangeColor(entity.change24h) }]}>
                  {entity.changePercent24h.toFixed(2)}%
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* All Entities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌟 All Entities</Text>
          {entities.map((entity) => (
            <TouchableOpacity
              key={entity.id}
              style={styles.entityCard}
              onPress={() => handleEntityPress(entity.id, entity.category)}
            >
              <View style={styles.entityLeft}>
                <View>
                  <Text style={styles.entityTicker}>{entity.ticker}</Text>
                  <Text style={styles.entityName}>{entity.name}</Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{entity.category}</Text>
                </View>
              </View>
              <View style={styles.entityRight}>
                <Text style={styles.entityPrice}>{formatCurrency(entity.currentPrice)}</Text>
                <Text
                  style={[styles.entityChange, { color: getChangeColor(entity.change24h) }]}
                >
                  {entity.change24h >= 0 ? '+' : ''}
                  {entity.changePercent24h.toFixed(2)}%
                </Text>
                <Text style={styles.entityVolume}>Vol: {formatVolume(entity.volume24h)}</Text>
              </View>
            </TouchableOpacity>
          ))}
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
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 4,
  },
  balanceCard: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
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
  entityCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
  },
  entityLeft: {
    flex: 1,
    gap: 8,
  },
  entityTicker: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  entityName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E0E7FF',
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
  },
  entityRight: {
    alignItems: 'flex-end',
  },
  entityPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  entityChange: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  entityVolume: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
