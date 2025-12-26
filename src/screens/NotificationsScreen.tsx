import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types';
import { getEntityByName } from '../utils/mockEntities';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const handleEntityPress = (mentionName: string) => {
    const entity = getEntityByName(mentionName);
    if (entity) {
      // Map category to display category
      let categoryId = entity.category;
      if (entity.category === 'People') {
        if (entity.id >= 11 && entity.id <= 20) {
          categoryId = 'Influencers';
        } else if (entity.id >= 21 && entity.id <= 30) {
          categoryId = 'Music Artists';
        }
      } else if (entity.category === 'Tech') {
        categoryId = 'Startups';
      } else if (entity.category === 'Politics') {
        categoryId = 'Political Figures';
      } else if (entity.category === 'Events') {
        categoryId = 'Sports';
      }
      navigation.navigate('Entity', { entityId: entity.id, categoryId });
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Notifications</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Notifications List */}
      <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
        {notifications.map((notification) => (
          <View key={notification.id} style={[styles.notificationItem, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <View style={styles.notificationHeader}>
              <Image source={notification.avatar} style={styles.avatar} />
              <View style={styles.notificationInfo}>
                <Text style={[styles.username, { color: theme.text }]}>{notification.username}</Text>
                <Text style={[styles.timestamp, { color: theme.textSecondary }]}>{notification.timestamp}</Text>
              </View>
            </View>
            <View style={styles.messageContainer}>
              {renderMessageWithMentions(notification.message)}
            </View>
          </View>
        ))}
      </ScrollView>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
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
  messageContainer: {
    marginTop: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  mentionText: {
    fontWeight: '600',
  },
});

