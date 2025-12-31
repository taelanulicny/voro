import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, GroupMessage, GroupMember } from '../types';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authenticatedRequest, isBackendConfigured } from '../config/api';

type GroupDetailRouteProp = RouteProp<RootStackParamList, 'GroupDetail'>;


function GroupDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<GroupDetailRouteProp>();
  const { groupId } = route.params;
  const { groups, leaveGroup } = useSocial();
  const { user, token } = useAuth();
  const { theme } = useTheme();

  const [selectedTab, setSelectedTab] = useState<'messages' | 'members'>('messages');
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const group = groups.find(g => g.id === groupId);

  // Helper function to show creator as fallback when members can't be fetched
  const showCreatorAsFallback = React.useCallback(async (groupData?: any) => {
    const groupToUse = groupData || group;
    
    if (!groupToUse || !groupToUse.ownerId) {
      // If we don't have group data, try to fetch it
      if (isBackendConfigured() && token) {
        try {
          const groupResponse = await authenticatedRequest<{ group: any }>(
            `/api/groups/${groupId}`,
            token,
            { method: 'GET' }
          );
          if (groupResponse.success && groupResponse.data?.group) {
            const fetchedGroup = groupResponse.data.group;
            // If current user is the owner, show them
            if (user && user.id === fetchedGroup.ownerId) {
              setMembers([{
                id: `${groupId}-member-${fetchedGroup.ownerId}`,
                userId: fetchedGroup.ownerId,
                username: user.username || 'unknown',
                displayName: user.displayName || 'Unknown User',
                role: 'owner',
                joinedAt: fetchedGroup.createdAt || new Date().toISOString(),
              }]);
              return;
            }
            // Try to fetch owner details
            try {
              const ownerResponse = await authenticatedRequest<{
                id: string;
                username: string;
                displayName: string;
                avatarUrl?: string;
              }>(`/api/user/${fetchedGroup.ownerId}`, token, { method: 'GET' });
              
              if (ownerResponse.success && ownerResponse.data) {
                setMembers([{
                  id: `${groupId}-member-${fetchedGroup.ownerId}`,
                  userId: fetchedGroup.ownerId,
                  username: ownerResponse.data.username || 'unknown',
                  displayName: ownerResponse.data.displayName || 'Unknown User',
                  role: 'owner',
                  joinedAt: fetchedGroup.createdAt || new Date().toISOString(),
                }]);
                return;
              }
            } catch (error) {
              console.error('Error fetching owner details:', error);
            }
          }
        } catch (error) {
          console.error('Error fetching group for fallback:', error);
        }
      }
      setMembers([]);
      return;
    }

    // If current user is the owner, show them
    if (user && user.id === groupToUse.ownerId) {
      setMembers([{
        id: `${groupId}-member-${groupToUse.ownerId}`,
        userId: groupToUse.ownerId,
        username: user.username || 'unknown',
        displayName: user.displayName || 'Unknown User',
        role: 'owner',
        joinedAt: groupToUse.createdAt || new Date().toISOString(),
      }]);
      return;
    }

    // Otherwise, try to fetch owner details from backend
    if (isBackendConfigured() && token) {
      try {
        const ownerResponse = await authenticatedRequest<{
          id: string;
          username: string;
          displayName: string;
          avatarUrl?: string;
        }>(`/api/user/${groupToUse.ownerId}`, token, { method: 'GET' });
        
        if (ownerResponse.success && ownerResponse.data) {
          setMembers([{
            id: `${groupId}-member-${groupToUse.ownerId}`,
            userId: groupToUse.ownerId,
            username: ownerResponse.data.username || 'unknown',
            displayName: ownerResponse.data.displayName || 'Unknown User',
            role: 'owner',
            joinedAt: groupToUse.createdAt || new Date().toISOString(),
          }]);
          return;
        }
      } catch (error) {
        console.error('Error fetching owner details:', error);
      }
    }

    // Last resort: show owner with minimal info
    setMembers([{
      id: `${groupId}-member-${groupToUse.ownerId}`,
      userId: groupToUse.ownerId,
      username: 'unknown',
      displayName: 'Group Owner',
      role: 'owner',
      joinedAt: groupToUse.createdAt || new Date().toISOString(),
    }]);
  }, [group, groupId, user, token]);

  useEffect(() => {
    // Show creator immediately if we have group data (optimistic UI)
    if (group && group.ownerId) {
      if (user && user.id === group.ownerId) {
        // Current user is the owner
        setMembers([{
          id: `${groupId}-member-${group.ownerId}`,
          userId: group.ownerId,
          username: user.username || 'unknown',
          displayName: user.displayName || 'Unknown User',
          role: 'owner',
          joinedAt: group.createdAt || new Date().toISOString(),
        }]);
      } else {
        // Show placeholder for owner until we fetch details
        setMembers([{
          id: `${groupId}-member-${group.ownerId}`,
          userId: group.ownerId,
          username: 'unknown',
          displayName: 'Group Owner',
          role: 'owner',
          joinedAt: group.createdAt || new Date().toISOString(),
        }]);
      }
    }
    loadGroupData();
  }, [groupId, token, showCreatorAsFallback, group, user]);

  const loadGroupData = async () => {
    setIsLoading(true);
    
    try {
      // Start with empty messages - no mock data
      setMessages([]);
      
      // First, ensure we have group data - fetch it if not in context
      let currentGroup = group;
      if (!currentGroup && isBackendConfigured() && token) {
        try {
          const groupResponse = await authenticatedRequest<{ group: any }>(
            `/api/groups/${groupId}`,
            token,
            { method: 'GET' }
          );
          if (groupResponse.success && groupResponse.data?.group) {
            currentGroup = {
              id: groupResponse.data.group.groupId || groupId,
              name: groupResponse.data.group.name,
              description: groupResponse.data.group.description,
              category: groupResponse.data.group.category,
              ownerId: groupResponse.data.group.ownerId,
              isPrivate: groupResponse.data.group.isPrivate,
              memberCount: groupResponse.data.group.memberCount || 0,
              createdAt: groupResponse.data.group.createdAt,
            };
          }
        } catch (error) {
          console.error('Error fetching group details:', error);
        }
      }
      
      // Fetch real members from backend
      if (isBackendConfigured() && token) {
        try {
          const response = await authenticatedRequest<{ members?: any[]; groups?: any[] }>(
            `/api/groups/${groupId}/members`,
            token,
            { method: 'GET' }
          );
          
          // Handle case where API returns wrong structure (groups instead of members)
          if (response.success && response.data) {
            let membersData = response.data.members;
            
            // If response has groups instead of members, it's the wrong endpoint
            if (!membersData && response.data.groups) {
              console.warn('API returned groups instead of members, using fallback');
              await showCreatorAsFallback(currentGroup);
              return;
            }
            
            if (membersData && Array.isArray(membersData)) {
              // Map backend members to frontend format
              const mappedMembers: GroupMember[] = membersData.map((m: any) => ({
                id: `${groupId}-member-${m.userId}`,
                userId: m.userId,
                username: m.username || 'unknown',
                displayName: m.displayName || 'Unknown User',
                role: m.role || 'member',
                joinedAt: m.joinedAt || new Date().toISOString(),
              }));
              
              // If members array is empty, ensure creator is shown
              if (mappedMembers.length === 0) {
                console.warn('Members array is empty, showing creator as fallback');
                await showCreatorAsFallback(currentGroup);
              } else {
                // Ensure creator is in the list (in case API doesn't return them)
                const ownerId = currentGroup?.ownerId;
                if (ownerId && !mappedMembers.find(m => m.userId === ownerId)) {
                  // Creator not in list, add them
                  const creatorMember: GroupMember = {
                    id: `${groupId}-member-${ownerId}`,
                    userId: ownerId,
                    username: user?.id === ownerId ? (user.username || 'unknown') : 'unknown',
                    displayName: user?.id === ownerId ? (user.displayName || 'Unknown User') : 'Group Owner',
                    role: 'owner',
                    joinedAt: currentGroup?.createdAt || new Date().toISOString(),
                  };
                  setMembers([creatorMember, ...mappedMembers]);
                } else {
                  setMembers(mappedMembers);
                }
              }
            } else {
              // If API returns empty or fails, try to show creator from group data
              console.warn('Failed to fetch members or invalid response:', response);
              await showCreatorAsFallback(currentGroup);
            }
          } else {
            await showCreatorAsFallback(currentGroup);
          }
        } catch (apiError: any) {
          console.error('Error fetching group members:', apiError);
          // Fallback: show creator if API fails
          await showCreatorAsFallback(currentGroup);
        }
      } else {
        // Backend not configured - show creator as fallback
        await showCreatorAsFallback(currentGroup);
      }
    } catch (error) {
      console.error('Error loading group data:', error);
      // On error, try to show creator as fallback
      await showCreatorAsFallback(group);
    } finally {
      setIsLoading(false);
    }
  };


  const handleSendMessage = () => {
    if (!messageText.trim() || !user || !user.id) return;

    const newMessage: GroupMessage = {
      id: `${groupId}-msg-${Date.now()}`,
      groupId,
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      content: messageText.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newMessage]);
    setMessageText('');
  };

  const handleLeaveGroup = async () => {
    await leaveGroup(groupId);
    navigation.goBack();
  };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const msgDate = new Date(timestamp);
    const diffMs = now.getTime() - msgDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return msgDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: GroupMessage }) => {
    const isOwnMessage = item.userId === user?.id;

    return (
      <View style={[styles.messageItem, isOwnMessage && styles.messageItemOwn]}>
        {!isOwnMessage && (
          <View style={styles.messageAvatar}>
            <Ionicons name="person-circle" size={32} color={theme.textTertiary} />
          </View>
        )}
        <View style={[
          styles.messageBubble,
          { backgroundColor: isOwnMessage ? theme.primary : theme.card },
        ]}>
          {!isOwnMessage && (
            <Text style={[styles.messageSender, { color: theme.text }]}>{item.displayName}</Text>
          )}
          <Text style={[styles.messageText, { color: isOwnMessage ? '#FFFFFF' : theme.text }]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, { color: isOwnMessage ? 'rgba(255,255,255,0.7)' : theme.textTertiary }]}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  const renderMember = ({ item }: { item: GroupMember }) => (
    <TouchableOpacity style={[styles.memberItem, { backgroundColor: theme.card, borderBottomColor: theme.borderLight }]}>
      <View style={styles.memberLeft}>
        <View style={styles.memberAvatar}>
          <Ionicons name="person-circle" size={40} color={theme.textTertiary} />
        </View>
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: theme.text }]}>{item.displayName}</Text>
          <Text style={[styles.memberUsername, { color: theme.textSecondary }]}>@{item.username}</Text>
        </View>
      </View>
      {item.role !== 'member' && (
        <View style={[styles.roleBadge, { backgroundColor: theme.primaryLight }]}>
          <Text style={[styles.roleText, { color: theme.primary }]}>{item.role.toUpperCase()}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (!group) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.text }]}>Group not found</Text>
          <TouchableOpacity
            style={[styles.errorButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
        
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{group.name}</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
          </Text>
        </View>

        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setSelectedTab('messages')}
        >
          <Ionicons
            name="chatbubbles"
            size={20}
            color={selectedTab === 'messages' ? theme.primary : theme.textSecondary}
          />
          <Text style={[
            styles.tabText,
            { color: selectedTab === 'messages' ? theme.primary : theme.textSecondary },
            selectedTab === 'messages' && { fontWeight: '600' },
          ]}>
            Messages
          </Text>
          {selectedTab === 'messages' && <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => setSelectedTab('members')}
        >
          <Ionicons
            name="people"
            size={20}
            color={selectedTab === 'members' ? theme.primary : theme.textSecondary}
          />
          <Text style={[
            styles.tabText,
            { color: selectedTab === 'members' ? theme.primary : theme.textSecondary },
            selectedTab === 'members' && { fontWeight: '600' },
          ]}>
            Members ({members.length})
          </Text>
          {selectedTab === 'members' && <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} />}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <>
            {selectedTab === 'messages' ? (
              <>
                <FlatList
                  data={messages}
                  renderItem={renderMessage}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.messagesList}
                  showsVerticalScrollIndicator={false}
                  inverted={false}
                />
                
                {/* Message Input */}
                <View style={[styles.inputContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
                  <TextInput
                    style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSecondary }]}
                    placeholder="Type a message..."
                    placeholderTextColor={theme.textTertiary}
                    value={messageText}
                    onChangeText={setMessageText}
                    multiline
                    maxLength={500}
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      { backgroundColor: messageText.trim() ? theme.primary : theme.backgroundTertiary },
                    ]}
                    onPress={handleSendMessage}
                    disabled={!messageText.trim()}
                  >
                    <Ionicons
                      name="send"
                      size={20}
                      color={messageText.trim() ? '#FFFFFF' : theme.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <FlatList
                data={members}
                renderItem={renderMember}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                  styles.membersList,
                  members.length === 0 && { flexGrow: 1, justifyContent: 'center' }
                ]}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="people-outline" size={48} color={theme.textTertiary} />
                    <Text style={[styles.emptyStateText, { color: theme.text }]}>
                      No members found
                    </Text>
                  </View>
                }
                ListFooterComponent={
                  group.isMember && (
                    <TouchableOpacity
                      style={[styles.leaveGroupButton, { backgroundColor: theme.card, borderColor: theme.error }]}
                      onPress={handleLeaveGroup}
                    >
                      <Ionicons name="exit-outline" size={20} color={theme.error} />
                      <Text style={[styles.leaveGroupText, { color: theme.error }]}>Leave Group</Text>
                    </TouchableOpacity>
                  )
                }
              />
            )}
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default React.memo(GroupDetailScreen);

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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    position: 'relative',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  messageItemOwn: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#111827',
    marginBottom: 4,
  },
  messageTextOwn: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  messageTimeOwn: {
    color: '#DBEAFE',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  membersList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  memberUsername: {
    fontSize: 13,
    color: '#6B7280',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3B82F6',
    letterSpacing: 0.5,
  },
  leaveGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  leaveGroupText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
});

