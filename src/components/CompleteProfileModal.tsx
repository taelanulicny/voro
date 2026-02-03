import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authenticatedRequest, isBackendConfigured } from '../config/api';

export default function CompleteProfileModal() {
  const { user, token, setProfileComplete, refreshUser } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState(user?.username?.replace(/\d+$/, '') || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUrl || null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const uploadAvatarToS3 = async (imageUri: string): Promise<string | undefined> => {
    if (!isBackendConfigured() || !user || !token) return undefined;
    try {
      setIsUploading(true);
      const uriParts = imageUri.split('.');
      const ext = uriParts[uriParts.length - 1];
      const contentType = `image/${ext === 'png' ? 'png' : 'jpeg'}`;
      const urlRes = await authenticatedRequest<{ uploadUrl: string; key: string; avatarUrl?: string }>(
        `/api/user/avatar/upload-url?contentType=${encodeURIComponent(contentType)}`,
        token,
        { method: 'GET' }
      );
      if (!urlRes.success || !urlRes.data) throw new Error(urlRes.error || 'Failed to get upload URL');
      const res = await fetch(imageUri);
      const blob = await res.blob();
      const uploadRes = await fetch(urlRes.data.uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': contentType },
      });
      if (!uploadRes.ok) throw new Error('Upload failed');
      // Store S3 key in profile (backend generates presigned URLs when needed)
      return urlRes.data.key;
    } catch (e: any) {
      console.error('Avatar upload', e);
      Alert.alert('Upload Error', e.message || 'Failed to upload photo.');
      return undefined;
    } finally {
      setIsUploading(false);
    }
  };

  const handlePickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your photos.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setSelectedImage(result.assets[0].uri);
  };

  const handleContinue = async () => {
    const u = (username || user?.username || '').trim().toLowerCase().replace(/[^a-z0-9._]/g, '');
    if (u.length < 3) {
      Alert.alert('Username required', 'Choose at least 3 characters (letters, numbers, dots, underscores).');
      return;
    }
    if (!displayName.trim()) {
      Alert.alert('Display name required', 'Enter how you want to be shown.');
      return;
    }
    if (!token || !user) return;
    try {
      setIsSaving(true);
      let avatarUrl: string | undefined = user.avatarUrl;
      if (selectedImage) {
        const key = await uploadAvatarToS3(selectedImage);
        if (key) avatarUrl = key;
      }
      const updateRes = await authenticatedRequest<{ username?: string; displayName?: string; bio?: string; avatarUrl?: string }>(
        '/api/user/profile',
        token,
        {
          method: 'PUT',
          body: JSON.stringify({
            username: u,
            displayName: displayName.trim(),
            bio: bio.trim() || undefined,
            avatarUrl,
          }),
        }
      );
      if (updateRes.success) {
        await setProfileComplete();
        await refreshUser();
      } else {
        Alert.alert('Error', updateRes.error || 'Could not save profile.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const displayImage = selectedImage || avatarUri;

  return (
    <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>Complete your profile</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Set your username, display name, and photo so others can find you.
          </Text>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={handlePickImage} style={styles.avatarWrap}>
            {displayImage ? (
              <Image source={{ uri: displayImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="person" size={48} color={theme.primary} />
              </View>
            )}
            {isUploading && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="small" color="#FFF" />
              </View>
            )}
            <Text style={[styles.avatarHint, { color: theme.textSecondary }]}>Tap to add photo</Text>
          </TouchableOpacity>

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.text }]}>Username</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
              value={username}
              onChangeText={setUsername}
              placeholder="e.g. johndoe"
              placeholderTextColor={theme.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
            />
            <Text style={[styles.hint, { color: theme.textTertiary }]}>3+ characters, letters, numbers, . _</Text>
          </View>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.text }]}>Display name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="How you want to be shown"
              placeholderTextColor={theme.textTertiary}
              maxLength={50}
            />
          </View>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.text }]}>Bio (optional)</Text>
            <TextInput
              style={[styles.input, styles.bioInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
              value={bio}
              onChangeText={setBio}
              placeholder="A short bio"
              placeholderTextColor={theme.textTertiary}
              multiline
              maxLength={160}
            />
          </View>
          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: theme.primary }]}
            onPress={handleContinue}
            disabled={isSaving || isUploading}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 24 },
  avatarWrap: { alignSelf: 'center', marginBottom: 24 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  avatarOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 50, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  avatarHint: { fontSize: 12, marginTop: 8, textAlign: 'center' },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  bioInput: { minHeight: 80, textAlignVertical: 'top' },
  hint: { fontSize: 12, marginTop: 4 },
  continueButton: { marginTop: 12, paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  continueButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
