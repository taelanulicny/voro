import React, { useState, useEffect } from 'react';
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

export default function EmailScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { user, token, updateUser } = useAuth();

  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setCurrentEmail(user.email);
    }
  }, [user]);

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
    infoBox: {
      ...styles.infoBox,
      backgroundColor: theme.background,
      borderColor: theme.border,
    },
    currentEmailText: {
      ...styles.currentEmailText,
      color: theme.text,
    },
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleUpdateEmail = async () => {
    // Validation
    if (!newEmail || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validateEmail(newEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    if (newEmail === currentEmail) {
      Alert.alert('Error', 'New email must be different from current email');
      return;
    }

    if (!isBackendConfigured() || !token) {
      Alert.alert(
        'Backend Required',
        'Email changes require backend configuration. This feature will be available once the backend is set up.'
      );
      return;
    }

    setIsUpdatingEmail(true);

    try {
      const response = await authenticatedRequest('/api/auth/change-email', token, {
        method: 'POST',
        body: JSON.stringify({
          newEmail,
          password,
        }),
      });

      if (response.success) {
        Alert.alert(
          'Verification Email Sent',
          `A verification email has been sent to ${newEmail}. Please check your inbox and click the verification link to complete the email change.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Update local user state
                if (updateUser && user) {
                  updateUser({ ...user, email: newEmail });
                }
                setNewEmail('');
                setPassword('');
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to update email');
      }
    } catch (error: any) {
      console.error('Error updating email:', error);
      Alert.alert('Error', error.message || 'Failed to update email');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const canSave = newEmail.length > 0 && password.length > 0 && !isUpdatingEmail;

  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>Email</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={dynamicStyles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Current Email */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>CURRENT EMAIL</Text>
          <View style={dynamicStyles.infoBox}>
            <Ionicons name="mail-outline" size={20} color={theme.textSecondary} />
            <Text style={dynamicStyles.currentEmailText}>{currentEmail || 'Not set'}</Text>
          </View>
        </View>

        {/* Change Email Section */}
        <View style={[dynamicStyles.section, { marginTop: 24 }]}>
          <Text style={dynamicStyles.sectionTitle}>CHANGE EMAIL</Text>

          {/* New Email */}
          <View style={styles.inputGroup}>
            <Text style={dynamicStyles.label}>New Email Address</Text>
            <View style={dynamicStyles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={theme.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={dynamicStyles.input}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="Enter new email address"
                placeholderTextColor={theme.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password Confirmation */}
          <View style={styles.inputGroup}>
            <Text style={dynamicStyles.label}>Confirm Password</Text>
            <View style={dynamicStyles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={theme.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={dynamicStyles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={theme.textTertiary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <Text style={dynamicStyles.helpText}>
              Enter your password to confirm this change
            </Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={canSave ? dynamicStyles.saveButton : dynamicStyles.saveButtonDisabled}
            onPress={handleUpdateEmail}
            disabled={!canSave}
          >
            {isUpdatingEmail ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Update Email</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Important Information */}
        <View style={[dynamicStyles.section, { marginTop: 24 }]}>
          <Text style={dynamicStyles.sectionTitle}>IMPORTANT INFORMATION</Text>

          <View style={styles.infoItem}>
            <Ionicons name="information-circle-outline" size={20} color={theme.accent} />
            <Text style={[styles.infoText, { color: theme.text }]}>
              You will receive a verification email at your new address
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="information-circle-outline" size={20} color={theme.accent} />
            <Text style={[styles.infoText, { color: theme.text }]}>
              Your current email will remain active until you verify the new one
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="information-circle-outline" size={20} color={theme.accent} />
            <Text style={[styles.infoText, { color: theme.text }]}>
              Make sure you have access to the new email address
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="warning-outline" size={20} color="#F59E0B" />
            <Text style={[styles.infoText, { color: theme.text }]}>
              You'll need to log in again after changing your email
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
  inputIcon: {
    marginRight: 8,
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  currentEmailText: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});
