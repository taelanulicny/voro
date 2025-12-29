import React, { useState, createContext, useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList, RootStackParamList } from '../types';
import FloatingBottomNav from '../components/FloatingBottomNav';
import ErrorBoundary from '../components/ErrorBoundary';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import NewsScreen from '../screens/NewsScreen';
import FeedsScreen from '../screens/FeedsScreen';
import GroupsScreen from '../screens/GroupsScreen';
import PortfolioScreen from '../screens/PortfolioScreen';
import WatchlistScreen from '../screens/WatchlistScreen';
import AllCategoriesScreen from '../screens/AllCategoriesScreen';
import SeasonalCompetitionScreen from '../screens/SeasonalCompetitionScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Context to share navigation
const TabNavigationContext = createContext<{
  navigate: (route: keyof MainTabParamList) => void;
  setActiveTab: (tab: string) => void;
} | null>(null);

// Wrapper component that has access to tab navigation
function FloatingNavWrapper({ activeTab }: { activeTab: string }) {
  const context = useContext(TabNavigationContext);
  const navigation = useNavigation();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const handleTabPress = (tabName: string) => {
    // Map tab names to navigation routes
    const routeMap: Record<string, keyof MainTabParamList | 'Search' | null> = {
      'Search': 'Search', // Links to search screen
      'Home': 'Home',
      'Portfolio': 'Portfolio',
      'Watchlist': 'Watchlist',
      'Categories': 'Categories', // Links to all categories screen
      'Feeds': 'Feeds', // Links to feeds screen
      'SeasonalCompetition': 'SeasonalCompetition', // Links to seasonal competition screen
      'Profile': 'Profile',
    };
    
    const route = routeMap[tabName];
    if (route) {
      if (route === 'Search') {
        // Navigate to Search using root navigation
        rootNavigation.navigate('Search');
      } else {
        // Get the tab navigator from parent
        const tabNavigator = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();
        
        if (tabNavigator) {
          // Use the tab navigator directly
          tabNavigator.navigate(route as keyof MainTabParamList);
          if (context) {
            context.setActiveTab(route);
          }
        } else if (context && context.navigate) {
          // Fallback to context navigation
          context.navigate(route as keyof MainTabParamList);
          context.setActiveTab(route);
        } else {
          // Last resort: try direct navigation
          try {
            (navigation as any).navigate(route);
            if (context) {
              context.setActiveTab(route);
            }
          } catch (error) {
            console.error('Navigation error:', error);
          }
        }
      }
    }
  };

  return (
    <FloatingBottomNav 
      activeTab={activeTab}
      onTabPress={handleTabPress}
    />
  );
}


export default function BottomTabNavigator() {
  const [activeTab, setActiveTab] = useState<string>('Home');
  const [tabNavigation, setTabNavigation] = useState<BottomTabNavigationProp<MainTabParamList> | null>(null);
  
  const navigate = (route: keyof MainTabParamList) => {
    if (tabNavigation) {
      tabNavigation.navigate(route);
    }
  };
  
  return (
    <TabNavigationContext.Provider value={{ navigate, setActiveTab }}>
      <View style={styles.container}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' }, // Hide default tab bar
          }}
          screenListeners={{
            state: (e) => {
              // Update active tab when navigation state changes
              const state = e.data.state;
              if (state && state.routes && state.routes[state.index]) {
                setActiveTab(state.routes[state.index].name);
              }
            },
          }}
        >
          <Tab.Screen name="Home">
            {() => {
              const nav = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
              React.useEffect(() => {
                setTabNavigation(nav);
              }, [nav]);
              return (
                <ErrorBoundary>
                  <HomeScreen />
                </ErrorBoundary>
              );
            }}
          </Tab.Screen>
          <Tab.Screen name="News">
            {() => (
              <ErrorBoundary>
                <NewsScreen />
              </ErrorBoundary>
            )}
          </Tab.Screen>
          <Tab.Screen name="Feeds">
            {() => {
              const nav = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
              React.useEffect(() => {
                setTabNavigation(nav);
              }, [nav]);
              return (
                <ErrorBoundary>
                  <FeedsScreen />
                </ErrorBoundary>
              );
            }}
          </Tab.Screen>
          <Tab.Screen name="Groups">
            {() => (
              <ErrorBoundary>
                <GroupsScreen />
              </ErrorBoundary>
            )}
          </Tab.Screen>
          <Tab.Screen name="Portfolio">
            {() => (
              <ErrorBoundary>
                <PortfolioScreen />
              </ErrorBoundary>
            )}
          </Tab.Screen>
          <Tab.Screen name="Watchlist">
            {() => (
              <ErrorBoundary>
                <WatchlistScreen />
              </ErrorBoundary>
            )}
          </Tab.Screen>
          <Tab.Screen name="Categories">
            {() => (
              <ErrorBoundary>
                <AllCategoriesScreen />
              </ErrorBoundary>
            )}
          </Tab.Screen>
          <Tab.Screen name="SeasonalCompetition">
            {() => (
              <ErrorBoundary>
                <SeasonalCompetitionScreen />
              </ErrorBoundary>
            )}
          </Tab.Screen>
          <Tab.Screen name="Profile">
            {() => (
              <ErrorBoundary>
                <ProfileScreen />
              </ErrorBoundary>
            )}
          </Tab.Screen>
        </Tab.Navigator>
        
        <FloatingNavWrapper activeTab={activeTab} />
      </View>
    </TabNavigationContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

