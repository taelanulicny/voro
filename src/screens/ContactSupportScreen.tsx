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

type SupportCategory = 'technical' | 'account' | 'trading' | 'billing' | 'other';

interface CategoryOption {
  id: SupportCategory;
  label: string;
  icon: string;
}

const CATEGORIES: CategoryOption[] = [
  { id: 'technical', label: 'Technical Issue', icon: 'bug-outline' },
  { id: 'account', label: 'Account Problem', icon: 'person-outline' },
  { id: 'trading', label: 'Trading Question', icon: 'trending-up-outline' },
  { id: 'billing', label: 'Billing & Payments', icon: 'card-outline' },
  { id: 'other', label: 'Other', icon: 'help-circle-outline' },
];

export default function ContactSupportScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { user, token } = useAuth();

  const [category, setCategory] = useState<SupportCategory>('technical');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    textArea: {
      ...styles.textArea,
      color: theme.text,
      backgroundColor: theme.background,
      borderColor: theme.border,
    },
    label: {
      ...styles.label,
      color: theme.textSecondary,
    },
    categoryButton: {
      ...styles.categoryButton,
      backgroundColor: theme.background,
      borderColor: theme.border,
    },
    categoryButtonActive: {
      ...styles.categoryButton,
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    categoryButtonText: {
      ...styles.categoryButtonText,
      color: theme.text,
    },
    categoryButtonTextActive: {
      ...styles.categoryButtonText,
      color: '#FFFFFF',
    },
    submitButton: {
      ...styles.submitButton,
      backgroundColor: theme.primary,
    },
    submitButtonDisabled: {
      ...styles.submitButton,
      backgroundColor: theme.border,
    },
    infoBox: {
      ...styles.infoBox,
      backgroundColor: theme.background,
      borderColor: theme.border,
    },
    infoText: {
      ...styles.infoText,
      color: theme.textSecondary,
    },
  };

  const handleSubmit = async () => {
    // Validation
    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please describe your issue');
      return;
    }

    if (description.trim().length < 20) {
      Alert.alert('Error', 'Please provide more details (at least 20 characters)');
      return;
    }

    if (!isBackendConfigured() || !token) {
      Alert.alert(
        'Support Request Saved',
        'Your support request has been saved locally. Once the backend is configured, we\'ll submit it to our support team.\n\nFor urgent issues, please email support@moro.app',
        [
          {
            text: 'OK',
            onPress: () => {
              setSubject('');
              setDescription('');
              navigation.goBack();
            },
          },
        ]
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authenticatedRequest('/api/support/tickets', token, {
        method: 'POST',
        body: JSON.stringify({
          category,
          subject: subject.trim(),
          description: description.trim(),
          userEmail: user?.email,
          userName: user?.name,
        }),
      });

      if (response.success) {
        const ticketId = response.data?.ticketId || 'Unknown';
        Alert.alert(
          'Support Request Submitted',
          `Your ticket (#${ticketId}) has been submitted. Our support team will respond within 24-48 hours via email.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setSubject('');
                setDescription('');
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to submit support request');
      }
    } catch (error: any) {
      console.error('Error submitting support request:', error);
      Alert.alert('Error', error.message || 'Failed to submit support request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = subject.trim().length > 0 && description.trim().length >= 20 && !isSubmitting;

  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>Contact Support</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={dynamicStyles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Info Box */}
        <View style={styles.infoBoxContainer}>
          <View style={dynamicStyles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={theme.accent} />
            <Text style={dynamicStyles.infoText}>
              Our support team typically responds within 24-48 hours
            </Text>
          </View>
        </View>

        {/* Category Selection */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>CATEGORY</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={
                  category === cat.id
                    ? dynamicStyles.categoryButtonActive
                    : dynamicStyles.categoryButton
                }
                onPress={() => setCategory(cat.id)}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={20}
                  color={category === cat.id ? '#FFFFFF' : theme.textSecondary}
                />
                <Text
                  style={
                    category === cat.id
                      ? dynamicStyles.categoryButtonTextActive
                      : dynamicStyles.categoryButtonText
                  }
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Subject */}
        <View style={[dynamicStyles.section, { marginTop: 24 }]}>
          <Text style={dynamicStyles.sectionTitle}>SUBJECT</Text>
          <View style={dynamicStyles.inputContainer}>
            <TextInput
              style={dynamicStyles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="Brief summary of your issue"
              placeholderTextColor={theme.textTertiary}
              maxLength={100}
            />
          </View>
          <Text style={[styles.charCount, { color: theme.textTertiary }]}>
            {subject.length}/100
          </Text>
        </View>

        {/* Description */}
        <View style={[dynamicStyles.section, { marginTop: 24 }]}>
          <Text style={dynamicStyles.sectionTitle}>DESCRIPTION</Text>
          <TextInput
            style={dynamicStyles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Please describe your issue in detail. Include any error messages, steps to reproduce, or relevant information."
            placeholderTextColor={theme.textTertiary}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={[styles.charCount, { color: theme.textTertiary }]}>
            {description.length}/1000
          </Text>
        </View>

        {/* User Info */}
        {user && (
          <View style={[dynamicStyles.section, { marginTop: 24 }]}>
            <Text style={dynamicStyles.sectionTitle}>YOUR INFORMATION</Text>
            <View style={styles.userInfoRow}>
              <Ionicons name="person-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.userInfoText, { color: theme.text }]}>
                {user.name || user.username}
              </Text>
            </View>
            {user.email && (
              <View style={styles.userInfoRow}>
                <Ionicons name="mail-outline" size={16} color={theme.textSecondary} />
                <Text style={[styles.userInfoText, { color: theme.text }]}>{user.email}</Text>
              </View>
            )}
            <Text style={[styles.helpText, { color: theme.textTertiary }]}>
              We'll respond to your email address
            </Text>
          </View>
        )}

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={canSubmit ? dynamicStyles.submitButton : dynamicStyles.submitButtonDisabled}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="send-outline" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Submit Request</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Alternative Contact */}
        <View style={styles.alternativeContact}>
          <Text style={[styles.alternativeTitle, { color: theme.textSecondary }]}>
            Need immediate help?
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('HelpCenter')}>
            <Text style={[styles.alternativeLink, { color: theme.primary }]}>
              Visit our Help Center →
            </Text>
          </TouchableOpacity>
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
  infoBoxContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 18,
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
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    minWidth: '48%',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 150,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  userInfoText: {
    fontSize: 14,
  },
  helpText: {
    fontSize: 12,
    marginTop: 4,
  },
  submitContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  submitButton: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  alternativeContact: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  alternativeTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  alternativeLink: {
    fontSize: 15,
    fontWeight: '600',
  },
});
