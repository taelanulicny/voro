import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
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
  // Generate mock members with account values
  // Current user will use their actual account value, others get random values
  const mockMembers: GroupMember[] = [
    {
      id: `${groupId}-member-1`,
      userId: '1',
      username: 'devuser',
      displayName: 'Dev User',
      role: 'owner',
      joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      accountValue: currentUserId === '1' ? currentUserAccountValue : 125000 + Math.random() * 50000,
    },
    {
      id: `${groupId}-member-2`,
      userId: '2',
      username: 'sarah_trader',
      displayName: 'Sarah Chen',
      role: 'admin',
      joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
      accountValue: currentUserId === '2' ? currentUserAccountValue : 115000 + Math.random() * 40000,
    },
    {
      id: `${groupId}-member-3`,
      userId: '3',
      username: 'mike_investor',
      displayName: 'Mike Johnson',
      role: 'member',
      joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
      accountValue: currentUserId === '3' ? currentUserAccountValue : 105000 + Math.random() * 30000,
    },
    {
      id: `${groupId}-member-4`,
      userId: '4',
      username: 'crypto_king',
      displayName: 'Alex Rivera',
      role: 'member',
      joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
      accountValue: currentUserId === '4' ? currentUserAccountValue : 95000 + Math.random() * 20000,
    },
  ];

  // Replace any member that matches currentUserId with current user data
  const currentUserIndex = mockMembers.findIndex(m => m.userId === currentUserId);
  if (currentUserId && currentUserIndex !== -1) {
    // Update existing member with current user's account value
    mockMembers[currentUserIndex].accountValue = currentUserAccountValue;
  } else if (currentUserId) {
    // Add current user if not already in the list
    mockMembers.push({
      id: `${groupId}-member-current`,
      userId: currentUserId,
      username: 'you', // Will be updated with actual username when user data is available
      displayName: 'You',
      role: 'member',
      joinedAt: new Date().toISOString(),
      accountValue: currentUserAccountValue,
    });
  }

  // Sort by account value (highest to lowest)
  return mockMembers.sort((a, b) => (b.accountValue || 0) - (a.accountValue || 0));
};

export default function GroupDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<GroupDetailRouteProp>();
  const { groupId } = route.params;
  const { groups, leaveGroup } = useSocial();
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

        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={theme.text} />
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

