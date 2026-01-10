import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useSocial } from '../context/SocialContext';
import { useTheme } from '../context/ThemeContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// US States list
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming',
];

const COUNTRY_OPTIONS = [
  'Worldwide',
  'United States of America',
  'More countries coming soon',
];

export default function CreateGroupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { createGroup, refreshGroups, refreshUserGroups } = useSocial();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('Worldwide');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [stateModalVisible, setStateModalVisible] = useState(false);

  // Calculate location string based on selections
  const location = useMemo(() => {
    if (selectedCountry === 'Worldwide') {
      return 'Whole World';
    }
    if (selectedCountry === 'More countries coming soon') {
      return undefined;
    }
    if (selectedCountry === 'United States of America') {
      return selectedState || 'United States of America';
    }
    return undefined;
  }, [selectedCountry, selectedState]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a group description');
      return;
    }
    if (isPrivate && !password.trim()) {
      Alert.alert('Error', 'Please enter a password for private groups');
      return;
    }
    if (selectedCountry === 'More countries coming soon') {
      Alert.alert('Error', 'Please select a valid country. More countries are coming soon!');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createGroup({
        name: name.trim(),
        description: description.trim(),
        category: 'Other', // Default category
        isPrivate,
        location,
        password: isPrivate ? password.trim() : undefined,
      });

      if (result.success && result.group) {
        // Refresh groups list
        await Promise.all([refreshGroups(), refreshUserGroups()]);
        Alert.alert('Success', 'Group created successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to create group');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while creating the group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCountryModal = () => (
    <Modal
      visible={countryModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setCountryModalVisible(false)}
    >
      <SafeAreaView style={styles.modalOverlay} edges={['bottom']}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setCountryModalVisible(false)}
        />
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Country</Text>
            <TouchableOpacity
              onPress={() => setCountryModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
            {COUNTRY_OPTIONS.map((country) => (
              <TouchableOpacity
                key={country}
                style={[
                  styles.modalOption,
                  { 
                    backgroundColor: selectedCountry === country ? theme.primaryLight : 'transparent',
                    borderBottomColor: theme.border,
                  },
                ]}
                onPress={() => {
                  setSelectedCountry(country);
                  if (country !== 'United States of America') {
                    setSelectedState(null);
                  }
                  setCountryModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    {
                      color: selectedCountry === country ? theme.primary : theme.text,
                      fontWeight: selectedCountry === country ? '600' : '400',
                    },
                  ]}
                >
                  {country}
                </Text>
                {selectedCountry === country && (
                  <Ionicons name="checkmark" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderStateModal = () => (
    <Modal
      visible={stateModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setStateModalVisible(false)}
    >
      <SafeAreaView style={styles.modalOverlay} edges={['bottom']}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setStateModalVisible(false)}
        />
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select State/Region</Text>
            <TouchableOpacity
              onPress={() => setStateModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.modalOption,
                { 
                  backgroundColor: selectedState === null ? theme.primaryLight : 'transparent',
                  borderBottomColor: theme.border,
                },
              ]}
              onPress={() => {
                setSelectedState(null);
                setStateModalVisible(false);
              }}
            >
              <Text
                style={[
                  styles.modalOptionText,
                  {
                    color: selectedState === null ? theme.primary : theme.text,
                    fontWeight: selectedState === null ? '600' : '400',
                  },
                ]}
              >
                All States/Regions
              </Text>
              {selectedState === null && (
                <Ionicons name="checkmark" size={20} color={theme.primary} />
              )}
            </TouchableOpacity>
            {US_STATES.map((state) => (
              <TouchableOpacity
                key={state}
                style={[
                  styles.modalOption,
                  { 
                    backgroundColor: selectedState === state ? theme.primaryLight : 'transparent',
                    borderBottomColor: theme.border,
                  },
                ]}
                onPress={() => {
                  setSelectedState(state);
                  setStateModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    {
                      color: selectedState === state ? theme.primary : theme.text,
                      fontWeight: selectedState === state ? '600' : '400',
                    },
                  ]}
                >
                  {state}
                </Text>
                {selectedState === state && (
                  <Ionicons name="checkmark" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Create Group</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Group Name */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.label, { color: theme.text }]}>Group Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder="Enter group name"
              placeholderTextColor={theme.textTertiary}
              value={name}
              onChangeText={setName}
              maxLength={50}
            />
          </View>

          {/* Description */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.label, { color: theme.text }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder="What's this group about?"
              placeholderTextColor={theme.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
          </View>

          {/* Location Selection */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.label, { color: theme.text }]}>Location</Text>
            <View style={styles.regionRow}>
              {/* Country Dropdown */}
              <TouchableOpacity
                style={[styles.regionButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, flex: 1 }]}
                onPress={() => setCountryModalVisible(true)}
              >
                <Ionicons name="globe-outline" size={18} color={theme.textSecondary} />
                <Text style={[styles.regionButtonText, { color: theme.text }]} numberOfLines={1}>
                  {selectedCountry}
                </Text>
                <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
              </TouchableOpacity>

              {/* State/Region Dropdown - Only show when country is selected */}
              {selectedCountry === 'United States of America' && (
                <TouchableOpacity
                  style={[styles.regionButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, flex: 1, marginLeft: 8 }]}
                  onPress={() => setStateModalVisible(true)}
                >
                  <Ionicons name="location-outline" size={18} color={theme.textSecondary} />
                  <Text style={[styles.regionButtonText, { color: theme.text }]} numberOfLines={1}>
                    {selectedState || 'State/Region'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Public/Private Toggle */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelContainer}>
                <Text style={[styles.label, { color: theme.text }]}>Privacy</Text>
                <Text style={[styles.toggleSubtext, { color: theme.textSecondary }]}>
                  {isPrivate ? 'Private groups require a password to join' : 'Anyone can join and see the group'}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggle,
                  { backgroundColor: isPrivate ? theme.primary : theme.backgroundTertiary },
                ]}
                onPress={() => {
                  setIsPrivate(!isPrivate);
                  if (!isPrivate) {
                    setPassword('');
                  }
                }}
              >
                <View style={[styles.toggleThumb, isPrivate && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Password Field - Only show when private */}
          {isPrivate && (
            <View style={[styles.section, { backgroundColor: theme.card }]}>
              <Text style={[styles.label, { color: theme.text }]}>Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                placeholder="Enter password for private group"
                placeholderTextColor={theme.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                maxLength={50}
              />
              <Text style={[styles.hint, { color: theme.textTertiary }]}>
                Members will need this password to join your group
              </Text>
            </View>
          )}

          {/* Create Button */}
          <TouchableOpacity
            style={[
              styles.createButton,
              {
                backgroundColor: (!name.trim() || !description.trim() || (isPrivate && !password.trim()) || selectedCountry === 'More countries coming soon' || isSubmitting)
                  ? theme.backgroundTertiary
                  : theme.primary,
              },
            ]}
            onPress={handleSubmit}
            disabled={!name.trim() || !description.trim() || (isPrivate && !password.trim()) || selectedCountry === 'More countries coming soon' || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.createButtonText}>Create Group</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modals */}
      {renderCountryModal()}
      {renderStateModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 44,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
  },
  dropdownText: {
    fontSize: 16,
    flex: 1,
  },
  regionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  regionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    minHeight: 44,
  },
  regionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  toggleSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  createButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 50,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollView: {
    maxHeight: 500,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: 16,
  },
});
