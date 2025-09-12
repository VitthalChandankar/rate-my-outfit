// src/screens/auth/EmailVerificationScreen.js

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sendEmailVerification } from 'firebase/auth';

import { useTheme } from '../../theme/ThemeContext';
import { auth } from '../../services/firebase';
import useAuthStore from '../../store/authStore';

export default function EmailVerificationScreen({ navigation }) {
  const { logout } = useAuthStore();
  const { colors } = useTheme();
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      const user = auth.currentUser;
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          // The onAuthChange listener in AppNavigator will handle navigation.
          // We don't need to navigate from here.
          clearInterval(interval);
        }
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, []);

  const handleResend = async () => {
    if (isResending) return;
    setIsResending(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await sendEmailVerification(user);
        Alert.alert('Email Sent', 'A new verification link has been sent to your email.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to resend verification email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Ionicons name="mail-unread-outline" size={80} color={colors.accent} />
      <Text style={[styles.title, { color: colors.text }]}>Verify Your Email</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        We've sent a verification link to <Text style={{ fontWeight: 'bold' }}>{auth.currentUser?.email}</Text>.
        Please check your inbox and click the link to continue.
      </Text>

      <ActivityIndicator style={{ marginVertical: 20 }} />
      <Text style={[styles.waitingText, { color: colors.textTertiary }]}>Waiting for verification...</Text>

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.inputBackground }]} onPress={handleResend} disabled={isResending}>
        <Text style={[styles.buttonText, { color: colors.text }]}>{isResending ? 'Sending...' : 'Resend Email'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={async () => {
          try {
            await logout(); // Await the logout process
          } catch (e) { Alert.alert('Logout Failed', 'Please try again.'); }
        }}>
        <Text style={[styles.backText, { color: colors.textSecondary }]}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginTop: 16, marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  waitingText: { fontStyle: 'italic' },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginTop: 32,
  },
  buttonText: { fontSize: 18, fontWeight: '600' },
  backText: {
    marginTop: 20,
    fontSize: 16,
  },
});