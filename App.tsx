import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Context Providers
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SocialProvider } from './src/context/SocialContext';
import { TradingProvider } from './src/context/TradingContext';
import { NewsProvider } from './src/context/NewsContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { WatchlistProvider } from './src/context/WatchlistContext';

// Screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import EntityScreen from './src/screens/EntityScreen';
import GroupDetailScreen from './src/screens/GroupDetailScreen';
import FollowersListScreen from './src/screens/FollowersListScreen';
import NewsDetailScreen from './src/screens/NewsDetailScreen';
import BuyScreen from './src/screens/BuyScreen';
import SettingsScreen from './src/screens/SettingsScreen';

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
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={BottomTabNavigator} />
          <Stack.Screen name="Entity" component={EntityScreen} />
          <Stack.Screen name="BuyScreen" component={BuyScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
          <Stack.Screen name="FollowersList" component={FollowersListScreen} />
          <Stack.Screen name="NewsDetail" component={NewsDetailScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <SocialProvider>
            <NewsProvider>
              <TradingProvider>
                <WatchlistProvider>
                  <NavigationContainer>
                    <StatusBar style="auto" />
                    <RootNavigator />
                  </NavigationContainer>
                </WatchlistProvider>
              </TradingProvider>
            </NewsProvider>
          </SocialProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

