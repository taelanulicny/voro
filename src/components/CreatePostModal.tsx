import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import MentionAutocomplete from './MentionAutocomplete';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  entityId?: number;
  entityName?: string;
  categoryId?: string; // For category-level posts (subcategory or big category)
  categoryName?: string; // Display name for category
  slideFromBottom?: boolean;
  prefillEntityTag?: boolean; // Auto-tag entity if posting from entity feed
  prefillCategoryTag?: boolean; // Auto-tag category if posting from category feed
}

export default function CreatePostModal({
  visible,
  onClose,
  entityId,
  entityName,
  categoryId,
  categoryName,
  slideFromBottom = false,
  prefillEntityTag = false,
  prefillCategoryTag = false,
}: CreatePostModalProps) {
  const { user } = useAuth();
  const { createPost } = useSocial();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState('');
  const [sentiment, setSentiment] = useState<'positive' | 'negative' | 'neutral'>('neutral');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  // Pre-fill entity or category tag when modal opens
  useEffect(() => {
    if (visible) {
      let mention = '';
      
      // Priority: Entity tag > Category tag
      if (prefillEntityTag && entityName) {
        // Entity feed: auto-tag the entity (e.g., "@TomBrady ")
        mention = `@${entityName.replace(/\s+/g, '')} `;
      } else if (prefillCategoryTag && categoryName) {
        // Category feed: auto-tag the category (e.g., "@Influencers " or "@People ")
        mention = `@${categoryName.replace(/\s+/g, '')} `;
      }
      
      if (mention && !content.startsWith(mention.trim())) {
        setContent(mention);
      }
    } else if (!visible) {
      // Reset content when modal closes
      setContent('');
      setSentiment('neutral');
    }
  }, [visible, prefillEntityTag, prefillCategoryTag, entityName, categoryName]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content for your post');
      return;
    }

    setIsSubmitting(true);
    const result = await createPost({
      content: content.trim(),
      entityId,
      entityName,
      sentiment, // Always include sentiment
    });

    setIsSubmitting(false);

    if (result.success) {
      setContent('');
      setSentiment('neutral');
      onClose();
    } else {
      Alert.alert('Error', result.error || 'Failed to create post');
    }
  };

  const handleClose = () => {
    if (content.trim() && !isSubmitting) {
      Alert.alert(
        'Discard Post?',
        'Are you sure you want to discard this post?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setContent('');
              setSentiment('neutral');
              onClose();
            },
          },
        ]
      );
    } else {
      setContent('');
      setSentiment('neutral');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType={slideFromBottom ? "slide" : "slide"}
      presentationStyle={slideFromBottom ? "overFullScreen" : "pageSheet"}
      transparent={slideFromBottom}
      onRequestClose={handleClose}
    >
      <View style={[
        styles.container, 
        { backgroundColor: slideFromBottom ? 'transparent' : theme.card }
      ]}>
        {slideFromBottom && (
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={handleClose}
          />
        )}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[
          slideFromBottom ? styles.modalContentBottom : styles.modalContent,
          { backgroundColor: theme.card },
          slideFromBottom && { paddingBottom: insets.bottom },
        ]}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={handleClose}
            disabled={isSubmitting}
            style={styles.headerButton}
          >
            <Text style={[styles.headerButtonText, { color: theme.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: theme.text }]}>New Post</Text>
          
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || !content.trim()}
            style={[
              styles.headerButton,
              (!content.trim() || isSubmitting) && styles.headerButtonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Text
                style={[
                  styles.headerButtonText,
                  { color: (!content.trim() || isSubmitting) ? theme.textTertiary : theme.primary },
                ]}
              >
                Post
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.contentWrapper}>
          {/* Mention Autocomplete - positioned above input, outside ScrollView */}
          {showMentionAutocomplete && (
            <View style={styles.autocompleteWrapper}>
              <MentionAutocomplete
                text={content}
                cursorPosition={cursorPosition}
                onSelect={(mention) => {
                  // Find the @ position before cursor
                  let startIndex = cursorPosition - 1;
                  while (startIndex >= 0 && content[startIndex] !== '@' && content[startIndex] !== ' ') {
                    startIndex--;
                  }
                  
                  if (startIndex >= 0 && content[startIndex] === '@') {
                    // Replace the mention text with the selected mention
                    const beforeMention = content.substring(0, startIndex);
                    const afterMention = content.substring(cursorPosition);
                    const newContent = beforeMention + mention + ' ' + afterMention;
                    setContent(newContent);
                    setShowMentionAutocomplete(false);
                    
                    // Set cursor position after the inserted mention
                    setTimeout(() => {
                      const newCursorPos = startIndex + mention.length + 1;
                      textInputRef.current?.setNativeProps({
                        selection: { start: newCursorPos, end: newCursorPos },
                      });
                      setCursorPosition(newCursorPos);
                    }, 0);
                  }
                }}
                onClose={() => setShowMentionAutocomplete(false)}
              />
            </View>
          )}

          <ScrollView
            style={styles.content}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24), flexGrow: 1 } as any}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* User Info */}
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Ionicons name="person-circle" size={40} color={theme.textTertiary} />
              </View>
              <View style={styles.userDetails}>
                <Text style={[styles.displayName, { color: theme.text }]}>{user?.displayName}</Text>
                <Text style={[styles.username, { color: theme.textSecondary }]}>@{user?.username}</Text>
              </View>
            </View>

            {/* Post Content */}
            <View style={styles.textInputContainer}>
              <TextInput
                ref={textInputRef}
                style={[styles.textInput, { color: theme.text }]}
                placeholder="What's on your mind?"
                placeholderTextColor={theme.textTertiary}
                value={content}
                onChangeText={(newText) => {
                  setContent(newText);
                  // Check if @ was just typed
                  const lastChar = newText[newText.length - 1];
                  if (lastChar === '@') {
                    setShowMentionAutocomplete(true);
                  }
                }}
                onSelectionChange={(event) => {
                  const { start } = event.nativeEvent.selection;
                  setCursorPosition(start);
                  // Check if cursor is after @
                  if (start > 0 && content[start - 1] === '@') {
                    setShowMentionAutocomplete(true);
                  } else if (start > 0) {
                    // Check if we're still in a mention
                    let i = start - 1;
                    while (i >= 0 && content[i] !== '@' && content[i] !== ' ') {
                      i--;
                    }
                    if (i >= 0 && content[i] === '@') {
                      setShowMentionAutocomplete(true);
                    } else {
                      setShowMentionAutocomplete(false);
                    }
                  } else {
                    setShowMentionAutocomplete(false);
                  }
                }}
                multiline
                autoFocus
                maxLength={500}
              />
            </View>

            <Text style={[styles.characterCount, { color: theme.textTertiary }]}>{content.length}/500</Text>

            {/* Sentiment Selector */}
            <View style={styles.sentimentSection}>
              <Text style={[styles.sectionLabel, { color: theme.text }]}>Sentiment (Optional)</Text>
              <View style={styles.sentimentButtons}>
                <TouchableOpacity
                  style={[
                    styles.sentimentButton,
                    { 
                      backgroundColor: sentiment === 'positive' ? '#10B981' : theme.backgroundSecondary,
                      borderColor: sentiment === 'positive' ? '#10B981' : theme.border,
                    },
                  ]}
                  onPress={() => setSentiment('positive')}
                >
                  <Ionicons
                    name="trending-up"
                    size={20}
                    color={sentiment === 'positive' ? '#FFFFFF' : '#10B981'}
                  />
                  <Text
                    style={[
                      styles.sentimentButtonText,
                      { color: sentiment === 'positive' ? '#FFFFFF' : theme.text },
                    ]}
                  >
                    Positive
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sentimentButton,
                    { 
                      backgroundColor: sentiment === 'neutral' ? '#6B7280' : theme.backgroundSecondary,
                      borderColor: sentiment === 'neutral' ? '#6B7280' : theme.border,
                    },
                  ]}
                  onPress={() => setSentiment('neutral')}
                >
                  <Ionicons
                    name="remove"
                    size={20}
                    color={sentiment === 'neutral' ? '#FFFFFF' : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.sentimentButtonText,
                      { color: sentiment === 'neutral' ? '#FFFFFF' : theme.text },
                    ]}
                  >
                    Neutral
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sentimentButton,
                    { 
                      backgroundColor: sentiment === 'negative' ? '#EF4444' : theme.backgroundSecondary,
                      borderColor: sentiment === 'negative' ? '#EF4444' : theme.border,
                    },
                  ]}
                  onPress={() => setSentiment('negative')}
                >
                  <Ionicons
                    name="trending-down"
                    size={20}
                    color={sentiment === 'negative' ? '#FFFFFF' : '#EF4444'}
                  />
                  <Text
                    style={[
                      styles.sentimentButtonText,
                      { color: sentiment === 'negative' ? '#FFFFFF' : theme.text },
                    ]}
                  >
                    Negative
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
  },
  modalContentBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 70,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
  },
  autocompleteWrapper: {
    position: 'absolute',
    top: 80, // Position below header, above the text input
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
  },
  username: {
    fontSize: 14,
  },
  textInputContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  textInput: {
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 16,
  },
  sentimentSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  sentimentButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  sentimentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 6,
  },
  sentimentButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

