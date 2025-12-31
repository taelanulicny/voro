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
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import CommentSection from './CommentSection';
import { getEntityByName, getEntityByTicker } from '../utils/mockEntities';

interface PostCardProps {
  post: Post;
  onPress?: () => void;
  isCategoryFeed?: boolean; // For category feeds, use @entityName format
  categoryId?: string; // Category ID for navigation
  categoryName?: string; // Category display name for tagging
  isEntityFeed?: boolean; // For entity feeds, use @entityName format
  entityId?: number; // Entity ID for navigation
  entityName?: string; // Entity display name for tagging
  onDelete?: (postId: string) => void; // Optional callback when post is deleted
}

export default function PostCard({ post, onPress, isCategoryFeed = false, categoryId, categoryName, isEntityFeed = false, entityId, entityName, onDelete }: PostCardProps) {
  const { user } = useAuth();
  const { toggleLikePost, deletePost } = useSocial();
  const { theme } = useTheme();
  const [showComments, setShowComments] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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
            const result = await deletePost(post.id);
            if (result.success) {
              // Post will be removed from feed automatically via context update
              // Also call onDelete callback if provided (e.g., to update local state)
              if (onDelete) {
                onDelete(post.id);
              }
            } else {
              Alert.alert(
                'Error',
                result.error || 'Failed to delete post. Please try again.',
                [{ text: 'OK' }]
              );
            }
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
      
      // Map entity category to categoryId format used in navigation
      // For People category, need to check entity ID to distinguish Influencers vs Music Artists
      let entityCategoryId: string;
      if (entity.category === 'People') {
        if (entity.id >= 11 && entity.id <= 20) {
          entityCategoryId = 'Influencers';
        } else if (entity.id >= 21 && entity.id <= 30) {
          entityCategoryId = 'Music Artists';
        } else {
          entityCategoryId = 'Influencers'; // Default
        }
      } else {
        const categoryMap: Record<string, string> = {
          'Politics': 'Political Figures',
          'Tech': 'Startups',
          'Events': 'Sports',
        };
        entityCategoryId = categoryMap[entity.category] || entity.category;
      }
      
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

  const handleProfilePress = () => {
    // Check if clicking on own profile
    if (user?.id === post.userId) {
      // Navigate to Profile tab in the Main tab navigator
      // React Navigation supports nested navigation with params
      navigation.dispatch(
        CommonActions.navigate({
          name: 'Main',
          params: {
            screen: 'Profile',
          },
        } as any)
      );
    } else {
      // Navigate to other user's profile
      navigation.navigate('UserProfile', {
        userId: post.userId,
      });
    }
  };

  const handleTickerPress = (ticker: string) => {
    const entity = getEntityByTicker(ticker);
    if (!entity) {
      console.warn(`Entity not found for ticker: ${ticker}`);
      return;
    }
    
    // Map entity category to categoryId format used in navigation
    let entityCategoryId: string;
    if (entity.category === 'People') {
      if (entity.id >= 11 && entity.id <= 20) {
        entityCategoryId = 'Influencers';
      } else if (entity.id >= 21 && entity.id <= 30) {
        entityCategoryId = 'Music Artists';
      } else {
        entityCategoryId = 'Influencers'; // Default
      }
    } else {
      const categoryMap: Record<string, string> = {
        'Politics': 'Political Figures',
        'Tech': 'Startups',
        'Events': 'Sports',
      };
      entityCategoryId = categoryMap[entity.category] || entity.category;
    }
    
    navigation.navigate('Entity' as never, {
      entityId: entity.id,
      categoryId: entityCategoryId,
    } as never);
  };

  const isOwnPost = user?.id === post.userId;

  // Helper function to parse content and find all @mentions and $tickers, returning sorted matches
  const parseMentionsAndTickers = (content: string): Array<{
    type: 'mention' | 'ticker';
    match: string;
    name: string;
    index: number;
    possessiveText?: string;
  }> => {
    const matches: Array<{
      type: 'mention' | 'ticker';
      match: string;
      name: string;
      index: number;
      possessiveText?: string;
    }> = [];

    // Find all @mentions
    const mentionRegex = /@([a-zA-Z0-9.'-]+)/g;
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      const possessiveMatch = match[0].match(/^(@[a-zA-Z0-9.'-]+)('s|')$/i);
      matches.push({
        type: 'mention',
        match: possessiveMatch ? possessiveMatch[1] : match[0],
        name: cleanMentionName(match[1]),
        index: match.index,
        possessiveText: possessiveMatch ? possessiveMatch[2] : undefined,
      });
    }

    // Find all $tickers (uppercase letters, 1-6 chars typically)
    const tickerRegex = /\$([A-Z]{1,6})\b/g;
    while ((match = tickerRegex.exec(content)) !== null) {
      matches.push({
        type: 'ticker',
        match: match[0],
        name: match[1],
        index: match.index,
      });
    }

    // Sort by index
    return matches.sort((a, b) => a.index - b.index);
  };

  // Parse content to find @mentions, $tickers, and make them clickable
  const renderContentWithMentions = () => {
    if (isEntityFeed) {
      // Entity feed: Start with @EntityName prefix (no spaces) - e.g., @KanyeWest not @Kanye West
      const entityMentionFormatted = entityName ? `@${entityNameToMention(entityName)} ` : '';
      const fullContent = entityMentionFormatted + post.content;
      
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      const matches = parseMentionsAndTickers(fullContent);
      
      matches.forEach((item) => {
        // Add text before the match
        if (item.index > lastIndex) {
          const textBefore = fullContent.substring(lastIndex, item.index);
          if (textBefore) {
            parts.push(
              <Text key={`text-${item.index}`} style={[styles.contentText, { color: theme.text }]}>
                {textBefore}
              </Text>
            );
          }
        }
        
        // Render the match based on type
        if (item.type === 'mention') {
          // Check if this is the main entity mention
          const isMainEntityMention = item.name.toLowerCase() === entityNameToMention(entityName || '').toLowerCase();
          
          if (isMainEntityMention && entityId) {
            // Main entity mention - navigate to current entity page
            parts.push(
              <Text
                key={`mention-${item.index}`}
                style={[styles.contentText, styles.mentionText, { color: theme.primary }]}
                onPress={() => {
                  navigation.navigate('Entity' as never, {
                    entityId: entityId,
                    categoryId: categoryId || 'Influencers',
                  } as never);
                }}
              >
                {item.match}
              </Text>
            );
          } else {
            // Other entity mentions - navigate to their entity page
            parts.push(
              <Text
                key={`mention-${item.index}`}
                style={[styles.contentText, styles.mentionText, { color: theme.primary }]}
                onPress={() => handleEntityPress(item.name)}
              >
                {item.match}
              </Text>
            );
          }
        } else if (item.type === 'ticker') {
          // Ticker - clickable, navigates to entity
          parts.push(
            <Text
              key={`ticker-${item.index}`}
              style={[styles.contentText, styles.mentionText, { color: theme.primary }]}
              onPress={() => handleTickerPress(item.name)}
            >
              {item.match}
            </Text>
          );
        }
        
        // If there's possessive text, render it as regular text
        if (item.possessiveText) {
          parts.push(
            <Text key={`possessive-${item.index}`} style={[styles.contentText, { color: theme.text }]}>
              {item.possessiveText}
            </Text>
          );
        }
        
        lastIndex = item.index + item.match.length + (item.possessiveText?.length || 0);
      });
      
      // Add any remaining text after the last match
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
      
      return <Text style={{ fontSize: 15, lineHeight: 22 }}>{parts}</Text>;
    }
    
    if (isCategoryFeed) {
      // Category feed: Start with @CategoryName prefix, then parse entity mentions (no-space format)
      // Remove spaces from category name, e.g., "Music Artists" -> "@MusicArtists"
      const categoryMentionName = categoryName ? categoryName.replace(/\s+/g, '') : '';
      const categoryMention = categoryMentionName ? `@${categoryMentionName} ` : '';
      const fullContent = categoryMention + post.content;
      
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      const matches = parseMentionsAndTickers(fullContent);
      const categoryMentionNameForComparison = categoryName ? categoryName.replace(/\s+/g, '') : '';
      
      matches.forEach((item) => {
        // Add text before the match
        if (item.index > lastIndex) {
          const textBefore = fullContent.substring(lastIndex, item.index);
          if (textBefore) {
            parts.push(
              <Text key={`text-${item.index}`} style={[styles.contentText, { color: theme.text }]}>
                {textBefore}
              </Text>
            );
          }
        }
        
        // Render the match based on type
        if (item.type === 'mention') {
          // Check if this is the category mention
          const isCategoryMention = categoryMentionNameForComparison && item.name.toLowerCase() === categoryMentionNameForComparison.toLowerCase();
          
          if (isCategoryMention) {
            // Category mention - clickable, navigates to category
            parts.push(
              <Text
                key={`mention-${item.index}`}
                style={[styles.contentText, styles.mentionText, { color: theme.primary }]}
                onPress={handleCategoryPress}
              >
                {item.match}
              </Text>
            );
          } else {
            // Entity mention - clickable, navigates to entity
            parts.push(
              <Text
                key={`mention-${item.index}`}
                style={[styles.contentText, styles.mentionText, { color: theme.primary }]}
                onPress={() => handleEntityPress(item.name)}
              >
                {item.match}
              </Text>
            );
          }
        } else if (item.type === 'ticker') {
          // Ticker - clickable, navigates to entity
          parts.push(
            <Text
              key={`ticker-${item.index}`}
              style={[styles.contentText, styles.mentionText, { color: theme.primary }]}
              onPress={() => handleTickerPress(item.name)}
            >
              {item.match}
            </Text>
          );
        }
        
        // If there's possessive text, render it as regular text
        if (item.possessiveText) {
          parts.push(
            <Text key={`possessive-${item.index}`} style={[styles.contentText, { color: theme.text }]}>
              {item.possessiveText}
            </Text>
          );
        }
        
        lastIndex = item.index + item.match.length + (item.possessiveText?.length || 0);
      });
      
      // Add any remaining text after the last match
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
      
      return <Text style={{ fontSize: 15, lineHeight: 22 }}>{parts}</Text>;
    }
    
    // Regular feed - parse @mentions and $tickers but no category/entity prefix
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const matches = parseMentionsAndTickers(post.content);
    
    matches.forEach((item, idx) => {
      // Add text before the match
      if (item.index > lastIndex) {
        const textBefore = post.content.substring(lastIndex, item.index);
        if (textBefore) {
          parts.push(
            <Text key={`text-${item.index}`} style={[styles.contentText, { color: theme.text }]}>
              {textBefore}
            </Text>
          );
        }
      }
      
      // Render the match based on type
      if (item.type === 'mention') {
        // Entity mention - clickable, navigates to entity
        parts.push(
          <Text
            key={`mention-${item.index}`}
            style={[styles.contentText, styles.mentionText, { color: theme.primary }]}
            onPress={() => handleEntityPress(item.name)}
          >
            {item.match}
          </Text>
        );
      } else if (item.type === 'ticker') {
        // Ticker - clickable, navigates to entity
        parts.push(
          <Text
            key={`ticker-${item.index}`}
            style={[styles.contentText, styles.mentionText, { color: theme.primary }]}
            onPress={() => handleTickerPress(item.name)}
          >
            {item.match}
          </Text>
        );
      }
      
      // If there's possessive text, render it as regular text
      if (item.possessiveText) {
        parts.push(
          <Text key={`possessive-${item.index}`} style={[styles.contentText, { color: theme.text }]}>
            {item.possessiveText}
          </Text>
        );
      }
      
      lastIndex = item.index + item.match.length + (item.possessiveText?.length || 0);
    });
    
    // Add any remaining text after the last match
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
        <TouchableOpacity 
          style={[styles.avatar, { backgroundColor: theme.backgroundSecondary }]}
          onPress={handleProfilePress}
          activeOpacity={0.7}
        >
          <Ionicons name="person" size={24} color={theme.textTertiary} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.userInfo}
              onPress={handleProfilePress}
              activeOpacity={0.7}
            >
              <Text style={[styles.displayName, { color: theme.text }]}>{post.displayName}</Text>
              <Text style={[styles.username, { color: theme.textSecondary }]}>@{post.username}</Text>
            </TouchableOpacity>
            
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

