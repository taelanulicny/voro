import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { useSocial } from '../context/SocialContext';

interface FollowButtonProps {
  userId: string;
  size?: 'small' | 'medium' | 'large';
  style?: any;
  showMutualStatus?: boolean; // Whether to show mutual follow indicator
}

export default function FollowButton({ 
  userId, 
  size = 'medium', 
  style,
  showMutualStatus = true,
}: FollowButtonProps) {
  const { isFollowingUser, toggleFollowUser, checkMutualFollow } = useSocial();
  const [isLoading, setIsLoading] = useState(false);
  const [mutualStatus, setMutualStatus] = useState<{
    isMutual: boolean;
    otherFollowsUser: boolean;
  } | null>(null);
  const [isLoadingMutual, setIsLoadingMutual] = useState(false);
  
  const isFollowing = isFollowingUser(userId);

  // Check mutual follow status on mount and when following status changes
  useEffect(() => {
    if (showMutualStatus && userId) {
      loadMutualStatus();
    }
  }, [userId, isFollowing, showMutualStatus]);

  const loadMutualStatus = async () => {
    setIsLoadingMutual(true);
    try {
      const status = await checkMutualFollow(userId);
      setMutualStatus(status);
    } catch (error) {
      console.error('Error checking mutual follow:', error);
    } finally {
      setIsLoadingMutual(false);
    }
  };

  const handlePress = async () => {
    setIsLoading(true);
    const result = await toggleFollowUser(userId);
    setIsLoading(false);
    
    // Update mutual status after follow toggle
    if (showMutualStatus && result.success) {
      // The backend returns mutual status, so update local state
      if (result.isMutual !== undefined) {
        setMutualStatus({
          isMutual: result.isMutual,
          otherFollowsUser: result.otherFollowsUser || false,
        });
      } else {
        // Fallback to checking again
        await loadMutualStatus();
      }
    }
  };

  const buttonStyle = [
    styles.button,
    styles[`button_${size}`],
    isFollowing ? styles.buttonFollowing : styles.buttonFollow,
    mutualStatus?.isMutual && isFollowing && styles.buttonMutual,
    style,
  ];

  const textStyle = [
    styles.text,
    styles[`text_${size}`],
    isFollowing ? styles.textFollowing : styles.textFollow,
  ];

  // Determine button text
  const getButtonText = () => {
    if (isLoading || isLoadingMutual) {
      return isFollowing ? 'Following' : 'Follow';
    }
    
    if (isFollowing) {
      if (mutualStatus?.isMutual) {
        return 'Mutual';
      }
      if (mutualStatus?.otherFollowsUser) {
        return 'Follows You';
      }
      return 'Following';
    }
    
    return 'Follow';
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={buttonStyle}
        onPress={handlePress}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={isFollowing ? '#3B82F6' : '#FFFFFF'}
          />
        ) : (
          <Text style={textStyle}>
            {getButtonText()}
          </Text>
        )}
      </TouchableOpacity>
      
      {/* Show mutual follow indicator below button if mutual and small size */}
      {showMutualStatus && mutualStatus?.isMutual && isFollowing && size === 'small' && (
        <Text style={styles.mutualIndicator}>Mutual</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    minWidth: 80,
  },
  button_small: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 70,
  },
  button_medium: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 90,
  },
  button_large: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    minWidth: 120,
  },
  buttonFollow: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  buttonFollowing: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
  },
  buttonMutual: {
    borderColor: '#10B981',
  },
  text: {
    fontWeight: '600',
  },
  text_small: {
    fontSize: 12,
  },
  text_medium: {
    fontSize: 14,
  },
  text_large: {
    fontSize: 16,
  },
  textFollow: {
    color: '#FFFFFF',
  },
  textFollowing: {
    color: '#6B7280',
  },
  mutualIndicator: {
    fontSize: 10,
    color: '#10B981',
    marginTop: 2,
    fontWeight: '500',
  },
});

