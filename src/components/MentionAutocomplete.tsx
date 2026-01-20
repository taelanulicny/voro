import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getAllEntities, entityNameToMention } from '../utils/entities';
import { getAllCategories } from '../utils/categories';

interface MentionOption {
  id: string;
  name: string;
  mentionName: string; // Name without spaces, with correct accents
  type: 'entity' | 'category';
  entityId?: number;
  categoryId?: string;
}

interface MentionAutocompleteProps {
  text: string;
  cursorPosition: number;
  onSelect: (mention: string) => void; // Returns the mention text to insert (e.g., "@LukaDončić")
  onClose: () => void;
}

/**
 * Remove accents/diacritics for search matching
 * "Luka Dončić" -> "luka doncic"
 */
function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Get mention name without spaces but with correct accents
 * "Luka Dončić" -> "LukaDončić"
 */
function getMentionName(name: string): string {
  return name.replace(/\s+/g, '');
}

export default function MentionAutocomplete({
  text,
  cursorPosition,
  onSelect,
  onClose,
}: MentionAutocompleteProps) {
  const { theme } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Extract the current mention being typed (e.g., "@lukadon" from "@lukadon is great")
  const currentMention = useMemo(() => {
    // Find the @ symbol before cursor
    let startIndex = cursorPosition - 1;
    while (startIndex >= 0 && text[startIndex] !== '@' && text[startIndex] !== ' ') {
      startIndex--;
    }
    
    if (startIndex < 0 || text[startIndex] !== '@') {
      return null;
    }
    
    // Extract the mention text after @
    const mentionText = text.substring(startIndex + 1, cursorPosition);
    return {
      startIndex,
      text: mentionText.toLowerCase(),
    };
  }, [text, cursorPosition]);

  // Get all entities and categories as mention options
  const allOptions = useMemo(() => {
    const options: MentionOption[] = [];
    
    // Add all entities
    const entities = getAllEntities();
    entities.forEach(entity => {
      options.push({
        id: `entity-${entity.id}`,
        name: entity.name,
        mentionName: getMentionName(entity.name), // "Luka Dončić" -> "LukaDončić"
        type: 'entity',
        entityId: entity.id,
      });
    });
    
    // Add all categories
    const categories = getAllCategories();
    categories.forEach(category => {
      options.push({
        id: `category-${category}`,
        name: category,
        mentionName: getMentionName(category), // "NBA Players" -> "NBAPlayers"
        type: 'category',
        categoryId: category,
      });
    });
    
    return options;
  }, []);

  // Filter options based on current mention text
  const filteredOptions = useMemo(() => {
    if (!currentMention || !currentMention.text) {
      return [];
    }
    
    const searchText = removeAccents(currentMention.text);
    
    return allOptions.filter(option => {
      // Search in both the full name and mention name (without accents)
      const nameWithoutAccents = removeAccents(option.name);
      const mentionNameWithoutAccents = removeAccents(option.mentionName);
      
      return (
        nameWithoutAccents.startsWith(searchText) ||
        mentionNameWithoutAccents.startsWith(searchText)
      );
    }).slice(0, 10); // Limit to 10 results
  }, [allOptions, currentMention]);

  // Reset selected index when options change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredOptions.length]);

  // Handle selection
  const handleSelect = (option: MentionOption) => {
    // Insert the mention with correct accents (e.g., "@LukaDončić")
    const mentionText = `@${option.mentionName}`;
    onSelect(mentionText);
    onClose();
  };

  // Don't show if no mention is being typed or no results
  if (!currentMention || filteredOptions.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <FlatList
        data={filteredOptions}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[
              styles.option,
              index === selectedIndex && { backgroundColor: theme.backgroundSecondary },
            ]}
            onPress={() => handleSelect(item)}
          >
            <View style={styles.optionContent}>
              {item.type === 'entity' ? (
                <Ionicons name="person" size={20} color={theme.primary} />
              ) : (
                <Ionicons name="folder" size={20} color={theme.primary} />
              )}
              <Text style={[styles.optionText, { color: theme.text }]}>
                {item.mentionName}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        style={styles.list}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  list: {
    maxHeight: 200,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
