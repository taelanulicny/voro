import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../types';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import CommentSection from './CommentSection';

interface PostCardProps {
  post: Post;
  onPress?: () => void;
}

export default function PostCard({ post, onPress }: PostCardProps) {
  const { user } = useAuth();
  const { toggleLikePost, toggleBookmarkPost, deletePost } = useSocial();
  const { theme } = useTheme();
  const [showComments, setShowComments] = useState(false);
  const navigation = useNavigation();

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const postDate = new Date(timestamp);
    const diffMs = now.getTime() - postDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return postDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleLike = async () => {
    await toggleLikePost(post.id);
  };

  const handleBookmark = async () => {
    await toggleBookmarkPost(post.id);
  };

  const handleComment = () => {
    setShowComments(!showComments);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePost(post.id);
          },
        },
      ]
    );
  };

  const handleEntityPress = () => {
    if (post.entityId) {
      navigation.navigate('Entity' as never, {
        entityId: post.entityId,
        categoryId: 'stocks', // Default category
      } as never);
    }
  };

  const isOwnPost = user?.id === post.userId;

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person-circle" size={40} color={theme.textTertiary} />
        </View>
        
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.userInfo}>
              <Text style={[styles.displayName, { color: theme.text }]}>{post.displayName}</Text>
              <Text style={[styles.username, { color: theme.textSecondary }]}>@{post.username}</Text>
              <Text style={[styles.timestamp, { color: theme.textTertiary }]}>{formatTimestamp(post.timestamp)}</Text>
            </View>
            
            {isOwnPost && (
              <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>

          {/* Entity Tag */}
          {post.entityTicker && (
            <TouchableOpacity 
              style={[styles.entityTag, { backgroundColor: theme.primaryLight }]} 
              onPress={handleEntityPress}
            >
              <Ionicons name="pricetag" size={14} color={theme.primary} />
              <Text style={[styles.entityTagText, { color: theme.primary }]}>
                ${post.entityTicker}
              </Text>
              {post.entityName && (
                <Text style={[styles.entityName, { color: theme.textSecondary }]}> · {post.entityName}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <TouchableOpacity
        style={styles.content}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <Text style={[styles.contentText, { color: theme.text }]}>{post.content}</Text>
        
        {/* Sentiment Badge */}
        {post.sentiment && (
          <View style={[
            styles.sentimentBadge,
            {
              backgroundColor: 
                post.sentiment === 'bullish' ? 'rgba(16, 185, 129, 0.2)' :
                post.sentiment === 'bearish' ? 'rgba(239, 68, 68, 0.2)' :
                theme.backgroundTertiary,
            },
          ]}>
            <Ionicons
              name={
                post.sentiment === 'bullish' ? 'trending-up' :
                post.sentiment === 'bearish' ? 'trending-down' :
                'remove'
              }
              size={14}
              color={
                post.sentiment === 'bullish' ? '#10B981' :
                post.sentiment === 'bearish' ? '#EF4444' :
                theme.textSecondary
              }
            />
            <Text style={[
              styles.sentimentText,
              {
                color:
                  post.sentiment === 'bullish' ? '#10B981' :
                  post.sentiment === 'bearish' ? '#EF4444' :
                  theme.textSecondary,
              },
            ]}>
              {post.sentiment.charAt(0).toUpperCase() + post.sentiment.slice(1)}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Ionicons
            name={post.isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={post.isLiked ? '#EF4444' : theme.textSecondary}
          />
          {post.likes > 0 && (
            <Text style={[styles.actionText, { color: post.isLiked ? '#EF4444' : theme.textSecondary }]}>
              {post.likes}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
          <Ionicons name="chatbubble-outline" size={20} color={theme.textSecondary} />
          {post.comments > 0 && (
            <Text style={[styles.actionText, { color: theme.textSecondary }]}>{post.comments}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleBookmark}>
          <Ionicons
            name={post.isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={post.isBookmarked ? theme.primary : theme.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Comments Section */}
      {showComments && (
        <CommentSection postId={post.id} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  displayName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginRight: 6,
  },
  username: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 6,
  },
  timestamp: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  deleteButton: {
    padding: 4,
  },
  entityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  entityTagText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  entityName: {
    fontSize: 13,
  },
  content: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#111827',
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
    gap: 4,
  },
  sentimentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

