import React, { useState, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useSocial } from '../context/SocialContext';
import { Group } from '../types';

export default function GroupsScreen() {
  const { groups, isLoadingGroups, refreshGroups, createGroup, joinGroup, leaveGroup } = useSocial();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'my'>('all');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    await refreshGroups();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshGroups();
    setRefreshing(false);
  };

  const filteredGroups = filter === 'my' 
    ? groups.filter(g => g.isMember)
    : groups;

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Groups</Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add-circle" size={28} color="#3B82F6" />
      </TouchableOpacity>
    </View>
  );

  const renderFilterTabs = () => (
    <View style={styles.filterTabs}>
      <TouchableOpacity
        style={[
          styles.filterTab,
          filter === 'all' && styles.filterTabActive,
        ]}
        onPress={() => setFilter('all')}
      >
        <Text
          style={[
            styles.filterTabText,
            filter === 'all' && styles.filterTabTextActive,
          ]}
        >
          All Groups
        </Text>
        {filter === 'all' && <View style={styles.filterTabIndicator} />}
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filterTab,
          filter === 'my' && styles.filterTabActive,
        ]}
        onPress={() => setFilter('my')}
      >
        <Text
          style={[
            styles.filterTabText,
            filter === 'my' && styles.filterTabTextActive,
          ]}
        >
          My Groups
        </Text>
        {filter === 'my' && <View style={styles.filterTabIndicator} />}
      </TouchableOpacity>
    </View>
  );

  const renderGroupCard = ({ item }: { item: Group }) => (
    <View style={styles.groupCard}>
      <View style={styles.groupHeader}>
        <View style={styles.groupIcon}>
          <Ionicons name="people" size={32} color="#3B82F6" />
        </View>
        <View style={styles.groupInfo}>
          <View style={styles.groupTitleRow}>
            <Text style={styles.groupName}>{item.name}</Text>
            {item.isPrivate && (
              <Ionicons name="lock-closed" size={14} color="#6B7280" />
            )}
          </View>
          <Text style={styles.groupCategory}>{item.category}</Text>
          <Text style={styles.groupMembers}>
            {item.memberCount.toLocaleString()} members
          </Text>
        </View>
      </View>

      <Text style={styles.groupDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <TouchableOpacity
        style={[
          styles.actionButton,
          item.isMember ? styles.actionButtonSecondary : styles.actionButtonPrimary,
        ]}
        onPress={() => item.isMember ? leaveGroup(item.id) : joinGroup(item.id)}
      >
        <Text
          style={[
            styles.actionButtonText,
            item.isMember ? styles.actionButtonTextSecondary : styles.actionButtonTextPrimary,
          ]}
        >
          {item.isMember ? 'Leave' : 'Join'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyStateTitle}>
        {filter === 'my' ? 'No groups yet' : 'No groups found'}
      </Text>
      <Text style={styles.emptyStateText}>
        {filter === 'my'
          ? 'Join groups to connect with like-minded traders'
          : 'Be the first to create a trading group!'}
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Text style={styles.emptyStateButtonText}>Create Group</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoadingGroups && groups.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading groups...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={filteredGroups}
        renderItem={renderGroupCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {renderFilterTabs()}
          </>
        }
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3B82F6"
          />
        }
        contentContainerStyle={[
          styles.listContent,
          filteredGroups.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
      />

      <CreateGroupModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createGroup}
      />
    </SafeAreaView>
  );
}

// Create Group Modal Component
interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (params: { name: string; description: string; category: string; isPrivate: boolean }) => Promise<{ success: boolean; group?: Group }>;
}

function CreateGroupModal({ visible, onClose, onCreate }: CreateGroupModalProps) {
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
      Alert.alert('Success', 'Group created successfully!');
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
        style={styles.modalContainer}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Create Group</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || !name.trim() || !description.trim() || !category}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <Text
                style={[
                  styles.modalCreateText,
                  (!name.trim() || !description.trim() || !category) && styles.modalCreateTextDisabled,
                ]}
              >
                Create
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Group Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Tech Stock Bulls"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
            maxLength={50}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What's this group about?"
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={200}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryButtons}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  category === cat && styles.categoryButtonActive,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    category === cat && styles.categoryButtonTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.privacyToggle}
            onPress={() => setIsPrivate(!isPrivate)}
          >
            <View style={styles.privacyToggleInfo}>
              <Ionicons
                name={isPrivate ? 'lock-closed' : 'lock-open'}
                size={20}
                color="#6B7280"
              />
              <Text style={styles.privacyToggleText}>Private Group</Text>
            </View>
            <View style={[styles.switch, isPrivate && styles.switchActive]}>
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
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  createButton: {
    padding: 4,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  filterTabActive: {},
  filterTabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  filterTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#3B82F6',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#EFF6FF',
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
    color: '#111827',
  },
  groupCategory: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
    marginTop: 2,
  },
  groupMembers: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  groupDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    marginBottom: 12,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: '#3B82F6',
  },
  actionButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonTextPrimary: {
    color: '#FFFFFF',
  },
  actionButtonTextSecondary: {
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
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
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#3B82F6',
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
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalCreateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  modalCreateTextDisabled: {
    color: '#9CA3AF',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
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
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  categoryButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
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
    color: '#111827',
    fontWeight: '500',
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: '#3B82F6',
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

