import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface CategoryFilterChipsProps {
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

const CATEGORIES = [
  { id: null, label: 'All' },
  { id: 'Tech', label: 'Tech' },
  { id: 'Politics', label: 'Politics' },
  { id: 'People', label: 'People' },
  { id: 'Events', label: 'Events' },
];

export default function CategoryFilterChips({
  selectedCategory,
  onCategoryChange,
}: CategoryFilterChipsProps) {
  const { theme } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const chipRefs = useRef<{ [key: string]: View | null }>({});

  // Scroll to selected chip when category changes
  useEffect(() => {
    if (selectedCategory !== null && chipRefs.current[selectedCategory]) {
      // Use setTimeout to ensure layout is complete
      setTimeout(() => {
        chipRefs.current[selectedCategory]?.measureLayout(
          scrollViewRef.current as any,
          (x, y) => {
            scrollViewRef.current?.scrollTo({
              x: Math.max(0, x - 20),
              animated: true,
            });
          },
          () => {
            // Fallback: scroll to approximate position
            const selectedIndex = CATEGORIES.findIndex(cat => cat.id === selectedCategory);
            if (selectedIndex >= 0) {
              scrollViewRef.current?.scrollTo({
                x: selectedIndex * 100,
                animated: true,
              });
            }
          }
        );
      }, 100);
    }
  }, [selectedCategory]);

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scrollView}
    >
      {CATEGORIES.map((category) => {
        const isSelected = selectedCategory === category.id;
        return (
          <TouchableOpacity
            key={category.id ?? 'all'}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary,
                borderColor: isSelected ? theme.primary : theme.border,
              },
            ]}
            onPress={() => onCategoryChange(category.id)}
            ref={(ref) => {
              if (category.id) {
                chipRefs.current[category.id] = ref;
              }
            }}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: isSelected ? theme.textContrast : theme.text,
                  fontWeight: isSelected ? '600' : '500',
                },
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    maxHeight: 50,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 14,
  },
});

