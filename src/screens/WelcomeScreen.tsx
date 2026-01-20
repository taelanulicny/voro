import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { skipAuth } = useAuth();

  const handleSkipAuth = async () => {
    await skipAuth();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Moro</Text>
        <Text style={styles.subtitle}>
          Trade, compete, and connect with other traders
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.primaryButtonText}>Log In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={styles.secondaryButtonText}>Sign Up</Text>
        </TouchableOpacity>
      </View>

      {/* DEV ONLY - Skip Sign In Button */}
      <View style={styles.bottomButtonsContainer}>
        <TouchableOpacity 
          style={styles.skipButton}
          onPress={handleSkipAuth}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.chartDevButton}
          onPress={() => navigation.navigate('ChartDevelopment')}
        >
          <Text style={styles.chartDevButtonText}>Chart Development</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#775a96',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    borderWidth: 2,
    borderColor: '#775a96',
  },
  secondaryButtonText: {
    color: '#775a96',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // DEV ONLY
  bottomButtonsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
    zIndex: 999,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EF4444',
    borderRadius: 6,
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  chartDevButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#775a96',
    borderRadius: 6,
  },
  chartDevButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});

