import React, { useState, useEffect } from 'react';
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
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { sanitizeContentForSubmission } from '../utils/sanitize';
import { moderateContent } from '../utils/contentModeration';
import { authenticatedRequest, isBackendConfigured } from '../config/api';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  entityId?: number;
  entityTicker?: string;
  entityName?: string;
  slideFromBottom?: boolean;
  prefillEntityTag?: boolean;
}

export default function CreatePostModal({
  visible,
  onClose,
  entityId,
  entityTicker,
  entityName,
  slideFromBottom = false,
  prefillEntityTag = false,
}: CreatePostModalProps) {
  const { user, token, getToken } = useAuth();
  const { createPost, saveDraft, loadDrafts, drafts, deleteDraft, getDraft } = useSocial();
  const { theme } = useTheme();
  const [content, setContent] = useState('');
  const [sentiment, setSentiment] = useState<'positive' | 'negative' | 'neutral'>('neutral');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<{ uri: string; type: string }[]>([]);
  const [uploadedImageKeys, setUploadedImageKeys] = useState<string[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [showDrafts, setShowDrafts] = useState(false);

  // Auto-save draft when content changes (debounced)
  useEffect(() => {
    if (!visible || !content.trim()) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        if (currentDraftId) {
          // Update existing draft
          await deleteDraft(currentDraftId);
        }
        const draftId = await saveDraft({
          content,
          entityId,
          entityTicker,
          entityName,
          sentiment,
          images: selectedImages,
        });
        setCurrentDraftId(draftId);
      } catch (error) {
        console.error('Error auto-saving draft:', error);
      }
    }, 2000); // Save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [content, sentiment, selectedImages, entityId, entityTicker, entityName, visible, currentDraftId, saveDraft, deleteDraft]);

  // Load drafts when modal opens
  useEffect(() => {
    if (visible) {
      loadDrafts();
    }
  }, [visible, loadDrafts]);

  // Pre-fill entity tag when modal opens
  useEffect(() => {
    if (visible && prefillEntityTag && entityName) {
      const entityMention = `@${entityName.replace(/\s+/g, '')} `;
      if (!content.startsWith(entityMention.trim())) {
        setContent(entityMention);
      }
    } else if (!visible) {
      // Reset content when modal closes
      setContent('');
      setSentiment('neutral');
      setSelectedImages([]);
      setUploadedImageKeys([]);
      setCurrentDraftId(null);
      setShowDrafts(false);
    }
  }, [visible, prefillEntityTag, entityName]);

  // Request permissions on mount
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Media library permission not granted');
        }
      }
    })();
  }, []);

  const handlePickImage = async () => {
    try {
      if (selectedImages.length >= 4) {
        Alert.alert('Limit Reached', 'You can only add up to 4 images per post');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7, // Compress to 70% quality for smaller file sizes
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        // Use the compressed image from ImagePicker
        // ImagePicker already handles compression based on the quality parameter
        setSelectedImages(prev => [...prev, { 
          uri: asset.uri, 
          type: asset.mimeType || 'image/jpeg' 
        }]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setUploadedImageKeys(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (selectedImages.length === 0) return [];

    const uploadedKeys: string[] = [];

    for (let i = 0; i < selectedImages.length; i++) {
      const image = selectedImages[i];
      try {
        // Get upload URL from backend
        const urlResponse = await authenticatedRequest<{ uploadUrl: string; key: string }>(
          `/api/social/posts/images/upload-url?contentType=${encodeURIComponent(image.type)}&imageIndex=${i}`,
          token!,
          { method: 'GET' },
          getToken
        );

        if (!urlResponse.success || !urlResponse.data) {
          throw new Error('Failed to get upload URL');
        }

        // Convert local URI to blob
        const response = await fetch(image.uri);
        const blob = await response.blob();

        // Upload to S3
        const uploadResponse = await fetch(urlResponse.data.uploadUrl, {
          method: 'PUT',
          body: blob,
          headers: {
            'Content-Type': image.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }

        uploadedKeys.push(urlResponse.data.key);
      } catch (error) {
        console.error(`Error uploading image ${i}:`, error);
        throw new Error(`Failed to upload image ${i + 1}`);
      }
    }

    return uploadedKeys;
  };

  const handleSubmit = async () => {
    if (!content.trim() && selectedImages.length === 0) {
      Alert.alert('Error', 'Please enter some content or add an image for your post');
      return;
    }

    // Client-side content moderation
    if (content.trim()) {
      const moderationResult = moderateContent(content.trim());
      if (!moderationResult.approved) {
        Alert.alert('Content Moderation', moderationResult.reason || 'Your post contains inappropriate content');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Upload images first
      let imageKeys: string[] = [];
      if (selectedImages.length > 0 && isBackendConfigured()) {
        try {
          imageKeys = await uploadImages();
          setUploadedImageKeys(imageKeys);
        } catch (error) {
          setIsSubmitting(false);
          Alert.alert('Upload Error', error instanceof Error ? error.message : 'Failed to upload images. Please try again.');
          return;
        }
      }

      // Sanitize content before submission
      const sanitizedContent = content.trim() ? sanitizeContentForSubmission(content.trim()) : '';
      
      const result = await createPost({
        content: sanitizedContent,
        entityId,
        entityTicker,
        entityName,
        sentiment,
        images: imageKeys.length > 0 ? imageKeys : undefined,
      });

      if (result.success) {
        // Delete draft if it was used
        if (currentDraftId) {
          await deleteDraft(currentDraftId);
          setCurrentDraftId(null);
        }
        setContent('');
        setSentiment('neutral');
        setSelectedImages([]);
        setUploadedImageKeys([]);
        onClose();
      } else {
        Alert.alert('Error', result.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadDraftIntoEditor = (draftId: string) => {
    const draft = getDraft(draftId);
    if (draft) {
      setContent(draft.content);
      setSentiment(draft.sentiment || 'neutral');
      setSelectedImages(draft.images || []);
      setCurrentDraftId(draft.id);
      setShowDrafts(false);
    }
  };

  const handleClose = () => {
    if (content.trim() && !isSubmitting) {
      Alert.alert(
        'Discard Post?',
        'Your post has been saved as a draft. Are you sure you want to discard it?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: async () => {
              if (currentDraftId) {
                await deleteDraft(currentDraftId);
              }
              setContent('');
              setSentiment('neutral');
              setSelectedImages([]);
              setUploadedImageKeys([]);
              setCurrentDraftId(null);
              setShowDrafts(false);
              onClose();
            },
          },
        ]
      );
    } else {
      if (currentDraftId) {
        deleteDraft(currentDraftId).catch(console.error);
      }
      setContent('');
      setSentiment('neutral');
      setSelectedImages([]);
      setUploadedImageKeys([]);
      setCurrentDraftId(null);
      setShowDrafts(false);
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
            { backgroundColor: theme.card }
          ]}
      >
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={handleClose}
            disabled={isSubmitting}
            style={styles.headerButton}
          >
            <Text style={[styles.headerButtonText, { color: theme.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>New Post</Text>
            {drafts.length > 0 && (
              <TouchableOpacity
                onPress={() => setShowDrafts(!showDrafts)}
                style={styles.draftsButton}
              >
                <Ionicons name="document-text-outline" size={16} color={theme.primary} />
                <Text style={[styles.draftsButtonText, { color: theme.primary }]}>
                  {drafts.length} {drafts.length === 1 ? 'draft' : 'drafts'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || (!content.trim() && selectedImages.length === 0)}
            style={[
              styles.headerButton,
              ((!content.trim() && selectedImages.length === 0) || isSubmitting) && styles.headerButtonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Text
                style={[
                  styles.headerButtonText,
                  { color: ((!content.trim() && selectedImages.length === 0) || isSubmitting) ? theme.textTertiary : theme.primary },
                ]}
              >
                Post
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Drafts List */}
        {showDrafts && drafts.length > 0 && (
          <View style={[styles.draftsContainer, { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.draftsScroll}>
              {drafts.map((draft) => (
                <TouchableOpacity
                  key={draft.id}
                  style={[styles.draftCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => loadDraftIntoEditor(draft.id)}
                >
                  <View style={styles.draftHeader}>
                    <Text style={[styles.draftPreview, { color: theme.text }]} numberOfLines={2}>
                      {draft.content || 'Empty draft'}
                    </Text>
                    <TouchableOpacity
                      onPress={async (e) => {
                        e.stopPropagation();
                        await deleteDraft(draft.id);
                        if (currentDraftId === draft.id) {
                          setCurrentDraftId(null);
                          setContent('');
                          setSentiment('neutral');
                          setSelectedImages([]);
                        }
                      }}
                      style={styles.deleteDraftButton}
                    >
                      <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
                    </TouchableOpacity>
                  </View>
                  {draft.entityName && (
                    <Text style={[styles.draftEntity, { color: theme.primary }]}>
                      @{draft.entityName}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

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

          {/* Post Content */}
          <TextInput
            style={[styles.textInput, { color: theme.text }]}
            placeholder="What's on your mind?"
            placeholderTextColor={theme.textTertiary}
            value={content}
            onChangeText={setContent}
            multiline
            autoFocus
            maxLength={5000}
          />

          <Text style={[styles.characterCount, { color: theme.textTertiary }]}>{content.length}/5000</Text>

          {/* Image Picker */}
          <View style={styles.imageSection}>
            <TouchableOpacity
              style={[styles.addImageButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
              onPress={handlePickImage}
              disabled={selectedImages.length >= 4}
            >
              <Ionicons name="image-outline" size={24} color={theme.text} />
              <Text style={[styles.addImageText, { color: theme.text }]}>
                Add Image {selectedImages.length > 0 && `(${selectedImages.length}/4)`}
              </Text>
            </TouchableOpacity>

            {/* Selected Images Preview */}
            {selectedImages.length > 0 && (
              <View style={styles.imagePreviewContainer}>
                {selectedImages.map((image, index) => (
                  <View key={index} style={styles.imagePreviewWrapper}>
                    <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => handleRemoveImage(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

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
    maxHeight: '90%',
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
  imageSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 8,
  },
  addImageText: {
    fontSize: 14,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  imagePreviewWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  draftsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  draftsButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  draftsContainer: {
    borderBottomWidth: 1,
    paddingVertical: 8,
    maxHeight: 120,
  },
  draftsScroll: {
    paddingHorizontal: 16,
  },
  draftCard: {
    width: 150,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  draftPreview: {
    fontSize: 12,
    flex: 1,
    marginRight: 4,
  },
  deleteDraftButton: {
    padding: 2,
  },
  draftEntity: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
});

