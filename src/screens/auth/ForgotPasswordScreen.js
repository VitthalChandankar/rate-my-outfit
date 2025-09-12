// src/screens/auth/ForgotPasswordScreen.js

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { sendResetEmail } from '../../services/firebase';

export default function ForgotPasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendLink = async () => {
    if (loading || !email.trim()) return;
    setError('');
    setLoading(true);

    try {
      // We always show a success message to prevent user enumeration.
      // The actual email is only sent if the user exists.
      await sendResetEmail(email.trim());
      Alert.alert(
        'Check Your Email',
        `If an account exists for ${email}, you will receive a password reset link.`,
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (e) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Enter your email address and we'll send you a link to get back into your account.</Text>

      {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}

      <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground }]}>
        <Ionicons name="mail-outline" size={20} color={colors.textTertiary} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
          onSubmitEditing={handleSendLink}
        />
      </View>

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }, loading && { opacity: 0.7 }]} onPress={handleSendLink} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.textOnAccent} /> : <Text style={[styles.buttonText, { color: colors.textOnAccent }]}>Send Reset Link</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  backButton: { position: 'absolute', top: 60, left: 24 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, marginBottom: 32, textAlign: 'center' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 50,
    width: '100%',
  },
  input: { flex: 1, fontSize: 16 },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: { fontSize: 18, fontWeight: '600' },
  errorText: {
    marginBottom: 12,
    fontSize: 14,
    textAlign: 'center',
  },
});