import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import VideoSplashScreen from './src/components/VideoSplashScreen';
import PushNotificationManager from './src/components/PushNotificationManager';
import TradeErrorModal from './src/components/TradeErrorModal';
import { initializeFeatureFlags } from './src/config/featureFlags';
import { initializeSentry } from './src/config/sentry';

// Context Providers
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SocialProvider } from './src/context/SocialContext';
import { TradingProvider } from './src/context/TradingContext';
import { NewsProvider } from './src/context/NewsContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { WatchlistProvider } from './src/context/WatchlistContext';
import { SideMenuProvider } from './src/context/SideMenuContext';
import { FeatureFlagsProvider } from './src/context/FeatureFlagsContext';

// Screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import EntityScreen from './src/screens/EntityScreen';
import GroupDetailScreen from './src/screens/GroupDetailScreen';
import RecommendedGroupsScreen from './src/screens/RecommendedGroupsScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import FollowersListScreen from './src/screens/FollowersListScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import NewsDetailScreen from './src/screens/NewsDetailScreen';
import NewsFeedScreen from './src/screens/NewsFeedScreen';
import SearchScreen from './src/screens/SearchScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CategoryScreen from './src/screens/CategoryScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import DiscoverNewAdditionsScreen from './src/screens/DiscoverNewAdditionsScreen';
import AccountValueScreen from './src/screens/AccountValueScreen';
import TradeHistoryScreen from './src/screens/TradeHistoryScreen';
import CreateAlertScreen from './src/screens/CreateAlertScreen';
import CommentRepliesScreen from './src/screens/CommentRepliesScreen';
import AllCommentsScreen from './src/screens/AllCommentsScreen';
import CastYourVoteScreen from './src/screens/CastYourVoteScreen';
import SimulatorScreen from './src/screens/SimulatorScreen';
import SecurityScreen from './src/screens/SecurityScreen';
import EmailScreen from './src/screens/EmailScreen';
import HelpCenterScreen from './src/screens/HelpCenterScreen';
import ContactSupportScreen from './src/screens/ContactSupportScreen';
import LegalDocumentScreen from './src/screens/LegalDocumentScreen';
import AboutScreen from './src/screens/AboutScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import CompleteProfileModal from './src/components/CompleteProfileModal';
import TradingPreferencesScreen from './src/screens/TradingPreferencesScreen';
import PrivacySettingsScreen from './src/screens/PrivacySettingsScreen';
import BlockedUsersScreen from './src/screens/BlockedUsersScreen';

import { RootStackParamList } from './src/types';
import * as Linking from 'expo-linking';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Deep Linking Configuration
const linking = {
  prefixes: [
    'moro://',
    'https://moro.app',
    'https://*.moro.app',
  ],
  config: {
    screens: {
      Welcome: 'welcome',
      Login: 'login',
      Signup: 'signup',
      Main: {
        path: 'main',
        screens: {
          Home: 'home',
          News: 'news',
          Community: 'community',
          Groups: 'groups',
          Portfolio: 'portfolio',
          Watchlist: 'watchlist',
          Categories: 'discover',
          SeasonalCompetition: 'competition',
          Profile: 'profile',
        },
      },
      Entity: {
        path: 'entity/:entityId',
        parse: {
          entityId: (entityId: string) => Number(entityId),
        },
      },
      Category: 'category/:categoryId',
      GroupDetail: 'group/:groupId',
      UserProfile: 'user/:userId',
      NewsDetail: 'news/:articleId',
      NewsFeed: 'news-feed',
      Search: 'search',
      Settings: 'settings',
      Notifications: 'notifications',
      DiscoverNewAdditions: 'discover/new',
      AccountValue: 'account/value',
      TradeHistory: 'account/history',
      CreateAlert: 'alert/create',
      CommentReplies: 'post/:postId/comment/:commentId/replies',
      AllComments: 'post/:postId/comments',
      EditProfile: 'settings/edit-profile',
      TradingPreferences: 'settings/trading',
      PrivacySettings: 'settings/privacy',
      BlockedUsers: 'settings/blocked',
      Security: 'settings/security',
      Email: 'settings/email',
      HelpCenter: 'help',
      ContactSupport: 'support',
      Legal: 'legal/:documentType',
      About: 'about',
    },
  },
};

function RootNavigator() {
  const { isAuthenticated, isLoading, needsProfileCompletion } = useAuth();

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <>
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
          <Stack.Screen name="Category" component={CategoryScreen} />
          <Stack.Screen 
            name="Search" 
            component={SearchScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
              headerShown: false,
            }}
          />
          <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
          <Stack.Screen 
            name="RecommendedGroups" 
            component={RecommendedGroupsScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen 
            name="CreateGroup" 
            component={CreateGroupScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen name="FollowersList" component={FollowersListScreen} />
          <Stack.Screen 
            name="UserProfile" 
            component={UserProfileScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen name="NewsDetail" component={NewsDetailScreen} />
          <Stack.Screen name="NewsFeed" component={NewsFeedScreen} />
          <Stack.Screen 
            name="Notifications" 
            component={NotificationsScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen 
            name="DiscoverNewAdditions" 
            component={DiscoverNewAdditionsScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen 
            name="AccountValue" 
            component={AccountValueScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen 
            name="TradeHistory" 
            component={TradeHistoryScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen 
            name="CreateAlert" 
            component={CreateAlertScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="CommentReplies"
            component={CommentRepliesScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="AllComments"
            component={AllCommentsScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="CastYourVote"
            component={CastYourVoteScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="Simulator"
            component={SimulatorScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="Security"
            component={SecurityScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="Email"
            component={EmailScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="HelpCenter"
            component={HelpCenterScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="ContactSupport"
            component={ContactSupportScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="Legal"
            component={LegalDocumentScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="About"
            component={AboutScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="TradingPreferences"
            component={TradingPreferencesScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="PrivacySettings"
            component={PrivacySettingsScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="BlockedUsers"
            component={BlockedUsersScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
        </>
      )}
    </Stack.Navigator>
    {isAuthenticated && needsProfileCompletion && <CompleteProfileModal />}
    </>
  );
}

export default function App() {
  const [videoFinished, setVideoFinished] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  // Initialize app systems
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize crash reporting (must be first)
        await initializeSentry();

        // Initialize feature flags
        await initializeFeatureFlags();

        // Add other initializations here (analytics, etc.)

        setAppReady(true);
      } catch (error) {
        console.error('Error initializing app:', error);
        // Still allow app to start even if initialization fails
        setAppReady(true);
      }
    };

    if (videoFinished) {
      initializeApp();
    }
  }, [videoFinished]);

  if (!videoFinished) {
    return (
      <VideoSplashScreen
        videoSource={require('./assets/moro-load-in.mp4')}
        onFinish={() => setVideoFinished(true)}
        skippable={true}
      />
    );
  }

  if (!appReady) {
    return null; // Or a simple loading screen
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <FeatureFlagsProvider>
          <AuthProvider>
            <SocialProvider>
              <NewsProvider>
                <TradingProvider>
                  <TradeErrorModal />
                  <WatchlistProvider>
                    <SideMenuProvider>
                    <NavigationContainer ref={navigationRef} linking={linking}>
                      <PushNotificationManager navigationRef={navigationRef} />
                      <StatusBar style="auto" />
                      <RootNavigator />
                    </NavigationContainer>
                    </SideMenuProvider>
                  </WatchlistProvider>
                </TradingProvider>
              </NewsProvider>
            </SocialProvider>
          </AuthProvider>
        </FeatureFlagsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

