import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authenticatedRequest, isBackendConfigured } from '../config/api';

interface BlockedUser {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  blockedAt: string;
}

export default function BlockedUsersScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { token } = useAuth();

  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    if (!isBackendConfigured() || !token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await authenticatedRequest<{ blockedUsers: BlockedUser[] }>(
        '/api/user/blocked',
        token,
        { method: 'GET' }
      );

      if (response.success && response.data?.blockedUsers) {
        setBlockedUsers(response.data.blockedUsers);
      }
    } catch (error) {
      console.error('Error loading blocked users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async (userId: string, username: string) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: async () => {
            if (!isBackendConfigured() || !token) {
              Alert.alert('Error', 'Backend not configured');
              return;
            }

            try {
              const response = await authenticatedRequest(
                `/api/user/blocked/${userId}`,
                token,
                { method: 'DELETE' }
              );

              if (response.success) {
                setBlockedUsers(blockedUsers.filter(u => u.userId !== userId));
                Alert.alert('Success', `${username} has been unblocked`);
              } else {
                Alert.alert('Error', response.error || 'Failed to unblock user');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to unblock user');
            }
          },
        },
      ]
    );
  };

  const renderBlockedUser = ({ item }: { item: BlockedUser }) => (
    <View style={[styles.userItem, { backgroundColor: theme.card, borderBottomColor: theme.borderLight }]}>
      <View style={styles.userLeft}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="person" size={24} color={theme.primary} />
          </View>
        )}
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.text }]}>{item.displayName}</Text>
          <Text style={[styles.userUsername, { color: theme.textSecondary }]}>@{item.username}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.unblockButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
        onPress={() => handleUnblock(item.userId, item.username)}
      >
        <Text style={[styles.unblockButtonText, { color: theme.text }]}>Unblock</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Blocked Users</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : blockedUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="eye-off-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No Blocked Users</Text>
          <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
            You haven't blocked any users yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          renderItem={renderBlockedUser}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
  },
  unblockButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  unblockButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

