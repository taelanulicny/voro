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
  const [content, setContent] = useState('');
  const [sentiment, setSentiment] = useState<'bullish' | 'bearish' | 'neutral'>('neutral');
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
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleClose}
            disabled={isSubmitting}
            style={styles.headerButton}
          >
            <Text style={[styles.headerButtonText, styles.cancelText]}>Cancel</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>New Post</Text>
          
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || !content.trim()}
            style={[
              styles.headerButton,
              (!content.trim() || isSubmitting) && styles.headerButtonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <Text
                style={[
                  styles.headerButtonText,
                  styles.postText,
                  (!content.trim() || isSubmitting) && styles.postTextDisabled,
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
              <Ionicons name="person-circle" size={40} color="#9CA3AF" />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.displayName}>{user?.displayName}</Text>
              <Text style={styles.username}>@{user?.username}</Text>
            </View>
          </View>

          {/* Entity Tag (if present) */}
          {entityTicker && (
            <View style={styles.entityTag}>
              <Ionicons name="pricetag" size={16} color="#3B82F6" />
              <Text style={styles.entityTagText}>
                ${entityTicker} {entityName && `· ${entityName}`}
              </Text>
            </View>
          )}

          {/* Post Content */}
          <TextInput
            style={styles.textInput}
            placeholder="What's on your mind?"
            placeholderTextColor="#9CA3AF"
            value={content}
            onChangeText={setContent}
            multiline
            autoFocus
            maxLength={500}
          />

          <Text style={styles.characterCount}>{content.length}/500</Text>

          {/* Sentiment Selector */}
          <View style={styles.sentimentSection}>
            <Text style={styles.sectionLabel}>Sentiment (Optional)</Text>
            <View style={styles.sentimentButtons}>
              <TouchableOpacity
                style={[
                  styles.sentimentButton,
                  sentiment === 'bullish' && styles.sentimentButtonBullish,
                ]}
                onPress={() => setSentiment('bullish')}
              >
                <Ionicons
                  name="trending-up"
                  size={20}
                  color={sentiment === 'bullish' ? '#FFFFFF' : '#10B981'}
                />
                <Text
                  style={[
                    styles.sentimentButtonText,
                    sentiment === 'bullish' && styles.sentimentButtonTextActive,
                  ]}
                >
                  Bullish
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sentimentButton,
                  sentiment === 'neutral' && styles.sentimentButtonNeutral,
                ]}
                onPress={() => setSentiment('neutral')}
              >
                <Ionicons
                  name="remove"
                  size={20}
                  color={sentiment === 'neutral' ? '#FFFFFF' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.sentimentButtonText,
                    sentiment === 'neutral' && styles.sentimentButtonTextActive,
                  ]}
                >
                  Neutral
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sentimentButton,
                  sentiment === 'bearish' && styles.sentimentButtonBearish,
                ]}
                onPress={() => setSentiment('bearish')}
              >
                <Ionicons
                  name="trending-down"
                  size={20}
                  color={sentiment === 'bearish' ? '#FFFFFF' : '#EF4444'}
                />
                <Text
                  style={[
                    styles.sentimentButtonText,
                    sentiment === 'bearish' && styles.sentimentButtonTextActive,
                  ]}
                >
                  Bearish
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  cancelText: {
    color: '#6B7280',
  },
  postText: {
    color: '#3B82F6',
  },
  postTextDisabled: {
    color: '#9CA3AF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
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
    color: '#111827',
  },
  username: {
    fontSize: 14,
    color: '#6B7280',
  },
  entityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  entityTagText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 6,
  },
  textInput: {
    fontSize: 16,
    color: '#111827',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginBottom: 16,
  },
  sentimentSection: {
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
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
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  sentimentButtonBullish: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  sentimentButtonNeutral: {
    backgroundColor: '#6B7280',
    borderColor: '#6B7280',
  },
  sentimentButtonBearish: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  sentimentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  sentimentButtonTextActive: {
    color: '#FFFFFF',
  },
});

