import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';

export interface EntityListItem {
  id: number;
  name: string;
  category: string;
  displayCategory: string;
  price: number;
  change: number;
  changePercent: number;
  // For positions
  quantity?: number;
  profitLoss?: number;
}

interface EntityListProps {
  title: string;
  items: EntityListItem[];
  onSeeAll?: () => void;
  onItemPress: (item: EntityListItem) => void;
  onRemove?: () => void;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
  emptyTitle?: string;
  emptyText?: string;
  showProfitLoss?: boolean;
  maxItems?: number;
}

export default function EntityList({
  title,
  items,
  onSeeAll,
  onItemPress,
  onRemove,
  emptyIcon = 'list-outline',
  emptyTitle = 'No items yet',
  emptyText = 'Items will appear here',
  showProfitLoss = false,
  maxItems = 5,
}: EntityListProps) {
  const { theme } = useTheme();

  const displayItems = items.slice(0, maxItems);

  return (
    <View style={[styles.section, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
        {onRemove ? (
          <TouchableOpacity onPress={onRemove}>
            <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        ) : onSeeAll ? (
          <TouchableOpacity onPress={onSeeAll}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name={emptyIcon} size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyStateTitle, { color: theme.text }]}>{emptyTitle}</Text>
          <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
            {emptyText}
          </Text>
        </View>
      ) : (
        <>
          {displayItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.listCard, { borderBottomColor: theme.borderLight }]}
              onPress={() => onItemPress(item)}
            >
              <View style={styles.listLeft}>
                <View style={[styles.listIcon, { backgroundColor: theme.primaryLight }]}>
                  <Text style={[styles.listIconText, { color: theme.primary }]}>
                    {item.name.substring(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.listInfo}>
                  <Text style={[styles.listName, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.listCategory, { color: theme.textSecondary }]}>
                    {item.displayCategory}
                  </Text>
                </View>
              </View>

              <View style={styles.listRight}>
                <Text style={[styles.listPrice, { color: theme.text }]}>
                  {formatCurrency(showProfitLoss && item.profitLoss !== undefined ? item.price : item.price)}
                </Text>
                <Text style={[styles.listChange, { color: getChangeColor(showProfitLoss ? (item.profitLoss || 0) : item.change) }]}>
                  {showProfitLoss && item.profitLoss !== undefined ? (
                    <>
                      {item.profitLoss >= 0 ? '+' : ''}
                      {formatCurrency(item.profitLoss)}
                    </>
                  ) : (
                    <>
                      {item.change >= 0 ? '+' : ''}
                      {item.changePercent.toFixed(2)}%
                    </>
                  )}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#F9FAFB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  seeAllText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  listLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listIconText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  listCategory: {
    fontSize: 13,
  },
  listRight: {
    alignItems: 'flex-end',
  },
  listPrice: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  listChange: {
    fontSize: 13,
    fontWeight: '500',
  },
});

