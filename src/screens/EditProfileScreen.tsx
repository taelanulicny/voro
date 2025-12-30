import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types';
import { authenticatedRequest, isBackendConfigured } from '../config/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function EditProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, token, refreshUser } = useAuth();
  const { theme } = useTheme();
  
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUrl || null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Request camera roll permissions
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'We need access to your photos to upload an avatar.',
            [{ text: 'OK' }]
          );
        }
      }
    })();
  }, []);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your camera to take a photo.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleRemoveAvatar = () => {
    setSelectedImage(null);
    setAvatarUri(null);
  };

  const uploadAvatarToS3 = async (imageUri: string): Promise<string | null> => {
    if (!isBackendConfigured() || !user || !token) {
      return null;
    }

    try {
      setIsUploading(true);

      // Get file extension and content type
      const uriParts = imageUri.split('.');
      const fileExtension = uriParts[uriParts.length - 1];
      const contentType = `image/${fileExtension === 'png' ? 'png' : 'jpeg'}`;

      // Get presigned URL from backend
      const urlResponse = await authenticatedRequest<{
        uploadUrl: string;
        key: string;
        avatarUrl: string; // The public URL to store in the profile
      }>(
        `/api/user/avatar/upload-url?contentType=${encodeURIComponent(contentType)}`,
        token,
        { method: 'GET' }
      );

      if (!urlResponse.success || !urlResponse.data) {
        throw new Error(urlResponse.error || 'Failed to get upload URL');
      }

      const { uploadUrl, avatarUrl } = urlResponse.data;

      // Convert local URI to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Upload to S3 using presigned URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': contentType,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image to S3');
      }

      // Return the avatarUrl to store in the profile
      return avatarUrl;
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Upload Error', error.message || 'Failed to upload avatar. Please try again.');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!isBackendConfigured() || !user || !token) {
      Alert.alert('Error', 'Backend not configured. Profile editing requires a backend connection.');
      return;
    }

    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name is required.');
      return;
    }

    try {
      setIsSaving(true);

      let avatarUrl = user.avatarUrl;

      // Upload new avatar if one was selected
      if (selectedImage) {
        const uploadResult = await uploadAvatarToS3(selectedImage);
        if (uploadResult) {
          // uploadResult contains the avatarUrl from the backend
          avatarUrl = uploadResult;
        } else {
          // If upload failed, don't update profile
          setIsSaving(false);
          return;
        }
      } else if (avatarUri === null && user.avatarUrl) {
        // Avatar was removed
        avatarUrl = undefined;
      }

      // Update profile (backend uses authenticated user ID, not path param)
      const updateResponse = await authenticatedRequest<{
        id: string;
        displayName: string;
        bio?: string;
        avatarUrl?: string;
      }>(
        '/api/user/profile',
        token,
        {
          method: 'PUT',
          body: JSON.stringify({
            displayName: displayName.trim(),
            bio: bio.trim() || undefined,
            avatarUrl,
          }),
        }
      );

      if (updateResponse.success) {
        // Refresh user data
        await refreshUser();
        Alert.alert('Success', 'Profile updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        throw new Error(updateResponse.error || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const displayImage = selectedImage || avatarUri;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
        >
          <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, { backgroundColor: theme.primary }]}
          disabled={isSaving || isUploading}
        >
          {isSaving || isUploading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={[styles.avatarSection, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
          <View style={styles.avatarContainer}>
            {displayImage ? (
              <Image source={{ uri: displayImage }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="person" size={40} color={theme.primary} />
              </View>
            )}
            {isUploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            )}
          </View>

          <View style={styles.avatarButtons}>
            <TouchableOpacity
              style={[styles.avatarButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={handlePickImage}
              disabled={isUploading}
            >
              <Ionicons name="image-outline" size={20} color={theme.text} />
              <Text style={[styles.avatarButtonText, { color: theme.text }]}>Choose Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.avatarButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={handleTakePhoto}
              disabled={isUploading}
            >
              <Ionicons name="camera-outline" size={20} color={theme.text} />
              <Text style={[styles.avatarButtonText, { color: theme.text }]}>Take Photo</Text>
            </TouchableOpacity>
            {displayImage && (
              <TouchableOpacity
                style={[styles.avatarButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={handleRemoveAvatar}
                disabled={isUploading}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                <Text style={[styles.avatarButtonText, { color: '#EF4444' }]}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Form Fields */}
        <View style={[styles.formSection, { backgroundColor: theme.card }]}>
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Display Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your display name"
              placeholderTextColor={theme.textTertiary}
              maxLength={50}
            />
            <Text style={[styles.helperText, { color: theme.textSecondary }]}>
              {displayName.length}/50
            </Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Bio</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself..."
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={4}
              maxLength={160}
              textAlignVertical="top"
            />
            <Text style={[styles.helperText, { color: theme.textSecondary }]}>
              {bio.length}/160
            </Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Username</Text>
            <View style={[styles.readOnlyField, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <Text style={[styles.readOnlyText, { color: theme.textSecondary }]}>@{user?.username}</Text>
            </View>
            <Text style={[styles.helperText, { color: theme.textSecondary }]}>
              Username cannot be changed
            </Text>
          </View>
        </View>
      </ScrollView>
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
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 8,
    // backgroundColor and borderBottomColor are set dynamically via theme
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor will be set dynamically via theme
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  avatarButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  formSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111827',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
    backgroundColor: '#F9FAFB',
  },
  readOnlyField: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  readOnlyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    color: '#6B7280',
  },
});

