import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { getEntityByName } from '../utils/mockEntities';

interface NotificationsPanelProps {
  visible: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PANEL_WIDTH = SCREEN_WIDTH * 0.85; // 85% of screen width

interface Notification {
  id: string;
  avatar: any; // Image source
  username: string;
  message: string;
  timestamp: string;
}

const notifications: Notification[] = [
  {
    id: '1',
    avatar: require('../../assets/icon.png'),
    username: 'Moro Team',
    message: 'We\'re excited to announce a new category coming soon: "March Madness"! Track public opinion on teams throughout the tournament. Get ready to trade confidence in your favorite teams as they compete for the championship.',
    timestamp: '2h ago',
  },
  {
    id: '2',
    avatar: require('../../assets/icon.png'),
    username: 'Moro Team',
    message: 'Go follow @MrBeast! He just joined Moro and will be doing an exclusive giveaway. Don\'t miss out on this amazing opportunity!',
    timestamp: '5h ago',
  },
  {
    id: '3',
    avatar: require('../../assets/icon.png'),
    username: 'Moro Team',
    message: 'We\'re holding an app-wide poll: Who should be the next entity added to the Influencers category? The entity with the highest votes will get added. Cast your vote now!',
    timestamp: '1d ago',
  },
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function NotificationsPanel({ visible, onClose }: NotificationsPanelProps) {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const slideAnim = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const handleEntityPress = (mentionName: string) => {
    const entity = getEntityByName(mentionName);
    if (entity) {
      onClose();
      // Category is already in the correct format (no mapping needed)
      navigation.navigate('Entity', { entityId: entity.id, categoryId: entity.category });
    }
  };

  const renderMessageWithMentions = (message: string) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const mentionRegex = /@([a-zA-Z0-9.'-]+)/g;
    let match;

    while ((match = mentionRegex.exec(message)) !== null) {
      const startIndex = match.index;
      const mention = match[0];
      const mentionName = match[1];

      // Add text before the mention
      if (startIndex > lastIndex) {
        const textBefore = message.substring(lastIndex, startIndex);
        parts.push(
          <Text key={`text-${lastIndex}`} style={[styles.message, { color: theme.text }]}>
            {textBefore}
          </Text>
        );
      }

      // Add the mention (blue and clickable)
      parts.push(
        <Text
          key={`mention-${startIndex}`}
          style={[styles.message, styles.mentionText, { color: theme.primary }]}
          onPress={() => handleEntityPress(mentionName)}
        >
          {mention}
        </Text>
      );

      lastIndex = startIndex + mention.length;
    }

    // Add any remaining text after the last mention
    if (lastIndex < message.length) {
      const textAfter = message.substring(lastIndex);
      if (textAfter) {
        parts.push(
          <Text key={`text-${lastIndex}`} style={[styles.message, { color: theme.text }]}>
            {textAfter}
          </Text>
        );
      }
    }

    return <Text style={{ fontSize: 14, lineHeight: 20 }}>{parts}</Text>;
  };

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -PANEL_WIDTH,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropOpacity]);

  if (!visible && slideAnim._value === -PANEL_WIDTH) return null;

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropOpacity,
          },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>
      
      {/* Notifications Panel */}
      <Animated.View
        style={[
          styles.panelContainer,
          {
            backgroundColor: theme.card,
            width: PANEL_WIDTH,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <SafeAreaView style={styles.panelContent} edges={['top', 'left', 'right']}>
          {/* Header */}
          <View style={[styles.panelHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.panelTitle, { color: theme.text }]}>Notifications</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Notifications List */}
          <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
            {notifications.map((notification) => (
              <View key={notification.id} style={[styles.notificationItem, { borderBottomColor: theme.border }]}>
                <View style={styles.notificationHeader}>
                  <Image source={notification.avatar} style={styles.avatar} />
                  <View style={styles.notificationInfo}>
                    <Text style={[styles.username, { color: theme.text }]}>{notification.username}</Text>
                    <Text style={[styles.timestamp, { color: theme.textSecondary }]}>{notification.timestamp}</Text>
                  </View>
                </View>
                {renderMessageWithMentions(notification.message)}
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  panelContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  panelContent: {
    flex: 1,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  mentionText: {
    fontWeight: '600',
  },
});

