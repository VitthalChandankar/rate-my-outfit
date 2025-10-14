// src/screens/auth/Verify2FALoginScreen.js
import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Button, TextInput, Text } from 'react-native-paper';
import useAuthStore from '../../store/authStore';
import showAlert from '../../utils/showAlert';

export default function Verify2FALoginScreen() {
  const { verify2FALogin, logout } = useAuthStore();
  const [token, setToken] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (!token || token.length !== 6) {
      showAlert('Invalid Code', 'Please enter the 6-digit code from your authenticator app.');
      return;
    }
    setVerifying(true);
    const res = await verify2FALogin(token);
    // On success, the authStep in the store will change and AppNavigator will redirect.
    if (!res.success) {
      setVerifying(false);
      showAlert('Verification Failed', res.error?.message || 'The code was incorrect. Please try again.');
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Two-Factor Authentication</Text>
      <Text style={styles.info}>Enter the 6-digit code from your authenticator app to complete your login.</Text>
      <TextInput
        label="Verification Code"
        value={token}
        onChangeText={setToken}
        keyboardType="number-pad"
        maxLength={6}
        style={styles.input}
        mode="outlined"
        autoFocus={true}
      />
      <Button
        mode="contained"
        onPress={handleVerify}
        loading={verifying}
        disabled={verifying || !token}
        style={styles.button}
      >
        Verify
      </Button>
      <Button
        mode="text"
        onPress={handleLogout}
        disabled={verifying}
        style={styles.logoutButton}
      >
        Cancel and Log Out
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  info: { fontSize: 16, color: '#333', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  input: {
    width: '100%',
    marginBottom: 16,
  },
  button: {
    width: '100%',
    paddingVertical: 8,
  },
  logoutButton: {
    marginTop: 16,
  },
});