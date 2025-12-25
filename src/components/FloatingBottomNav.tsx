import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSideMenu } from '../context/SideMenuContext';

interface FloatingBottomNavProps {
  activeTab?: string;
  onTabPress?: (tabName: string) => void;
}

export default function FloatingBottomNav({ activeTab, onTabPress }: FloatingBottomNavProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isVisible: isSideMenuVisible } = useSideMenu();

  // Hide bottom nav when side menu is visible
  if (isSideMenuVisible) {
    return null;
  }

  const handlePress = (tabName: string) => {
    if (onTabPress) {
      onTabPress(tabName);
    }
  };

  const isActive = (tabName: string) => activeTab === tabName;

  const buttonSize = 48;
  const middleButtonSize = 40;
  const gap = 6;

  return (
    <View 
      style={[
        styles.container,
        { 
          paddingBottom: Math.max(insets.bottom, 12),
          paddingHorizontal: 16,
        }
      ]}
    >
      {/* Left Circle - Search */}
      <TouchableOpacity
        style={[
          styles.circleButton,
          {
            width: buttonSize,
            height: buttonSize,
            backgroundColor: isActive('Search') ? theme.text : theme.card,
            borderWidth: 1,
            borderColor: theme.border,
          }
        ]}
        onPress={() => handlePress('Search')}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="search" 
          size={22} 
          color={isActive('Search') ? theme.card : theme.textSecondary} 
        />
      </TouchableOpacity>

      {/* Middle Oval with 4 Icons */}
      <View 
        style={[
          styles.ovalContainer,
          {
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            paddingHorizontal: 10,
            paddingVertical: 6,
            gap: gap,
          }
        ]}
      >
        {/* Home Icon */}
        <TouchableOpacity
          style={[
            styles.middleButton,
            {
              width: middleButtonSize,
              height: middleButtonSize,
              backgroundColor: isActive('Home') ? theme.text : 'transparent',
            }
          ]}
          onPress={() => handlePress('Home')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={isActive('Home') ? 'home' : 'home-outline'} 
            size={20} 
            color={isActive('Home') ? theme.card : theme.textSecondary} 
          />
        </TouchableOpacity>

        {/* Categories Icon */}
        <TouchableOpacity
          style={[
            styles.middleButton,
            {
              width: middleButtonSize,
              height: middleButtonSize,
              backgroundColor: isActive('Categories') ? theme.text : 'transparent',
            }
          ]}
          onPress={() => handlePress('Categories')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={isActive('Categories') ? 'grid' : 'grid-outline'} 
            size={20} 
            color={isActive('Categories') ? theme.card : theme.textSecondary} 
          />
        </TouchableOpacity>

        {/* People/Feeds Icon */}
        <TouchableOpacity
          style={[
            styles.middleButton,
            {
              width: middleButtonSize,
              height: middleButtonSize,
              backgroundColor: isActive('Feeds') ? theme.text : 'transparent',
            }
          ]}
          onPress={() => handlePress('Feeds')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={isActive('Feeds') ? 'people' : 'people-outline'} 
            size={20} 
            color={isActive('Feeds') ? theme.card : theme.textSecondary} 
          />
        </TouchableOpacity>

        {/* Trophy/Podium Icon */}
        <TouchableOpacity
          style={[
            styles.middleButton,
            {
              width: middleButtonSize,
              height: middleButtonSize,
              backgroundColor: isActive('SeasonalCompetition') ? theme.text : 'transparent',
            }
          ]}
          onPress={() => handlePress('SeasonalCompetition')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={isActive('SeasonalCompetition') ? 'trophy' : 'trophy-outline'} 
            size={20} 
            color={isActive('SeasonalCompetition') ? theme.card : theme.textSecondary} 
          />
        </TouchableOpacity>
      </View>

      {/* Right Circle - Profile */}
      <TouchableOpacity
        style={[
          styles.circleButton,
          {
            width: buttonSize,
            height: buttonSize,
            backgroundColor: isActive('Profile') ? theme.text : theme.card,
            borderWidth: 1,
            borderColor: theme.border,
          }
        ]}
        onPress={() => handlePress('Profile')}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={isActive('Profile') ? 'person' : 'person-outline'} 
          size={22} 
          color={isActive('Profile') ? theme.card : theme.textSecondary} 
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  circleButton: {
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  ovalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    minWidth: 200,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  middleButton: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

