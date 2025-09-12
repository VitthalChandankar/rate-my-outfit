import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuthStore from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import { isEmailDisposable } from '../../utils/emailValidator';

export default function SignupScreen({ navigation }) {
  const signup = useAuthStore((s) => s.signup);
  const [name, setName] = useState('');
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPasswordSecure, setIsPasswordSecure] = useState(true);
  const [isConfirmPasswordSecure, setIsConfirmPasswordSecure] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      // This runs when the screen is focused
      return () => {
        // This runs when the screen is unfocused (e.g., navigating away)
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setError('');
      };
    }, [])
  );

  const handleSignup = async () => {
    if (loading) return;
    setError('');
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields');
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

    // Block disposable emails
    if (await isEmailDisposable(email.trim())) {
      setError('Disposable email addresses are not allowed. Please use a permanent email provider like Gmail or Outlook.');
      setLoading(false);
      return;
    }

    setLoading(true);
    const res = await signup(name.trim(), email.trim(), password);
    setLoading(false);

    if (res.success) {
      navigation.navigate('EmailVerification');
    } else {
      setError(res.error?.message || 'Signup failed. The email may already be in use.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
        {/* Logo / App Name */}
        <Ionicons name="shirt" size={64} color={colors.accent} style={{ marginBottom: 16 }} />
        <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Join Rate My Outfit</Text>

        {/* Error message */}
        {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}

        {/* Name Input */}
        <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground }]}>
          <Ionicons name="person-outline" size={20} color={colors.textTertiary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Email Input */}
        <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground }]}>
          <Ionicons name="mail-outline" size={20} color={colors.textTertiary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Password Input */}
        <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground }]}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} style={{ marginRight: 8 }} />
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

        {/* Confirm Password Input */}
        <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground }]}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} style={{ marginRight: 8 }} />
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

        {/* Signup Button */}
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }, loading && { opacity: 0.7 }]} onPress={handleSignup} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.textOnAccent} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.textOnAccent }]}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.altLoginButton, { borderColor: colors.border }]} onPress={() => navigation.navigate('PhoneNumber')} disabled={loading}>
          <Text style={[styles.altLoginText, { color: colors.text }]}>Sign up with Phone Number</Text>
        </TouchableOpacity>

        {/* Login Link */}
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={[styles.loginText, { color: colors.textSecondary }]}>
            Already have an account? <Text style={{ color: colors.accent, fontWeight: '600' }}>Log in</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 50,
    width: '100%',
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  loginText: {
    fontSize: 14,
    marginTop: 8,
  },
  errorText: {
    marginBottom: 12,
    fontSize: 14,
    alignSelf: 'flex-start',
  },
  altLoginButton: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  altLoginText: {
    fontWeight: '600',
  },
});
