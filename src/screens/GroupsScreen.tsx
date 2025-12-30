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
    myGroups,
    isLoadingGroups, 
    isLoadingMyGroups,
    refreshGroups, 
    refreshUserGroups,
    createGroup, 
    joinGroup, 
    leaveGroup 
  } = useSocial();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'my' | 'explore'>('my');
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

  // Filter groups for Explore tab based on search query
  const filteredExploreGroups = useMemo(() => {
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

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>Groups</Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add-circle" size={28} color={theme.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderTabs = () => (
    <View style={[styles.tabsContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'my' && styles.tabActive]}
        onPress={() => setSelectedTab('my')}
      >
        <Text
          style={[
            styles.tabText,
            { color: selectedTab === 'my' ? theme.primary : theme.textSecondary },
            selectedTab === 'my' && { fontWeight: '600' },
          ]}
        >
          My Groups
        </Text>
        {selectedTab === 'my' && <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} />}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, selectedTab === 'explore' && styles.tabActive]}
        onPress={() => setSelectedTab('explore')}
      >
        <Text
          style={[
            styles.tabText,
            { color: selectedTab === 'explore' ? theme.primary : theme.textSecondary },
            selectedTab === 'explore' && { fontWeight: '600' },
          ]}
        >
          Explore
        </Text>
        {selectedTab === 'explore' && <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} />}
      </TouchableOpacity>
    </View>
  );

  const renderSearchBar = () => {
    if (selectedTab !== 'explore') return null;
    
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

      {selectedTab === 'explore' && (
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: item.isMember ? theme.backgroundTertiary : theme.primary },
            item.isMember && { borderWidth: 1.5, borderColor: theme.border },
          ]}
          onPress={(e) => {
            e.stopPropagation();
            item.isMember ? leaveGroup(item.id) : joinGroup(item.id);
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
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    const isLoading = selectedTab === 'my' ? isLoadingMyGroups : isLoadingGroups;
    const isEmpty = selectedTab === 'my' ? myGroups.length === 0 : filteredExploreGroups.length === 0;
    
    if (isLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>Loading groups...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="people-outline" size={64} color={theme.textTertiary} />
        <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
          {selectedTab === 'my' 
            ? 'No groups yet' 
            : searchQuery.trim() 
              ? 'No groups found' 
              : 'No groups available'}
        </Text>
        <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
          {selectedTab === 'my'
            ? 'Join groups to connect with like-minded traders'
            : searchQuery.trim()
              ? 'Try a different search term'
              : 'Be the first to create a trading group!'}
        </Text>
        {selectedTab === 'my' && (
          <TouchableOpacity
            style={[styles.emptyStateButton, { backgroundColor: theme.primary }]}
            onPress={() => setSelectedTab('explore')}
          >
            <Text style={styles.emptyStateButtonText}>Explore Groups</Text>
          </TouchableOpacity>
        )}
        {selectedTab === 'explore' && (
          <TouchableOpacity
            style={[styles.emptyStateButton, { backgroundColor: theme.primary }]}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={styles.emptyStateButtonText}>Create Group</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const currentGroups = selectedTab === 'my' ? myGroups : filteredExploreGroups;
  const isLoading = selectedTab === 'my' ? isLoadingMyGroups : isLoadingGroups;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      <FlatList
        data={currentGroups}
        renderItem={renderGroupCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {renderTabs()}
            {renderSearchBar()}
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
          currentGroups.length === 0 && styles.emptyListContent,
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
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  tabActive: {
    // Active tab styling handled by indicator
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
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
});
