import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, PanResponder } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Circle, Line } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { PriceDataPoint } from '../types';
import { formatCurrency } from '../utils/dataGenerator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface InteractiveChartProps {
  data: PriceDataPoint[];
  width?: number;
  height?: number;
  showTooltip?: boolean;
  formatDate?: (timestamp: number) => string;
}

const CHART_PADDING = 20;
const CHART_HEIGHT = 400;
const CHART_WIDTH = SCREEN_WIDTH - 32;

export default function InteractiveChart({
  data,
  width = CHART_WIDTH,
  height = CHART_HEIGHT,
  showTooltip = true,
  formatDate,
}: InteractiveChartProps) {
  const { theme } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const chartRef = useRef<View>(null);

  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { width, height, backgroundColor: theme.card }]}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No data available</Text>
      </View>
    );
  }

  // Calculate chart boundaries
  const prices = data.map((point) => point.price);
  const minValue = Math.min(...prices);
  const maxValue = Math.max(...prices);
  const range = maxValue - minValue || 1;
  const padding = 0.05; // 5% padding on top and bottom
  const yMin = minValue - range * padding;
  const yMax = maxValue + range * padding;
  const yRange = yMax - yMin || 1;

  const plotWidth = width - CHART_PADDING * 2;
  const plotHeight = height - CHART_PADDING * 2;

  // Map data points to SVG coordinates
  const points = useMemo(() => {
    return data.map((point, index) => {
      const x = CHART_PADDING + (index / (data.length - 1 || 1)) * plotWidth;
      const y = CHART_PADDING + plotHeight - ((point.price - yMin) / yRange) * plotHeight;
      return { x, y, ...point };
    });
  }, [data, plotWidth, plotHeight, yMin, yRange]);

  // Determine color based on trend (first vs last value)
  const firstValue = data[0].price;
  const lastValue = data[data.length - 1].price;
  const isPositive = lastValue >= firstValue;
  const lineColor = isPositive ? theme.success : theme.error;
  const gradientStartColor = isPositive ? theme.success : theme.error;
  const gradientEndColor = isPositive ? `${theme.success}20` : `${theme.error}20`;

  // Create area path for gradient fill
  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    
    let path = `M ${points[0].x} ${CHART_PADDING + plotHeight}`;
    points.forEach((point) => {
      path += ` L ${point.x} ${point.y}`;
    });
    path += ` L ${points[points.length - 1].x} ${CHART_PADDING + plotHeight} Z`;
    return path;
  }, [points, plotHeight]);

  // Create line path
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    points.slice(1).forEach((point) => {
      path += ` L ${point.x} ${point.y}`;
    });
    return path;
  }, [points]);

  // Format date helper
  const formatDateLabel = (timestamp: number): string => {
    if (formatDate) return formatDate(timestamp);
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Calculate Y-axis ticks
  const yTicks = useMemo(() => {
    const numTicks = 5;
    const tickValues: number[] = [];
    const step = (yMax - yMin) / (numTicks - 1);
    for (let i = 0; i < numTicks; i++) {
      tickValues.push(yMin + step * i);
    }
    return tickValues;
  }, [yMin, yMax]);

  // Handle touch/press
  const handleTouch = (evt: any) => {
    if (!showTooltip) return;
    
    const { locationX, locationY } = evt.nativeEvent;
    const relativeX = locationX - CHART_PADDING;
    
    if (relativeX < 0 || relativeX > plotWidth) {
      setSelectedIndex(null);
      setTooltipPosition(null);
      return;
    }

    // Find closest data point
    const index = Math.round((relativeX / plotWidth) * (data.length - 1));
    const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
    
    setSelectedIndex(clampedIndex);
    const pointY = points[clampedIndex].y;
    // Position tooltip above the point, but adjust if too close to edges
    setTooltipPosition({
      x: locationX,
      y: Math.max(10, Math.min(pointY - 50, height - 80)),
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: handleTouch,
      onPanResponderMove: handleTouch,
      onPanResponderRelease: () => {
        // Keep tooltip visible on release
      },
    })
  ).current;

  const selectedPoint = selectedIndex !== null ? points[selectedIndex] : null;

  return (
    <View style={[styles.container, { width, height, backgroundColor: theme.card }]}>
      <View
        ref={chartRef}
        style={styles.chartWrapper}
        {...panResponder.panHandlers}
      >
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="5%" stopColor={gradientStartColor} stopOpacity="0.3" />
              <Stop offset="95%" stopColor={gradientEndColor} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          {yTicks.map((tick, index) => {
            const y = CHART_PADDING + plotHeight - ((tick - yMin) / yRange) * plotHeight;
            return (
              <Line
                key={`grid-${index}`}
                x1={CHART_PADDING}
                y1={y}
                x2={CHART_PADDING + plotWidth}
                y2={y}
                stroke={theme.border}
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.3}
              />
            );
          })}

          {/* Area fill */}
          <Path
            d={areaPath}
            fill="url(#areaGradient)"
          />

          {/* Line */}
          <Path
            d={linePath}
            fill="none"
            stroke={lineColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Selected point indicator */}
          {selectedPoint && (
            <>
              {/* Vertical line at selected point */}
              <Line
                x1={selectedPoint.x}
                y1={CHART_PADDING}
                x2={selectedPoint.x}
                y2={CHART_PADDING + plotHeight}
                stroke={theme.border}
                strokeWidth={1}
                strokeDasharray="2 2"
                opacity={0.5}
              />
              {/* Circle at selected point */}
              <Circle
                cx={selectedPoint.x}
                cy={selectedPoint.y}
                r={4}
                fill={lineColor}
                stroke={theme.card}
                strokeWidth={2}
              />
            </>
          )}
        </Svg>

        {/* Y-axis labels */}
        <View style={styles.yAxisLabels}>
          {yTicks.map((tick, index) => {
            const y = CHART_PADDING + plotHeight - ((tick - yMin) / yRange) * plotHeight;
            return (
              <Text
                key={`y-label-${index}`}
                style={[
                  styles.yAxisLabel,
                  { color: theme.textSecondary, top: y - 8 },
                ]}
              >
                {formatCurrency(tick)}
              </Text>
            );
          })}
        </View>

        {/* Tooltip */}
        {selectedPoint && tooltipPosition && showTooltip && (
          <View
            style={[
              styles.tooltip,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border,
                left: Math.max(10, Math.min(tooltipPosition.x - 75, width - 150)),
                top: Math.max(10, Math.min(tooltipPosition.y, height - 80)),
              },
            ]}
          >
            <Text style={[styles.tooltipPrice, { color: theme.text }]}>
              {formatCurrency(selectedPoint.price)}
            </Text>
            <Text style={[styles.tooltipDate, { color: theme.textSecondary }]}>
              {formatDateLabel(selectedPoint.timestamp)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  chartWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: '50%',
    fontSize: 14,
  },
  yAxisLabels: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: CHART_PADDING,
    height: '100%',
    justifyContent: 'space-between',
  },
  yAxisLabel: {
    fontSize: 10,
    position: 'absolute',
    right: 4,
  },
  tooltip: {
    position: 'absolute',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 120,
  },
  tooltipPrice: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  tooltipDate: {
    fontSize: 12,
  },
});

