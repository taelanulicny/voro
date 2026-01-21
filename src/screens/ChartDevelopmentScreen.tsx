import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Stop, Path, G, Line, Text as SvgText, Rect, Circle } from 'react-native-svg';
import { LineChart } from 'react-native-chart-kit';
import { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';
import TradingViewChart from '../components/TradingViewChart';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Content Performance Chart Component
const ContentPerformanceChart = ({ theme }: { theme: any }) => {
  // Generate 1080 data points for both lines - pattern from 80 to 110 and back
  const articlesData: number[] = [];
  const viewsData: number[] = [];
  const labels: string[] = [];
  
  for (let i = 0; i < 1080; i++) {
    const progress = i / 1080;
    const sinePattern = Math.sin(progress * Math.PI);
    const priceRange = 30; // 80 to 110
    const basePrice = 80;
    
    // Articles: pattern from 80 to 110 and back (scaled differently)
    const articlesPrice = basePrice + (sinePattern * priceRange);
    articlesData.push(Math.max(79, Math.min(111, articlesPrice + Math.sin(progress * Math.PI * 8) * 0.5)));
    
    // Views: pattern from 80 to 110 and back (slightly offset)
    const viewsPrice = basePrice + (sinePattern * priceRange * 0.9);
    viewsData.push(Math.max(79, Math.min(111, viewsPrice + Math.sin(progress * Math.PI * 6) * 0.3)));
    
    // Labels - show key points
    if (i === 0) labels.push('8am');
    else if (i === 269) labels.push('12pm');
    else if (i === 540) labels.push('6pm');
    else if (i === 810) labels.push('12am');
    else if (i === 1079) labels.push('2am');
    else labels.push('');
  }
  
  const chartWidth = SCREEN_WIDTH - 64;
  const chartHeight = 280;
  const margin = { top: 20, right: 20, left: 0, bottom: 40 };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;
  
  // Y-axis range based on actual data
  const yMin = Math.min(...articlesData, ...viewsData) - 5;
  const yMax = Math.max(...articlesData, ...viewsData) + 5;
  const yRange = yMax - yMin;
  
  // Generate path for articles line (blue)
  const generateArticlesPath = () => {
    if (articlesData.length === 0) return '';
    const points = articlesData.map((value, i) => {
      const x = margin.left + (i / (articlesData.length - 1)) * innerWidth;
      const y = margin.top + innerHeight - ((value - yMin) / yRange) * innerHeight;
      return { x, y };
    });
    
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1] || curr;
      
      const dx1 = (curr.x - prev.x) / 3;
      const dy1 = (curr.y - prev.y) / 3;
      const dx2 = (next.x - curr.x) / 3;
      const dy2 = (next.y - curr.y) / 3;
      
      path += ` C ${prev.x + dx1} ${prev.y + dy1}, ${curr.x - dx2} ${curr.y - dy2}, ${curr.x} ${curr.y}`;
    }
    return path;
  };
  
  // Generate path for views line (green)
  const generateViewsPath = () => {
    if (viewsData.length === 0) return '';
    const points = viewsData.map((value, i) => {
      const x = margin.left + (i / (viewsData.length - 1)) * innerWidth;
      const y = margin.top + innerHeight - ((value - yMin) / yRange) * innerHeight;
      return { x, y };
    });
    
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1] || curr;
      
      const dx1 = (curr.x - prev.x) / 3;
      const dy1 = (curr.y - prev.y) / 3;
      const dx2 = (next.x - curr.x) / 3;
      const dy2 = (next.y - curr.y) / 3;
      
      path += ` C ${prev.x + dx1} ${prev.y + dy1}, ${curr.x - dx2} ${curr.y - dy2}, ${curr.x} ${curr.y}`;
    }
    return path;
  };

  return (
    <View style={styles.contentChartContainer}>
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id="articlesGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="5%" stopColor="#775a96" stopOpacity={0.3} />
            <Stop offset="95%" stopColor="#775a96" stopOpacity={0.05} />
          </LinearGradient>
          <LinearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
            <Stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
          </LinearGradient>
        </Defs>
        
        {/* Grid lines */}
        {[0, 20, 40, 60, 80, 90].map((value) => {
          const y = margin.top + innerHeight - ((value - yMin) / yRange) * innerHeight;
          return (
            <Line
              key={value}
              x1={margin.left}
              y1={y}
              x2={margin.left + innerWidth}
              y2={y}
              stroke="#2A2A2A"
              strokeWidth={1}
              strokeDasharray="3,3"
            />
          );
        })}
        
        {/* Articles line (blue) */}
        <Path
          d={generateArticlesPath()}
          fill="none"
          stroke="#775a96"
          strokeWidth={2}
        />
        
        {/* Views line (green) */}
        <Path
          d={generateViewsPath()}
          fill="none"
          stroke="#10B981"
          strokeWidth={2}
        />
        
        {/* Dots for articles - only show a few key points */}
        {articlesData.filter((_, i) => i % 180 === 0 || i === articlesData.length - 1).map((value, i) => {
          const originalIndex = i * 180 < articlesData.length ? i * 180 : articlesData.length - 1;
          const x = margin.left + (originalIndex / (articlesData.length - 1)) * innerWidth;
          const y = margin.top + innerHeight - ((value - yMin) / yRange) * innerHeight;
          return (
            <G key={`article-dot-${originalIndex}`}>
              <Rect
                x={x - 3}
                y={y - 3}
                width={6}
                height={6}
                fill="#775a96"
                rx={3}
              />
            </G>
          );
        })}
        
        {/* Dots for views - only show a few key points */}
        {viewsData.filter((_, i) => i % 180 === 0 || i === viewsData.length - 1).map((value, i) => {
          const originalIndex = i * 180 < viewsData.length ? i * 180 : viewsData.length - 1;
          const x = margin.left + (originalIndex / (viewsData.length - 1)) * innerWidth;
          const y = margin.top + innerHeight - ((value - yMin) / yRange) * innerHeight;
          return (
            <G key={`view-dot-${originalIndex}`}>
              <Rect
                x={x - 3}
                y={y - 3}
                width={6}
                height={6}
                fill="#10B981"
                rx={3}
              />
            </G>
          );
        })}
        
        {/* X-axis labels */}
        {labels.map((label, i) => {
          const x = margin.left + (i / (labels.length - 1)) * innerWidth;
          return (
            <SvgText
              key={`label-${i}`}
              x={x}
              y={chartHeight - 10}
              fontSize="10"
              fill="#9A9A9A"
              textAnchor="middle"
            >
              {label}
            </SvgText>
          );
        })}
        
        {/* Y-axis labels */}
        {(() => {
          const labelValues = [];
          const step = Math.ceil((yMax - yMin) / 5);
          for (let v = Math.ceil(yMin); v <= Math.floor(yMax); v += step) {
            labelValues.push(v);
          }
          return labelValues.map((value) => {
            const y = margin.top + innerHeight - ((value - yMin) / yRange) * innerHeight;
            return (
              <SvgText
                key={`y-label-${value}`}
                x={chartWidth - 10}
                y={y + 4}
                fontSize="10"
                fill="#9A9A9A"
                textAnchor="end"
              >
                {value.toFixed(0)}
              </SvgText>
            );
          });
        })()}
      </Svg>
    </View>
  );
};

// Chart Components from Energy Dashboard
const ConsumptionBreakdownChart = ({ theme }: { theme: any }) => {
  const data = [
    { name: 'Manufacturing', value: 35, color: '#775a96' },
    { name: 'Office', value: 25, color: '#10B981' },
    { name: 'Warehouse', value: 20, color: '#F59E0B' },
    { name: 'Other', value: 20, color: '#EF4444' },
  ];

  return (
    <View style={[styles.chartExampleSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.chartExampleHeader}>
        <View style={styles.chartExampleHeaderLeft}>
          <Ionicons name="pie-chart" size={20} color="#FF6B00" />
          <Text style={[styles.chartExampleTitle, { color: theme.text }]}>Consumption Breakdown</Text>
        </View>
        <Text style={[styles.chartExampleDescription, { color: theme.textSecondary }]}>
          Distribution of energy usage by area
        </Text>
      </View>
      <View style={styles.pieChartContainer}>
        <Text style={[styles.chartPlaceholder, { color: theme.textSecondary }]}>
          Pie Chart: {data.map(d => `${d.name} ${d.value}%`).join(', ')}
        </Text>
      </View>
      <View style={styles.chartExampleSummary}>
        <View style={[styles.summaryCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Text style={[styles.summaryValue, { color: '#FF6B00' }]}>{data[0].value}%</Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Top Consumer</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Text style={[styles.summaryValue, { color: theme.text }]}>
            {data.reduce((sum, d) => sum + d.value, 0)}%
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Total Coverage</Text>
        </View>
      </View>
    </View>
  );
};

const EnergyTrendChart = ({ theme }: { theme: any }) => {
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("24h");
  
  // Generate 1080 data points - pattern from 80 to 110 and back
  const dataPoints: number[] = [];
  const labels: string[] = [];
  
  for (let i = 0; i < 1080; i++) {
    const progress = i / 1080;
    const sinePattern = Math.sin(progress * Math.PI);
    const priceRange = 30;
    const basePrice = 80;
    const price = basePrice + (sinePattern * priceRange);
    const smallVariation = Math.sin(progress * Math.PI * 8) * 0.5;
    dataPoints.push(Math.max(79, Math.min(111, price + smallVariation)));
    
    if (i === 0) labels.push('8am');
    else if (i === 269) labels.push('12pm');
    else if (i === 540) labels.push('6pm');
    else if (i === 810) labels.push('12am');
    else if (i === 1079) labels.push('2am');
    else labels.push('');
  }
  
  const chartData = {
    labels,
    datasets: [{
      data: dataPoints,
    }],
  };

  const chartConfig = {
    backgroundColor: theme.card,
    backgroundGradientFrom: theme.card,
    backgroundGradientTo: theme.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 107, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(154, 154, 154, ${opacity})`,
    style: { borderRadius: 0 },
  };

  return (
    <View style={[styles.chartExampleSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.chartExampleHeader}>
        <View>
          <View style={styles.chartExampleHeaderLeft}>
            <Ionicons name="bar-chart" size={20} color="#FF6B00" />
            <Text style={[styles.chartExampleTitle, { color: theme.text }]}>Energy Consumption</Text>
          </View>
          <Text style={[styles.chartExampleDescription, { color: theme.textSecondary }]}>
            Total consumption across selected time periods
          </Text>
        </View>
        <View style={styles.timeRangeSelector}>
          {(['24h', '7d', '30d'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.timeRangeButton,
                { backgroundColor: theme.backgroundSecondary },
                timeRange === range && { backgroundColor: '#FF6B00' },
              ]}
              onPress={() => setTimeRange(range)}
            >
              <Text
                style={[
                  styles.timeRangeButtonText,
                  { color: theme.textSecondary },
                  timeRange === range && { color: '#000000', fontWeight: '600' },
                ]}
              >
                {range.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={SCREEN_WIDTH - 64}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withDots={true}
          withShadow={false}
          withVerticalLines={false}
          withHorizontalLines={true}
          segments={4}
        />
      </View>
    </View>
  );
};

const EnergyHeatmapChart = ({ theme }: { theme: any }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const getIntensity = (dayIndex: number, hour: number) => {
    let base = 0.3;
    if (dayIndex >= 5) base *= 0.7; // Weekend
    if (hour >= 6 && hour <= 8) base *= 1.8;
    else if (hour >= 9 && hour <= 17) base *= 1.5;
    else if (hour >= 18 && hour <= 21) base *= 1.6;
    else base *= 0.6;
    return Math.min(1, base);
  };

  const getIntensityColor = (intensity: number) => {
    const opacity = Math.max(0.1, intensity);
    return `rgba(255, 107, 0, ${opacity})`;
  };

  return (
    <View style={[styles.chartExampleSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.chartExampleHeader}>
        <View style={styles.chartExampleHeaderLeft}>
          <Ionicons name="calendar" size={20} color="#FF6B00" />
          <Text style={[styles.chartExampleTitle, { color: theme.text }]}>Energy Consumption Heatmap</Text>
        </View>
        <Text style={[styles.chartExampleDescription, { color: theme.textSecondary }]}>
          Weekly consumption patterns by hour and day
        </Text>
      </View>
      <View style={styles.heatmapContainer}>
        <View style={styles.heatmapGrid}>
          {days.map((day, dayIndex) => (
            <View key={day} style={styles.heatmapRow}>
              <Text style={[styles.heatmapDayLabel, { color: theme.textSecondary }]}>{day}</Text>
              <View style={styles.heatmapCells}>
                {hours.map((hour) => (
                  <View
                    key={`${day}-${hour}`}
                    style={[
                      styles.heatmapCell,
                      { backgroundColor: getIntensityColor(getIntensity(dayIndex, hour)) },
                    ]}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
        <View style={styles.heatmapLegend}>
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Low</Text>
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((intensity) => (
            <View
              key={intensity}
              style={[styles.legendColorBox, { backgroundColor: getIntensityColor(intensity) }]}
            />
          ))}
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>High</Text>
        </View>
      </View>
    </View>
  );
};

const LoadDurationCurveChart = ({ theme }: { theme: any }) => {
  const loadData = Array.from({ length: 24 }, (_, i) => ({
    hours: i + 1,
    load: 200 + Math.random() * 300,
  })).sort((a, b) => b.load - a.load);

  const peakLoad = Math.max(...loadData.map(d => d.load));
  const threshold80 = peakLoad * 0.8;

  const chartData = {
    labels: loadData.map((_, i) => (i % 4 === 0 ? `${i + 1}h` : '')),
    datasets: [{
      data: loadData.map(d => d.load),
    }],
  };

  const chartConfig = {
    backgroundColor: theme.card,
    backgroundGradientFrom: theme.card,
    backgroundGradientTo: theme.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 107, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(154, 154, 154, ${opacity})`,
    style: { borderRadius: 0 },
  };

  return (
    <View style={[styles.chartExampleSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.chartExampleHeader}>
        <View style={styles.chartExampleHeaderLeft}>
          <Ionicons name="trending-down" size={20} color="#FF6B00" />
          <Text style={[styles.chartExampleTitle, { color: theme.text }]}>Load Duration Curve (24h)</Text>
        </View>
        <Text style={[styles.chartExampleDescription, { color: theme.textSecondary }]}>
          Load distribution over time for demand response planning
        </Text>
      </View>
      <View style={styles.chartExampleSummary}>
        <View style={[styles.summaryCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Text style={[styles.summaryValue, { color: '#FF6B00' }]}>
            {loadData.filter(d => d.load >= threshold80).length}h
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Time &gt; 80% Peak</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Text style={[styles.summaryValue, { color: theme.text }]}>{peakLoad.toFixed(0)}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Peak Load (kW)</Text>
        </View>
      </View>
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={SCREEN_WIDTH - 64}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withDots={false}
          withShadow={false}
          withVerticalLines={false}
          withHorizontalLines={true}
          withFill={true}
        />
      </View>
    </View>
  );
};

const PowerDistributionPieChart = ({ theme }: { theme: any }) => {
  const data = [
    { name: 'Phase 1', value: 35, color: '#775a96' },
    { name: 'Phase 2', value: 33, color: '#10B981' },
    { name: 'Phase 3', value: 32, color: '#F59E0B' },
  ];

  return (
    <View style={[styles.chartExampleSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.chartExampleHeader}>
        <View style={styles.chartExampleHeaderLeft}>
          <Ionicons name="pie-chart" size={20} color="#FF6B00" />
          <Text style={[styles.chartExampleTitle, { color: theme.text }]}>Load Distribution</Text>
        </View>
        <Text style={[styles.chartExampleDescription, { color: theme.textSecondary }]}>
          Power distribution across phases
        </Text>
      </View>
      <View style={styles.pieChartContainer}>
        <Text style={[styles.chartPlaceholder, { color: theme.textSecondary }]}>
          Pie Chart: {data.map(d => `${d.name} ${d.value}%`).join(', ')}
        </Text>
      </View>
    </View>
  );
};

const PowerSpikesChart = ({ theme }: { theme: any }) => {
  // Generate 1080 data points - pattern from 80 to 110 and back
  const dataPoints: number[] = [];
  const labels: string[] = [];
  
  for (let i = 0; i < 1080; i++) {
    const progress = i / 1080;
    const sinePattern = Math.sin(progress * Math.PI);
    const priceRange = 30;
    const basePrice = 80;
    const price = basePrice + (sinePattern * priceRange);
    const smallVariation = Math.sin(progress * Math.PI * 8) * 0.5;
    dataPoints.push(Math.max(79, Math.min(111, price + smallVariation)));
    
    if (i === 0) labels.push('8am');
    else if (i === 269) labels.push('12pm');
    else if (i === 540) labels.push('6pm');
    else if (i === 810) labels.push('12am');
    else if (i === 1079) labels.push('2am');
    else labels.push('');
  }

  const chartData = {
    labels,
    datasets: [{
      data: dataPoints,
    }],
  };

  const chartConfig = {
    backgroundColor: theme.card,
    backgroundGradientFrom: theme.card,
    backgroundGradientTo: theme.card,
    decimalPlaces: 4,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(154, 154, 154, ${opacity})`,
    style: { borderRadius: 0 },
  };

  return (
    <View style={[styles.chartExampleSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.chartExampleHeader}>
        <View style={styles.chartExampleHeaderLeft}>
          <Ionicons name="trending-up" size={20} color="#FF6B00" />
          <Text style={[styles.chartExampleTitle, { color: theme.text }]}>Power Spikes This Week</Text>
        </View>
        <Text style={[styles.chartExampleDescription, { color: theme.textSecondary }]}>
          Rate of power change over the last 7 days
        </Text>
      </View>
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={SCREEN_WIDTH - 64}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withDots={true}
          withShadow={false}
          withVerticalLines={false}
          withHorizontalLines={true}
          withFill={true}
        />
      </View>
    </View>
  );
};

const HourlyPowerBreakdownChart = ({ theme }: { theme: any }) => {
  const breakdownData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    base: 50 + Math.random() * 30,
    peak: 30 + Math.random() * 40,
    auxiliary: 20 + Math.random() * 20,
  }));

  const chartData = {
    labels: breakdownData.map((_, i) => (i % 4 === 0 ? `${i}:00` : '')),
    datasets: [
      {
        data: breakdownData.map(d => d.base),
        color: (opacity = 1) => `rgba(119, 90, 150, ${opacity})`,
      },
      {
        data: breakdownData.map(d => d.peak),
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
      },
      {
        data: breakdownData.map(d => d.auxiliary),
        color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: theme.card,
    backgroundGradientFrom: theme.card,
    backgroundGradientTo: theme.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(119, 90, 150, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(154, 154, 154, ${opacity})`,
    style: { borderRadius: 0 },
  };

  return (
    <View style={[styles.chartExampleSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.chartExampleHeader}>
        <View style={styles.chartExampleHeaderLeft}>
          <Ionicons name="pulse" size={20} color="#FF6B00" />
          <Text style={[styles.chartExampleTitle, { color: theme.text }]}>Hourly Power by Device</Text>
        </View>
        <Text style={[styles.chartExampleDescription, { color: theme.textSecondary }]}>
          24-hour power consumption breakdown
        </Text>
      </View>
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={SCREEN_WIDTH - 64}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withDots={false}
          withShadow={false}
          withVerticalLines={false}
          withHorizontalLines={true}
        />
      </View>
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#775a96' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Base Load</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Peak Load</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Auxiliary</Text>
        </View>
      </View>
    </View>
  );
};

const EnergyConsumptionChart = ({ theme }: { theme: any }) => {
  const [chartView, setChartView] = useState<"consumption" | "cost" | "efficiency">("consumption");
  
  // Generate 1080 data points - pattern from 80 to 110 and back
  const dataPoints: number[] = [];
  const labels: string[] = [];
  
  for (let i = 0; i < 1080; i++) {
    const progress = i / 1080;
    const sinePattern = Math.sin(progress * Math.PI);
    const priceRange = 30;
    const basePrice = 80;
    const price = basePrice + (sinePattern * priceRange);
    const smallVariation = Math.sin(progress * Math.PI * 8) * 0.5;
    dataPoints.push(Math.max(79, Math.min(111, price + smallVariation)));
    
    if (i === 0) labels.push('8am');
    else if (i === 269) labels.push('12pm');
    else if (i === 540) labels.push('6pm');
    else if (i === 810) labels.push('12am');
    else if (i === 1079) labels.push('2am');
    else labels.push('');
  }

  const chartData = {
    labels,
    datasets: [{
      data: dataPoints,
    }],
  };

  const chartConfig = {
    backgroundColor: theme.card,
    backgroundGradientFrom: theme.card,
    backgroundGradientTo: theme.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 107, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(154, 154, 154, ${opacity})`,
    style: { borderRadius: 0 },
  };

  // Calculate summary values from dataPoints
  const totalValue = dataPoints.reduce((sum, value) => sum + value, 0);
  const avgValue = totalValue / dataPoints.length;
  const maxValue = Math.max(...dataPoints);

  return (
    <View style={[styles.chartExampleSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.chartExampleHeader}>
        <View style={styles.chartExampleHeaderLeft}>
          <Ionicons name="bar-chart" size={20} color="#FF6B00" />
          <Text style={[styles.chartExampleTitle, { color: theme.text }]}>Energy Consumption Chart</Text>
        </View>
        <View style={styles.timeRangeSelector}>
          {(['consumption', 'cost', 'efficiency'] as const).map((view) => (
            <TouchableOpacity
              key={view}
              style={[
                styles.timeRangeButton,
                { backgroundColor: theme.backgroundSecondary },
                chartView === view && { backgroundColor: '#FF6B00' },
              ]}
              onPress={() => setChartView(view)}
            >
              <Text
                style={[
                  styles.timeRangeButtonText,
                  { color: theme.textSecondary },
                  chartView === view && { color: '#000000', fontWeight: '600' },
                ]}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.chartExampleSummary}>
        <View style={[styles.summaryCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Text style={[styles.summaryValue, { color: '#FF6B00' }]}>
            {totalValue.toFixed(0)}
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Total</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Text style={[styles.summaryValue, { color: theme.text }]}>
            {avgValue.toFixed(0)}
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Average</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Text style={[styles.summaryValue, { color: '#10B981' }]}>
            {maxValue.toFixed(0)}
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Peak</Text>
        </View>
      </View>
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={SCREEN_WIDTH - 64}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withDots={true}
          withShadow={false}
          withVerticalLines={false}
          withHorizontalLines={true}
        />
      </View>
    </View>
  );
};

// Performance Chart Component (like EntityScreen but with 1D, 1M, 3M, 6M, 1Y)
const PerformanceChart = ({ theme }: { theme: any }) => {
  const [timeRange, setTimeRange] = useState<'1D' | '1M' | '3M' | '6M' | '1Y'>('6M');
  
  // Generate 1080 data points - pattern goes from 80 to 110 and back down
  const generateChartData = useMemo(() => {
    const dataPoints: number[] = [];
    
    for (let i = 0; i < 1080; i++) {
      const progress = i / 1080;
      const sinePattern = Math.sin(progress * Math.PI);
      const priceRange = 30; // 80 to 110
      const basePrice = 80;
      const price = basePrice + (sinePattern * priceRange);
      const smallVariation = Math.sin(progress * Math.PI * 8) * 0.5;
      const finalPrice = price + smallVariation;
      dataPoints.push(Math.max(79, Math.min(111, finalPrice)));
    }
    
    // Labels for x-axis - show key points
    const labels: string[] = [];
    for (let i = 0; i < 1080; i++) {
      if (i === 0) labels.push('8am');
      else if (i === 269) labels.push('12pm');
      else if (i === 540) labels.push('6pm');
      else if (i === 810) labels.push('12am');
      else if (i === 1079) labels.push('2am');
      else labels.push('');
    }
    
    return {
      labels,
      datasets: [{
        data: dataPoints,
      }],
    };
  }, [timeRange]);

  const chartConfig = {
    backgroundColor: '#1B1B1B',
    backgroundGradientFrom: '#1B1B1B',
    backgroundGradientTo: '#1B1B1B',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`, // Light green
    labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
    style: {
      borderRadius: 0,
    },
    propsForDots: {
      r: '0',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#374151',
      strokeWidth: 1,
    },
  };

  // Calculate Y-axis range
  const dataMin = Math.min(...generateChartData.datasets[0].data);
  const dataMax = Math.max(...generateChartData.datasets[0].data);
  const yMin = Math.floor(dataMin / 50) * 50 - 50;
  const yMax = Math.ceil(dataMax / 50) * 50 + 50;

  return (
    <View style={[styles.chartExampleSection, { backgroundColor: '#1B1B1B', borderColor: '#2A2A2A' }]}>
      {/* Header */}
      <View style={styles.performanceChartHeader}>
        <View style={styles.performanceChartHeaderLeft}>
          <Text style={styles.performanceChartTitle}>Performance</Text>
          <View style={styles.tickerBadge}>
            <Ionicons name="close-circle" size={12} color="#EF4444" />
            <Text style={styles.tickerText}>TSLA</Text>
          </View>
        </View>
        <View style={styles.performanceChartHeaderRight}>
          <View style={styles.timeRangeSelector}>
            {(['1D', '1M', '3M', '6M', '1Y'] as const).map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.performanceTimeRangeButton,
                  { backgroundColor: 'transparent' },
                  timeRange === range && { backgroundColor: '#374151' },
                ]}
                onPress={() => setTimeRange(range)}
              >
                <Text
                  style={[
                    styles.performanceTimeRangeText,
                    { color: '#9CA3AF' },
                    timeRange === range && { color: '#FFFFFF', fontWeight: '600' },
                  ]}
                >
                  {range}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.performanceChartIcons}>
            <TouchableOpacity style={styles.performanceIconButton}>
              <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.performanceIconButton}>
              <Ionicons name="download-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.performanceChartContainer}>
        <LineChart
          data={generateChartData}
          width={SCREEN_WIDTH - 64}
          height={280}
          chartConfig={chartConfig}
          bezier
          style={styles.performanceChart}
          withDots={false}
          withShadow={false}
          withVerticalLines={false}
          withHorizontalLines={true}
          withInnerLines={true}
          segments={4}
        />
      </View>
    </View>
  );
};

// Trading algorithm types
type ModeType = "Custom" | "IPO" | "PositiveIPO" | "NegativeIPO" | "BadNews" | "GoodNews" | "NormalDay" | "ExtremeVolatility";

interface LiveDataPoint {
  time: number;
  price: number;
  posTokens: number;
  negTokens: number;
  netConviction: number;
  deltaConviction: number;
  convictionPressure: number;
  r: number;
}

export default function ChartDevelopmentScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  
  // Core state
  const [price, setPrice] = useState(100);
  const [isLiveSimulation, setIsLiveSimulation] = useState(false);
  const [liveTime, setLiveTime] = useState(0);
  const [liveData, setLiveData] = useState<LiveDataPoint[]>([]);
  const [simulationSpeed, setSimulationSpeed] = useState(1000);
  const [prevNetConviction, setPrevNetConviction] = useState(0);
  const [z_t, setZ_t] = useState(0);
  
  // Essential variables for momentum-based dual-token conviction system
  const [B_H, setBH] = useState(6000); // Buy pressure (posTokens)
  const [S_H, setSH] = useState(4000); // Sell pressure (negTokens)
  const [A, setA] = useState(3.0); // Amplitude (volatility multiplier)
  const [L0, setL0] = useState(150000); // Base liquidity
  const [USERS, setUSERS] = useState(1000); // Active users
  const [TOTAL_TOKENS, setTotalTokens] = useState(500000);
  const [ACTIVE_TOKEN_RATIO, setActiveTokenRatio] = useState(0.5);
  const [LAMBDA_TOKENS, setLambdaTokens] = useState(0.3);
  
  // Mode system
  const [mode, setMode] = useState<ModeType>("Custom");
  const [currentPressure, setCurrentPressure] = useState({ targetBH: B_H, targetSH: S_H, note: "" });
  const [currentBH, setCurrentBH] = useState(B_H);
  const [currentSH, setCurrentSH] = useState(S_H);

  // Example Entity Chart Simulator state
  const [entitySimulatorRunning, setEntitySimulatorRunning] = useState(false);
  const [entitySimulatorIndex, setEntitySimulatorIndex] = useState(1); // Start at point 1/1080
  const [entitySimulatorSpeed, setEntitySimulatorSpeed] = useState(50); // ms per point


  // Get initial opening volumes for each mode
  const getInitialVolumes = (mode: ModeType) => {
    switch (mode) {
      case "IPO":
        return { initialBH: 7000, initialSH: 3000 };
      case "PositiveIPO":
        return { initialBH: 8000, initialSH: 2000 };
      case "NegativeIPO":
        return { initialBH: 3000, initialSH: 8000 };
      case "BadNews":
        return { initialBH: 6000, initialSH: 8000 };
      case "GoodNews":
        return { initialBH: 6000, initialSH: 4000 };
      case "NormalDay":
        return { initialBH: 6000, initialSH: 4000 };
      case "ExtremeVolatility":
        return { initialBH: 6500, initialSH: 3500 };
      default:
        return { initialBH: B_H, initialSH: S_H };
    }
  };

  // Get time-based pressure adjustments (simplified version - includes key modes)
  const getTimeBasedPressure = (timeStep: number): { targetBH: number; targetSH: number; note: string } => {
    const hourRaw = timeStep / 60 + 8;
    const hour = Math.floor(hourRaw);
    const minuteBlock = Math.floor((timeStep % 60) / 30);
    const minuteBlock15 = Math.floor((timeStep % 60) / 15);
    
    switch (mode) {
      case "PositiveIPO":
        if (hour >= 8 && hour < 9) {
          if (minuteBlock15 === 0) return { targetBH: 18000, targetSH: 5000, note: "8:00-8:15 AM: Massive buying begins" };
          if (minuteBlock15 === 1) return { targetBH: 18500, targetSH: 4800, note: "8:15-8:30 AM: Massive buying continues" };
          if (minuteBlock15 === 2) return { targetBH: 19000, targetSH: 4600, note: "8:30-8:45 AM: Buying intensifies" };
          return { targetBH: 19500, targetSH: 4500, note: "8:45-9 AM: Reaching ~$140" };
        } else if (hour >= 9 && hour < 10) {
          if (minuteBlock15 === 0) return { targetBH: 20000, targetSH: 4000, note: "9:00-9:15 AM: Peak at ~$140" };
          if (minuteBlock15 === 1) return { targetBH: 19800, targetSH: 4200, note: "9:15-9:30 AM: Sustaining peak" };
          if (minuteBlock15 === 2) return { targetBH: 19600, targetSH: 4350, note: "9:30-9:45 AM: Holding strong" };
          return { targetBH: 19500, targetSH: 4500, note: "9:45-10 AM: Maintaining peak" };
        } else if (hour >= 11 && hour < 12) {
          if (minuteBlock15 === 0) return { targetBH: 12500, targetSH: 9000, note: "11:00-11:15 AM: Profit taking begins" };
          if (minuteBlock15 === 1) return { targetBH: 11000, targetSH: 10000, note: "11:15-11:30 AM: Profit taking continues" };
          if (minuteBlock15 === 2) return { targetBH: 10000, targetSH: 10700, note: "11:30-11:45 AM: Selling intensifies" };
          return { targetBH: 9500, targetSH: 11000, note: "11:45-12 PM: Profit taking peaks" };
        } else if (hour >= 18 && hour < 20) {
          if (minuteBlock15 === 0) return { targetBH: 20000, targetSH: 4000, note: "6:00-6:15 PM: Peak momentum to $145" };
          if (minuteBlock15 === 1) return { targetBH: 19800, targetSH: 4300, note: "6:15-6:30 PM: Sustaining momentum" };
          if (minuteBlock15 === 2) return { targetBH: 19600, targetSH: 4500, note: "6:30-6:45 PM: Holding strong" };
          return { targetBH: 19400, targetSH: 4600, note: "6:45-7 PM: Maintaining strength" };
        } else {
          return { targetBH: 16000, targetSH: 6800, note: "Late session: Strength maintained" };
        }
      
      case "NormalDay":
        if (hour >= 8 && hour < 9) {
          if (minuteBlock15 === 0) return { targetBH: 7000, targetSH: 5000, note: "8:00-8:15 AM: Market open - balanced" };
          if (minuteBlock15 === 1) return { targetBH: 7300, targetSH: 4900, note: "8:15-8:30 AM: Slight activity" };
          if (minuteBlock15 === 2) return { targetBH: 7600, targetSH: 4800, note: "8:30-8:45 AM: Building" };
          return { targetBH: 8000, targetSH: 4700, note: "8:45-9 AM: Optimism building" };
        } else if (hour >= 12 && hour < 13) {
          if (minuteBlock15 === 0) return { targetBH: 8000, targetSH: 4700, note: "12:00-12:15 PM: Lunch slowdown" };
          if (minuteBlock15 === 1) return { targetBH: 7800, targetSH: 4900, note: "12:15-12:30 PM: Lunch deep" };
          if (minuteBlock15 === 2) return { targetBH: 7500, targetSH: 5000, note: "12:30-12:45 PM: Quiet period" };
          return { targetBH: 7200, targetSH: 5100, note: "12:45-1 PM: Lunch ending" };
        } else {
          return { targetBH: 7000, targetSH: 5000, note: "Market closed" };
        }
      
      default:
        return { targetBH: B_H, targetSH: S_H, note: "Custom" };
    }
  };

  // Momentum-based additive price formula
  const updatePriceRealistic = (
    currentPrice: number,
    posTokens: number,
    negTokens: number,
    liquidity: number,
    volume: number,
    currentZ_t: number,
    _medianCP: number
  ) => {
    // Pure momentum-based additive model
    // r_t = A × Δf_t × (V_t / L_t)
    // P_(t+1) = P_t + r_t
    
    const epsilon = 1e-9;
    const f_t = (posTokens - negTokens) / (posTokens + negTokens + epsilon);
    const deltaF_t = f_t - currentZ_t;
    const V_t = volume;
    const L_t = liquidity;
    const rate = A * deltaF_t * (V_t / L_t) * 100;
    const nextPrice = Math.max(0.01, currentPrice + rate);
    
    return { nextPrice, rate, cp: f_t, newZ_t: f_t };
  };

  // Live simulation effect
  useEffect(() => {
    if (!isLiveSimulation) return;

    const interval = setInterval(() => {
      const pressure = getTimeBasedPressure(liveTime);
      setCurrentPressure(pressure);
      
      let newBH, newSH;
      
      if (mode !== "Custom") {
        const blockSize = (mode === "GoodNews") ? 5 : 15;
        const blockStartTime = liveTime - (liveTime % blockSize);
        const currentPressure = getTimeBasedPressure(blockStartTime);
        newBH = currentPressure.targetBH;
        newSH = currentPressure.targetSH;
      } else {
        newBH = B_H;
        newSH = S_H;
      }
      
      setCurrentBH(newBH);
      setCurrentSH(newSH);
      
      const adjustedBH = newBH;
      const adjustedSH = newSH;
      let B_t = adjustedBH;
      let S_t = adjustedSH;
      let V_t = B_t + S_t;
      const ACTIVE_TOKENS = TOTAL_TOKENS * ACTIVE_TOKEN_RATIO;
      let L_t = L0 + LAMBDA_TOKENS * ACTIVE_TOKENS;
      const netConviction = currentBH - currentSH;
      
      let nextPrice, r_t, cp;
      if (mode !== "PositiveIPO" && mode !== "NegativeIPO" && mode !== "IPO" && liveTime === 0) {
        nextPrice = price;
        r_t = 0;
        cp = 0;
      } else {
        const medianCP = 0.05;
        const priceResult = updatePriceRealistic(price, B_t, S_t, L_t, V_t, z_t, medianCP);
        nextPrice = priceResult.nextPrice;
        r_t = priceResult.rate;
        cp = priceResult.cp;
      }
      
      if (!(mode !== "PositiveIPO" && mode !== "NegativeIPO" && mode !== "IPO" && liveTime === 0)) {
        setZ_t(cp);
      }
      
      const deltaNetConviction = netConviction - prevNetConviction;
      setPrevNetConviction(netConviction);
      
      const newDataPoint: LiveDataPoint = {
        time: liveTime,
        price: nextPrice,
        posTokens: currentBH,
        negTokens: currentSH,
        netConviction: netConviction,
        deltaConviction: deltaNetConviction,
        convictionPressure: cp * (V_t / L_t),
        r: r_t
      };

      setLiveData(prev => [...prev, newDataPoint]);
      
      const newTime = liveTime + 1;
      setLiveTime(newTime);
      setPrice(nextPrice);
      
      if (newTime >= 1080) {
        setIsLiveSimulation(false);
      }
    }, simulationSpeed);

    return () => clearInterval(interval);
  }, [isLiveSimulation, B_H, S_H, A, L0, USERS, price, prevNetConviction, simulationSpeed, liveTime, mode, currentBH, currentSH, z_t, TOTAL_TOKENS, ACTIVE_TOKEN_RATIO, LAMBDA_TOKENS]);

  const resetSimulation = () => {
    const initialVolumes = getInitialVolumes(mode);
    let startingPrice = 100;
    if (mode === "PositiveIPO" || mode === "NegativeIPO" || mode === "IPO") {
      const openingRatio = initialVolumes.initialBH / Math.max(1, initialVolumes.initialSH);
      const SCALE_FACTOR = 0.15;
      const logRatio = Math.log(Math.max(0.01, Math.min(100, openingRatio)));
      const priceAdjustment = logRatio * SCALE_FACTOR;
      startingPrice = 100 * (1 + priceAdjustment);
    }
    
    setPrice(startingPrice);
    setLiveTime(0);
    setLiveData([]);
    setPrevNetConviction(0);
    setZ_t(0);
    setIsLiveSimulation(false);
    setCurrentBH(initialVolumes.initialBH);
    setCurrentSH(initialVolumes.initialSH);
  };
  
  useEffect(() => {
    if (!isLiveSimulation) {
      const initialVolumes = getInitialVolumes(mode);
      setCurrentBH(initialVolumes.initialBH);
      setCurrentSH(initialVolumes.initialSH);
      
      if (mode !== "Custom") {
        setBH(initialVolumes.initialBH);
        setSH(initialVolumes.initialSH);
        
        if (mode === "PositiveIPO" || mode === "NegativeIPO" || mode === "IPO") {
          const openingRatio = initialVolumes.initialBH / Math.max(1, initialVolumes.initialSH);
          const SCALE_FACTOR = 0.15;
          const logRatio = Math.log(Math.max(0.01, Math.min(100, openingRatio)));
          const priceAdjustment = logRatio * SCALE_FACTOR;
          const startingPrice = 100 * (1 + priceAdjustment);
          setPrice(startingPrice);
        } else {
          setPrice(100);
        }
      }
    }
  }, [mode, isLiveSimulation]);

  // Entity Chart Simulator effect
  useEffect(() => {
    if (!entitySimulatorRunning || entitySimulatorIndex >= 1080) {
      return;
    }

    const interval = setInterval(() => {
      setEntitySimulatorIndex(prev => {
        if (prev >= 1080) {
          setEntitySimulatorRunning(false);
          return 1080;
        }
        return prev + 1;
      });
    }, entitySimulatorSpeed);

    return () => clearInterval(interval);
  }, [entitySimulatorRunning, entitySimulatorIndex, entitySimulatorSpeed]);

  // Fixed width for full day chart (1080 minutes = 18 hours)
  const FULL_DAY_WIDTH = Math.max(SCREEN_WIDTH - 64, 1080 * 1.2);

  // Calculate price range and percentage changes
  const priceRange = useMemo(() => {
    if (liveData.length === 0) {
      return {
        min: price,
        max: price,
        current: price,
        startPrice: price,
        topPercent: 0,
        bottomPercent: 0,
      };
    }
    
    const prices = liveData.map(p => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const current = liveData[liveData.length - 1].price;
    const startPrice = liveData[0]?.price || price;
    
    // Calculate percentage changes from start
    const topPercent = ((max - startPrice) / startPrice) * 100;
    const bottomPercent = ((min - startPrice) / startPrice) * 100;
    
    return { min, max, current, startPrice, topPercent, bottomPercent };
  }, [liveData, price]);

  // Prepare chart data from live data - show full 18-hour day (8am to 2am)
  const chartData = useMemo(() => {
    // Always prepare data for full 1080 minutes (18 hours)
    const fullDayLabels: string[] = [];
    const fullDayData: number[] = [];
    
    // Create labels for full day - minimal labels
    for (let i = 0; i <= 1080; i++) {
      fullDayLabels.push(''); // No X-axis labels for cleaner look
      
      // Use actual data if available, otherwise use placeholder
      const dataPoint = liveData.find(p => p.time === i);
      if (dataPoint) {
        fullDayData.push(dataPoint.price);
      } else if (liveData.length > 0) {
        // If we have some data but not this point, use the last known price
        const lastPrice = liveData[liveData.length - 1].price;
        fullDayData.push(lastPrice);
      } else {
        // No data yet, use starting price
        fullDayData.push(price);
      }
    }

    return {
      labels: fullDayLabels,
      datasets: [
        {
          data: fullDayData,
          color: (opacity = 1) => `rgba(20, 184, 166, ${opacity})`, // Teal color
          strokeWidth: 2,
        },
      ],
      legend: [],
    };
  }, [liveData, price]);

  // Calculate Y-axis range with padding
  const yAxisRange = useMemo(() => {
    if (liveData.length === 0) {
      const padding = price * 0.05; // 5% padding
      return {
        min: price - padding,
        max: price + padding,
      };
    }
    
    const priceRangeSpan = priceRange.max - priceRange.min;
    const padding = priceRangeSpan * 0.1; // 10% padding
    return {
      min: priceRange.min - padding,
      max: priceRange.max + padding,
    };
  }, [liveData, priceRange, price]);

  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(20, 184, 166, ${opacity})`, // Teal color
    labelColor: (opacity = 1) => `rgba(20, 184, 166, ${opacity})`, // Teal for labels
    style: {
      borderRadius: 0,
    },
    fillShadowGradient: '#14B8A6', // Teal for area fill
    fillShadowGradientOpacity: 0.2, // Translucent area fill
    yAxisMin: yAxisRange.min,
    yAxisMax: yAxisRange.max,
    propsForDots: {
      r: '0', // Hide dots by default, we'll add custom indicator
      strokeWidth: '0',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: 'transparent', // Hide background lines
      strokeWidth: 0,
    },
    formatYLabel: (value: string) => '', // Hide Y-axis labels, we'll add custom ones
  };

  const modes: ModeType[] = ["Custom", "IPO", "PositiveIPO", "NegativeIPO", "BadNews", "GoodNews", "NormalDay", "ExtremeVolatility"];

  // Generate normal day data - starts at 80, goes up to 110, then back down to 100
  const generateNormalData = useMemo(() => {
    const dataPoints: number[] = [];
    for (let i = 0; i < 1080; i++) {
      const progress = i / 1080;
      const basePrice = 80;
      const peakPrice = 110;
      const endPrice = 100;
      const upRange = peakPrice - basePrice;
      const downRange = peakPrice - endPrice;
      
      let price;
      if (progress <= 0.5) {
        const halfProgress = progress * 2;
        price = basePrice + (halfProgress * upRange);
      } else {
        const halfProgress = (progress - 0.5) * 2;
        price = peakPrice - (halfProgress * downRange);
      }
      
      const smallVariation = (Math.sin(progress * Math.PI * 8) * 0.5);
      const finalPrice = price + smallVariation;
      dataPoints.push(Math.max(79, Math.min(111, finalPrice)));
    }
    return dataPoints;
  }, []);

  // Generate spike scenario data - huge spike around point 100/1080
  const generateSpikeData = useMemo(() => {
    const dataPoints: number[] = [];
    const spikePoint = 100; // News comes out at point 100/1080
    const basePrice = 80;
    
    for (let i = 0; i < 1080; i++) {
      if (i < spikePoint) {
        // Before spike: gradual rise from 80
        const progress = i / spikePoint;
        const price = basePrice + (progress * 5); // Gradual rise to ~85
        dataPoints.push(Math.max(79, Math.min(200, price + Math.sin(progress * Math.PI * 4) * 0.3)));
      } else if (i === spikePoint) {
        // At spike point: huge jump to 140
        dataPoints.push(140);
      } else if (i < spikePoint + 50) {
        // After spike: rapid rise continues, then starts to fall
        const progress = (i - spikePoint) / 50;
        const spikePeak = 140 + (progress * 20); // Continue up to 160
        dataPoints.push(Math.max(140, Math.min(200, spikePeak + Math.sin(progress * Math.PI * 2) * 2)));
      } else {
        // Later: gradual decline back down
        const progress = (i - spikePoint - 50) / (1080 - spikePoint - 50);
        const declinePrice = 160 - (progress * 60); // Decline from 160 back to ~100
        dataPoints.push(Math.max(100, Math.min(200, declinePrice + Math.sin(progress * Math.PI * 6) * 1)));
      }
    }
    return dataPoints;
  }, []);

  // Fake entity data for example chart - exactly 1080 data points (one per minute)
  // Each point is (minute_index, price_value) where index goes from 0 to 1079 (representing minutes 1-1080)
  const fakeEntityData = useMemo(() => {
    const dataPoints = chartScenario === 'normal' ? generateNormalData : generateSpikeData;
    
    const prices = dataPoints; // Exactly 1080 points: (price at minute 1, price at minute 2, ..., price at minute 1080)
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const current = prices[prices.length - 1]; // Last point (minute 1079, which is 2am)
    const startPrice = prices[0]; // First point (minute 0, which is 8am)
    const topPercent = ((max - startPrice) / startPrice) * 100;
    const bottomPercent = ((min - startPrice) / startPrice) * 100;
    const change = current - startPrice;
    const changePercent = (change / startPrice) * 100;
    
    return {
      name: 'Example Entity',
      ticker: 'EXMP',
      currentPrice: current,
      startPrice,
      change,
      changePercent,
      prices,
      min,
      max,
      topPercent,
      bottomPercent,
    };
  }, [chartScenario, generateNormalData, generateSpikeData]);

  // Entity chart Y-axis range
  const entityYAxisRange = useMemo(() => {
    const priceRangeSpan = fakeEntityData.max - fakeEntityData.min;
    const padding = priceRangeSpan * 0.1;
    return {
      min: fakeEntityData.min - padding,
      max: fakeEntityData.max + padding,
    };
  }, [fakeEntityData]);

  // Animation state for chart playback
  const [chartPlaybackIndex, setChartPlaybackIndex] = useState(1); // Start at point 1/1080
  const [chartPlaybackRunning, setChartPlaybackRunning] = useState(false);
  const [chartScenario, setChartScenario] = useState<'normal' | 'spike'>('normal');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1min' | 'coming-soon'>('1min');

  // Multi Entity Chart - Three entities with different colors
  const multiEntityData = useMemo(() => {
    const numPoints = 50;
    
    // Alix Earle - ending at 200
    const alixEarlePrices: number[] = [];
    let alixPrice = 170 + (Math.random() - 0.5) * 20; // Random starting price around 170
    for (let i = 0; i < numPoints; i++) {
      const progress = i / (numPoints - 1);
      const targetPrice = 200;
      // Random walk towards target, with more weight on target as we progress
      alixPrice = alixPrice * (1 - progress * 0.1) + targetPrice * (progress * 0.1) + (Math.random() - 0.5) * 8;
      if (i === numPoints - 1) {
        alixPrice = targetPrice; // Ensure exact ending price
      }
      alixEarlePrices.push(Math.max(150, Math.min(210, alixPrice)));
    }
    
    // Mr Beast - ending at 188.98
    const mrBeastPrices: number[] = [];
    let mrBeastPrice = 160 + (Math.random() - 0.5) * 20; // Random starting price around 160
    for (let i = 0; i < numPoints; i++) {
      const progress = i / (numPoints - 1);
      const targetPrice = 188.98;
      mrBeastPrice = mrBeastPrice * (1 - progress * 0.1) + targetPrice * (progress * 0.1) + (Math.random() - 0.5) * 8;
      if (i === numPoints - 1) {
        mrBeastPrice = targetPrice; // Ensure exact ending price
      }
      mrBeastPrices.push(Math.max(140, Math.min(200, mrBeastPrice)));
    }
    
    // Logan Paul - ending at 186.25
    const loganPaulPrices: number[] = [];
    let loganPrice = 155 + (Math.random() - 0.5) * 20; // Random starting price around 155
    for (let i = 0; i < numPoints; i++) {
      const progress = i / (numPoints - 1);
      const targetPrice = 186.25;
      loganPrice = loganPrice * (1 - progress * 0.1) + targetPrice * (progress * 0.1) + (Math.random() - 0.5) * 8;
      if (i === numPoints - 1) {
        loganPrice = targetPrice; // Ensure exact ending price
      }
      loganPaulPrices.push(Math.max(135, Math.min(195, loganPrice)));
    }
    
    return {
      alixEarle: alixEarlePrices,
      mrBeast: mrBeastPrices,
      loganPaul: loganPaulPrices,
    };
  }, []);

  // Multi Entity Chart dimensions
  const multiEntityChartHeight = 220;
  const multiEntityChartWidth = SCREEN_WIDTH;
  const multiEntityMargin = { top: 50, right: 0, left: 0, bottom: 0 };
  const multiEntityInnerWidth = multiEntityChartWidth - multiEntityMargin.left - multiEntityMargin.right;
  const multiEntityInnerHeight = multiEntityChartHeight - multiEntityMargin.top - multiEntityMargin.bottom;

  // Calculate Y domain for multi entity chart - include all three datasets
  const multiEntityYDomain = useMemo(() => {
    const allPrices = [...multiEntityData.alixEarle, ...multiEntityData.mrBeast, ...multiEntityData.loganPaul];
    if (allPrices.length === 0) {
      const price = 180;
      const padding = price * 0.1;
      return { yMin: price - padding, yMax: price + padding, yRange: padding * 2 };
    }
    const fullDataMin = Math.min(...allPrices);
    const fullDataMax = Math.max(...allPrices);
    const dataRange = fullDataMax - fullDataMin;
    const yMin = fullDataMin - dataRange * 0.1;
    const yMax = fullDataMax + dataRange * 0.1;
    const yRange = yMax - yMin;
    return { yMin, yMax, yRange };
  }, [multiEntityData]);

  // Generate line path helper function
  const generateLinePath = (prices: number[]) => {
    if (prices.length === 0) return '';
    
    const totalPoints = prices.length;
    const pointSpacing = multiEntityInnerWidth / Math.max(1, totalPoints - 1);
    
    const points = prices.map((price, i) => {
      const x = multiEntityMargin.left + (i * pointSpacing);
      const y = multiEntityMargin.top + multiEntityInnerHeight - ((price - multiEntityYDomain.yMin) / multiEntityYDomain.yRange) * multiEntityInnerHeight;
      return { x, y };
    });

    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y}`;
    }

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1] || curr;
      
      const dx1 = (curr.x - prev.x) / 3;
      const dy1 = (curr.y - prev.y) / 3;
      const dx2 = (next.x - curr.x) / 3;
      const dy2 = (next.y - curr.y) / 3;
      
      path += ` C ${prev.x + dx1} ${prev.y + dy1}, ${curr.x - dx2} ${curr.y - dy2}, ${curr.x} ${curr.y}`;
    }
    
    return path;
  };

  // Entity chart data - format matching energy dashboard structure
  // Show data points up to current playback index
  const entityChartData = useMemo(() => {
    const visiblePrices = fakeEntityData.prices.slice(0, chartPlaybackIndex);
    return visiblePrices.map((price, index) => ({
      hour: index,
      consumption: price,
    }));
  }, [fakeEntityData, chartPlaybackIndex]);

  // Chart playback animation effect
  useEffect(() => {
    if (!chartPlaybackRunning || chartPlaybackIndex >= 1080) {
      return;
    }

    const interval = setInterval(() => {
      setChartPlaybackIndex((prev) => {
        if (prev >= 1080) {
          setChartPlaybackRunning(false);
          return 1080;
        }
        return prev + 1;
      });
    }, 50); // 0.05 seconds (50ms) per point - much faster

    return () => clearInterval(interval);
  }, [chartPlaybackRunning, chartPlaybackIndex]);

  // Chart dimensions - full screen width
  const chartHeight = 220;
  const chartWidth = SCREEN_WIDTH; // Full screen width
  const margin = { top: 10, right: 0, left: 0, bottom: 0 };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  // Calculate Y domain - center point 0/1080 at the middle of the y-axis
  const fullDataMin = Math.min(...fakeEntityData.prices);
  const fullDataMax = Math.max(...fakeEntityData.prices);
  const startPrice = fakeEntityData.startPrice; // Price at point 0/1080
  const dataRange = Math.max(fullDataMax - startPrice, startPrice - fullDataMin);
  // Center the y-axis around the starting price
  const yMin = startPrice - dataRange * 1.1; // 10% padding below
  const yMax = startPrice + dataRange * 1.1; // 10% padding above
  const yRange = yMax - yMin;

  // Generate path for area chart with monotone interpolation
  const generateAreaPath = () => {
    if (entityChartData.length === 0) return '';
    
    const totalPoints = 1080; // Always use full width for positioning
    const centerPoint = 539.5; // Center between point 0 and 1079 so both edges mirror each other
    const screenCenter = chartWidth / 2;
    const points = entityChartData.map((d, i) => {
      // Position based on full 1080 points, with edges mirrored (point 0 and 1079 are 1/1080 from edges)
      const x = screenCenter + (i - centerPoint) * (chartWidth / totalPoints);
      const y = margin.top + innerHeight - ((d.consumption - yMin) / yRange) * innerHeight;
      return { x, y, value: d.consumption };
    });

    // Monotone interpolation (simplified)
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1] || curr;
      
      const dx1 = (curr.x - prev.x) / 3;
      const dy1 = (curr.y - prev.y) / 3;
      const dx2 = (next.x - curr.x) / 3;
      const dy2 = (next.y - curr.y) / 3;
      
      path += ` C ${prev.x + dx1} ${prev.y + dy1}, ${curr.x - dx2} ${curr.y - dy2}, ${curr.x} ${curr.y}`;
    }
    
    // Close path for area fill
    path += ` L ${points[points.length - 1].x} ${margin.top + innerHeight}`;
    path += ` L ${points[0].x} ${margin.top + innerHeight}`;
    path += ' Z';
    
    return path;
  };

  const generateEntityLinePath = () => {
    if (entityChartData.length === 0) return '';
    
    const totalPoints = 1080; // Always use full width for positioning
    const centerPoint = 539.5; // Center between point 0 and 1079 so both edges mirror each other
    const screenCenter = chartWidth / 2;
    const points = entityChartData.map((d, i) => {
      // Position based on full 1080 points, with edges mirrored (point 0 and 1079 are 1/1080 from edges)
      const x = screenCenter + (i - centerPoint) * (chartWidth / totalPoints);
      const y = margin.top + innerHeight - ((d.consumption - yMin) / yRange) * innerHeight;
      return { x, y };
    });

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1] || curr;
      
      const dx1 = (curr.x - prev.x) / 3;
      const dy1 = (curr.y - prev.y) / 3;
      const dx2 = (next.x - curr.x) / 3;
      const dy2 = (next.y - curr.y) / 3;
      
      path += ` C ${prev.x + dx1} ${prev.y + dy1}, ${curr.x - dx2} ${curr.y - dy2}, ${curr.x} ${curr.y}`;
    }
    
    return path;
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Chart Development</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Example Entity & Trading Simulator
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Fake Entity Page - Full Width Chart */}
        <View style={styles.entityFullWidthContainer}>
          <View style={[styles.entityHeader, { paddingHorizontal: 16 }]}>
            <View style={styles.entityInfo}>
              <Text style={[styles.entityName, { color: theme.text }]}>{fakeEntityData.name}</Text>
              <Text style={[styles.entityTicker, { color: theme.textSecondary }]}>{fakeEntityData.ticker}</Text>
            </View>
            <View style={styles.entityPriceInfo}>
              <Text style={[styles.entityCurrentPrice, { color: theme.text }]}>
                {formatCurrency(entityChartData.length > 0 ? entityChartData[entityChartData.length - 1].consumption : fakeEntityData.startPrice)}
              </Text>
              <View style={styles.entityChangeContainer}>
                {(() => {
                  const currentPrice = entityChartData.length > 0 ? entityChartData[entityChartData.length - 1].consumption : fakeEntityData.startPrice;
                  const change = currentPrice - fakeEntityData.startPrice;
                  const changePercent = (change / fakeEntityData.startPrice) * 100;
                  return (
                    <>
                      <Text style={[
                        styles.entityChangeText,
                        { color: getChangeColor(change, theme) }
                      ]}>
                        {change >= 0 ? '+' : ''}{formatCurrency(change)}
                      </Text>
                      <Text style={[
                        styles.entityChangePercent,
                        { color: getChangeColor(change, theme) }
                      ]}>
                        ({change >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
                      </Text>
                    </>
                  );
                })()}
              </View>
            </View>
          </View>

          {/* Chart Playback Controls */}
          <View style={[styles.chartPlaybackControls, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, marginHorizontal: 16 }]}>
            <View style={styles.chartPlaybackButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.chartPlaybackButton,
                  {
                    backgroundColor: chartPlaybackRunning ? '#EF4444' : '#10B981',
                  },
                ]}
                onPress={() => {
                  if (chartPlaybackIndex >= 1080) {
                    setChartPlaybackIndex(1);
                  }
                  setChartPlaybackRunning(!chartPlaybackRunning);
                }}
              >
                <Ionicons 
                  name={chartPlaybackRunning ? 'pause' : 'play'} 
                  size={16} 
                  color="#FFFFFF" 
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.chartPlaybackButtonText}>
                  {chartPlaybackRunning ? 'Pause' : chartPlaybackIndex >= 1080 ? 'Restart' : 'Play'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chartPlaybackButton, { backgroundColor: '#6B7280' }]}
                onPress={() => {
                  setChartPlaybackIndex(1);
                  setChartPlaybackRunning(false);
                }}
              >
                <Text style={styles.chartPlaybackButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.chartScenarioButtons}>
              <TouchableOpacity
                style={[
                  styles.chartScenarioButton,
                  {
                    backgroundColor: chartScenario === 'normal' ? theme.primary : theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => {
                  setChartScenario('normal');
                  setChartPlaybackIndex(1);
                  setChartPlaybackRunning(false);
                }}
              >
                <Text style={[
                  styles.chartScenarioButtonText,
                  { color: chartScenario === 'normal' ? '#FFFFFF' : theme.text }
                ]}>
                  Normal Day
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.chartScenarioButton,
                  {
                    backgroundColor: chartScenario === 'spike' ? '#EF4444' : theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => {
                  setChartScenario('spike');
                  setChartPlaybackIndex(1);
                  setChartPlaybackRunning(false);
                }}
              >
                <Text style={[
                  styles.chartScenarioButtonText,
                  { color: chartScenario === 'spike' ? '#FFFFFF' : theme.text }
                ]}>
                  Spike Scenario
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.chartPlaybackProgress, { color: theme.textSecondary }]}>
              {chartPlaybackIndex}/1080 points ({((chartPlaybackIndex / 1080) * 100).toFixed(1)}%)
            </Text>
          </View>

          {/* Entity Chart - Full Width */}
          <View style={styles.entityChartWrapperFullWidth}>
            <View style={styles.entityChartContainerFull}>
              <View style={styles.chartWithOverlay}>
                <Svg width={chartWidth} height={chartHeight}>
                  <Defs>
                    <LinearGradient id="peakGradient" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="5%" stopColor="#14B8A6" stopOpacity="0.8" />
                      <Stop offset="95%" stopColor="#14B8A6" stopOpacity="0.1" />
                    </LinearGradient>
                  </Defs>
                  
                  {/* Horizontal lines at top and bottom edges */}
                  <Line
                    x1={0}
                    y1={margin.top}
                    x2={chartWidth}
                    y2={margin.top}
                    stroke="#000000"
                    strokeWidth="1"
                  />
                  <Line
                    x1={0}
                    y1={margin.top + innerHeight}
                    x2={chartWidth}
                    y2={margin.top + innerHeight}
                    stroke="#000000"
                    strokeWidth="1"
                  />
                  
                  {/* Line stroke - only draw up to current point, but use full width positioning */}
                  {entityChartData.length > 1 && (
                    <Path
                      d={generateEntityLinePath()}
                      stroke="#14B8A6"
                      strokeWidth="2"
                      fill="none"
                    />
                  )}
                  
                  {/* Current price horizontal dotted line */}
                  {entityChartData.length > 0 && (() => {
                    const currentPrice = entityChartData[entityChartData.length - 1].consumption;
                    const currentPriceY = margin.top + innerHeight - ((currentPrice - yMin) / yRange) * innerHeight;
                    return (
                      <G>
                        <Line
                          x1={0}
                          y1={currentPriceY}
                          x2={chartWidth}
                          y2={currentPriceY}
                          stroke="#000000"
                          strokeWidth="1"
                          strokeDasharray="3 3"
                        />
                        {/* Price label box on the right */}
                        <Rect
                          x={chartWidth - 60}
                          y={currentPriceY - 12}
                          width={55}
                          height={24}
                          rx={4}
                          fill="#EF4444"
                        />
                        <SvgText
                          x={chartWidth - 32.5}
                          y={currentPriceY + 4}
                          fontSize="12"
                          fill="#FFFFFF"
                          fontWeight="600"
                          textAnchor="middle"
                        >
                          {currentPrice.toFixed(2)}
                        </SvgText>
                      </G>
                    );
                  })()}
                  
                  {/* Marker dots at points 1/1080, 540/1080, and 1080/1080 */}
                  {(() => {
                    const totalPoints = 1080;
                    const centerPoint = 539.5; // Center between point 0 and 1079 so both edges mirror each other
                    const screenCenter = chartWidth / 2;
                    // Using 0-indexed: 0 (1/1080), 540 (540/1080), 1079 (1080/1080)
                    const markerPoints = [0, 540, 1079];
                    
                    return markerPoints.map((pointIndex) => {
                      // Use full data array (fakeEntityData.prices) instead of entityChartData
                      const priceValue = fakeEntityData.prices[pointIndex];
                      // Calculate x position: center point 539.5 at screen center, then offset by point index
                      const x = screenCenter + (pointIndex - centerPoint) * (chartWidth / totalPoints);
                      const y = margin.top + innerHeight - ((priceValue - yMin) / yRange) * innerHeight;
                      
                      return (
                        <Circle
                          key={`marker-${pointIndex}`}
                          cx={x}
                          cy={y}
                          r={1}
                          fill="#14B8A6"
                        />
                      );
                    });
                  })()}
                  
                </Svg>
                
                {/* Reference line (starting price) */}
                {(() => {
                  const startPriceY = margin.top + innerHeight - ((fakeEntityData.startPrice - yMin) / yRange) * innerHeight;
                  return (
                    <View 
                      style={[
                        styles.referenceLine,
                        {
                          top: Math.max(0, Math.min(chartHeight, startPriceY)),
                        }
                      ]}
                    />
                  );
                })()}
                
                
              </View>
              
              {/* Time Frame Selector */}
              <View style={styles.timeframeSelector}>
                <TouchableOpacity
                  style={[
                    styles.timeframeButton,
                    {
                      backgroundColor: selectedTimeframe === '1min' ? theme.primary : theme.backgroundSecondary,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => setSelectedTimeframe('1min')}
                >
                  <Text style={[
                    styles.timeframeButtonText,
                    { color: selectedTimeframe === '1min' ? '#FFFFFF' : theme.text }
                  ]}>
                    1 min
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.timeframeButton,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.border,
                    },
                  ]}
                  disabled={true}
                >
                  <Text style={[
                    styles.timeframeButtonText,
                    { color: theme.textSecondary }
                  ]}>
                    More Timeframes Coming Soon
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Multi Entity Chart - Using App-Wide Chart Style */}
        <View style={[styles.entityFullWidthContainer, { marginTop: 32 }]}>
          <View style={[styles.entityHeader, { paddingHorizontal: 16, paddingBottom: 12 }]}>
            <Text style={[styles.entityName, { color: theme.text }]}>Influencers - Top 3</Text>
          </View>
          
          {/* Legend/Key showing entities horizontally */}
          <View style={[styles.chartLegend, { paddingHorizontal: 16 }]}>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendColorDot,
                  { backgroundColor: '#000000' },
                ]}
              />
              <View style={styles.legendText}>
                <Text style={[styles.legendName, { color: theme.text }]}>
                  Alix Earle
                </Text>
                <Text
                  style={[
                    styles.legendPrice,
                    { color: '#000000' },
                  ]}
                >
                  {formatCurrency(200)}
                </Text>
              </View>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendColorDot,
                  { backgroundColor: '#775a96' },
                ]}
              />
              <View style={styles.legendText}>
                <Text style={[styles.legendName, { color: theme.text }]}>
                  MrBeast
                </Text>
                <Text
                  style={[
                    styles.legendPrice,
                    { color: '#775a96' },
                  ]}
                >
                  {formatCurrency(188.98)}
                </Text>
              </View>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendColorDot,
                  { backgroundColor: '#10B981' },
                ]}
              />
              <View style={styles.legendText}>
                <Text style={[styles.legendName, { color: theme.text }]}>
                  Logan Paul
                </Text>
                <Text
                  style={[
                    styles.legendPrice,
                    { color: '#10B981' },
                  ]}
                >
                  {formatCurrency(186.25)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.entityChartWrapperFullWidth}>
            <View style={styles.entityChartContainerFull}>
              {/* Multi Entity Chart - Three lines with different colors */}
              <View style={styles.chartWithOverlay}>
                <Svg width={multiEntityChartWidth} height={multiEntityChartHeight}>
                  {/* Horizontal line at bottom edge */}
                  <Line
                    x1={0}
                    y1={multiEntityMargin.top + multiEntityInnerHeight}
                    x2={multiEntityChartWidth}
                    y2={multiEntityMargin.top + multiEntityInnerHeight}
                    stroke="#000000"
                    strokeWidth="1"
                  />
                  
                  {/* Alix Earle line - Black color */}
                  {multiEntityData.alixEarle.length > 1 && (
                    <Path
                      d={generateLinePath(multiEntityData.alixEarle)}
                      stroke="#000000"
                      strokeWidth="2"
                      fill="none"
                    />
                  )}
                  
                  {/* Mr Beast line - Blue color */}
                  {multiEntityData.mrBeast.length > 1 && (
                    <Path
                      d={generateLinePath(multiEntityData.mrBeast)}
                      stroke="#775a96"
                      strokeWidth="2"
                      fill="none"
                    />
                  )}
                  
                  {/* Logan Paul line - Green color */}
                  {multiEntityData.loganPaul.length > 1 && (
                    <Path
                      d={generateLinePath(multiEntityData.loganPaul)}
                      stroke="#10B981"
                      strokeWidth="2"
                      fill="none"
                    />
                  )}
                </Svg>
              </View>
            </View>
          </View>
        </View>

        {/* TradingView Chart Section */}
        <View style={[styles.chartExampleSection, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 32 }]}>
          <View style={styles.chartExampleHeader}>
            <View style={styles.chartExampleHeaderLeft}>
              <Ionicons name="trending-up" size={20} color="#FF6B00" />
              <Text style={[styles.chartExampleTitle, { color: theme.text }]}>TradingView Chart</Text>
            </View>
            <Text style={[styles.chartExampleDescription, { color: theme.textSecondary }]}>
              Interactive professional charting widget from TradingView
            </Text>
          </View>
          <View style={styles.tradingViewContainer}>
            <TradingViewChart
              symbol="AAPL"
              width={SCREEN_WIDTH - 64}
              height={450}
              interval="D"
              theme={theme.background === '#000000' ? 'dark' : 'light'}
            />
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
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
    paddingLeft: 0,
    paddingRight: 16,
  },
  priceCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  priceValue: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  timeLabel: {
    fontSize: 12,
    marginTop: 8,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  modeScroll: {
    marginBottom: 8,
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  modeButtonText: {
    fontSize: 14,
  },
  modeNote: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  variableRow: {
    marginBottom: 12,
  },
  variableLabel: {
    fontSize: 14,
    marginBottom: 6,
  },
  variableInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  currentValue: {
    fontSize: 12,
    marginTop: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  controlButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  speedLabel: {
    fontSize: 14,
  },
  speedInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    width: 80,
    fontSize: 14,
  },
  speedUnit: {
    fontSize: 14,
  },
  chartWrapper: {
    flexDirection: 'row',
    marginTop: 12,
    position: 'relative',
    height: 220,
  },
  yAxisLabels: {
    width: 60,
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingLeft: 8,
  },
  yAxisLabelTop: {
    fontSize: 12,
    color: '#14B8A6',
    fontWeight: '500',
  },
  yAxisLabelBottom: {
    fontSize: 12,
    color: '#14B8A6',
    fontWeight: '500',
  },
  chartContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  chartScrollView: {
    flex: 1,
  },
  chartWithOverlay: {
    position: 'relative',
    height: 220,
  },
  chart: {
    marginVertical: 0,
    marginLeft: 0,
    marginRight: 0,
    borderRadius: 0,
  },
  referenceLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
    borderTopColor: '#EF4444',
    borderStyle: 'dashed',
    zIndex: 1,
  },
  currentPriceIndicator: {
    position: 'absolute',
    right: 0,
    top: '50%',
    alignItems: 'center',
    zIndex: 2,
  },
  priceCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#14B8A6',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  priceDashedLine: {
    width: 60,
    height: 1,
    borderTopWidth: 1,
    borderTopColor: '#EF4444',
    borderStyle: 'dashed',
    marginTop: -1,
  },
  priceLabelBox: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: -1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  priceLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  percentLabels: {
    width: 60,
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingRight: 8,
    alignItems: 'flex-end',
  },
  percentLabelTop: {
    fontSize: 12,
    fontWeight: '500',
  },
  percentLabelBottom: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyChart: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 14,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    width: 80,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableCell: {
    fontSize: 12,
    width: 80,
    textAlign: 'center',
  },
  formulaText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#0E0E0E',
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  performanceMetrics: {
    gap: 6,
    marginBottom: 12,
  },
  performanceMetricCard: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  performanceMetricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  performanceMetricHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  performanceMetricIconContainer: {
    padding: 4,
    borderRadius: 4,
  },
  performanceMetricTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  performanceMetricChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  performanceMetricChangeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  performanceMetricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  performanceMetricPeriod: {
    fontSize: 12,
  },
  performanceSummary: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    marginTop: 8,
  },
  summaryCard: {
    flex: 1,
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
  },
  contentPerformanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: 14,
  },
  contentPerformanceChartContainer: {
    marginTop: 8,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginBottom: 12,
    paddingRight: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
  },
  contentChartWrapper: {
    marginTop: 8,
  },
  contentChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentChart: {
    marginVertical: 0,
    borderRadius: 0,
  },
  chartExampleSection: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  chartExampleHeader: {
    marginBottom: 16,
  },
  chartExampleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  chartExampleTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  chartExampleDescription: {
    fontSize: 12,
    marginTop: 4,
  },
  chartExampleSummary: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  pieChartContainer: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartPlaceholder: {
    fontSize: 14,
    textAlign: 'center',
  },
  heatmapContainer: {
    marginTop: 8,
  },
  heatmapGrid: {
    marginBottom: 12,
  },
  heatmapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  heatmapDayLabel: {
    width: 40,
    fontSize: 10,
    fontWeight: '500',
    marginRight: 8,
  },
  heatmapCells: {
    flexDirection: 'row',
    flex: 1,
    gap: 2,
  },
  heatmapCell: {
    flex: 1,
    aspectRatio: 1,
    minWidth: 8,
    borderRadius: 2,
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  legendColorBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  performanceChartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  performanceChartHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  performanceChartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tickerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tickerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  performanceChartHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  performanceTimeRangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  performanceTimeRangeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  performanceChartIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  performanceIconButton: {
    padding: 4,
  },
  performanceChartContainer: {
    marginTop: 8,
  },
  performanceChart: {
    marginVertical: 0,
    borderRadius: 0,
  },
  entitySection: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  entityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 16,
  },
  entityInfo: {
    flex: 1,
  },
  entityName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  entityTicker: {
    fontSize: 14,
  },
  entityPriceInfo: {
    alignItems: 'flex-end',
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
  entityFullWidthContainer: {
    width: SCREEN_WIDTH,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    marginLeft: 0,
    marginRight: -16, // Counteract scrollContent paddingRight: 16
    alignSelf: 'stretch', // Stretch to full width
  },
  entityChartWrapperFullWidth: {
    position: 'relative',
    height: 220,
    width: SCREEN_WIDTH,
    alignSelf: 'flex-start', // Align to left edge
  },
  entityChartContainerFull: {
    width: SCREEN_WIDTH,
    position: 'relative',
    overflow: 'visible', // Allow chart to extend to edges
    alignSelf: 'flex-start', // Align to left edge
  },
  chartPlaybackControls: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  chartPlaybackButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chartPlaybackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  chartPlaybackButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  chartScenarioButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  chartScenarioButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  chartScenarioButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartPlaybackProgress: {
    fontSize: 12,
    textAlign: 'center',
  },
  timeframeSelector: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    alignSelf: 'flex-start',
  },
  timeframeButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
  },
  timeframeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 12,
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    flexDirection: 'column',
  },
  legendName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  legendPrice: {
    fontSize: 16,
    fontWeight: '600',
  },
  yAxisLabelsOverlay: {
    position: 'absolute',
    left: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingVertical: 8,
    zIndex: 3,
  },
  yAxisLabelTopOverlay: {
    fontSize: 12,
    color: '#14B8A6',
    fontWeight: '500',
  },
  yAxisLabelBottomOverlay: {
    fontSize: 12,
    color: '#14B8A6',
    fontWeight: '500',
  },
  percentLabelsOverlay: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingVertical: 8,
    alignItems: 'flex-end',
    zIndex: 3,
  },
  percentLabelTopOverlay: {
    fontSize: 12,
    fontWeight: '500',
  },
  percentLabelBottomOverlay: {
    fontSize: 12,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 24,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
  },
  tradingViewContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
