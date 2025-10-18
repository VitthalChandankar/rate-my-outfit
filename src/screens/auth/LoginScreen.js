import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import useAuthStore from '../../store/authStore';
import { Image as ExpoImage } from 'expo-image';

export default function LoginScreen({ navigation }) {
  const { login } = useAuthStore();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;
    setError('');

    if (!identifier.trim()) {
      setError('Please enter your email or phone number');
      return;
    }

    // This screen now only handles email/password. Phone login is separate.
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (identifier.includes('@')) { // Simple check for email
      setLoading(true);
      const res = await login(identifier.trim(), password);
      if (!res.success) setError(res.error?.message || 'Invalid email or password.');
      setLoading(false);
    } else {
      setError('Please enter a valid email address.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / App Name */}
        <ExpoImage source={require('../../../assets/icon.png')} style={styles.logo} />
      
        <Text style={styles.title}>Vastrayl</Text>
        <Text style={styles.subtitle}>Sign in or create an account</Text>

        {/* Error message */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Input for Email or Phone */}
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#999" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            autoCapitalize="none"
            keyboardType="email-address"
            value={identifier}
            onChangeText={setIdentifier}
            editable={!loading}
            returnKeyType="next"
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#999" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue</Text>}
        </TouchableOpacity>

        <View style={styles.linksContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} disabled={loading}>
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')} disabled={loading}>
            <Text style={styles.linkText}>Create Account</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.altLoginButton} onPress={() => navigation.navigate('PhoneNumber')} disabled={loading}>
          <Text style={styles.altLoginText}>Login with Phone OTP</Text>
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
    backgroundColor: '#fff',
    paddingVertical: 50,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#222',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
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
  errorText: {
    color: 'red',
    marginBottom: 12,
    fontSize: 14,
    alignSelf: 'flex-start',
  },
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 12,
  },
  linkText: { color: '#FF5A5F', fontWeight: '600', fontSize: 14 },
  altLoginButton: {
    marginTop: 24,
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
});
