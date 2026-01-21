import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, getChangeColor, TOKEN_SYMBOL } from '../utils/dataGenerator';
import { calculatePrice, BASE_PRICE, EPSILON } from '../utils/sentimentTrading';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ChartDevelopmentScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  
  // Mock entity data to match EntityScreen structure
  // Base price is 100, representing neutral 0/0 ratio state (no buy/sell pressure)
  const [currentPrice, setCurrentPrice] = useState(BASE_PRICE);
  const [priceChange, setPriceChange] = useState(0);
  const [priceChangePercent, setPriceChangePercent] = useState(0);
  const [volume, setVolume] = useState(0);
  const [high, setHigh] = useState(BASE_PRICE);
  const [low, setLow] = useState(BASE_PRICE);
  const entityName = 'Example Entity';
  const categoryName = 'Test Category';
  const isInWatchlist = false;

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toFixed(2);
  };

  // Generate price data using the real pricing algorithm
  // Algorithm: Price = BASE_PRICE * (P + EPSILON) / (N + EPSILON)
  // Start with P=0, N=0 (neutral state = price of exactly 100)
  // No randomization - price stays at 100 until actual trading activity
  const priceData = useMemo(() => {
    const points: { time: number; value: number }[] = [];
    const now = Date.now();
    
    // Start with neutral pools (P=0, N=0) = price of exactly 100
    const positiveTokens = 0;
    const negativeTokens = 0;
    
    // Generate points - all at base price of 100 (no trading activity yet)
    for (let i = 180; i >= 0; i--) {
      const ts = now - i * 15 * 60 * 1000; // 15m spacing
      
      // Calculate price using the real algorithm
      // With P=0, N=0: Price = 100 * (0 + 10000) / (0 + 10000) = 100 * 1 = 100
      const price = calculatePrice(positiveTokens, negativeTokens, EPSILON);
      points.push({ time: Math.floor(ts / 1000), value: price });
    }

    return points;
  }, []);

  useEffect(() => {
    if (!priceData.length) return;
    // All prices should be exactly 100 (P=0, N=0)
    const price = priceData[0].value; // Should be BASE_PRICE (100)
    
    // Set all stats to base values
    setCurrentPrice(BASE_PRICE);
    setPriceChange(0);
    setPriceChangePercent(0);
    setHigh(BASE_PRICE);
    setLow(BASE_PRICE);
    setVolume(0); // No trading activity = no volume
  }, [priceData]);

  // Create HTML for TradingView Lightweight Charts
  const chartHTML = useMemo(() => {
    const dataString = JSON.stringify(priceData.map(d => ({ time: d.time, value: d.value })));
    const isDark = theme.background === '#000000' || theme.background === '#0A0A0A';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script src="https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: ${theme.card || '#FFFFFF'};
      overflow: hidden;
    }
    #chart {
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div id="chart"></div>
  <script>
    const chartContainer = document.getElementById('chart');
    const chart = LightweightCharts.createChart(chartContainer, {
      width: chartContainer.clientWidth,
      height: chartContainer.clientHeight,
      layout: {
        background: { color: '${theme.card || '#FFFFFF'}' },
        textColor: '${theme.text || '#000000'}',
      },
      grid: {
        vertLines: { color: 'rgba(0, 0, 0, 0.05)' },
        horzLines: { color: 'rgba(0, 0, 0, 0.05)' },
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: 'rgba(0, 0, 0, 0.2)',
      },
      timeScale: {
        borderColor: 'rgba(0, 0, 0, 0.2)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const lineSeries = chart.addLineSeries({
      color: '${priceChange >= 0 ? '#10B981' : '#EF4444'}',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    const data = ${dataString};
    const formattedData = data.map(d => ({
      time: d.time,
      value: d.value,
    }));

    lineSeries.setData(formattedData);

    chart.timeScale().fitContent();

    // Handle crosshair move to send data back to React Native
    chart.subscribeCrosshairMove(param => {
      if (param.point === undefined || !param.time || param.point.x < 0 || param.point.x > chartContainer.clientWidth ||
          param.point.y < 0 || param.point.y > chartContainer.clientHeight) {
        return;
      }

      if (param.seriesData.size === 0) {
        return;
      }

      const data = param.seriesData.values().next().value;
      if (data && window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'crosshair',
          time: data.time,
          value: data.value,
        }));
      }
    });

    // Handle resize
    window.addEventListener('resize', () => {
      chart.applyOptions({
        width: chartContainer.clientWidth,
        height: chartContainer.clientHeight,
      });
    });
  </script>
</body>
</html>
    `;
  }, [priceData, theme, priceChange]);

  const handleWatchlistPress = () => {
    // Mock watchlist toggle
    console.log('Watchlist toggled');
  };

  const renderChartContent = () => (
    <>
      {/* Chart Container */}
      <View style={[styles.entityChartWrapperFullWidth, { backgroundColor: theme.card }]}>
        <View style={styles.entityChartContainerFull}>
          {/* TradingView WebView Chart */}
          <View style={styles.chartWithOverlay}>
            <WebView
              source={{ html: chartHTML }}
              style={styles.webview}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  if (data.type === 'crosshair') {
                    // Handle crosshair updates
                    console.log('Crosshair:', data.value, 'at', new Date(data.time * 1000));
                  }
                } catch (e) {
                  console.error('Error parsing chart message:', e);
                }
              }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
            />
          </View>
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      {/* Header - matches EntityScreen */}
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerLeft}>
          <Text style={[styles.entityName, { color: theme.text }]}>{entityName}</Text>
          <Text style={[styles.categoryName, { color: theme.textSecondary }]}>
            {categoryName}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => {
              navigation.navigate('Search');
            }}
          >
            <Ionicons name="search" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.watchlistButton}
            onPress={handleWatchlistPress}
          >
            <Ionicons
              name={isInWatchlist ? 'star' : 'star-outline'}
              size={24}
              color={isInWatchlist ? theme.primary : theme.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Price Header - matches EntityScreen */}
      <View style={[styles.entityHeader, { backgroundColor: theme.card }]}>
        <View style={styles.entityPriceInfo}>
          <Text style={[styles.entityCurrentPrice, { color: theme.text }]}>
            {formatCurrency(currentPrice)}
          </Text>
          <View style={styles.entityChangeContainer}>
            <Text style={[
              styles.entityChangeText,
              { color: getChangeColor(priceChange) }
            ]}>
              {priceChange === 0 ? '' : priceChange >= 0 ? '+' : ''}{formatCurrency(priceChange)}
            </Text>
            <Text style={[
              styles.entityChangePercent,
              { color: getChangeColor(priceChange) }
            ]}>
              ({priceChangePercent === 0 ? '' : priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
            </Text>
          </View>
        </View>
        <View style={styles.entityStatsInfo}>
          <Text style={[styles.entityStatsLabel, { color: theme.textSecondary }]}>
            Volume: <Text style={{ color: theme.text }}>{formatVolume(volume)} {TOKEN_SYMBOL}</Text>
          </Text>
          <Text style={[styles.entityStatsLabel, { color: theme.textSecondary }]}>
            High: <Text style={{ color: theme.text }}>{formatCurrency(high)}</Text>
          </Text>
          <Text style={[styles.entityStatsLabel, { color: theme.textSecondary }]}>
            Low: <Text style={{ color: theme.text }}>{formatCurrency(low)}</Text>
          </Text>
        </View>
      </View>

      {/* Tab Selector - matches EntityScreen (Chart tab only for now) */}
      <View style={[styles.tabSelectorContainerPersistent, { backgroundColor: theme.card, borderBottomColor: 'rgba(0, 0, 0, 0.08)' }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabSelector}
          contentContainerStyle={styles.tabSelectorContent}
        >
          <TouchableOpacity
            style={styles.tabButton}
          >
            <Text
              style={[
                styles.tabButtonText,
                {
                  color: theme.text,
                  fontWeight: '600',
                }
              ]}
            >
              Chart
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Content with chart */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.horizontalScrollView}
      >
        {/* Chart Tab */}
        <View style={{ width: SCREEN_WIDTH }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {renderChartContent()}
            {/* Spacer for bottom */}
            <View style={{ height: 100 }} />
          </ScrollView>
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
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerLeft: {
    flex: 1,
  },
  entityName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  categoryName: {
    fontSize: 14,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchButton: {
    padding: 4,
  },
  watchlistButton: {
    padding: 4,
  },
  entityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  entityPriceInfo: {
    alignItems: 'flex-start',
    flex: 1,
  },
  entityStatsInfo: {
    alignItems: 'flex-end',
    gap: 4,
  },
  entityStatsLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  entityCurrentPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  entityChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entityChangeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  entityChangePercent: {
    fontSize: 14,
    fontWeight: '500',
  },
  entityChartWrapperFullWidth: {
    position: 'relative',
    width: SCREEN_WIDTH,
    backgroundColor: '#FFFFFF',
    paddingBottom: 16,
  },
  entityChartContainerFull: {
    width: SCREEN_WIDTH,
    position: 'relative',
    overflow: 'visible',
  },
  chartWithOverlay: {
    position: 'relative',
    height: 220,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  tabSelectorContainerPersistent: {
    borderBottomWidth: 0.5,
    paddingTop: 12,
    paddingBottom: 12,
  },
  tabSelector: {
    maxHeight: 20,
  },
  tabSelectorContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 0,
    alignItems: 'center',
  },
  tabButton: {
    marginRight: 18,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonText: {
    fontSize: 15,
    lineHeight: 18,
  },
  horizontalScrollView: {
    flex: 1,
  },
});
