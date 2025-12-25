import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TreemapItem {
  name: string;
  percentage: number;
  categoryId: string;
  color?: 'green' | 'red';
}

interface TreemapProps {
  data: TreemapItem[];
  onItemPress: (categoryId: string) => void;
  containerWidth?: number;
  containerHeight?: number;
  padding?: number;
}

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  item: TreemapItem;
}

// Squarified Treemap Algorithm
// This is the algorithm commonly used by financial platforms like stock exchanges
function squarifyTreemap(
  items: TreemapItem[],
  containerWidth: number,
  containerHeight: number
): Rectangle[] {
  const rectangles: Rectangle[] = [];
  const total = items.reduce((sum, item) => sum + item.percentage, 0);
  
  if (total === 0) return rectangles;
  
  // Normalize percentages to fill the container
  const normalizedItems = items.map(item => ({
    ...item,
    normalizedValue: (item.percentage / total) * (containerWidth * containerHeight)
  }));
  
  // Sort by size (largest first) for better layout
  const sortedItems = [...normalizedItems].sort((a, b) => b.normalizedValue - a.normalizedValue);
  
  let currentY = 0;
  let remainingWidth = containerWidth;
  let remainingHeight = containerHeight;
  let currentRow: typeof sortedItems = [];
  
  const worstAspectRatio = (row: typeof sortedItems, width: number): number => {
    if (row.length === 0) return Infinity;
    const rowArea = row.reduce((sum, i) => sum + i.normalizedValue, 0);
    const rowHeight = rowArea / width;
    return Math.max(
      ...row.map(i => {
        const itemWidth = (i.normalizedValue / rowArea) * width;
        return Math.max(itemWidth / rowHeight, rowHeight / itemWidth);
      })
    );
  };
  
  for (const item of sortedItems) {
    const testRow = [...currentRow, item];
    const currentWorst = worstAspectRatio(currentRow, remainingWidth);
    const testWorst = worstAspectRatio(testRow, remainingWidth);
    
    // If adding this item improves or maintains aspect ratio, add it to current row
    if (testWorst <= currentWorst || currentRow.length === 0) {
      currentRow.push(item);
    } else {
      // Finalize current row
      const rowArea = currentRow.reduce((sum, i) => sum + i.normalizedValue, 0);
      const rowHeight = rowArea / remainingWidth;
      
      let rowX = 0;
      for (const rowItem of currentRow) {
        const itemWidth = (rowItem.normalizedValue / rowArea) * remainingWidth;
        rectangles.push({
          x: rowX,
          y: currentY,
          width: itemWidth,
          height: rowHeight,
          item: rowItem,
        });
        rowX += itemWidth;
      }
      
      // Start new row
      currentY += rowHeight;
      remainingHeight -= rowHeight;
      currentRow = [item];
    }
  }
  
  // Finalize last row
  if (currentRow.length > 0 && remainingHeight > 0) {
    const rowArea = currentRow.reduce((sum, i) => sum + i.normalizedValue, 0);
    const rowHeight = Math.min(rowArea / remainingWidth, remainingHeight);
    
    let rowX = 0;
    for (const rowItem of currentRow) {
      const itemWidth = (rowItem.normalizedValue / rowArea) * remainingWidth;
      rectangles.push({
        x: rowX,
        y: currentY,
        width: itemWidth,
        height: rowHeight,
        item: rowItem,
      });
      rowX += itemWidth;
    }
  }
  
  return rectangles;
}

export default function Treemap({
  data,
  onItemPress,
  containerWidth = SCREEN_WIDTH,
  containerHeight = 400,
  padding = 16,
}: TreemapProps) {
  const { theme } = useTheme();
  
  const treemapWidth = containerWidth - (padding * 2);
  const treemapHeight = containerHeight;
  
  const rectangles = squarifyTreemap(data, treemapWidth, treemapHeight);
  
  return (
    <View style={[styles.container, { paddingHorizontal: padding, paddingTop: padding, paddingBottom: padding }]}>
      <View style={[styles.treemapContainer, { width: treemapWidth, height: treemapHeight }]}>
        {rectangles.map((rect, index) => (
          <TouchableOpacity
            key={rect.item.categoryId}
            style={[
              styles.rectangle,
              {
                position: 'absolute',
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
                backgroundColor: rect.item.color === 'green' 
                  ? '#10B981' 
                  : rect.item.color === 'red' 
                  ? '#EF4444' 
                  : theme.backgroundSecondary,
                borderWidth: 1,
                borderColor: theme.border,
              },
            ]}
            onPress={() => onItemPress(rect.item.categoryId)}
            activeOpacity={0.7}
          >
            <View style={styles.labelContainer}>
              <Text
                style={[styles.categoryName, { color: '#FFFFFF' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {rect.item.name}
              </Text>
              <Text
                style={[styles.percentage, { color: '#FFFFFF' }]}
                numberOfLines={1}
              >
                {rect.item.percentage.toFixed(1)}%
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  treemapContainer: {
    position: 'relative',
  },
  rectangle: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  labelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  percentage: {
    fontSize: 10,
    textAlign: 'center',
  },
});

