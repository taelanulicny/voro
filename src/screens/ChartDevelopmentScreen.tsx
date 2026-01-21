import React, { useState, useMemo } from 'react';
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
import { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, getChangeColor, TOKEN_SYMBOL } from '../utils/dataGenerator';
import TradingViewChart, { PriceDataPoint } from '../components/TradingViewChart';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BASE_PRICE = 100;

export default function ChartDevelopmentScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  
  // Example Entity data
  const entityName = 'Example Entity';
  const categoryName = 'Development';
  const currentPrice = BASE_PRICE; // Base price of 100 Moro Tokens
  const priceChange = 0;
  const priceChangePercent = 0;
  const isPositive = true;
  const volume = 0;
  const high = BASE_PRICE;
  const low = BASE_PRICE;
  
  // Generate fake data: every minute from 8am EST this morning until now, price = 100, volume = 0
  const generateFakeData = (): PriceDataPoint[] => {
    const now = Math.floor(Date.now() / 1000);
    
    // Get current date in EST
    const estNowParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(now * 1000));
    
    const estYear = parseInt(estNowParts.find(p => p.type === 'year')?.value || '2025', 10);
    const estMonth = parseInt(estNowParts.find(p => p.type === 'month')?.value || '1', 10) - 1;
    const estDay = parseInt(estNowParts.find(p => p.type === 'day')?.value || '1', 10);
    
    // Create 8am EST this morning
    const est8AmDate = new Date(Date.UTC(estYear, estMonth, estDay, 8, 0, 0));
    // Convert EST to UTC (EST is UTC-5, but we need to handle this properly)
    // Actually, let's use a simpler approach - create date in local time and adjust
    const eightAmLocal = new Date(estYear, estMonth, estDay, 8, 0, 0);
    // Get offset between EST and UTC
    const estOffset = -5 * 60 * 60; // EST is UTC-5 (simplified, doesn't account for DST)
    const eightAmUTC = Math.floor((eightAmLocal.getTime() / 1000) - estOffset);
    
    const data: PriceDataPoint[] = [];
    
    // Generate data every minute from 8am EST until now
    for (let timestamp = eightAmUTC; timestamp <= now; timestamp += 60) {
      // Helper to get EST hour from a timestamp
      const estParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        hour12: false,
      }).formatToParts(new Date(timestamp * 1000));
      
      const estHour = parseInt(estParts.find(p => p.type === 'hour')?.value || '0', 10);
      
      // Only add data if it's within trading hours (8am-2am EST)
      if (estHour >= 8 || estHour < 2) {
        data.push({
          time: timestamp,
          price: 100,
          volume: 0, // No volume as requested
        });
      }
    }
    
    return data;
  };

  // TradingView chart data - generate fake data for testing
  const tradingViewData = useMemo(() => generateFakeData(), []);
  
  const [selectedTab, setSelectedTab] = useState<'chart' | 'about' | 'feed' | 'news'>('chart');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1H' | '1D' | '5D' | '1M' | 'ALL'>('1D');
  const scrollViewRef = React.useRef<ScrollView>(null);

  const handleTabChange = (tab: 'chart' | 'about' | 'feed' | 'news') => {
    setSelectedTab(tab);
    const tabIndex = tab === 'chart' ? 0 : tab === 'about' ? 1 : tab === 'feed' ? 2 : 3;
    const scrollToX = tabIndex * SCREEN_WIDTH;
    scrollViewRef.current?.scrollTo({ x: scrollToX, animated: true });
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / SCREEN_WIDTH);
    const tabs: ('chart' | 'about' | 'feed' | 'news')[] = ['chart', 'about', 'feed', 'news'];
    const newTab = tabs[pageIndex];
    if (newTab && newTab !== selectedTab) {
      setSelectedTab(newTab);
    }
  };

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toFixed(2);
  };

  const handleTimeframeChange = (timeframe: '1H' | '1D' | '5D' | '1M' | 'ALL') => {
    setSelectedTimeframe(timeframe);
  };

  const renderChartContent = () => (
    <>
      {/* TradingView Chart Container */}
      <View style={[styles.entityChartWrapperFullWidth, { backgroundColor: theme.card }]}>
        <View style={styles.entityChartContainerFull}>
          {/* Timeframe Selector (Top-Left) */}
          <View style={[styles.timeframeSelector, { backgroundColor: theme.card }]}>
            <TouchableOpacity 
              style={[styles.timeframeButton, { borderColor: theme.border }]}
              onPress={() => {
                // Toggle between 1H and other timeframes - for now just set to 1H
                handleTimeframeChange('1H');
              }}
            >
              <Text style={[styles.timeframeButtonText, { color: theme.text }]}>1H</Text>
              <Ionicons name="chevron-down" size={16} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.tradingViewContainer}>
            <TradingViewChart
              width={SCREEN_WIDTH}
              height={450}
              customData={tradingViewData}
              entityName={entityName}
              currentPrice={currentPrice}
              currentVolume={volume}
              theme={theme.background === '#000000' ? 'dark' : 'light'}
              selectedTimeframe={selectedTimeframe}
              onTimeframeChange={handleTimeframeChange}
            />
          </View>
          
          {/* Bottom Navigation Bar */}
          <View style={[styles.bottomNavigation, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
            <View style={styles.timeRangeButtons}>
              {(['1D', '5D', '1M', 'ALL'] as const).map((timeframe) => (
                <TouchableOpacity
                  key={timeframe}
                  style={[
                    styles.timeRangeButton,
                    selectedTimeframe === timeframe && styles.timeRangeButtonActive,
                  ]}
                  onPress={() => handleTimeframeChange(timeframe)}
                >
                  <Text
                    style={[
                      styles.timeRangeButtonText,
                      { color: theme.text },
                      selectedTimeframe === timeframe && [styles.timeRangeButtonTextActive, { color: '#A855F7' }],
                    ]}
                  >
                    {timeframe}
                  </Text>
                  {selectedTimeframe === timeframe && (
                    <View style={[styles.timeRangeButtonUnderline, { backgroundColor: '#A855F7' }]} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      {/* Header */}
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
        </View>
      </View>

      {/* Price Header - Persists across all tabs */}
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
              {priceChange === 0 ? '' : isPositive ? '+' : ''}{formatCurrency(priceChange)}
            </Text>
            <Text style={[
              styles.entityChangePercent,
              { color: getChangeColor(priceChange) }
            ]}>
              ({priceChangePercent === 0 ? '' : isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
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

      {/* Tab Selector - Persists across all tabs */}
      <View style={[styles.tabSelectorContainerPersistent, { backgroundColor: theme.card, borderBottomColor: 'rgba(0, 0, 0, 0.08)' }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabSelector}
          contentContainerStyle={styles.tabSelectorContent}
        >
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => handleTabChange('chart')}
          >
            <Text
              style={[
                styles.tabButtonText,
                {
                  color: selectedTab === 'chart' ? theme.text : theme.textSecondary,
                  fontWeight: selectedTab === 'chart' ? '600' : '400',
                }
              ]}
            >
              Chart
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => handleTabChange('about')}
          >
            <Text
              style={[
                styles.tabButtonText,
                {
                  color: selectedTab === 'about' ? theme.text : theme.textSecondary,
                  fontWeight: selectedTab === 'about' ? '600' : '400',
                }
              ]}
            >
              About
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => handleTabChange('feed')}
          >
            <Text
              style={[
                styles.tabButtonText,
                {
                  color: selectedTab === 'feed' ? theme.text : theme.textSecondary,
                  fontWeight: selectedTab === 'feed' ? '600' : '400',
                }
              ]}
            >
              Feed
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => handleTabChange('news')}
          >
            <Text
              style={[
                styles.tabButtonText,
                {
                  color: selectedTab === 'news' ? theme.text : theme.textSecondary,
                  fontWeight: selectedTab === 'news' ? '600' : '400',
                }
              ]}
            >
              News
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Content with horizontal swipe */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.horizontalScrollView}
      >
        {/* Chart Tab */}
        <View style={{ width: SCREEN_WIDTH }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {renderChartContent()}
            {/* Spacer for bottom buttons */}
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>

        {/* About Tab */}
        <View style={{ width: SCREEN_WIDTH }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.comingSoonContainer}>
              <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
                About coming soon
              </Text>
            </View>
            {/* Spacer for bottom buttons */}
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>

        {/* Feed Tab */}
        <View style={{ width: SCREEN_WIDTH }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.comingSoonContainer}>
              <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
                Feed coming soon
              </Text>
            </View>
            {/* Spacer for bottom buttons */}
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>

        {/* News Tab */}
        <View style={{ width: SCREEN_WIDTH }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.comingSoonContainer}>
              <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
                News coming soon
              </Text>
            </View>
            {/* Spacer for bottom buttons */}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  backButton: {
    padding: 4,
  },
  headerLeft: {
    flex: 1,
    marginLeft: 12,
  },
  entityName: {
    fontSize: 18,
    fontWeight: '600',
  },
  categoryName: {
    fontSize: 12,
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
  entityHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  entityPriceInfo: {
    marginBottom: 12,
  },
  entityCurrentPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  entityChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entityChangeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  entityChangePercent: {
    fontSize: 16,
    fontWeight: '500',
  },
  entityStatsInfo: {
    flexDirection: 'row',
    gap: 16,
  },
  entityStatsLabel: {
    fontSize: 12,
  },
  tabSelectorContainerPersistent: {
    borderBottomWidth: 1,
  },
  tabSelector: {
    flexGrow: 0,
  },
  tabSelectorContent: {
    paddingHorizontal: 16,
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  tabButtonText: {
    fontSize: 16,
  },
  horizontalScrollView: {
    flex: 1,
  },
  entityChartWrapperFullWidth: {
    width: SCREEN_WIDTH,
    marginTop: 0,
  },
  entityChartContainerFull: {
    width: SCREEN_WIDTH,
    position: 'relative',
    overflow: 'visible',
  },
  tradingViewContainer: {
    width: SCREEN_WIDTH,
    overflow: 'visible', // Changed to visible to show axes
  },
  timeframeSelector: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#374151',
  },
  timeframeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  timeframeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  timeRangeButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  timeRangeButton: {
    paddingVertical: 4,
    position: 'relative',
  },
  timeRangeButtonActive: {
    // Active state styling
  },
  timeRangeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeRangeButtonTextActive: {
    // Active text styling
  },
  timeRangeButtonUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#A855F7',
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  comingSoonText: {
    fontSize: 16,
  },
});
