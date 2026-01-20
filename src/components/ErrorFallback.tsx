import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../context/ThemeContext';

interface ErrorFallbackProps {
  error?: Error;
  onRetry?: () => void;
}

// Fallback theme in case ThemeProvider is not available
const fallbackTheme: Partial<Theme> = {
  background: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  error: '#EF4444',
  primary: '#775a96',
  backgroundSecondary: '#FEF2F2',
};

export default function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  // Use theme with fallback in case ThemeProvider is not available (edge case)
  let theme: Partial<Theme>;
  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
  } catch {
    // Fallback to light theme if theme context is not available
    theme = fallbackTheme;
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: theme.backgroundSecondary || '#FEF2F2' }]}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.error || '#EF4444'} />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Something went wrong</Text>
        
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          We're sorry, but something unexpected happened. Please try again.
        </Text>

        {__DEV__ && error && (
          <View style={[styles.errorDetails, { backgroundColor: theme.backgroundSecondary || '#FEF2F2' }]}>
            <Text style={[styles.errorLabel, { color: theme.error || '#EF4444' }]}>Error Details (DEV only):</Text>
            <Text style={[styles.errorText, { color: theme.textSecondary }]} numberOfLines={5}>
              {error.message}
            </Text>
          </View>
        )}

        {onRetry && (
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: theme.primary }]} 
            onPress={onRetry}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => {
            // This will cause a re-render which should reset the error state
            if (onRetry) {
              onRetry();
            }
          }}
        >
          <Text style={[styles.homeButtonText, { color: theme.primary }]}>Go Back Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  errorDetails: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
  },
  errorLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
    width: '100%',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  homeButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

