import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Comment, Post } from '../types';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import MentionAutocomplete from '../components/MentionAutocomplete';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AllCommentsRouteProp = RouteProp<RootStackParamList, 'AllComments'>;

export default function AllCommentsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AllCommentsRouteProp>();
  const { postId, post } = route.params;
  const { user } = useAuth();
  const { postComments, getComments, addComment, toggleLikeComment, toggleLikePost } = useSocial();
  const { theme } = useTheme();

  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [commentCursorPosition, setCommentCursorPosition] = useState(0);
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false);
  const commentInputRef = useRef<TextInput>(null);

  // Sort comments by timestamp (newest first) so new comments appear at top
  const allComments = postComments[postId] || [];
  const comments = [...allComments].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    setIsLoading(true);
    await getComments(postId);
    setIsLoading(false);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    const result = await addComment(postId, commentText.trim());
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

  const renderComment = ({ item: comment }: { item: Comment }) => {
    return (
      <View style={[styles.commentItem, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.commentAvatar}>
          <Ionicons name="person-circle" size={32} color="#9CA3AF" />
        </View>
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={[styles.commentUsername, { color: theme.text }]}>
              {comment.displayName}
            </Text>
            <Text style={[styles.commentTimestamp, { color: theme.textSecondary }]}>
              {formatTimestamp(comment.timestamp)}
            </Text>
          </View>
          <Text style={[styles.commentText, { color: theme.text }]}>
            {comment.content}
          </Text>
          <View style={styles.commentActions}>
            <TouchableOpacity
              style={styles.commentActionButton}
              onPress={() => toggleLikeComment(postId, comment.id)}
            >
              <Ionicons
                name={comment.isLiked ? 'heart' : 'heart-outline'}
                size={16}
                color={comment.isLiked ? '#EF4444' : theme.textSecondary}
              />
              {comment.likes > 0 && (
                <Text style={[
                  styles.commentLikeText,
                  { color: comment.isLiked ? '#EF4444' : theme.textSecondary }
                ]}>
                  {comment.likes}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.commentActionButton}
              onPress={() => {
                // TODO: Navigate to reply screen or show reply input
              }}
            >
              <Ionicons name="chatbubble-outline" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
        <ActivityIndicator size="large" color={theme.primary} style={styles.loadingIndicator} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          All Comments ({comments.length})
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Post and Comments List */}
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={renderComment}
        style={{ backgroundColor: theme.backgroundSecondary }}
        contentContainerStyle={styles.commentsListContent}
        ListHeaderComponent={() => (
          <View style={[styles.postSection, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <View style={styles.postHeader}>
              <View style={styles.postAvatar}>
                <Ionicons name="person-circle" size={40} color="#9CA3AF" />
              </View>
              <View style={styles.postHeaderContent}>
                <Text style={[styles.postUsername, { color: theme.text }]}>
                  {post.displayName}
                </Text>
                <Text style={[styles.postTimestamp, { color: theme.textSecondary }]}>
                  {formatTimestamp(post.timestamp)}
                </Text>
              </View>
              <TouchableOpacity style={styles.followButton}>
                <Text style={styles.followButtonText}>Follow</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.postContent, { color: theme.text }]}>
              {post.content}
            </Text>
            <View style={styles.postActions}>
              <TouchableOpacity
                style={styles.postActionButton}
                onPress={() => toggleLikePost(postId)}
              >
                <Ionicons
                  name={post.isLiked ? 'heart' : 'heart-outline'}
                  size={20}
                  color={post.isLiked ? '#EF4444' : theme.textSecondary}
                />
                {post.likes > 0 && (
                  <Text style={[styles.postActionText, { color: theme.textSecondary }]}>
                    {post.likes}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.postActionButton}>
                <Ionicons name="chatbubble-outline" size={20} color={theme.textSecondary} />
                {post.comments > 0 && (
                  <Text style={[styles.postActionText, { color: theme.textSecondary }]}>
                    {post.comments}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
              No comments yet
            </Text>
          </View>
        }
      />

      {/* Mention Autocomplete - positioned above input */}
      {showMentionAutocomplete && (
        <View style={styles.autocompleteWrapper}>
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
        </View>
      )}

      {/* Comment Input */}
      <View style={[styles.inputContainer, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
        <TextInput
          ref={commentInputRef}
          style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
          placeholder="Post a reply"
          placeholderTextColor={theme.textSecondary}
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
        <TouchableOpacity
          style={[
            styles.postButton,
            (!commentText.trim() || isSubmitting) && styles.postButtonDisabled,
            { backgroundColor: commentText.trim() ? theme.primary : theme.backgroundTertiary }
          ]}
          onPress={handleSubmitComment}
          disabled={!commentText.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.postButtonText}>Post</Text>
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
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsListContent: {
    paddingBottom: 100,
  },
  commentItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  commentTimestamp: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  commentActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentLikeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 14,
  },
  autocompleteWrapper: {
    position: 'absolute',
    bottom: 60,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  input: {
    flex: 1,
    fontSize: 14,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
  },
  postButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  postSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postHeaderContent: {
    flex: 1,
  },
  postUsername: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  postTimestamp: {
    fontSize: 12,
  },
  followButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#775a96',
    marginRight: 8,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  postContent: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  postActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
