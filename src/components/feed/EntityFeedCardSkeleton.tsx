import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function EntityFeedCardSkeleton() {
  const { theme } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.content}>
        {/* Avatar skeleton */}
        <Animated.View
          style={[
            styles.avatar,
            { backgroundColor: theme.backgroundSecondary, opacity },
          ]}
        />

        {/* Info skeleton */}
        <View style={styles.info}>
          <Animated.View
            style={[
              styles.tickerSkeleton,
              { backgroundColor: theme.backgroundSecondary, opacity },
            ]}
          />
          <Animated.View
            style={[
              styles.nameSkeleton,
              { backgroundColor: theme.backgroundSecondary, opacity },
            ]}
          />
        </View>

        {/* Sparkline skeleton */}
        <Animated.View
          style={[
            styles.sparklineSkeleton,
            { backgroundColor: theme.backgroundSecondary, opacity },
          ]}
        />

        {/* Price skeleton */}
        <View style={styles.rightSection}>
          <Animated.View
            style={[
              styles.priceSkeleton,
              { backgroundColor: theme.backgroundSecondary, opacity },
            ]}
          />
          <Animated.View
            style={[
              styles.changeSkeleton,
              { backgroundColor: theme.backgroundSecondary, opacity },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  info: {
    flex: 1,
    gap: 8,
  },
  tickerSkeleton: {
    width: 60,
    height: 16,
    borderRadius: 4,
  },
  nameSkeleton: {
    width: 100,
    height: 12,
    borderRadius: 4,
  },
  sparklineSkeleton: {
    width: 60,
    height: 30,
    borderRadius: 4,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 6,
  },
  priceSkeleton: {
    width: 70,
    height: 16,
    borderRadius: 4,
  },
  changeSkeleton: {
    width: 50,
    height: 12,
    borderRadius: 4,
  },
});

