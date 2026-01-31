import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

/**
 * Skeleton loader component with shimmer animation
 * Used for loading states in the Discover tab
 */
export default function SkeletonLoader({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonLoaderProps) {
  const { theme } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create pulsing animation
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Skeleton loader for entity cards in horizontal lists
 */
export function SkeletonEntityCard() {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <SkeletonLoader width={48} height={48} borderRadius={24} style={styles.avatar} />
      <SkeletonLoader width={80} height={14} style={styles.name} />
      <SkeletonLoader width={60} height={10} style={styles.category} />
      <SkeletonLoader width={100} height={30} style={styles.chart} />
      <SkeletonLoader width={70} height={16} style={styles.price} />
      <SkeletonLoader width={50} height={12} />
    </View>
  );
}

/**
 * Skeleton loader for entity rows in vertical lists
 */
export function SkeletonEntityRow() {
  const { theme } = useTheme();

  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <SkeletonLoader width={44} height={44} borderRadius={22} style={styles.rowAvatar} />
      <View style={styles.rowInfo}>
        <SkeletonLoader width={120} height={15} style={styles.rowName} />
        <SkeletonLoader width={80} height={12} />
      </View>
      <View style={styles.rowPrice}>
        <SkeletonLoader width={70} height={15} style={styles.rowPriceValue} />
        <SkeletonLoader width={50} height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  card: {
    width: 120,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  avatar: {
    marginBottom: 8,
  },
  name: {
    marginBottom: 4,
  },
  category: {
    marginBottom: 8,
  },
  chart: {
    marginVertical: 8,
  },
  price: {
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  rowAvatar: {
    marginRight: 12,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    marginBottom: 4,
  },
  rowPrice: {
    alignItems: 'flex-end',
  },
  rowPriceValue: {
    marginBottom: 4,
  },
});
