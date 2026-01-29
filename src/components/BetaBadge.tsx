import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface BetaBadgeProps {
  position?: 'top-left' | 'top-right' | 'inline';
  variant?: 'default' | 'small' | 'large';
}

export const BetaBadge: React.FC<BetaBadgeProps> = ({
  position = 'top-right',
  variant = 'default',
}) => {
  const { theme } = useTheme();

  const positionStyles = {
    'top-left': {
      position: 'absolute' as const,
      top: 10,
      left: 10,
      zIndex: 100,
    },
    'top-right': {
      position: 'absolute' as const,
      top: 10,
      right: 10,
      zIndex: 100,
    },
    'inline': {
      // No positioning
    },
  };

  const variantStyles = {
    small: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      fontSize: 10,
    },
    default: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      fontSize: 12,
    },
    large: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      fontSize: 14,
    },
  };

  return (
    <View
      style={[
        styles.container,
        positionStyles[position],
        {
          backgroundColor: theme.accent + '20',
          borderColor: theme.accent,
          paddingHorizontal: variantStyles[variant].paddingHorizontal,
          paddingVertical: variantStyles[variant].paddingVertical,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: theme.accent,
            fontSize: variantStyles[variant].fontSize,
          },
        ]}
      >
        BETA
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 1,
  },
});
