import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Alert, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useFonts, PlayfairDisplay_400Regular } from '@expo-google-fonts/playfair-display';
import { Image as ExpoImage } from 'expo-image';
import useAuthStore from '../../store/authStore';
import { isEmailDisposable } from '../../utils/emailValidator';

export default function SignupScreen({ navigation }) {
  const signup = useAuthStore((s) => s.signup);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPasswordSecure, setIsPasswordSecure] = useState(true);
  const [isConfirmPasswordSecure, setIsConfirmPasswordSecure] = useState(true);

  const [fontsLoaded] = useFonts({ PlayfairDisplay_400Regular });

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
      style={{ flex: 1, backgroundColor: '#fff' }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Logo / App Name */}
        <ExpoImage source={require('../../../assets/icon.png')} style={styles.logo} />
        <Text style={[styles.title, { fontFamily: fontsLoaded ? 'PlayfairDisplay_400Regular' : undefined }]}>Join Vastrayl</Text>

        {/* Error message */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Name Input */}
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color="#888" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#888" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#888" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry={isPasswordSecure}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setIsPasswordSecure(!isPasswordSecure)}>
            <Ionicons name={isPasswordSecure ? 'eye-off' : 'eye'} size={24} color="#888" />
          </TouchableOpacity>
        </View>

        {/* Confirm Password Input */}
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#888" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            secureTextEntry={isConfirmPasswordSecure}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity onPress={() => setIsConfirmPasswordSecure(!isConfirmPasswordSecure)}>
            <Ionicons name={isConfirmPasswordSecure ? 'eye-off' : 'eye'} size={24} color="#888" />
          </TouchableOpacity>
        </View>

        {/* Signup Button */}
        <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleSignup} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.altLoginButton} onPress={() => navigation.navigate('PhoneNumber')} disabled={loading}>
          <Text style={styles.altLoginText}>Sign up with Phone Number</Text>
        </TouchableOpacity>

        {/* Login Link */}
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginText}>
            Already have an account? <Text style={{ color: '#FF5A5F', fontWeight: '600' }}>Log in</Text>
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By signing up, you agree to our{' '}
            <Text style={styles.footerLink} onPress={() => navigation.navigate('TermsOfService')}>
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text style={styles.footerLink} onPress={() => navigation.navigate('PrivacyPolicy')}>
              Privacy Policy
            </Text>
            .
          </Text>
        </View>

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
    backgroundColor: '#fff',
    paddingVertical: 50,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 50,
    width: '100%',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#FF5A5F',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loginText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  errorText: {
    color: 'red',
    marginBottom: 12,
    fontSize: 14,
    alignSelf: 'flex-start',
  },
  altLoginButton: {
    marginTop: 16,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  altLoginText: {
    color: '#333',
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  footerText: {
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: '#9CA3AF',
    textDecorationLine: 'underline',
  },
});
