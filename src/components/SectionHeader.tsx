import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onSeeAll?: () => void;
  showSeeAll?: boolean;
}

/**
 * Section header component for Discover tab sections
 * Shows title, optional subtitle, icon, and See All button
 */
export default function SectionHeader({
  title,
  subtitle,
  icon,
  onSeeAll,
  showSeeAll = true,
}: SectionHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.leftContent}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name={icon} size={20} color={theme.primary} />
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
          )}
        </View>
      </View>

      {showSeeAll && onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7} style={styles.seeAllButton}>
          <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingLeft: 8,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 2,
  },
});
