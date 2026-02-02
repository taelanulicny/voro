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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, GroupMember } from '../types';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTrading } from '../context/TradingContext';

type GroupDetailRouteProp = RouteProp<RootStackParamList, 'GroupDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Mock data generators - NO LONGER USED (replaced with real API calls)
// const generateMockMembers = (
//   groupId: string,
//   currentUserId: string | undefined,
//   currentUserAccountValue: number,
//   isMember: boolean,
//   memberCount: number
// ): GroupMember[] => {
//   // If user created the group (memberCount === 1 and isMember === true), only show them
//   if (isMember && memberCount === 1 && currentUserId) {
//     return [{
//       id: `${groupId}-member-current`,
//       userId: currentUserId,
//       username: 'you', // Will be updated with actual username when user data is available
//       displayName: 'You',
//       role: 'owner', // User is the owner of groups they create
//       joinedAt: new Date().toISOString(),
//       accountValue: currentUserAccountValue,
//     }];
//   }

//   // Generate mock members of the group (these represent existing members)
//   const mockMembers: GroupMember[] = [
//     {
//       id: `${groupId}-member-1`,
//       userId: 'mock-user-1',
//       username: 'trader_alex',
//       displayName: 'Alex Chen',
//       role: 'owner',
//       joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
//       accountValue: 125000 + Math.random() * 50000,
//     },
//     {
//       id: `${groupId}-member-2`,
//       userId: 'mock-user-2',
//       username: 'crypto_sarah',
//       displayName: 'Sarah Johnson',
//       role: 'member',
//       joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
//       accountValue: 115000 + Math.random() * 40000,
//     },
//     {
//       id: `${groupId}-member-3`,
//       userId: 'mock-user-3',
//       username: 'investor_mike',
//       displayName: 'Mike Rivera',
//       role: 'member',
//       joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
//       accountValue: 105000 + Math.random() * 30000,
//     },
//     {
//       id: `${groupId}-member-4`,
//       userId: 'mock-user-4',
//       username: 'stock_master',
//       displayName: 'Jordan Kim',
//       role: 'member',
//       joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
//       accountValue: 95000 + Math.random() * 20000,
//     },
//   ];

//   // If user is a member (but not the only member), add them to the list
//   if (isMember && currentUserId && memberCount > 1) {
//     // Check if user is already in the list (shouldn't happen with mock data, but just in case)
//     const existingUserIndex = mockMembers.findIndex(m => m.userId === currentUserId);
//     if (existingUserIndex === -1) {
//       // Add current user to the members list as a regular member
//       mockMembers.push({
//         id: `${groupId}-member-current`,
//         userId: currentUserId,
//         username: 'you', // Will be updated with actual username when user data is available
//         displayName: 'You',
//         role: 'member', // User joined, so they're a member (not owner)
//         joinedAt: new Date().toISOString(),
//         accountValue: currentUserAccountValue,
//       });
//     } else {
//       // User already exists in list, update their account value
//       mockMembers[existingUserIndex].accountValue = currentUserAccountValue;
//     }
//   }

//   // Sort by account value (highest to lowest)
//   return mockMembers.sort((a, b) => (b.accountValue || 0) - (a.accountValue || 0));
// };

export default function GroupDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<GroupDetailRouteProp>();
  const { groupId } = route.params;
  const { groups, leaveGroup, deleteGroup, joinGroup, getGroupMembers } = useSocial();
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

    try {
      // Fetch real members from backend
      const result = await getGroupMembers(groupId);

      if (result.success && result.members) {
        // Members are already sorted by account value from backend
        setMembers(result.members);
      } else {
        console.error('Failed to load group members:', result.error);
        Alert.alert('Error', result.error || 'Failed to load group members');
        setMembers([]);
      }
    } catch (error) {
      console.error('Error loading group data:', error);
      Alert.alert('Error', 'Failed to load group members');
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    await leaveGroup(groupId);
    navigation.goBack();
  };

  const handleJoinGroup = async () => {
    const result = await joinGroup(groupId);
    if (result.success) {
      // Reload members list after joining
      await loadGroupData();
    } else {
      Alert.alert('Error', result.error || 'Failed to join group');
    }
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
        onPress={() => {
          navigation.navigate('UserProfile', { userId: item.userId });
        }}
        activeOpacity={0.7}
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
            <>
              {!group.isMember && (
                <View style={[styles.joinGroupContainer, { backgroundColor: theme.card }]}>
                  <TouchableOpacity
                    style={[styles.joinGroupButton, { backgroundColor: theme.primary }]}
                    onPress={handleJoinGroup}
                  >
                    <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.joinGroupText}>Join Group</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={[styles.membersHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <Text style={[styles.membersHeaderText, { color: theme.textSecondary }]}>
                  Ranked by Account Value
                </Text>
              </View>
            </>
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
  joinGroupContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  joinGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  joinGroupText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
    backgroundColor: '#775a96',
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

