// src/screens/settings/Disable2FAScreen.js
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, TextInput, Text } from 'react-native-paper';
import useAuthStore from '../../store/authStore';
import showAlert from '../../utils/showAlert';

export default function Disable2FAScreen({ navigation }) {
  const { disable2FA } = useAuthStore();
  const [token, setToken] = useState('');
  const [disabling, setDisabling] = useState(false);

  const handleDisable = async () => {
    if (!token || token.length !== 6) {
      showAlert('Invalid Code', 'Please enter a valid 6-digit code from your authenticator app.');
      return;
    }
    setDisabling(true);
    const res = await disable2FA(token);
    setDisabling(false);
    if (res.success) {
      showAlert('2FA Disabled', 'Two-Factor Authentication has been successfully disabled.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      showAlert('Error', res.error?.message || 'Could not disable 2FA. The code may be incorrect.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Disable 2FA</Text>
      <Text style={styles.info}>
        To confirm, please enter the 6-digit code from your authenticator app. This will remove 2FA from your account.
      </Text>
      <TextInput
        label="Verification Code"
        value={token}
        onChangeText={setToken}
        keyboardType="number-pad"
        maxLength={6}
        style={styles.input}
        mode="outlined"
      />
      <Button
        mode="contained"
        onPress={handleDisable}
        loading={disabling}
        disabled={disabling || !token}
        style={styles.button}
        buttonColor="#D92D20" // Red for destructive action
      >
        Confirm & Disable
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
});