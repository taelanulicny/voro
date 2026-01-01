import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';
import { Entity } from '../types';

interface TrendingSectionProps {
  title?: string;
  entities: Entity[];
  onEntityPress: (entity: Entity, category: string) => void;
  getDisplayCategory: (entityId: number, category: string) => string;
}

export default function TrendingSection({
  title = "Today's Top Movers",
  entities,
  onEntityPress,
  getDisplayCategory,
}: TrendingSectionProps) {
  const { theme } = useTheme();

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  if (entities.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.card }]}>
        <Text style={[styles.header, { color: theme.text }]}>{title}</Text>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No entities available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      <Text style={[styles.header, { color: theme.text }]}>{title}</Text>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {entities.map((entity, entityIndex) => {
          const displayCategory = getDisplayCategory(entity.id, entity.category || '');
          const changeColor = getChangeColor(entity.change24h);
          
          return (
            <TouchableOpacity
              key={entity.id}
              style={[styles.entityCard, { backgroundColor: theme.backgroundSecondary }]}
              onPress={() => onEntityPress(entity, entity.category || '')}
            >
              <View style={styles.rankContainer}>
                <Text style={[styles.rankNumber, { color: theme.textSecondary }]}>
                  {entityIndex + 1}
                </Text>
              </View>
              <View style={styles.entityInfo}>
                <View style={[styles.entityIcon, { backgroundColor: theme.primaryLight }]}>
                  <Text style={[styles.entityIconText, { color: theme.primary }]}>
                    {getInitials(entity.name)}
                  </Text>
                </View>
                <View style={styles.entityDetails}>
                  <Text style={[styles.entityName, { color: theme.text }]}>{entity.name}</Text>
                  <Text style={[styles.entityCategory, { color: theme.textSecondary }]}>
                    {displayCategory}
                  </Text>
                </View>
              </View>
              <View style={styles.priceInfo}>
                <Text style={[styles.price, { color: theme.text }]}>
                  {formatCurrency(entity.currentPrice)}
                </Text>
                <Text style={[styles.change, { color: changeColor }]}>
                  {entity.changePercent24h >= 0 ? '+' : ''}
                  {entity.changePercent24h.toFixed(2)}%
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: 12,
  },
  entityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  rankContainer: {
    width: 24,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  entityInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  entityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entityIconText: {
    fontSize: 14,
    fontWeight: '600',
  },
  entityDetails: {
    flex: 1,
  },
  entityName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  entityCategory: {
    fontSize: 13,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  change: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});


