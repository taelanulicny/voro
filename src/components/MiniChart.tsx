import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

interface MiniChartProps {
  data: number[]; // Array of price values (7-day history)
  width?: number;
  height?: number;
  showGradient?: boolean;
}

const DEFAULT_WIDTH = 60;
const DEFAULT_HEIGHT = 30;

export default function MiniChart({
  data,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  showGradient = true,
}: MiniChartProps) {
  const { theme } = useTheme();

  if (!data || data.length === 0) {
    return <View style={[styles.container, { width, height }]} />;
  }

  // Calculate chart boundaries
  const minValue = Math.min(...data);
  const maxValue = Math.max(...data);
  const range = maxValue - minValue || 1; // Avoid division by zero
  const padding = 2;

  // Map data points to SVG coordinates
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1 || 1)) * (width - padding * 2) + padding;
    const y = height - padding - ((value - minValue) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  // Determine color based on trend (first vs last value)
  const firstValue = data[0];
  const lastValue = data[data.length - 1];
  const isPositive = lastValue >= firstValue;
  const lineColor = isPositive ? theme.success : theme.error;
  const gradientStartColor = isPositive ? theme.success : theme.error;
  const gradientEndColor = isPositive ? '#10B98120' : '#EF444420';

  // Create area path for gradient fill
  const areaPath = data.map((value, index) => {
    const x = (index / (data.length - 1 || 1)) * (width - padding * 2) + padding;
    const y = height - padding - ((value - minValue) / range) * (height - padding * 2);
    return index === 0 ? `M ${x} ${height - padding}` : `L ${x} ${y}`;
  }).join(' ') + ` L ${width - padding} ${height - padding} Z`;

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={gradientStartColor} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={gradientEndColor} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>
        
        {showGradient && (
          <Path
            d={areaPath}
            fill="url(#gradient)"
          />
        )}
        
        <Polyline
          points={points}
          fill="none"
          stroke={lineColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

