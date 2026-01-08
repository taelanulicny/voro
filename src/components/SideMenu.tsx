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
            
            {/* Buy Tokens - Prominent */}
            <TouchableOpacity
              style={[styles.menuItem, styles.prominentMenuItem, { backgroundColor: theme.primary + '15' }]}
              onPress={() => {
                handleClose();
                navigation.navigate('Purchases');
              }}
            >
              <View style={[styles.menuItemIcon, { backgroundColor: theme.primary, borderWidth: 0 }]}>
                <Ionicons name="card-outline" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemText, { color: theme.text }]}>Buy Tokens</Text>
                <Text style={[styles.menuItemSubtext, { color: theme.textSecondary }]}>Purchase tokens for trading</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
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
  prominentMenuItem: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    marginHorizontal: -4,
  },
  menuItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 18,
    fontWeight: '500',
  },
  menuItemSubtext: {
    fontSize: 12,
    marginTop: 2,
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
});

