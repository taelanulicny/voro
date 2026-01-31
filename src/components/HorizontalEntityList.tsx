import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { DiscoverEntity } from '../hooks/useDiscoverData';
import CompactEntityCard from './CompactEntityCard';

interface HorizontalEntityListProps {
  entities: DiscoverEntity[];
  showRanks?: boolean;
}

/**
 * Horizontal scrolling list of entity cards
 * Used for Trending, Movers, and For You sections
 */
export default function HorizontalEntityList({
  entities,
  showRanks = false,
}: HorizontalEntityListProps) {
  if (!entities || entities.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scroll}
    >
      {entities.map((entity, index) => (
        <CompactEntityCard
          key={entity.id}
          entity={entity}
          showRank={showRanks}
          rank={showRanks ? index + 1 : undefined}
        />
      ))}
      {/* Spacer at the end */}
      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginBottom: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  spacer: {
    width: 4,
  },
});
