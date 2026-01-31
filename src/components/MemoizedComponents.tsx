import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Performance-optimized memoized components
 * These components use React.memo to prevent unnecessary re-renders
 */

interface StatCardProps {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  valueColor?: string;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
}

/**
 * Memoized StatCard component for displaying statistics
 * Only re-renders when props actually change
 */
export const MemoizedStatCard = React.memo<StatCardProps>(
  ({ label, value, icon, iconColor, valueColor, textColor, backgroundColor, borderColor }) => {
    return (
      <View style={[styles.statCard, { backgroundColor, borderColor }]}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={iconColor || textColor}
            style={styles.statIcon}
          />
        )}
        <Text style={[styles.statLabel, { color: textColor }]}>{label}</Text>
        <Text style={[styles.statValue, { color: valueColor || textColor }]}>{value}</Text>
      </View>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function - only re-render if these props change
    return (
      prevProps.value === nextProps.value &&
      prevProps.label === nextProps.label &&
      prevProps.valueColor === nextProps.valueColor &&
      prevProps.textColor === nextProps.textColor
    );
  }
);

MemoizedStatCard.displayName = 'MemoizedStatCard';

interface PriceChangeProps {
  change: number;
  changePercent: number;
  size?: 'small' | 'medium' | 'large';
  positiveColor: string;
  negativeColor: string;
}

/**
 * Memoized PriceChange component
 * Shows price change with appropriate color
 */
export const MemoizedPriceChange = React.memo<PriceChangeProps>(
  ({ change, changePercent, size = 'medium', positiveColor, negativeColor }) => {
    const isPositive = change >= 0;
    const color = isPositive ? positiveColor : negativeColor;
    const fontSize = size === 'small' ? 12 : size === 'large' ? 18 : 14;

    return (
      <View style={styles.priceChangeContainer}>
        <Ionicons
          name={isPositive ? 'trending-up' : 'trending-down'}
          size={fontSize}
          color={color}
        />
        <Text style={[styles.priceChangeText, { color, fontSize }]}>
          {isPositive ? '+' : ''}
          {changePercent.toFixed(2)}%
        </Text>
      </View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.change === nextProps.change &&
      prevProps.changePercent === nextProps.changePercent &&
      prevProps.size === nextProps.size
    );
  }
);

MemoizedPriceChange.displayName = 'MemoizedPriceChange';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
  textColor: string;
  subtextColor?: string;
}

/**
 * Memoized SectionHeader component
 */
export const MemoizedSectionHeader = React.memo<SectionHeaderProps>(
  ({ title, subtitle, onPress, showChevron = true, textColor, subtextColor }) => {
    const content = (
      <View style={styles.sectionHeaderContainer}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={[styles.sectionHeaderTitle, { color: textColor }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.sectionHeaderSubtitle, { color: subtextColor || textColor }]}>
              {subtitle}
            </Text>
          )}
        </View>
        {showChevron && onPress && (
          <Ionicons name="chevron-forward" size={20} color={subtextColor || textColor} />
        )}
      </View>
    );

    if (onPress) {
      return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          {content}
        </TouchableOpacity>
      );
    }

    return content;
  },
  (prevProps, nextProps) => {
    return (
      prevProps.title === nextProps.title &&
      prevProps.subtitle === nextProps.subtitle &&
      prevProps.textColor === nextProps.textColor
    );
  }
);

MemoizedSectionHeader.displayName = 'MemoizedSectionHeader';

const styles = StyleSheet.create({
  statCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 12,
    minWidth: 120,
  },
  statIcon: {
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  priceChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceChangeText: {
    fontWeight: '600',
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  sectionHeaderSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
});
