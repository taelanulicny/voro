import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function SessionTimeoutWarning() {
  const { theme } = useTheme();
  const { showSessionTimeoutWarning, dismissSessionTimeoutWarning, tryRefreshToken } = useAuth();

  const handleStayLoggedIn = async () => {
    // Try to refresh token
    await tryRefreshToken();
    dismissSessionTimeoutWarning();
  };

  if (!showSessionTimeoutWarning) {
    return null;
  }

  return (
    <Modal
      visible={showSessionTimeoutWarning}
      transparent
      animationType="fade"
      onRequestClose={dismissSessionTimeoutWarning}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="time-outline" size={32} color="#F59E0B" />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>Session Expiring Soon</Text>
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            Your session will expire in a few minutes. Would you like to stay logged in?
          </Text>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.buttonSecondary, { borderColor: theme.border }]}
              onPress={dismissSessionTimeoutWarning}
            >
              <Text style={[styles.buttonTextSecondary, { color: theme.textSecondary }]}>
                Dismiss
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.buttonPrimary, { backgroundColor: theme.primary }]}
              onPress={handleStayLoggedIn}
            >
              <Text style={styles.buttonTextPrimary}>Stay Logged In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  buttonPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
  },
});

