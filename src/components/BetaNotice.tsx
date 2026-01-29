import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface BetaNoticeProps {
  message?: string;
  type?: 'info' | 'warning';
  dismissible?: boolean;
  onDismiss?: () => void;
}

export const BetaNotice: React.FC<BetaNoticeProps> = ({
  message = 'This is a beta feature. Data may be reset during updates.',
  type = 'info',
  dismissible = false,
  onDismiss,
}) => {
  const { theme } = useTheme();

  const typeColors = {
    info: {
      bg: theme.accent + '15',
      border: theme.accent + '40',
      icon: theme.accent,
    },
    warning: {
      bg: '#ff9800' + '15',
      border: '#ff9800' + '40',
      icon: '#ff9800',
    },
  };

  const colors = typeColors[type];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons
          name={type === 'warning' ? 'warning-outline' : 'information-circle-outline'}
          size={20}
          color={colors.icon}
          style={styles.icon}
        />
        <Text
          style={[
            styles.message,
            {
              color: theme.text,
              flex: 1,
            },
          ]}
        >
          {message}
        </Text>
        {dismissible && onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Ionicons name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  icon: {
    marginRight: 10,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
});
