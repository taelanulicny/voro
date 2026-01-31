import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface SparklineChartProps {
  data: number[];
  width: number;
  height: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Lightweight sparkline chart component for displaying price trends
 * Optimized for performance with minimal re-renders
 */
export default function SparklineChart({
  data,
  width,
  height,
  color = '#10b981',
  strokeWidth = 1.5,
}: SparklineChartProps) {
  // Need at least 2 points to draw a line
  if (!data || data.length < 2) {
    return <View style={{ width, height }} />;
  }

  // Calculate min and max for scaling
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;

  // If all values are the same, draw a flat line
  if (range === 0) {
    const y = height / 2;
    const pathData = `M 0 ${y} L ${width} ${y}`;
    return (
      <Svg width={width} height={height}>
        <Path d={pathData} stroke={color} strokeWidth={strokeWidth} fill="none" />
      </Svg>
    );
  }

  // Build SVG path
  const stepX = width / (data.length - 1);
  const pathData = data
    .map((value, index) => {
      const x = index * stepX;
      const normalizedValue = (value - min) / range;
      const y = height - normalizedValue * height; // Invert Y axis
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <Svg width={width} height={height}>
      <Path d={pathData} stroke={color} strokeWidth={strokeWidth} fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({});
