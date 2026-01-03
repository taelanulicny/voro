import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Post } from '../types';
import PostCard from './PostCard';

interface RecentActivityProps {
  posts: Post[];
  onPostPress?: (post: Post) => void;
  maxItems?: number;
}

export default React.memo(function RecentActivity({ posts, onPostPress, maxItems = 5 }: RecentActivityProps) {
  const { theme } = useTheme();

  const displayPosts = posts.slice(0, maxItems);

  if (posts.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
        <Text style={[styles.title, { color: theme.text }]}>Recent Activity</Text>
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No recent activity</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Activity from people you follow will appear here
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
      <Text style={[styles.title, { color: theme.text }]}>Recent Activity</Text>
      <FlatList
        data={displayPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onPostPress?.(item)}
            activeOpacity={0.7}
          >
            <PostCard post={item} />
          </TouchableOpacity>
        )}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});




