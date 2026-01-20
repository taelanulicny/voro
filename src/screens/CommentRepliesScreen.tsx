import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Comment } from '../types';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import MentionAutocomplete from '../components/MentionAutocomplete';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type CommentRepliesRouteProp = RouteProp<RootStackParamList, 'CommentReplies'>;

export default function CommentRepliesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CommentRepliesRouteProp>();
  const { postId, commentId, commentUsername, commentContent } = route.params;
  const { user } = useAuth();
  const { postComments, getComments, addComment, toggleLikeComment } = useSocial();
  const { theme } = useTheme();
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [commentCursorPosition, setCommentCursorPosition] = useState(0);
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false);
  const commentInputRef = useRef<TextInput>(null);

  // Get all comments for the post
  const allComments = postComments[postId] || [];
  
  // Find the parent comment and get its replies
  const parentComment = allComments.find(c => c.id === commentId);
  const replies = parentComment?.replies || [];

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    setIsLoading(true);
    await getComments(postId);
    setIsLoading(false);
  };

  const handleSubmitReply = async () => {
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    const result = await addComment(postId, commentText.trim(), commentId);
    setIsSubmitting(false);

    if (result.success) {
      setCommentText('');
      await loadComments();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const commentDate = new Date(timestamp);
    const diffMs = now.getTime() - commentDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return commentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderReply = ({ item: reply }: { item: Comment }) => {
    return (
      <View style={[styles.replyItem, { borderBottomColor: theme.border }]}>
        <View style={styles.replyHeader}>
          <Text style={[styles.replyUsername, { color: theme.text }]}>
            {reply.displayName}
          </Text>
          <Text style={[styles.replyTimestamp, { color: theme.textTertiary }]}>
            {formatTimestamp(reply.timestamp)}
          </Text>
        </View>
        <Text style={[styles.replyContent, { color: theme.text }]}>
          {reply.content}
        </Text>
        <View style={styles.replyActions}>
          <TouchableOpacity
            style={styles.replyActionButton}
            onPress={() => toggleLikeComment(postId, reply.id)}
          >
            <Ionicons
              name={reply.isLiked ? 'heart' : 'heart-outline'}
              size={16}
              color={reply.isLiked ? '#EF4444' : theme.textSecondary}
            />
            {reply.likes > 0 && (
              <Text style={[
                styles.replyActionText,
                { color: reply.isLiked ? '#EF4444' : theme.textSecondary }
              ]}>
                {reply.likes}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>All Comments</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          All Comments ({replies.length})
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Parent Comment */}
      <View style={[styles.parentComment, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.parentCommentHeader}>
          <Text style={[styles.parentCommentUsername, { color: theme.text }]}>
            {commentUsername}
          </Text>
          <Text style={[styles.parentCommentContent, { color: theme.text }]}>
            {commentContent}
          </Text>
        </View>
      </View>

      {/* Replies List */}
      <FlatList
        data={replies}
        renderItem={renderReply}
        keyExtractor={(item) => item.id}
        style={styles.repliesList}
        contentContainerStyle={styles.repliesListContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
              No replies yet
            </Text>
          </View>
        }
      />

      {/* Reply Input */}
      <View style={[styles.inputContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <View style={styles.inputWrapper}>
          <TextInput
            ref={commentInputRef}
            style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
            placeholder={`Reply to ${commentUsername}...`}
            placeholderTextColor={theme.textTertiary}
            value={commentText}
            onChangeText={(newText) => {
              setCommentText(newText);
              const lastChar = newText[newText.length - 1];
              if (lastChar === '@') {
                setShowMentionAutocomplete(true);
              }
            }}
            onSelectionChange={(event) => {
              const { start } = event.nativeEvent.selection;
              setCommentCursorPosition(start);
              if (start > 0 && commentText[start - 1] === '@') {
                setShowMentionAutocomplete(true);
              } else if (start > 0) {
                let i = start - 1;
                while (i >= 0 && commentText[i] !== '@' && commentText[i] !== ' ') {
                  i--;
                }
                if (i >= 0 && commentText[i] === '@') {
                  setShowMentionAutocomplete(true);
                } else {
                  setShowMentionAutocomplete(false);
                }
              } else {
                setShowMentionAutocomplete(false);
              }
            }}
            multiline
            maxLength={300}
          />
          {showMentionAutocomplete && (
            <MentionAutocomplete
              text={commentText}
              cursorPosition={commentCursorPosition}
              onSelect={(mention) => {
                let startIndex = commentCursorPosition - 1;
                while (startIndex >= 0 && commentText[startIndex] !== '@' && commentText[startIndex] !== ' ') {
                  startIndex--;
                }
                
                if (startIndex >= 0 && commentText[startIndex] === '@') {
                  const beforeMention = commentText.substring(0, startIndex);
                  const afterMention = commentText.substring(commentCursorPosition);
                  const newText = beforeMention + mention + ' ' + afterMention;
                  setCommentText(newText);
                  setShowMentionAutocomplete(false);
                  
                  setTimeout(() => {
                    const newCursorPos = startIndex + mention.length + 1;
                    commentInputRef.current?.setNativeProps({
                      selection: { start: newCursorPos, end: newCursorPos },
                    });
                    setCommentCursorPosition(newCursorPos);
                  }, 0);
                }
              }}
              onClose={() => setShowMentionAutocomplete(false)}
            />
          )}
        </View>
        
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!commentText.trim() || isSubmitting) && styles.sendButtonDisabled,
          ]}
          onPress={handleSubmitReply}
          disabled={!commentText.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={commentText.trim() ? theme.primary : theme.textTertiary}
            />
          )}
        </TouchableOpacity>
      </View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  parentComment: {
    padding: 16,
    borderBottomWidth: 1,
  },
  parentCommentHeader: {
    marginBottom: 8,
  },
  parentCommentUsername: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  parentCommentContent: {
    fontSize: 15,
    lineHeight: 20,
  },
  repliesList: {
    flex: 1,
  },
  repliesListContent: {
    paddingBottom: 16,
  },
  replyItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  replyUsername: {
    fontSize: 14,
    fontWeight: '600',
  },
  replyTimestamp: {
    fontSize: 12,
  },
  replyContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  replyActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyActionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
  },
  input: {
    fontSize: 14,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
