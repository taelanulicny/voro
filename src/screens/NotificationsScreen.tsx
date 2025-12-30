import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationsContext';
import { RootStackParamList, Notification } from '../types';
// Simple time formatter
const formatTimestamp = (timestamp: string) => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    const weeks = Math.floor(diffDays / 7);
    if (weeks < 4) return `${weeks}w ago`;
    
    const months = Math.floor(diffDays / 30);
    return `${months}mo ago`;
  } catch {
    return timestamp;
  }
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function NotificationsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    hasMore,
    refreshNotifications,
    loadMoreNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshNotifications();
    }, [refreshNotifications])
  );

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      markAsRead(notification.notificationId);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'like':
      case 'comment':
      case 'reply':
      case 'mention':
        if (notification.postId) {
          // Navigate to post detail (if you have a post detail screen)
          // For now, navigate to entity if available
          if (notification.entityId) {
            navigation.navigate('Entity', {
              entityId: notification.entityId,
              categoryId: 'All',
            });
          }
        }
        break;
      case 'follow':
        if (notification.actorUserId) {
          navigation.navigate('UserProfile', { userId: notification.actorUserId });
        }
        break;
      case 'price_alert':
      case 'trade':
        if (notification.entityId) {
          navigation.navigate('Entity', {
            entityId: notification.entityId,
            categoryId: 'All',
          });
        }
        break;
      case 'group_invite':
      case 'group_post':
        if (notification.groupId) {
          navigation.navigate('GroupDetail', { groupId: notification.groupId });
        }
        break;
      case 'system':
        if (notification.actionUrl) {
          // Handle deep link
          console.log('System notification action URL:', notification.actionUrl);
        }
        break;
    }
  };

  const handleMarkAllAsRead = () => {
    Alert.alert(
      'Mark All as Read',
      'Are you sure you want to mark all notifications as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark All Read',
          onPress: () => markAllAsRead(),
        },
      ]
    );
  };

  const handleDelete = (notificationId: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteNotification(notificationId),
        },
      ]
    );
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'like':
        return 'heart';
      case 'comment':
      case 'reply':
        return 'chatbubble';
      case 'follow':
        return 'person-add';
      case 'mention':
        return 'at';
      case 'trade':
        return 'swap-horizontal';
      case 'price_alert':
        return 'notifications';
      case 'group_invite':
      case 'group_post':
        return 'people';
      case 'system':
        return 'information-circle';
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'like':
        return '#EF4444'; // Red
      case 'comment':
      case 'reply':
        return '#3B82F6'; // Blue
      case 'follow':
        return '#10B981'; // Green
      case 'mention':
        return '#8B5CF6'; // Purple
      case 'trade':
        return '#F59E0B'; // Amber
      case 'price_alert':
        return '#F97316'; // Orange
      case 'group_invite':
      case 'group_post':
        return '#6366F1'; // Indigo
      case 'system':
        return '#6B7280'; // Gray
      default:
        return theme.primary;
    }
  };


  const renderNotification = ({ item }: { item: Notification }) => {
    const iconName = getNotificationIcon(item.type);
    const iconColor = getNotificationColor(item.type);

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          {
            backgroundColor: item.isRead ? theme.card : theme.backgroundSecondary,
            borderLeftColor: iconColor,
            borderLeftWidth: item.isRead ? 0 : 3,
          },
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
            <Ionicons name={iconName as any} size={20} color={iconColor} />
          </View>

          <View style={styles.notificationBody}>
            {item.actorAvatarUrl ? (
              <Image source={{ uri: item.actorAvatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="person" size={16} color={theme.primary} />
              </View>
            )}

            <View style={styles.notificationText}>
              <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.message, { color: theme.textSecondary }]}>{item.message}</Text>
              {item.entityTicker && (
                <Text style={[styles.entityTag, { color: theme.primary }]}>
                  {item.entityTicker}
                </Text>
              )}
              <Text style={[styles.timestamp, { color: theme.textTertiary }]}>
                {formatTimestamp(item.createdAt)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item.notificationId)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color={theme.textTertiary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Notifications</Text>
        {unreadCount > 0 && (
          <Text style={[styles.unreadBadge, { color: theme.primary }]}>
            {unreadCount} unread
          </Text>
        )}
      </View>
      <View style={styles.headerRight}>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
            <Text style={[styles.markAllText, { color: theme.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-outline" size={64} color={theme.textTertiary} />
      <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No notifications</Text>
      <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
        You're all caught up! New notifications will appear here.
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      {renderHeader()}
      {isLoading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.notificationId}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refreshNotifications}
              tintColor={theme.primary}
            />
          }
          onEndReached={() => {
            if (hasMore && !isLoadingMore) {
              loadMoreNotifications();
            }
          }}
          onEndReachedThreshold={0.5}
          contentContainerStyle={notifications.length === 0 ? styles.emptyListContent : styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

export default React.memo(NotificationsScreen);

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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  unreadBadge: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  headerRight: {
    width: 100,
    alignItems: 'flex-end',
  },
  markAllButton: {
    padding: 4,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 16,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  notificationItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  entityTag: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 100,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

