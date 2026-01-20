import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Comment, RootStackParamList } from '../types';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import MentionAutocomplete from './MentionAutocomplete';

interface CommentSectionProps {
  postId: string;
  autoFocus?: boolean; // Auto-focus the input when component mounts/becomes visible
  focusTrigger?: number; // Counter that triggers focus when it changes
  showOnlyMostRecent?: boolean; // If true, only show the most recent comment instead of all comments
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CommentSection({ postId, autoFocus = false, focusTrigger = 0, showOnlyMostRecent = false }: CommentSectionProps) {
  const { user } = useAuth();
  const { postComments, getComments, addComment, editComment, toggleLikeComment } = useSocial();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; username: string } | null>(null);
  const [editingComment, setEditingComment] = useState<{ commentId: string; content: string } | null>(null);
  const [editText, setEditText] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [commentCursorPosition, setCommentCursorPosition] = useState(0);
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false);
  const commentInputRef = useRef<TextInput>(null);

  const comments = postComments[postId] || [];

  useEffect(() => {
    loadComments();
  }, [postId]);

  // Auto-focus input when autoFocus prop is true or focusTrigger changes
  useEffect(() => {
    if (autoFocus && commentInputRef.current) {
      // Small delay to ensure the component is fully rendered
      setTimeout(() => {
        commentInputRef.current?.focus();
        // Clear any existing reply target when focusing from comment button
        setReplyingTo(null);
      }, 100);
    }
  }, [autoFocus, focusTrigger]);

  const loadComments = async () => {
    setIsLoading(true);
    await getComments(postId);
    setIsLoading(false);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    const result = await addComment(postId, commentText.trim(), replyingTo?.commentId);
    setIsSubmitting(false);

    if (result.success) {
      setCommentText('');
      setReplyingTo(null);
    }
  };

  const handleEditComment = async () => {
    if (!editingComment || !editText.trim()) return;

    const result = await editComment(postId, editingComment.commentId, editText.trim());

    if (result.success) {
      setEditingComment(null);
      setEditText('');
    } else {
      Alert.alert('Error', result.error || 'Failed to edit comment');
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const commentDate = new Date(timestamp);
    const diffMs = now.getTime() - commentDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return commentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderComment = (
    comment: Comment,
    level: number = 0,
    isReply: boolean = false
  ) => {
    const isOwnComment = user?.userId === comment.userId;
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isExpanded = expandedReplies.has(comment.id);
    const maxDepth = 5; // Limit nesting depth

    return (
      <View key={comment.id} style={[styles.commentItem, level > 0 && styles.replyItem]}>
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('UserProfile', { userId: comment.userId });
          }}
          activeOpacity={0.7}
        >
          <View style={styles.commentAvatar}>
            <Ionicons name="person-circle" size={level > 0 ? 24 : 32} color="#9CA3AF" />
          </View>
        </TouchableOpacity>
        
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <TouchableOpacity
              onPress={() => {
                navigation.navigate('UserProfile', { userId: comment.userId });
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.commentUsername}>
                {comment.displayName}
              </Text>
            </TouchableOpacity>
            {comment.replyTo && (
              <TouchableOpacity
                onPress={() => {
                  if (comment.replyTo?.userId) {
                    navigation.navigate('UserProfile', { userId: comment.replyTo.userId });
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.replyToText}>
                  {' '}→ {comment.replyTo.displayName}
                </Text>
              </TouchableOpacity>
            )}
            <Text style={styles.commentTimestamp}>
              {formatTimestamp(comment.timestamp)}
              {comment.isEdited && ' · edited'}
            </Text>
          </View>
          
          <Text style={styles.commentText}>{comment.content}</Text>
          
          <View style={styles.commentActions}>
            <TouchableOpacity
              style={styles.commentLikeButton}
              onPress={() => toggleLikeComment(postId, comment.id)}
            >
              <Ionicons
                name={comment.isLiked ? 'heart' : 'heart-outline'}
                size={16}
                color={comment.isLiked ? '#EF4444' : '#9CA3AF'}
              />
              {comment.likes > 0 && (
                <Text style={[
                  styles.commentLikeText,
                  comment.isLiked && styles.commentLikeTextActive
                ]}>
                  {comment.likes}
                </Text>
              )}
            </TouchableOpacity>

            {level < maxDepth && (
              <TouchableOpacity
                style={styles.commentActionButton}
                onPress={() => setReplyingTo({ commentId: comment.id, username: comment.username })}
              >
                <Text style={styles.commentActionText}>Reply</Text>
              </TouchableOpacity>
            )}

            {isOwnComment && (
              <>
                <TouchableOpacity
                  style={styles.commentActionButton}
                  onPress={() => {
                    setEditingComment({ commentId: comment.id, content: comment.content });
                    setEditText(comment.content);
                  }}
                >
                  <Text style={styles.commentActionText}>Edit</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Render replies */}
          {hasReplies && (
            <View style={styles.repliesContainer}>
              {level < maxDepth && (
                <TouchableOpacity
                  style={styles.toggleRepliesButton}
                  onPress={() => toggleReplies(comment.id)}
                >
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#9CA3AF"
                  />
                  <Text style={styles.toggleRepliesText}>
                    {isExpanded ? 'Hide' : 'Show'} {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
                  </Text>
                </TouchableOpacity>
              )}

              {isExpanded && (
                <View style={styles.repliesList}>
                  {comment.replies!.map(reply => renderComment(reply, level + 1, true))}
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  // Get most recent comment if showOnlyMostRecent is true
  const sortedComments = [...comments].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const mostRecentComment = sortedComments.length > 0 ? sortedComments[0] : null;

  // Simple render function for most recent comment (matches PostCard style)
  const renderMostRecentComment = (comment: Comment) => {
    return (
      <View key={comment.id} style={styles.simpleCommentItem}>
        <View style={[styles.simpleCommentThreadLine, { backgroundColor: theme.border }]} />
        <View style={styles.simpleCommentContent}>
          <Text style={styles.simpleCommentText}>
            <Text style={[styles.simpleCommentUsername, { color: theme.text }]}>
              {comment.displayName}:
            </Text>
            <Text style={[styles.simpleCommentTextContent, { color: theme.text }]}>
              {' '}{comment.content}
            </Text>
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Comments List - Only show if not in showOnlyMostRecent mode */}
      {!showOnlyMostRecent && (
        comments.length > 0 ? (
          <FlatList
            data={comments}
            renderItem={({ item }) => renderComment(item)}
            keyExtractor={(item) => item.id}
            style={styles.commentsList}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={32} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>No comments yet</Text>
          </View>
        )
      )}

      {/* Reply indicator */}
      {replyingTo && (
        <View style={styles.replyingToIndicator}>
          <Text style={styles.replyingToText}>
            Replying to {replyingTo.username}
          </Text>
          <TouchableOpacity onPress={() => setReplyingTo(null)}>
            <Ionicons name="close" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Mention Autocomplete - positioned above input */}
      {showMentionAutocomplete && (
        <View style={styles.autocompleteWrapper}>
          <MentionAutocomplete
            text={commentText}
            cursorPosition={commentCursorPosition}
            onSelect={(mention) => {
              // Find the @ position before cursor
              let startIndex = commentCursorPosition - 1;
              while (startIndex >= 0 && commentText[startIndex] !== '@' && commentText[startIndex] !== ' ') {
                startIndex--;
              }
              
              if (startIndex >= 0 && commentText[startIndex] === '@') {
                // Replace the mention text with the selected mention
                const beforeMention = commentText.substring(0, startIndex);
                const afterMention = commentText.substring(commentCursorPosition);
                const newText = beforeMention + mention + ' ' + afterMention;
                setCommentText(newText);
                setShowMentionAutocomplete(false);
                
                // Set cursor position after the inserted mention
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
        </View>
      )}

      {/* Add Comment Input */}
      <Pressable
        style={styles.inputContainer}
        onPress={(e) => e.stopPropagation()}
      >
        <View style={styles.inputAvatar}>
          <Ionicons name="person-circle" size={32} color="#9CA3AF" />
        </View>
        
        <View style={styles.inputWrapper}>
          <TextInput
            ref={commentInputRef}
            style={styles.input}
            placeholder={replyingTo ? `Reply to ${replyingTo.username}...` : "Post a reply..."}
            placeholderTextColor="#9CA3AF"
            value={commentText}
            onChangeText={(newText) => {
              setCommentText(newText);
              // Check if @ was just typed
              const lastChar = newText[newText.length - 1];
              if (lastChar === '@') {
                setShowMentionAutocomplete(true);
              }
            }}
            onSelectionChange={(event) => {
              const { start } = event.nativeEvent.selection;
              setCommentCursorPosition(start);
              // Check if cursor is after @
              if (start > 0 && commentText[start - 1] === '@') {
                setShowMentionAutocomplete(true);
              } else if (start > 0) {
                // Check if we're still in a mention
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
        </View>
        
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!commentText.trim() || isSubmitting) && styles.sendButtonDisabled,
          ]}
          onPress={handleSubmitComment}
          disabled={!commentText.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={commentText.trim() ? '#3B82F6' : '#D1D5DB'}
            />
          )}
        </TouchableOpacity>
      </Pressable>

      {/* Edit Comment Modal */}
      <Modal
        visible={!!editingComment}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingComment(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Comment</Text>
              <TouchableOpacity onPress={() => setEditingComment(null)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.editInput}
              value={editText}
              onChangeText={setEditText}
              multiline
              maxLength={300}
              placeholder="Edit your comment..."
              placeholderTextColor="#9CA3AF"
              autoFocus
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setEditingComment(null)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave, !editText.trim() && styles.modalButtonDisabled]}
                onPress={handleEditComment}
                disabled={!editText.trim()}
              >
                <Text style={[styles.modalButtonTextSave, !editText.trim() && styles.modalButtonTextDisabled]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  commentsList: {
    marginBottom: 12,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  replyItem: {
    marginLeft: 48,
    marginBottom: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#E5E7EB',
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginRight: 4,
  },
  replyToText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginRight: 4,
  },
  commentTimestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
    marginBottom: 6,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  commentLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionButton: {
    paddingVertical: 4,
  },
  commentActionText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  commentLikeText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  commentLikeTextActive: {
    color: '#EF4444',
  },
  repliesContainer: {
    marginTop: 8,
  },
  toggleRepliesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  toggleRepliesText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  repliesList: {
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  replyingToIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyingToText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  autocompleteWrapper: {
    position: 'absolute',
    bottom: 60, // Position above the input container
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    gap: 12,
    position: 'relative',
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalButtonCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalButtonSave: {
    backgroundColor: '#3B82F6',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonTextCancel: {
    color: '#6B7280',
    fontWeight: '600',
  },
  modalButtonTextSave: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalButtonTextDisabled: {
    color: '#9CA3AF',
  },
  // Simple comment styles (matches PostCard style)
  simpleCommentItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  simpleCommentThreadLine: {
    width: 2,
    marginRight: 12,
    minHeight: 20,
  },
  simpleCommentContent: {
    flex: 1,
  },
  simpleCommentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  simpleCommentUsername: {
    fontSize: 14,
    fontWeight: '600',
  },
  simpleCommentTextContent: {
    fontSize: 14,
    fontWeight: '400',
  },
});