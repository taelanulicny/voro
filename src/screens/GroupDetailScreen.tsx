import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, GroupMember } from '../types';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTrading } from '../context/TradingContext';

type GroupDetailRouteProp = RouteProp<RootStackParamList, 'GroupDetail'>;

// Mock data generators
const generateMockMembers = (groupId: string, currentUserId: string | undefined, currentUserAccountValue: number): GroupMember[] => {
  // Only return the current user as a member (no hard-coded examples)
  if (!currentUserId) {
    return [];
  }

  return [{
    id: `${groupId}-member-current`,
    userId: currentUserId,
    username: 'you', // Will be updated with actual username when user data is available
    displayName: 'You',
    role: 'owner', // User is the owner of groups they create
    joinedAt: new Date().toISOString(),
    accountValue: currentUserAccountValue,
  }];
};

export default function GroupDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<GroupDetailRouteProp>();
  const { groupId } = route.params;
  const { groups, leaveGroup, deleteGroup } = useSocial();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { portfolio } = useTrading();

  const group = groups.find(g => g.id === groupId);

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGroupData();
  }, [groupId]);

  const loadGroupData = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    // Generate members with account values, sorted by highest to lowest
    // Use actual user data if available
    const sortedMembers = generateMockMembers(
      groupId, 
      user?.id, 
      portfolio.totalValue || 10000 // Default to initial cash balance if portfolio not loaded
    );
    
    // Update current user's display info in the sorted members list
    if (user) {
      const currentUserMemberIndex = sortedMembers.findIndex(m => m.userId === user.id);
      if (currentUserMemberIndex !== -1) {
        sortedMembers[currentUserMemberIndex].username = user.username;
        sortedMembers[currentUserMemberIndex].displayName = user.displayName || user.username;
        sortedMembers[currentUserMemberIndex].avatarUrl = user.avatarUrl;
      }
    }
    
    setMembers(sortedMembers);
    setIsLoading(false);
  };

  const handleLeaveGroup = async () => {
    await leaveGroup(groupId);
    navigation.goBack();
  };

  const handleDeleteGroup = async () => {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${group?.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteGroup(groupId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  // Check if current user is the owner
  const currentUserMember = members.find(m => m.userId === user?.id);
  const isOwner = currentUserMember?.role === 'owner';

  const handleShare = async () => {
    try {
      // Generate invite link for the group
      // In production, this would be a proper invite link from the backend
      const inviteLink = `https://moro.app/groups/${groupId}/invite`;
      const shareMessage = `Join ${group.name} on Moro! 🚀\n\n${group.description || 'Join this group to connect with others.'}\n\n${inviteLink}`;
      
      await Share.share({
        message: shareMessage,
        title: `Invite to ${group.name}`,
      });
    } catch (error) {
      console.error('Error sharing group:', error);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const renderMember = ({ item, index }: { item: GroupMember; index: number }) => {
    const isCurrentUser = item.userId === user?.id;
    const rank = index + 1;

    return (
      <TouchableOpacity 
        style={[
          styles.memberItem, 
          { 
            backgroundColor: isCurrentUser ? theme.card : theme.backgroundSecondary,
            borderBottomColor: theme.border,
            borderLeftWidth: isCurrentUser ? 3 : 0,
            borderLeftColor: isCurrentUser ? theme.primary : 'transparent',
          }
        ]}
      >
        <View style={styles.memberRank}>
          <Text style={[styles.rankNumber, { color: isCurrentUser ? theme.primary : theme.textSecondary }]}>
            #{rank}
          </Text>
        </View>
      <View style={styles.memberLeft}>
        <View style={styles.memberAvatar}>
            <View style={[styles.avatarContainer, { backgroundColor: isCurrentUser ? theme.primaryLight : theme.backgroundTertiary }]}>
              <Text style={[styles.avatarInitial, { color: isCurrentUser ? theme.primary : theme.text }]}>
                {item.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
        </View>
        <View style={styles.memberInfo}>
            <View style={styles.memberNameRow}>
              <Text style={[styles.memberName, { color: isCurrentUser ? theme.primary : theme.text }]}>
                {item.displayName}
                {isCurrentUser && ' (You)'}
              </Text>
            </View>
          <Text style={[styles.memberUsername, { color: theme.textSecondary }]}>@{item.username}</Text>
        </View>
      </View>
        <View style={styles.memberRight}>
          <Text style={[styles.accountValue, { color: theme.text }]}>
            {item.accountValue ? formatCurrency(item.accountValue) : '$0.00'}
          </Text>
      {item.role !== 'member' && (
        <View style={[styles.roleBadge, { backgroundColor: theme.primaryLight }]}>
          <Text style={[styles.roleText, { color: theme.primary }]}>{item.role.toUpperCase()}</Text>
        </View>
      )}
        </View>
    </TouchableOpacity>
  );
  };

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

        <TouchableOpacity style={styles.menuButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
            ) : (
              <FlatList
                data={members}
          renderItem={({ item, index }) => renderMember({ item, index })}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.membersList}
                showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={[styles.membersHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
              <Text style={[styles.membersHeaderText, { color: theme.textSecondary }]}>
                Ranked by Account Value
              </Text>
            </View>
          }
                ListFooterComponent={
                  group.isMember && (
                    isOwner ? (
                      <TouchableOpacity
                        style={[styles.leaveGroupButton, { backgroundColor: theme.card, borderColor: theme.error }]}
                        onPress={handleDeleteGroup}
                      >
                        <Ionicons name="trash-outline" size={20} color={theme.error} />
                        <Text style={[styles.leaveGroupText, { color: theme.error }]}>Delete Group</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.leaveGroupButton, { backgroundColor: theme.card, borderColor: theme.error }]}
                        onPress={handleLeaveGroup}
                      >
                        <Ionicons name="exit-outline" size={20} color={theme.error} />
                        <Text style={[styles.leaveGroupText, { color: theme.error }]}>Leave Group</Text>
                      </TouchableOpacity>
                    )
                  )
                }
              />
            )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  membersList: {
    paddingVertical: 0,
  },
  membersHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  membersHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 0,
  },
  memberRank: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '600',
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
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 0,
  },
  memberUsername: {
    fontSize: 13,
  },
  memberRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  accountValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 9,
    fontWeight: '700',
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

