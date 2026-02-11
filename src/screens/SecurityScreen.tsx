import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { authenticatedRequest, isBackendConfigured } from '../config/api';

export default function SecurityScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { user, token, needsCompleteAccount, refreshUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [completeEmail, setCompleteEmail] = useState(user?.email || '');
  const [completePassword, setCompletePassword] = useState('');
  const [completeConfirm, setCompleteConfirm] = useState('');
  const [showCompletePassword, setShowCompletePassword] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  const dynamicStyles = {
    container: {
      ...styles.container,
      backgroundColor: theme.background,
    },
    header: {
      ...styles.header,
      backgroundColor: theme.background,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      ...styles.headerTitle,
      color: theme.text,
    },
    scrollView: {
      ...styles.scrollView,
      backgroundColor: theme.background,
    },
    section: {
      ...styles.section,
      backgroundColor: theme.surface,
      borderTopColor: theme.border,
      borderBottomColor: theme.border,
    },
    sectionTitle: {
      ...styles.sectionTitle,
      color: theme.textSecondary,
    },
    inputContainer: {
      ...styles.inputContainer,
      backgroundColor: theme.background,
      borderColor: theme.border,
    },
    input: {
      ...styles.input,
      color: theme.text,
    },
    label: {
      ...styles.label,
      color: theme.textSecondary,
    },
    saveButton: {
      ...styles.saveButton,
      backgroundColor: theme.primary,
    },
    saveButtonDisabled: {
      ...styles.saveButton,
      backgroundColor: theme.border,
    },
    helpText: {
      ...styles.helpText,
      color: theme.textTertiary,
    },
  };

  const validatePassword = (password: string): boolean => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    return minLength && hasUpperCase && hasLowerCase && hasNumber;
  };

  const handleSetPassword = async () => {
    if (!completeEmail.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(completeEmail.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    if (!completePassword || completePassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    if (completePassword !== completeConfirm) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (!validatePassword(completePassword)) {
      Alert.alert('Invalid Password', 'Password must contain uppercase, lowercase, and numbers');
      return;
    }
    if (!isBackendConfigured() || !token) {
      Alert.alert('Error', 'Backend required to set password');
      return;
    }
    setIsSettingPassword(true);
    try {
      const response = await authenticatedRequest('/api/auth/set-password', token, {
        method: 'POST',
        body: JSON.stringify({ email: completeEmail.trim(), newPassword: completePassword }),
      });
      if (response.success) {
        Alert.alert('Success', 'Password set. You can now change it from this screen.', [
          { text: 'OK', onPress: async () => {
            setCompletePassword('');
            setCompleteConfirm('');
            await refreshUser();
          } },
        ]);
      } else {
        Alert.alert('Error', response.error || 'Failed to set password');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to set password');
    } finally {
      setIsSettingPassword(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (!validatePassword(newPassword)) {
      Alert.alert(
        'Invalid Password',
        'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers'
      );
      return;
    }

    if (newPassword === currentPassword) {
      Alert.alert('Error', 'New password must be different from current password');
      return;
    }

    if (!isBackendConfigured() || !token) {
      Alert.alert(
        'Backend Required',
        'Password changes require backend configuration. This feature will be available once the backend is set up.'
      );
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await authenticatedRequest('/api/auth/change-password', token, {
        method: 'POST',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (response.success) {
        Alert.alert('Success', 'Your password has been changed successfully', [
          {
            text: 'OK',
            onPress: () => {
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              navigation.goBack();
            },
          },
        ]);
      } else {
        Alert.alert('Error', response.error || 'Failed to change password');
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      Alert.alert('Error', error.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const canSave =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    !isChangingPassword;

  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>Security</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={dynamicStyles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Complete account (Apple-only: add email + set password before they can change password) */}
        {needsCompleteAccount && (
          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>COMPLETE YOUR ACCOUNT</Text>
            <Text style={[dynamicStyles.helpText, { marginBottom: 12 }]}>
              Add an email and set a password so you can sign in with email or change your password later.
            </Text>
            <View style={styles.inputGroup}>
              <Text style={dynamicStyles.label}>Email</Text>
              <View style={dynamicStyles.inputContainer}>
                <TextInput
                  style={dynamicStyles.input}
                  value={completeEmail}
                  onChangeText={setCompleteEmail}
                  placeholder="your@email.com"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={dynamicStyles.label}>Password</Text>
              <View style={dynamicStyles.inputContainer}>
                <TextInput
                  style={dynamicStyles.input}
                  value={completePassword}
                  onChangeText={setCompletePassword}
                  placeholder="At least 8 characters, upper, lower, number"
                  placeholderTextColor={theme.textTertiary}
                  secureTextEntry={!showCompletePassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowCompletePassword(!showCompletePassword)} style={styles.eyeIcon}>
                  <Ionicons name={showCompletePassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={dynamicStyles.label}>Confirm Password</Text>
              <View style={dynamicStyles.inputContainer}>
                <TextInput
                  style={dynamicStyles.input}
                  value={completeConfirm}
                  onChangeText={setCompleteConfirm}
                  placeholder="Confirm password"
                  placeholderTextColor={theme.textTertiary}
                  secureTextEntry={!showCompletePassword}
                  autoCapitalize="none"
                />
              </View>
            </View>
            <TouchableOpacity
              style={completeEmail.trim() && completePassword && completeConfirm && !isSettingPassword ? dynamicStyles.saveButton : dynamicStyles.saveButtonDisabled}
              onPress={handleSetPassword}
              disabled={!completeEmail.trim() || !completePassword || !completeConfirm || isSettingPassword}
            >
              {isSettingPassword ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Set Password</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Change Password Section (hidden or disabled until account complete for Apple-only) */}
        {!needsCompleteAccount && (
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>CHANGE PASSWORD</Text>

          {/* Current Password */}
          <View style={styles.inputGroup}>
            <Text style={dynamicStyles.label}>Current Password</Text>
            <View style={dynamicStyles.inputContainer}>
              <TextInput
                style={dynamicStyles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor={theme.textTertiary}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showCurrentPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={dynamicStyles.label}>New Password</Text>
            <View style={dynamicStyles.inputContainer}>
              <TextInput
                style={dynamicStyles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor={theme.textTertiary}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showNewPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <Text style={dynamicStyles.helpText}>
              At least 8 characters with uppercase, lowercase, and numbers
            </Text>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={dynamicStyles.label}>Confirm New Password</Text>
            <View style={dynamicStyles.inputContainer}>
              <TextInput
                style={dynamicStyles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={theme.textTertiary}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={canSave ? dynamicStyles.saveButton : dynamicStyles.saveButtonDisabled}
            onPress={handleChangePassword}
            disabled={!canSave}
          >
            {isChangingPassword ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Change Password</Text>
            )}
          </TouchableOpacity>
        </View>
        )}

        {/* Security Tips */}
        <View style={[dynamicStyles.section, { marginTop: 24 }]}>
          <Text style={dynamicStyles.sectionTitle}>SECURITY TIPS</Text>

          <View style={styles.tipItem}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.accent} />
            <Text style={[styles.tipText, { color: theme.text }]}>
              Use a unique password that you don't use elsewhere
            </Text>
          </View>

          <View style={styles.tipItem}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.accent} />
            <Text style={[styles.tipText, { color: theme.text }]}>
              Change your password regularly
            </Text>
          </View>

          <View style={styles.tipItem}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.accent} />
            <Text style={[styles.tipText, { color: theme.text }]}>
              Never share your password with anyone
            </Text>
          </View>

          <View style={styles.tipItem}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.accent} />
            <Text style={[styles.tipText, { color: theme.text }]}>
              Enable two-factor authentication when available
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  helpText: {
    fontSize: 12,
    marginTop: 4,
  },
  saveButton: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
});
