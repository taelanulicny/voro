import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSocial } from '../context/SocialContext';

export default function NewsScreen() {
  const { activityFeed, isLoadingFeed, refreshActivityFeed } = useSocial();

  useEffect(() => {
    refreshActivityFeed();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>News Feed</Text>
      </View>

      {activityFeed.length === 0 ? (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No posts yet</Text>
          <Text style={styles.placeholderSubtext}>
            Follow traders or create your first post!
          </Text>
        </View>
      ) : (
        <FlatList
          data={activityFeed}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.postCard}>
              <Text style={styles.postUser}>{item.displayName}</Text>
              <Text style={styles.postContent}>{item.content}</Text>
              <View style={styles.postStats}>
                <Text style={styles.postStat}>❤️ {item.likes}</Text>
                <Text style={styles.postStat}>💬 {item.comments}</Text>
              </View>
            </View>
          )}
          refreshing={isLoadingFeed}
          onRefresh={refreshActivityFeed}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  postCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  postUser: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  postContent: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 12,
  },
  postStats: {
    flexDirection: 'row',
    gap: 16,
  },
  postStat: {
    fontSize: 14,
    color: '#6b7280',
  },
});

