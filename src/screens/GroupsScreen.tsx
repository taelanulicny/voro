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
import { Ionicons } from '@expo/vector-icons';
import { useSocial } from '../context/SocialContext';
import { useTheme } from '../context/ThemeContext';
import { Group, RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

  // Filter groups based on search query
  const searchFilteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return groups;
    }
    const query = searchQuery.toLowerCase();
    return groups.filter(group => 
      group.name.toLowerCase().includes(query) ||
      group.description.toLowerCase().includes(query) ||
      group.category.toLowerCase().includes(query)
    );
  }, [groups, searchQuery]);

  // Recommended groups (groups user is not a member of) - only show when no search query
  const recommendedGroups = useMemo(() => {
    // Only show recommended when no search query
    if (searchQuery.trim()) {
      return [];
    }
    const notMemberGroups = groups.filter(group => !group.isMember);
    // Return top 10 recommended groups (could add more sophisticated logic later)
    return notMemberGroups.slice(0, 10);
  }, [groups, searchQuery]);

  // Search results - all groups that match the search query (excluding user's groups)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }
    return searchFilteredGroups.filter(group => !group.isMember);
  }, [searchFilteredGroups, searchQuery]);

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>Join a Group</Text>
    </View>
  );


  const renderSearchBar = () => {
    return (
      <View style={[styles.searchContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search groups..."
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
    const isEmpty = searchQuery.trim() ? searchResults.length === 0 : false;
    
    if (isLoadingGroups) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>Loading groups...</Text>
        </View>
      );
    }

    if (isEmpty) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No groups found</Text>
          <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
            Try a different search term
          </Text>
        </View>
      );
    }

    return null;
  };

  // Current groups to display: search results if searching, otherwise empty (recommended slider handles display)
  const currentGroups = searchQuery.trim() ? searchResults : [];

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
            {!searchQuery.trim() && recommendedGroups.length > 0 && renderRecommendedSlider()}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
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
