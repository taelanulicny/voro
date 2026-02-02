import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { RootStackParamList, MainTabParamList } from '../types';
import { useSideMenu } from '../context/SideMenuContext';
import { useSocial } from '../context/SocialContext';

interface SideMenuProps {
  onClose?: () => void;
}

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MENU_WIDTH = SCREEN_WIDTH * 0.67; // 2/3 of screen width

export default function SideMenu({ onClose }: SideMenuProps) {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { isVisible: visible, setIsVisible } = useSideMenu();
  const { myGroups } = useSocial();
  const slideAnim = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      onClose();
    }
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
          toValue: -MENU_WIDTH,
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

  if (!visible && slideAnim._value === -MENU_WIDTH) return null;

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
          onPress={handleClose}
        />
      </Animated.View>
      
      {/* Side Menu */}
      <Animated.View
        style={[
          styles.menuContainer,
          {
            backgroundColor: theme.card,
            width: MENU_WIDTH,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <SafeAreaView style={styles.menuContent} edges={['top', 'left', 'right']}>
          {/* Header */}
          <View style={[styles.menuHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Menu Content */}
          <View style={styles.menuBody}>
            <Text style={[styles.menuTitle, { color: theme.text }]}>Menu</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                handleClose();
                navigation.navigate('CastYourVote');
              }}
            >
              <View style={[styles.menuItemIcon, { borderColor: theme.textSecondary, borderWidth: 1 }]}>
                <Ionicons name="megaphone-outline" size={16} color={theme.text} />
              </View>
              <Text style={[styles.menuItemText, { color: theme.text }]}>Cast Your Vote</Text>
            </TouchableOpacity>

            <TouchableOpacity
              key="new-additions"
              style={styles.menuItem}
              onPress={() => {
                handleClose();
                navigation.navigate('DiscoverNewAdditions');
              }}
            >
              <View style={[styles.menuItemIcon, { borderColor: theme.textSecondary, borderWidth: 1 }]}>
                <Ionicons name="bulb-outline" size={16} color={theme.text} />
              </View>
              <Text style={[styles.menuItemText, { color: theme.text }]}>New Additions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              key="watchlist"
              style={styles.menuItem}
              onPress={() => {
                handleClose();
                navigation.navigate('Main', { screen: 'Watchlist' });
              }}
            >
              <View style={[styles.menuItemIcon, { borderColor: theme.textSecondary, borderWidth: 1 }]}>
                <Ionicons name="star-outline" size={16} color={theme.text} />
              </View>
              <Text style={[styles.menuItemText, { color: theme.text }]}>Watchlist</Text>
            </TouchableOpacity>

            {/* My Groups Section */}
            <View style={[styles.groupsSection, { borderTopColor: theme.border }]}>
              <Text style={[styles.groupsSectionTitle, { color: theme.text }]}>My Groups</Text>
              
              {myGroups.length === 0 ? (
                <React.Fragment key="no-groups">
                  <TouchableOpacity
                    key="join-group"
                    style={styles.groupItem}
                    onPress={() => {
                      handleClose();
                      navigation.navigate('Main', { screen: 'Groups' });
                    }}
                  >
                    <View style={[styles.groupItemIcon, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons name="people-outline" size={16} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.groupItemText, { color: theme.text }]}>Join a group</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    key="create-group-empty"
                    style={styles.groupItem}
                    onPress={() => {
                      handleClose();
                      navigation.navigate('CreateGroup');
                    }}
                  >
                    <View style={[styles.groupItemIcon, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.groupItemText, { color: theme.text }]}>Create a group</Text>
                  </TouchableOpacity>
                </React.Fragment>
              ) : (
                <React.Fragment key="has-groups">
                  {myGroups.map((group) => (
                    <TouchableOpacity
                      key={group.id}
                      style={styles.groupItem}
                      onPress={() => {
                        handleClose();
                        navigation.navigate('GroupDetail', { groupId: group.id });
                      }}
                    >
                      <View style={[styles.groupItemIcon, { backgroundColor: theme.primaryLight }]}>
                    <Ionicons name="people" size={16} color="#FFFFFF" />
                      </View>
                      <Text style={[styles.groupItemText, { color: theme.text }]}>{group.name}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    key="join-another"
                    style={styles.groupItem}
                    onPress={() => {
                      handleClose();
                      navigation.navigate('Main', { screen: 'Groups' });
                    }}
                  >
                    <View style={[styles.groupItemIcon, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons name="people-outline" size={16} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.groupItemText, { color: theme.text }]}>Join another group</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    key="create-group-with-groups"
                    style={styles.groupItem}
                    onPress={() => {
                      handleClose();
                      navigation.navigate('CreateGroup');
                    }}
                  >
                    <View style={[styles.groupItemIcon, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.groupItemText, { color: theme.text }]}>Create a group</Text>
                  </TouchableOpacity>
                </React.Fragment>
              )}
            </View>
          </View>

          {/* Settings Button at Bottom */}
          <View style={[styles.menuFooter, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => {
                handleClose();
                navigation.navigate('Settings');
              }}
            >
              <Ionicons name="settings-outline" size={24} color={theme.text} />
              <Text style={[styles.settingsButtonText, { color: theme.text }]}>Settings</Text>
            </TouchableOpacity>
          </View>
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
  menuContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  menuContent: {
    flex: 1,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBody: {
    flex: 1,
    padding: 16,
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  menuItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  menuItemText: {
    fontSize: 18,
    fontWeight: '500',
  },
  menuFooter: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  settingsButtonText: {
    fontSize: 18,
    fontWeight: '500',
  },
  groupsSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
  },
  groupsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  groupItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

