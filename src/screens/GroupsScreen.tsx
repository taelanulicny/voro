import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSocial } from '../context/SocialContext';
import { useTheme } from '../context/ThemeContext';
import { Group, RootStackParamList, MainTabParamList } from '../types';

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

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

function GroupsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { 
    groups, 
    isLoadingGroups, 
    refreshGroups, 
    refreshUserGroups,
    createGroup, 
    joinGroup, 
    leaveGroup 
  } = useSocial();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('Worldwide');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'public' | 'private'>('all');
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [stateModalVisible, setStateModalVisible] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    await Promise.all([
      refreshGroups(),
      refreshUserGroups(),
    ]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refreshGroups(),
      refreshUserGroups(),
    ]);
    setRefreshing(false);
  };

  // Filter groups based on search query, location, and privacy
  const filteredGroups = useMemo(() => {
    let filtered = groups.filter(group => !group.isMember); // Only show groups user is not a member of

    // Filter by search query (name, description)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(group => 
        group.name.toLowerCase().includes(query) ||
        group.description.toLowerCase().includes(query) ||
        (group.category && group.category.toLowerCase().includes(query))
      );
    }

    // Filter by location
    if (selectedCountry === 'Worldwide') {
      // Show all groups
    } else if (selectedCountry === 'More countries coming soon') {
      // Don't show any groups for this placeholder
      filtered = [];
    } else if (selectedCountry === 'United States of America') {
      filtered = filtered.filter(group => {
        if (!group.location) return false;
        
        // Groups with 'Whole World' location only show when filtering by 'Worldwide'
        if (group.location === 'Whole World') {
          return false;
        }
        
        // If a specific state is selected, filter by that state
        if (selectedState) {
          return group.location === selectedState;
        }
        
        // If no state selected, show all US groups
        return group.location === 'United States of America' || 
               group.location === 'United States' ||
               US_STATES.includes(group.location);
      });
    }

    // Filter by privacy
    if (privacyFilter === 'public') {
      filtered = filtered.filter(group => !group.isPrivate);
    } else if (privacyFilter === 'private') {
      filtered = filtered.filter(group => group.isPrivate);
    }
    // 'all' shows both public and private

    return filtered;
  }, [groups, searchQuery, selectedCountry, selectedState, privacyFilter]);

  // Recommended groups - only show when no search query and no filters applied
  const recommendedGroups = useMemo(() => {
    // Only show recommended when no search query and default filters
    if (searchQuery.trim() || selectedCountry !== 'Worldwide' || privacyFilter !== 'all') {
      return [];
    }
    // Return top 10 recommended groups
    return filteredGroups.slice(0, 10);
  }, [filteredGroups, searchQuery, selectedCountry, privacyFilter]);

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          navigation.navigate('Main', { screen: 'Community' });
        }}
      >
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>
      <Text style={[styles.title, { color: theme.text }]}>Join a Group</Text>
      <View style={styles.headerRight} />
    </View>
  );


  const renderSearchBar = () => {
    return (
      <View style={[styles.searchContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search groups by name..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderFilters = () => {
    return (
      <View style={[styles.filtersContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        {/* Location Filters */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, flex: 1 }]}
            onPress={() => setCountryModalVisible(true)}
          >
            <Ionicons name="globe-outline" size={18} color={theme.textSecondary} />
            <Text style={[styles.filterButtonText, { color: theme.text }]} numberOfLines={1}>
              {selectedCountry}
            </Text>
            <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
          </TouchableOpacity>

          {selectedCountry === 'United States of America' && (
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, flex: 1, marginLeft: 8 }]}
              onPress={() => setStateModalVisible(true)}
            >
              <Ionicons name="location-outline" size={18} color={theme.textSecondary} />
              <Text style={[styles.filterButtonText, { color: theme.text }]} numberOfLines={1}>
                {selectedState || 'State/Region'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Privacy Filter */}
        <View style={styles.privacyFilterRow}>
          <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Privacy:</Text>
          <View style={styles.privacyButtons}>
            <TouchableOpacity
              style={[
                styles.privacyButton,
                {
                  backgroundColor: privacyFilter === 'all' ? theme.primary : theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setPrivacyFilter('all')}
            >
              <Text
                style={[
                  styles.privacyButtonText,
                  { color: privacyFilter === 'all' ? '#FFFFFF' : theme.text },
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.privacyButton,
                {
                  backgroundColor: privacyFilter === 'public' ? theme.primary : theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setPrivacyFilter('public')}
            >
              <Text
                style={[
                  styles.privacyButtonText,
                  { color: privacyFilter === 'public' ? '#FFFFFF' : theme.text },
                ]}
              >
                Public
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.privacyButton,
                {
                  backgroundColor: privacyFilter === 'private' ? theme.primary : theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setPrivacyFilter('private')}
            >
              <Text
                style={[
                  styles.privacyButtonText,
                  { color: privacyFilter === 'private' ? '#FFFFFF' : theme.text },
                ]}
              >
                Private
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
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
        <View style={[styles.filterModalContent, { backgroundColor: theme.card }]}>
          <View style={[styles.filterModalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.filterModalTitle, { color: theme.text }]}>Select Country</Text>
            <TouchableOpacity
              onPress={() => setCountryModalVisible(false)}
              style={styles.filterModalCloseButton}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.filterModalScrollView} showsVerticalScrollIndicator={false}>
            {COUNTRY_OPTIONS.map((country) => (
              <TouchableOpacity
                key={country}
                style={[
                  styles.filterModalOption,
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
                    styles.filterModalOptionText,
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
        <View style={[styles.filterModalContent, { backgroundColor: theme.card }]}>
          <View style={[styles.filterModalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.filterModalTitle, { color: theme.text }]}>Select State/Region</Text>
            <TouchableOpacity
              onPress={() => setStateModalVisible(false)}
              style={styles.filterModalCloseButton}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.filterModalScrollView} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.filterModalOption,
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
                  styles.filterModalOptionText,
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
                  styles.filterModalOption,
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
                    styles.filterModalOptionText,
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

  const renderRecommendedSlider = () => {
    if (recommendedGroups.length === 0) return null;
    
    return (
      <View style={[styles.recommendedSection, { borderBottomColor: theme.border }]}>
        <View style={styles.recommendedHeader}>
          <Text style={[styles.recommendedTitle, { color: theme.text }]}>Recommended for you</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recommendedScrollContent}
        >
          {recommendedGroups.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={[styles.recommendedCard, { backgroundColor: theme.card }]}
              onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })}
            >
              <View style={[styles.recommendedCardIcon, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="people" size={24} color={theme.primary} />
              </View>
              <Text style={[styles.recommendedCardName, { color: theme.text }]} numberOfLines={1}>
                {group.name}
              </Text>
              <Text style={[styles.recommendedCardMembers, { color: theme.textSecondary }]}>
                {group.memberCount.toLocaleString()} members
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderGroupCard = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={[styles.groupCard, { backgroundColor: theme.card }]}
      onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.groupHeader}>
        <View style={[styles.groupIcon, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="people" size={32} color={theme.primary} />
        </View>
        <View style={styles.groupInfo}>
          <View style={styles.groupTitleRow}>
            <Text style={[styles.groupName, { color: theme.text }]}>{item.name}</Text>
            {item.isPrivate && (
              <Ionicons name="lock-closed" size={14} color={theme.textSecondary} />
            )}
          </View>
          <Text style={[styles.groupCategory, { color: theme.primary }]}>{item.category}</Text>
          <Text style={[styles.groupMembers, { color: theme.textSecondary }]}>
            {item.memberCount.toLocaleString()} members
          </Text>
        </View>
      </View>

      <Text style={[styles.groupDescription, { color: theme.textSecondary }]} numberOfLines={2}>
        {item.description}
      </Text>

      <TouchableOpacity
        style={[
          styles.actionButton,
          { backgroundColor: item.isMember ? theme.backgroundTertiary : theme.primary },
          item.isMember && { borderWidth: 1.5, borderColor: theme.border },
        ]}
        onPress={(e) => {
          e.stopPropagation();
          if (item.isMember) {
            leaveGroup(item.id);
          } else {
            joinGroup(item.id);
          }
        }}
      >
        <Text
          style={[
            styles.actionButtonText,
            { color: item.isMember ? theme.textSecondary : '#FFFFFF' },
          ]}
        >
          {item.isMember ? 'Leave' : 'Join'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    const hasFilters = searchQuery.trim() || selectedCountry !== 'Worldwide' || privacyFilter !== 'all';
    const isEmpty = currentGroups.length === 0;
    
    if (isLoadingGroups) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>Loading groups...</Text>
        </View>
      );
    }

    if (isEmpty && hasFilters) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No groups found</Text>
          <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
            Try adjusting your search or filters
          </Text>
        </View>
      );
    }

    return null;
  };

  // Current groups to display: filtered groups (excluding recommended ones if showing recommended slider)
  const currentGroups = useMemo(() => {
    if (searchQuery.trim() || selectedCountry !== 'Worldwide' || privacyFilter !== 'all') {
      return filteredGroups;
    }
    // If showing recommended slider, exclude those from the main list
    return filteredGroups.slice(10);
  }, [filteredGroups, searchQuery, selectedCountry, privacyFilter]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      <FlatList
        data={currentGroups}
        renderItem={renderGroupCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {renderSearchBar()}
            {renderFilters()}
            {!searchQuery.trim() && selectedCountry === 'Worldwide' && privacyFilter === 'all' && recommendedGroups.length > 0 && renderRecommendedSlider()}
          </>
        }
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          currentGroups.length === 0 && !searchQuery.trim() && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
      />

      <CreateGroupModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createGroup}
        onSuccess={() => {
          refreshUserGroups();
          refreshGroups();
        }}
      />

      {/* Location Filter Modals */}
      {renderCountryModal()}
      {renderStateModal()}
    </SafeAreaView>
  );
}

export default React.memo(GroupsScreen);

// Create Group Modal Component
interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (params: { name: string; description: string; category: string; isPrivate: boolean }) => Promise<{ success: boolean; group?: Group }>;
  onSuccess: () => void;
}

function CreateGroupModal({ visible, onClose, onCreate, onSuccess }: CreateGroupModalProps) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = ['Technology', 'Cryptocurrency', 'Trading', 'Investing', 'Other'];

  const handleSubmit = async () => {
    if (!name.trim() || !description.trim() || !category) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    const result = await onCreate({
      name: name.trim(),
      description: description.trim(),
      category,
      isPrivate,
    });
    setIsSubmitting(false);

    if (result.success) {
      setName('');
      setDescription('');
      setCategory('');
      setIsPrivate(false);
      onClose();
      onSuccess();
      Alert.alert('Success', 'Group created successfully!');
    } else {
      Alert.alert('Error', result.error || 'Failed to create group');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.modalContainer, { backgroundColor: theme.card }]}
      >
        <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
            <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Create Group</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || !name.trim() || !description.trim() || !category}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Text
                style={[
                  styles.modalCreateText,
                  { color: (!name.trim() || !description.trim() || !category) ? theme.textTertiary : theme.primary },
                ]}
              >
                Create
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: theme.text }]}>Group Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
            placeholder="e.g. Tech Stock Bulls"
            placeholderTextColor={theme.textTertiary}
            value={name}
            onChangeText={setName}
            maxLength={50}
          />

          <Text style={[styles.label, { color: theme.text }]}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
            placeholder="What's this group about?"
            placeholderTextColor={theme.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={200}
          />

          <Text style={[styles.label, { color: theme.text }]}>Category</Text>
          <View style={styles.categoryButtons}>
            {categories.map((cat) => {
              const isActive = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    {
                      backgroundColor: isActive ? theme.primary : theme.backgroundSecondary,
                      borderColor: isActive ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      { color: isActive ? '#FFFFFF' : theme.textSecondary },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.privacyToggle}
            onPress={() => setIsPrivate(!isPrivate)}
          >
            <View style={styles.privacyToggleInfo}>
              <Ionicons
                name={isPrivate ? 'lock-closed' : 'lock-open'}
                size={20}
                color={theme.textSecondary}
              />
              <Text style={[styles.privacyToggleText, { color: theme.text }]}>Private Group</Text>
            </View>
            <View style={[
              styles.switch,
              { backgroundColor: isPrivate ? theme.primary : theme.backgroundTertiary },
            ]}>
              <View style={[styles.switchThumb, isPrivate && styles.switchThumbActive]} />
            </View>
          </TouchableOpacity>
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
    paddingTop: 16,
    paddingBottom: 12,
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
  createButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    minHeight: 44,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  privacyFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  privacyButtons: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  privacyButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  privacyButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  filterModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  filterModalCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterModalScrollView: {
    maxHeight: 500,
  },
  filterModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  filterModalOptionText: {
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  groupCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  groupIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '600',
  },
  groupCategory: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  groupMembers: {
    fontSize: 13,
    marginTop: 2,
  },
  groupDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 100,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyStateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCancelText: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCreateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  privacyToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 16,
  },
  privacyToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privacyToggleText: {
    fontSize: 15,
    fontWeight: '500',
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  recommendedSection: {
    paddingTop: 16,
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  recommendedHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  recommendedTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  recommendedScrollContent: {
    paddingHorizontal: 16,
    paddingRight: 16,
    gap: 12,
  },
  recommendedCard: {
    width: 160,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  recommendedCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  recommendedCardName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  recommendedCardMembers: {
    fontSize: 12,
    textAlign: 'center',
  },
});
