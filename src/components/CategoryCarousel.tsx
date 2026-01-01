import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface CategoryCarouselProps {
  categories: string[];
  selectedCategory: string;
  onCategoryPress: (category: string) => void;
}

export default function CategoryCarousel({
  categories,
  selectedCategory,
  onCategoryPress,
}: CategoryCarouselProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.categorySelectorContainer,
        { backgroundColor: theme.card, borderBottomColor: theme.border },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categorySelector}
        contentContainerStyle={styles.categorySelectorContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={styles.categoryButton}
            onPress={() => onCategoryPress(category)}
          >
            <Text
              style={[
                styles.categoryButtonText,
                {
                  color: selectedCategory === category ? theme.text : theme.textSecondary,
                  fontWeight: selectedCategory === category ? '600' : '400',
                },
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  categorySelectorContainer: {
    borderBottomWidth: 1,
    borderTopWidth: 0,
    paddingTop: 4,
    paddingBottom: 4,
  },
  categorySelector: {
    maxHeight: 20,
  },
  categorySelectorContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 0,
    alignItems: 'flex-end',
  },
  categoryButton: {
    marginRight: 18,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryButtonText: {
    fontSize: 15,
    lineHeight: 18,
  },
});

