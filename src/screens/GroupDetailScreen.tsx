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

type GroupDetailRouteProp = RouteProp<RootStackParamList, 'GroupDetail'>;

// Mock data generators
const generateMockMessages = (groupId: string): GroupMessage[] => {
  return [
    {
      id: `${groupId}-msg-1`,
      groupId,
      userId: '2',
      username: 'sarah_trader',
      displayName: 'Sarah Chen',
      content: 'What do you all think about the latest tech earnings?',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
    {
      id: `${groupId}-msg-2`,
      groupId,
      userId: '3',
      username: 'mike_investor',
      displayName: 'Mike Johnson',
      content: 'Looking positive! Strong fundamentals across the board.',
      timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    },
    {
      id: `${groupId}-msg-3`,
      groupId,
      userId: '4',
      username: 'crypto_king',
      displayName: 'Alex Rivera',
      content: 'Anyone following the AI sector? Seems like it\'s heating up 🔥',
      timestamp: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
    },
  ];
};

const generateMockMembers = (groupId: string): GroupMember[] => {
  return [
    {
      id: `${groupId}-member-1`,
      userId: '1',
      username: 'devuser',
      displayName: 'Dev User',
      role: 'owner',
      joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    },
    {
      id: `${groupId}-member-2`,
      userId: '2',
      username: 'sarah_trader',
      displayName: 'Sarah Chen',
      role: 'admin',
      joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    },
    {
      id: `${groupId}-member-3`,
      userId: '3',
      username: 'mike_investor',
      displayName: 'Mike Johnson',
      role: 'member',
      joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    },
    {
      id: `${groupId}-member-4`,
      userId: '4',
      username: 'crypto_king',
      displayName: 'Alex Rivera',
      role: 'member',
      joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    },
  ];
};

export default function GroupDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<GroupDetailRouteProp>();
  const { groupId } = route.params;
  const { groups, leaveGroup } = useSocial();
  const { user } = useAuth();
  const { theme } = useTheme();

  const [selectedTab, setSelectedTab] = useState<'messages' | 'members'>('messages');
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const group = groups.find(g => g.id === groupId);

  useEffect(() => {
    loadGroupData();
  }, [groupId]);

  const loadGroupData = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setMessages(generateMockMessages(groupId));
    setMembers(generateMockMembers(groupId));
    setIsLoading(false);
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || !user) return;

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
                contentContainerStyle={styles.membersList}
                showsVerticalScrollIndicator={false}
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
    marginTop: 24,
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
});

