import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../types';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import CommentSection from './CommentSection';
import { getEntityByName } from '../utils/mockEntities';

interface PostCardProps {
  post: Post;
  onPress?: () => void;
  isCategoryFeed?: boolean; // For category feeds, use @entityName format
  categoryId?: string; // Category ID for navigation
  categoryName?: string; // Category display name for tagging
  isEntityFeed?: boolean; // For entity feeds, use @entityName format
  entityId?: number; // Entity ID for navigation
  entityName?: string; // Entity display name for tagging
}

export default function PostCard({ post, onPress, isCategoryFeed = false, categoryId, categoryName, isEntityFeed = false, entityId, entityName }: PostCardProps) {
  const { user } = useAuth();
  const { toggleLikePost, deletePost } = useSocial();
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

  const handleShare = async () => {
    try {
      const shareContent = post.entityName 
        ? `${post.content}\n\n— ${post.displayName} (@${post.username})`
        : `${post.content}\n\n— ${post.displayName} (@${post.username})`;
      
      await Share.share({
        message: shareContent,
        title: post.entityName ? `Post about @${post.entityName}` : 'Post from moro',
      });
    } catch (error) {
      // User cancelled or error occurred
    }
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

  // Helper function to convert entity name to mention format (remove spaces)
  const entityNameToMention = (name: string): string => {
    return name.replace(/\s+/g, '');
  };

  // Helper function to clean mention name (remove trailing apostrophes, 's', etc.)
  const cleanMentionName = (mentionName: string): string => {
    // Remove trailing apostrophes and possessive forms like "'s"
    return mentionName.replace(/['"]+s?$/i, '').trim();
  };

  // Helper function to find entity by mention (try both mention format and full name)
  const getEntityByMention = (mentionName: string) => {
    // Clean the mention name first (e.g., "Drake's" -> "Drake")
    const cleanedName = cleanMentionName(mentionName);
    
    // First try exact match with cleaned name (for single-word names like "Drake")
    let entity = getEntityByName(cleanedName);
    if (entity) return entity;
    
    // Try all entities to find one whose mention format matches
    // This handles multi-word names like "Kanye West" -> "@KanyeWest"
    const { MOCK_ENTITIES } = require('../utils/mockEntities');
    return MOCK_ENTITIES.find((e: any) => {
      const entityMentionName = entityNameToMention(e.name);
      return entityMentionName.toLowerCase() === cleanedName.toLowerCase();
    });
  };

  const handleEntityPress = (mentionEntityName?: string) => {
    // If a specific entity name is provided (from mention), use that
    if (mentionEntityName) {
      const entity = getEntityByMention(mentionEntityName);
      if (!entity) {
        // Entity not found - this shouldn't happen, but handle gracefully
        console.warn(`Entity not found for mention: ${mentionEntityName}`);
        return;
      }
      
      // Category is already in the correct format (no mapping needed)
      const entityCategoryId = entity.category;
      
      // Navigate to the clicked entity's chart page - use the found entity's ID, not the current entity
      navigation.navigate('Entity' as never, {
        entityId: entity.id,
        categoryId: entityCategoryId,
      } as never);
      return;
    }
    
    // Otherwise use the post's entity
    if (post.entityId && categoryId) {
      navigation.navigate('Entity' as never, {
        entityId: post.entityId,
        categoryId: categoryId,
      } as never);
    } else if (post.entityId) {
      // Fallback for non-category feeds
      navigation.navigate('Entity' as never, {
        entityId: post.entityId,
        categoryId: 'Influencers',
      } as never);
    }
  };

  const handleCategoryPress = () => {
    if (categoryId) {
      navigation.navigate('Category' as never, {
        categoryId: categoryId,
      } as never);
    }
  };

  const isOwnPost = user?.id === post.userId;

  // Parse content to find @mentions and make them clickable
  const renderContentWithMentions = () => {
    if (isEntityFeed) {
      // Entity feed: Start with @EntityName prefix (no spaces) - e.g., @KanyeWest not @Kanye West
      const entityMentionFormatted = entityName ? `@${entityNameToMention(entityName)} ` : '';
      const fullContent = entityMentionFormatted + post.content;
      
      // Use regex to find all @mentions - now matches single word format (no spaces)
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      // Match @ followed by word characters (letters, numbers, dots, hyphens) but NO spaces
      // Stop at: punctuation, spaces, or end of string
      const mentionRegex = /@([a-zA-Z0-9.'-]+)/g;
      let match;
      
      while ((match = mentionRegex.exec(fullContent)) !== null) {
        const mention = match[0]; // e.g., "@Drake" or "@Drake's"
        const mentionName = match[1]; // e.g., "Drake" or "Drake's"
        const startIndex = match.index;
        
        // Add text before the mention
        if (startIndex > lastIndex) {
          const textBefore = fullContent.substring(lastIndex, startIndex);
          if (textBefore) {
            parts.push(
              <Text key={`text-${lastIndex}`} style={[styles.contentText, { color: theme.text }]}>
                {textBefore}
              </Text>
            );
          }
        }
        
        // Check if mention has possessive "'s" at the end
        const possessiveMatch = mention.match(/^(@[a-zA-Z0-9.'-]+)('s|')$/i);
        const entityMention = possessiveMatch ? possessiveMatch[1] : mention; // "@Drake" or "@Drake"
        const possessiveText = possessiveMatch ? possessiveMatch[2] : ''; // "'s" or ""
        
        // Clean mention name for comparison and lookup (remove possessive)
        const cleanedMentionName = cleanMentionName(mentionName);
        
        // Check if this is the main entity mention
        const isMainEntityMention = cleanedMentionName.toLowerCase() === entityNameToMention(entityName || '').toLowerCase();
        
        // Capture values in closure to ensure correct value
        const capturedMentionName = cleanedMentionName;
        const isMainMention = isMainEntityMention;
        
        // Render the entity mention (blue, clickable)
        parts.push(
          <Text
            key={`mention-${startIndex}`}
            style={[styles.contentText, styles.mentionText, { color: theme.primary }]}
            onPress={() => {
              if (capturedMentionName) {
                if (isMainMention && entityId) {
                  // Main entity mention - navigate to current entity page (the entity whose feed we're in)
                  navigation.navigate('Entity' as never, {
                    entityId: entityId,
                    categoryId: categoryId || 'Influencers',
                  } as never);
                } else {
                  // Other entity mentions - navigate to their entity page (NOT the current entity)
                  handleEntityPress(capturedMentionName);
                }
              }
            }}
          >
            {entityMention}
          </Text>
        );
        
        // If there's possessive text, render it as regular text (not blue)
        if (possessiveText) {
          parts.push(
            <Text key={`possessive-${startIndex}`} style={[styles.contentText, { color: theme.text }]}>
              {possessiveText}
            </Text>
          );
        }
        
        lastIndex = startIndex + mention.length;
      }
      
      // Add any remaining text after the last mention
      if (lastIndex < fullContent.length) {
        const textAfter = fullContent.substring(lastIndex);
        if (textAfter) {
          parts.push(
            <Text key={`text-${lastIndex}`} style={[styles.contentText, { color: theme.text }]}>
              {textAfter}
            </Text>
          );
        }
      }
      
      // Return all parts wrapped in a Text component (required in React Native for nested Text)
      // Outer wrapper only has fontSize/lineHeight - no color to prevent cascading
      // Each part explicitly specifies its own color (theme.text for regular text, theme.primary for mentions)
      return <Text style={{ fontSize: 15, lineHeight: 22 }}>{parts}</Text>;
    }
    
    if (isCategoryFeed) {
      // Category feed: Start with @CategoryName prefix, then parse entity mentions (no-space format)
      // Remove spaces from category name, e.g., "Music Artists" -> "@MusicArtists"
      const categoryMentionName = categoryName ? categoryName.replace(/\s+/g, '') : '';
      const categoryMention = categoryMentionName ? `@${categoryMentionName} ` : '';
      const fullContent = categoryMention + post.content;
      
      // Parse all @mentions in the full content (entity mentions use no-space format)
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      const mentionRegex = /@([a-zA-Z0-9.'-]+)/g;
      let match;
      
      while ((match = mentionRegex.exec(fullContent)) !== null) {
        const mention = match[0]; // e.g., "@Influencers" or "@AlixEarle"
        const mentionName = match[1]; // e.g., "Influencers" or "AlixEarle"
        const startIndex = match.index;
        
        // Add text before the mention
        if (startIndex > lastIndex) {
          const textBefore = fullContent.substring(lastIndex, startIndex);
          if (textBefore) {
            parts.push(
              <Text key={`text-${lastIndex}`} style={[styles.contentText, { color: theme.text }]}>
                {textBefore}
              </Text>
            );
          }
        }
        
        // Check if mention has possessive "'s" at the end
        const possessiveMatch = mention.match(/^(@[a-zA-Z0-9.'-]+)('s|')$/i);
        const entityMention = possessiveMatch ? possessiveMatch[1] : mention; // "@Drake" or "@Drake"
        const possessiveText = possessiveMatch ? possessiveMatch[2] : ''; // "'s" or ""
        
        // Clean mention name for comparison (remove possessive)
        const cleanedMentionName = cleanMentionName(mentionName);
        
        // Check if this is the category mention (compare with no-space version)
        const categoryMentionNameForComparison = categoryName ? categoryName.replace(/\s+/g, '') : '';
        const isCategoryMention = categoryMentionNameForComparison && cleanedMentionName.toLowerCase() === categoryMentionNameForComparison.toLowerCase();
        
        if (isCategoryMention) {
          // Category mention - clickable, navigates to category
          parts.push(
            <Text
              key={`mention-${startIndex}`}
              style={[styles.contentText, styles.mentionText, { color: theme.primary }]}
              onPress={handleCategoryPress}
            >
              {entityMention}
            </Text>
          );
        } else {
          // Entity mention - clickable, navigates to entity
          parts.push(
            <Text
              key={`mention-${startIndex}`}
              style={[styles.contentText, styles.mentionText, { color: theme.primary }]}
              onPress={() => {
                if (cleanedMentionName) {
                  handleEntityPress(cleanedMentionName);
                }
              }}
            >
              {entityMention}
            </Text>
          );
        }
        
        // If there's possessive text, render it as regular text (not blue)
        if (possessiveText) {
          parts.push(
            <Text key={`possessive-${startIndex}`} style={[styles.contentText, { color: theme.text }]}>
              {possessiveText}
            </Text>
          );
        }
        
        lastIndex = startIndex + mention.length;
      }
      
      // Add any remaining text after the last mention
      if (lastIndex < fullContent.length) {
        const textAfter = fullContent.substring(lastIndex);
        if (textAfter) {
          parts.push(
            <Text key={`text-${lastIndex}`} style={[styles.contentText, { color: theme.text }]}>
              {textAfter}
            </Text>
          );
        }
      }
      
      // Return all parts wrapped in a Text component
      return <Text style={{ fontSize: 15, lineHeight: 22 }}>{parts}</Text>;
    }
    
    // Regular feed - parse @mentions but no category/entity prefix
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const mentionRegex = /@([a-zA-Z0-9.'-]+)/g;
    let match;
    
    while ((match = mentionRegex.exec(post.content)) !== null) {
      const mention = match[0]; // e.g., "@TaylorSwift"
      const mentionName = match[1]; // e.g., "TaylorSwift"
      const startIndex = match.index;
      
      // Check if mention has possessive "'s" at the end
      const possessiveMatch = mention.match(/^(@[a-zA-Z0-9.'-]+)('s|')$/i);
      const entityMention = possessiveMatch ? possessiveMatch[1] : mention;
      const possessiveText = possessiveMatch ? possessiveMatch[2] : '';
      
      // Clean mention name for lookup
      const cleanedMentionName = cleanMentionName(mentionName);
      
      // Add text before the mention
      if (startIndex > lastIndex) {
        const textBefore = post.content.substring(lastIndex, startIndex);
        if (textBefore) {
          parts.push(
            <Text key={`text-${lastIndex}`} style={[styles.contentText, { color: theme.text }]}>
              {textBefore}
            </Text>
          );
        }
      }
      
      // Add the clickable entity mention (blue)
      parts.push(
        <Text
          key={`mention-${startIndex}`}
          style={[styles.contentText, styles.mentionText, { color: theme.primary }]}
          onPress={() => {
            if (cleanedMentionName) {
              handleEntityPress(cleanedMentionName);
            }
          }}
        >
          {entityMention}
        </Text>
      );
      
      // If there's possessive text, render it as regular text (not blue)
      if (possessiveText) {
        parts.push(
          <Text key={`possessive-${startIndex}`} style={[styles.contentText, { color: theme.text }]}>
            {possessiveText}
          </Text>
        );
      }
      
      lastIndex = startIndex + mention.length;
    }
    
    // Add any remaining text after the last mention
    if (lastIndex < post.content.length) {
      const textAfter = post.content.substring(lastIndex);
      if (textAfter) {
        parts.push(
          <Text key={`text-${lastIndex}`} style={[styles.contentText, { color: theme.text }]}>
            {textAfter}
          </Text>
        );
      }
    }
    
    // Return all parts wrapped in a Text component
    return <Text style={{ fontSize: 15, lineHeight: 22 }}>{parts}</Text>;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: theme.backgroundSecondary }]}>
          <Ionicons name="person" size={24} color={theme.textTertiary} />
        </View>
        
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.userInfo}>
              <Text style={[styles.displayName, { color: theme.text }]}>{post.displayName}</Text>
              <Text style={[styles.username, { color: theme.textSecondary }]}>@{post.username}</Text>
            </View>
            
            {isOwnPost && (
              <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>

          {/* Timestamp */}
          <Text style={[styles.timestamp, { color: theme.textTertiary }]}>{formatTimestamp(post.timestamp)}</Text>
        </View>
      </View>

      {/* Content */}
      <TouchableOpacity
        style={styles.content}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        {renderContentWithMentions()}
        
        {/* Sentiment Badge */}
        {post.sentiment && (
          <View style={[
            styles.sentimentBadge,
            {
              backgroundColor: 
                post.sentiment === 'positive' ? 'rgba(16, 185, 129, 0.2)' :
                post.sentiment === 'negative' ? 'rgba(239, 68, 68, 0.2)' :
                theme.backgroundTertiary,
            },
          ]}>
            <Ionicons
              name={
                post.sentiment === 'positive' ? 'trending-up' :
                post.sentiment === 'negative' ? 'trending-down' :
                'remove'
              }
              size={14}
              color={
                post.sentiment === 'positive' ? '#10B981' :
                post.sentiment === 'negative' ? '#EF4444' :
                theme.textSecondary
              }
            />
            <Text style={[
              styles.sentimentText,
              {
                color:
                  post.sentiment === 'positive' ? '#10B981' :
                  post.sentiment === 'negative' ? '#EF4444' :
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

        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Ionicons
            name="share-outline"
            size={20}
            color={theme.textSecondary}
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
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
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
  mentionText: {
    fontWeight: '600',
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

