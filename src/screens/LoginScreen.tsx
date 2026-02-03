import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types';
import { loginWithApple, OAuthResult } from '../services/oauthService';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { login, loginWithGoogle: authLoginWithGoogle, loginWithApple: authLoginWithApple } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  const isGoogleConfigured = !!googleClientId && !googleClientId.includes('placeholder');

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: googleClientId || 'placeholder-client-id.apps.googleusercontent.com',
    iosClientId: googleClientId || 'placeholder-client-id.apps.googleusercontent.com',
    webClientId: googleClientId || 'placeholder-client-id.apps.googleusercontent.com',
  });

  // Log redirect URI in dev so you can add it to Google Cloud Console → OAuth client → Authorized redirect URIs
  React.useEffect(() => {
    if (__DEV__ && request) {
      const redirectUri = (request as { redirectUri?: string }).redirectUri ?? AuthSession.makeRedirectUri({});
      console.log('[Google OAuth] Add this redirect URI to Google Cloud Console → APIs & Services → Credentials → your OAuth client → Authorized redirect URIs:');
      console.log(redirectUri);
      console.log('[Google OAuth] If using Expo auth proxy, also add: https://auth.expo.io/@moro-systems-llc/moro-mobile');
    }
  }, [request]);

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        // Backend requires idToken for verification; accessToken is only for fetching user info
        const idToken = authentication?.idToken ?? (response as any).params?.id_token ?? undefined;
        handleGoogleLoginSuccess(authentication.accessToken, idToken);
      }
    } else if (response?.type === 'error') {
      setIsGoogleLoading(false);
      const errMsg = (response as any).error?.message ?? (response as any).params?.error_description ?? 'An error occurred during sign in.';
      Alert.alert('Google Login Failed', errMsg);
    } else if (response?.type === 'dismiss') {
      setIsGoogleLoading(false);
    }
  }, [response]);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email.trim(), password);
      setIsLoading(false);

      if (!result.success) {
        Alert.alert('Login Failed', result.error || 'Invalid email or password');
      }
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const handleGoogleLoginSuccess = async (accessToken: string, idToken?: string) => {
    try {
      // Fetch user info using the access token
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const userInfo = await userInfoResponse.json();

      // Backend requires idToken for verification; access token cannot be used
      if (!idToken) {
        Alert.alert(
          'Google Sign In',
          'Could not get a sign-in token from Google. Try again, or use a development build (Expo Go may not return an ID token in some cases).'
        );
        return;
      }

      const authResult = await authLoginWithGoogle(
        userInfo.email,
        userInfo.id,
        userInfo.name,
        userInfo.picture,
        idToken
      );

      if (!authResult.success) {
        Alert.alert('Google Login Failed', authResult.error || 'Unable to sign in with Google');
      }
    } catch (error: any) {
      Alert.alert('Google Login Failed', error?.message || 'Failed to complete sign in');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isGoogleConfigured) {
      Alert.alert(
        'Google Sign-In Not Configured',
        'Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to your .env file (from Google Cloud Console → APIs & Services → Credentials). Restart Expo after changing .env.'
      );
      return;
    }
    if (!request) {
      Alert.alert('Google Sign-In', 'Sign-in is still loading. Please wait a moment and try again.');
      return;
    }
    setIsGoogleLoading(true);
    try {
      await promptAsync();
    } catch (err: any) {
      setIsGoogleLoading(false);
      const message = err?.message || err?.error?.message || String(err);
      console.error('[Google Sign-In]', err);
      Alert.alert(
        'Google Sign-In Error',
        message || 'Could not open sign-in. Check that your Client ID and redirect URI are set in Google Cloud Console.'
      );
    }
  };

  const handleAppleLogin = async () => {
    setIsAppleLoading(true);
    try {
      const result: OAuthResult = await loginWithApple();

      if (result.success && result.user) {
        // Call AuthContext to handle the login with identity token (Apple may omit email on subsequent logins)
        const authResult = await authLoginWithApple(
          result.user.email ?? '',
          result.user.id,
          result.user.name ?? '',
          result.identityToken
        );

        if (!authResult.success) {
          Alert.alert('Apple Login Failed', authResult.error || 'Unable to sign in with Apple');
        }
      } else {
        if (result.error) {
          Alert.alert('Apple Login Failed', result.error);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsAppleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue trading confidence</Text>

            {/* Email/Password Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  textContentType="password"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleEmailLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login Buttons */}
            <View style={styles.socialContainer}>
              {/* Google Login */}
              <TouchableOpacity
                style={[
                  styles.socialButton,
                  styles.googleButton,
                  (isGoogleLoading || !request || !isGoogleConfigured) && styles.buttonDisabled,
                ]}
                onPress={handleGoogleLogin}
                disabled={isGoogleLoading || !request || !isGoogleConfigured}
              >
                {isGoogleLoading ? (
                  <ActivityIndicator color="#111827" />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={20} color="#111827" />
                    <Text style={styles.socialButtonText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Apple Login */}
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={[styles.socialButton, styles.appleButton, isAppleLoading && styles.buttonDisabled]}
                  onPress={handleAppleLogin}
                  disabled={isAppleLoading}
                >
                  {isAppleLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                      <Text style={[styles.socialButtonText, styles.appleButtonText]}>
                        Continue with Apple
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

          </View>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 16,
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#775a96',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#775a96',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#775a96',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  socialContainer: {
    gap: 12,
    marginBottom: 24,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  appleButtonText: {
    color: '#FFFFFF',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 32,
  },
  signupText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signupLink: {
    fontSize: 14,
    color: '#775a96',
    fontWeight: '600',
  },
});
