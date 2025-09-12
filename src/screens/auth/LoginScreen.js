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
import { useTheme } from '../../theme/ThemeContext';
import useAuthStore from '../../store/authStore';

export default function LoginScreen({ navigation }) {
  const { login } = useAuthStore();
  const { colors } = useTheme();
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
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / App Name */}
        <Ionicons name="shirt" size={64} color={colors.accent} style={{ marginBottom: 16 }} />
       
        <Text style={[styles.title, { color: colors.text }]}>Rate My Outfit</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sign in or create an account</Text>

        {/* Error message */}
        {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}

        {/* Input for Email or Phone */}
        <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground }]}>
          <Ionicons name="mail-outline" size={20} color={colors.textTertiary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Email"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            keyboardType="email-address"
            value={identifier}
            onChangeText={setIdentifier}
            editable={!loading}
            returnKeyType="next"
          />
        </View>

        {/* Password Input */}
        <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground }]}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Password"
            placeholderTextColor={colors.textTertiary}
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
          style={[styles.button, { backgroundColor: colors.accent }, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? <ActivityIndicator color={colors.textOnAccent} /> : <Text style={[styles.buttonText, { color: colors.textOnAccent }]}>Continue</Text>}
        </TouchableOpacity>

        <View style={styles.linksContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} disabled={loading}>
            <Text style={[styles.linkText, { color: colors.accent }]}>Forgot Password?</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')} disabled={loading}>
            <Text style={[styles.linkText, { color: colors.accent }]}>Create Account</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.altLoginButton, { borderColor: colors.border }]} onPress={() => navigation.navigate('PhoneNumber')} disabled={loading}>
          <Text style={[styles.altLoginText, { color: colors.text }]}>Login with Phone OTP</Text>
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
  errorText: {
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
  linkText: { fontWeight: '600', fontSize: 14 },
  altLoginButton: {
    marginTop: 24,
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
