// src/screens/auth/EmailVerificationScreen.js

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sendEmailVerification } from 'firebase/auth';

import { auth } from '../../services/firebase';
import useAuthStore from '../../store/authStore';

export default function EmailVerificationScreen({ navigation }) {
  const { logout } = useAuthStore();
  const [isResending, setIsResending] = useState(false);

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

  const handleLogout = async () => {
    try {
      await logout();
      // The onAuthChange listener in authStore will now handle navigation.
    } catch (e) {
      Alert.alert('Logout Failed', 'An error occurred while logging out.');
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons name="mail-unread-outline" size={80} color="#FF5A5F" />
      <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.subtitle}>
        We've sent a verification link to <Text style={{ fontWeight: 'bold' }}>{auth.currentUser?.email}</Text>.
        Please check your inbox and click the link to continue.
      </Text>

      <ActivityIndicator style={{ marginVertical: 20 }} />
      <Text style={styles.waitingText}>Waiting for verification...</Text>

      <TouchableOpacity style={styles.button} onPress={handleResend} disabled={isResending}>
        <Text style={styles.buttonText}>{isResending ? 'Sending...' : 'Resend Email'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleLogout}>
        <Text style={styles.backText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginTop: 16, marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  waitingText: { color: '#888', fontStyle: 'italic' },
  button: {
    backgroundColor: '#F4F4F4',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginTop: 32,
  },
  buttonText: { color: '#333', fontSize: 18, fontWeight: '600' },
  backText: {
    marginTop: 20,
    color: '#666',
    fontSize: 16,
  },
});