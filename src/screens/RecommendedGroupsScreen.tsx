import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Group } from '../types';
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

export default function RecommendedGroupsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { groups, joinGroup, leaveGroup } = useSocial();
  const [selectedCountry, setSelectedCountry] = useState<string>('Worldwide');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [stateModalVisible, setStateModalVisible] = useState(false);

  // Filter groups that user is not a member of
  const recommendedGroups = useMemo(() => {
    return groups.filter(group => !group.isMember);
  }, [groups]);

  // Filter groups by selected location
  const filteredGroups = useMemo(() => {
    if (selectedCountry === 'Worldwide') {
      // Show all groups
      return recommendedGroups;
    }
    
    if (selectedCountry === 'More countries coming soon') {
      // Don't show any groups for this placeholder
      return [];
    }
    
    if (selectedCountry === 'United States of America') {
      return recommendedGroups.filter(group => {
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
        // (groups with location matching "United States of America" or any US state)
        return group.location === 'United States of America' || 
               group.location === 'United States' ||
               US_STATES.includes(group.location);
      });
    }
    
    return [];
  }, [recommendedGroups, selectedCountry, selectedState]);

  const renderGroupCard = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={[styles.groupCard, { backgroundColor: theme.card }]}
      onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.groupHeader}>
        {item.coverImage ? (
          <Image source={{ uri: item.coverImage }} style={styles.groupIcon} />
        ) : (
          <View style={[styles.groupIcon, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="people" size={32} color={theme.primary} />
          </View>
        )}
        <View style={styles.groupInfo}>
          <View style={styles.groupTitleRow}>
            <Text style={[styles.groupName, { color: theme.text }]}>{item.name}</Text>
            {item.isPrivate && (
              <Ionicons name="lock-closed" size={14} color={theme.textSecondary} />
            )}
          </View>
          <Text style={[styles.groupCategory, { color: theme.primary }]}>{item.category}</Text>
          <View style={styles.groupMeta}>
            <Text style={[styles.groupMembers, { color: theme.textSecondary }]}>
              {item.memberCount.toLocaleString()} members
            </Text>
            {item.location && (
              <>
                <Text style={[styles.groupMetaSeparator, { color: theme.textTertiary }]}> • </Text>
                <Text style={[styles.groupLocation, { color: theme.textSecondary }]}>
                  {item.location}
                </Text>
              </>
            )}
          </View>
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

  const renderLocationFilter = () => (
    <View style={[styles.filterContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <View style={styles.filterRow}>
        {/* Country Filter */}
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

        {/* State/Region Filter - Only show when country is selected */}
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
    </View>
  );

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
                  styles.locationOption,
                  { 
                    backgroundColor: selectedCountry === country ? theme.primaryLight : 'transparent',
                    borderBottomColor: theme.border,
                  },
                ]}
                onPress={() => {
                  setSelectedCountry(country);
                  // Reset state selection when country changes
                  if (country !== 'United States of America') {
                    setSelectedState(null);
                  }
                  setCountryModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.locationOptionText,
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
            {/* Option to show all states (no specific state filter) */}
            <TouchableOpacity
              style={[
                styles.locationOption,
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
                  styles.locationOptionText,
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
                  styles.locationOption,
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
                    styles.locationOptionText,
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
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Recommended Groups</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Location Filter */}
      {renderLocationFilter()}

      {/* Groups List */}
      <FlatList
        data={filteredGroups}
        renderItem={renderGroupCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={theme.textTertiary} />
            <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No groups found</Text>
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
              {selectedCountry === 'Worldwide'
                ? 'No recommended groups available'
                : selectedCountry === 'More countries coming soon'
                ? 'More countries coming soon'
                : selectedState
                ? `No groups found in ${selectedState}`
                : `No groups found in ${selectedCountry}`}
            </Text>
          </View>
        }
      />

      {/* Country Filter Modal */}
      {renderCountryModal()}
      
      {/* State/Region Filter Modal */}
      {renderStateModal()}
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
    overflow: 'hidden',
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
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  groupMembers: {
    fontSize: 13,
  },
  groupMetaSeparator: {
    fontSize: 13,
  },
  groupLocation: {
    fontSize: 13,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
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
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  locationOptionText: {
    fontSize: 16,
  },
});
