import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TreemapItem {
  name: string;
  percentage: number;
  categoryId: string;
  color?: 'green' | 'red' | 'grey';
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
  
  // If total is 0, give all items equal size so they still display
  const normalizedItems = total === 0
    ? items.map(item => ({
        ...item,
        normalizedValue: (containerWidth * containerHeight) / items.length
      }))
    : items.map(item => ({
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
  
  // Calculate dynamic font sizes based on trading volume
  // Find min and max percentages
  const percentages = data.map(item => item.percentage);
  const maxPercentage = Math.max(...percentages);
  const minPercentage = Math.min(...percentages);
  
  // Font size range: largest category gets 28px, smallest gets 14px
  const maxFontSize = 28;
  const minFontSize = 14;
  
  // Function to calculate font size based on percentage
  const getFontSize = (percentage: number): number => {
    if (maxPercentage === minPercentage) {
      // All categories have same percentage, use middle size
      return (maxFontSize + minFontSize) / 2;
    }
    // Linear interpolation between min and max
    const ratio = (percentage - minPercentage) / (maxPercentage - minPercentage);
    return minFontSize + (maxFontSize - minFontSize) * ratio;
  };
  
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
                  : rect.item.color === 'grey'
                  ? '#6B7280'
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
                style={[
                  styles.categoryName,
                  { color: '#FFFFFF', fontSize: getFontSize(rect.item.percentage) }
                ]}
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
    borderRadius: 6,
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

