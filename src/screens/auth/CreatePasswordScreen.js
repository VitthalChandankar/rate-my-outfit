// src/screens/auth/CreatePasswordScreen.js

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updatePassword } from 'firebase/auth';

import { useTheme } from '../../theme/ThemeContext';
import { auth } from '../../services/firebase';

export default function CreatePasswordScreen({ navigation }) {
  const [password, setPassword] = useState('');
  const { colors } = useTheme();
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordSecure, setIsPasswordSecure] = useState(true);
  const [isConfirmPasswordSecure, setIsConfirmPasswordSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSetPassword = async () => {
    if (loading) return;
    setError('');

    if (!password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user found.');

      await updatePassword(user, password);
      Alert.alert('Success', 'Your password has been set. Please complete your profile.');
      // The onAuthChange listener in AppNavigator will now take them to CompleteProfileScreen
    } catch (e) {
      setError(e.message || 'Failed to set password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Create a Password</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Secure your new account with a password.</Text>

      {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}

      <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground }]}>
        <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Password"
          secureTextEntry={isPasswordSecure}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setIsPasswordSecure(!isPasswordSecure)}>
          <Ionicons name={isPasswordSecure ? 'eye-off' : 'eye'} size={24} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground }]}>
        <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Confirm Password"
          secureTextEntry={isConfirmPasswordSecure}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <TouchableOpacity onPress={() => setIsConfirmPasswordSecure(!isConfirmPasswordSecure)}>
          <Ionicons name={isConfirmPasswordSecure ? 'eye-off' : 'eye'} size={24} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }, loading && { opacity: 0.7 }]} onPress={handleSetPassword} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.textOnAccent} /> : <Text style={[styles.buttonText, { color: colors.textOnAccent }]}>Set Password & Continue</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 32 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 50,
  },
  input: { flex: 1, fontSize: 16, marginLeft: 8 },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: { fontSize: 18, fontWeight: '600' },
  errorText: {
    marginBottom: 12,
    textAlign: 'center',
  },
});