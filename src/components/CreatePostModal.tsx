import React, { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  entityId?: number;
  entityTicker?: string;
  entityName?: string;
}

export default function CreatePostModal({
  visible,
  onClose,
  entityId,
  entityTicker,
  entityName,
}: CreatePostModalProps) {
  const { user } = useAuth();
  const { createPost } = useSocial();
  const { theme } = useTheme();
  const [content, setContent] = useState('');
  const [sentiment, setSentiment] = useState<'positive' | 'negative' | 'neutral'>('neutral');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content for your post');
      return;
    }

    setIsSubmitting(true);
    const result = await createPost({
      content: content.trim(),
      entityId,
      entityTicker,
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
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: theme.card }]}
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

        <ScrollView
          style={styles.content}
          keyboardShouldPersistTaps="handled"
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

          {/* Entity Tag (if present) */}
          {entityTicker && (
            <View style={[styles.entityTag, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="pricetag" size={16} color={theme.primary} />
              <Text style={[styles.entityTagText, { color: theme.primary }]}>
                ${entityTicker} {entityName && `· ${entityName}`}
              </Text>
            </View>
          )}

          {/* Post Content */}
          <TextInput
            style={[styles.textInput, { color: theme.text }]}
            placeholder="What's on your mind?"
            placeholderTextColor={theme.textTertiary}
            value={content}
            onChangeText={setContent}
            multiline
            autoFocus
            maxLength={500}
          />

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
      </KeyboardAvoidingView>
    </Modal>
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
  entityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  entityTagText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  textInput: {
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 16,
  },
  sentimentSection: {
    marginTop: 16,
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

