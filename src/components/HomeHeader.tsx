import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface HomeHeaderProps {
  onMenuPress: () => void;
  onGiftPress?: () => void;
  onNotificationsPress: () => void;
}

export default function HomeHeader({
  onMenuPress,
  onGiftPress,
  onNotificationsPress,
}: HomeHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.header, { backgroundColor: theme.card }]}>
      <View style={styles.headerLeft}>
        <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
          <Ionicons name="menu" size={24} color={theme.text} />
        </TouchableOpacity>

        <Text style={[styles.logoText, { color: theme.text }]}>moro</Text>
      </View>

      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.iconButton} onPress={onGiftPress}>
          <Ionicons name="gift-outline" size={24} color={theme.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={onNotificationsPress}>
          <Ionicons name="notifications-outline" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

