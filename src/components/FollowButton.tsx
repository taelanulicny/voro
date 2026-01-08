import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSocial } from '../context/SocialContext';

interface FollowButtonProps {
  userId: string;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

export default function FollowButton({ userId, size = 'medium', style }: FollowButtonProps) {
  const { isFollowingUser, toggleFollowUser } = useSocial();
  const [isLoading, setIsLoading] = useState(false);
  
  const isFollowing = isFollowingUser(userId);

  const handlePress = async () => {
    setIsLoading(true);
    await toggleFollowUser(userId);
    setIsLoading(false);
  };

  const buttonStyle = [
    styles.button,
    styles[`button_${size}`],
    isFollowing ? styles.buttonFollowing : styles.buttonFollow,
    style,
  ];

  const textStyle = [
    styles.text,
    styles[`text_${size}`],
    isFollowing ? styles.textFollowing : styles.textFollow,
  ];

  return (
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
          {isFollowing ? 'Following' : 'Follow'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
});

