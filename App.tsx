import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Error Boundary
import ErrorBoundary from './src/components/ErrorBoundary';

// Error Reporting
import { initErrorReporting } from './src/services/errorReporting';

// Context Providers
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SocialProvider } from './src/context/SocialContext';
import { TradingProvider } from './src/context/TradingContext';
import { NewsProvider } from './src/context/NewsContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { WatchlistProvider } from './src/context/WatchlistContext';
import { SideMenuProvider } from './src/context/SideMenuContext';
import { NotificationsProvider } from './src/context/NotificationsContext';

// Screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import EntityScreen from './src/screens/EntityScreen';
import GroupDetailScreen from './src/screens/GroupDetailScreen';
import FollowersListScreen from './src/screens/FollowersListScreen';
import NewsDetailScreen from './src/screens/NewsDetailScreen';
import NewsFeedScreen from './src/screens/NewsFeedScreen';
import SearchScreen from './src/screens/SearchScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CategoryScreen from './src/screens/CategoryScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import DiscoverNewAdditionsScreen from './src/screens/DiscoverNewAdditionsScreen';
import AccountValueScreen from './src/screens/AccountValueScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';

import { RootStackParamList } from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Welcome">
            {() => (
              <ErrorBoundary>
                <WelcomeScreen />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen name="Login">
            {() => (
              <ErrorBoundary>
                <LoginScreen />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen name="Signup">
            {() => (
              <ErrorBoundary>
                <SignupScreen />
              </ErrorBoundary>
            )}
          </Stack.Screen>
        </>
      ) : (
        <>
          <Stack.Screen name="Main">
            {() => (
              <ErrorBoundary>
                <BottomTabNavigator />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen name="Entity">
            {(props) => (
              <ErrorBoundary>
                <EntityScreen {...props} />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen name="Category">
            {(props) => (
              <ErrorBoundary>
                <CategoryScreen {...props} />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="Search" 
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          >
            {() => (
              <ErrorBoundary>
                <SearchScreen />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="Settings" 
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
              headerShown: false,
            }}
          >
            {() => (
              <ErrorBoundary>
                <SettingsScreen />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen name="GroupDetail">
            {(props) => (
              <ErrorBoundary>
                <GroupDetailScreen {...props} />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen name="FollowersList">
            {(props) => (
              <ErrorBoundary>
                <FollowersListScreen {...props} />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen name="NewsDetail">
            {(props) => (
              <ErrorBoundary>
                <NewsDetailScreen {...props} />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen name="NewsFeed">
            {() => (
              <ErrorBoundary>
                <NewsFeedScreen />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="Notifications" 
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          >
            {() => (
              <ErrorBoundary>
                <NotificationsScreen />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="DiscoverNewAdditions" 
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          >
            {() => (
              <ErrorBoundary>
                <DiscoverNewAdditionsScreen />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="AccountValue" 
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          >
            {() => (
              <ErrorBoundary>
                <AccountValueScreen />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="EditProfile" 
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          >
            {() => (
              <ErrorBoundary>
                <EditProfileScreen />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="UserProfile" 
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          >
            {(props) => (
              <ErrorBoundary>
                <UserProfileScreen {...props} />
              </ErrorBoundary>
            )}
          </Stack.Screen>
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  // Initialize error reporting on app startup
  React.useEffect(() => {
    initErrorReporting();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <SocialProvider>
              <NewsProvider>
                <TradingProvider>
                  <WatchlistProvider>
                    <NotificationsProvider>
                      <SideMenuProvider>
                        <NavigationContainer>
                          <StatusBar style="auto" />
                          <RootNavigator />
                        </NavigationContainer>
                      </SideMenuProvider>
                    </NotificationsProvider>
                  </WatchlistProvider>
                </TradingProvider>
              </NewsProvider>
            </SocialProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

