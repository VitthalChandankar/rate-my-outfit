// src/screens/settings/Enable2FAScreen.js
import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Button, TextInput, Text } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import useAuthStore from '../../store/authStore';
import showAlert from '../../utils/showAlert';

export default function Enable2FAScreen({ navigation }) {
  const { generate2FASecret, verifyAndEnable2FA } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [token, setToken] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const fetchSecret = async () => {
      setLoading(true);
      const res = await generate2FASecret();
      if (res.success && res.otpauthUrl) {
        setQrCodeUrl(res.otpauthUrl);
      } else {
        showAlert('Error', 'Could not generate a 2FA secret. Please try again.');
        navigation.goBack();
      }
      setLoading(false);
    };
    fetchSecret();
  }, [generate2FASecret, navigation]);

  const handleVerify = async () => {
    if (!token || token.length !== 6) {
      showAlert('Invalid Code', 'Please enter the 6-digit code from your authenticator app.');
      return;
    }
    setVerifying(true);
    const res = await verifyAndEnable2FA(token);
    setVerifying(false);
    if (res.success) {
      // Navigate to the recovery codes screen on success
      navigation.replace('TwoFactorRecoveryCodes', {
        recoveryCodes: res.recoveryCodes,
      });
    } else {
      showAlert('Verification Failed', res.error?.message || 'The code was incorrect. Please try again.');
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Set Up 2FA</Text>
      <Text style={styles.step}>1. Scan this QR code with an authenticator app (e.g., Google Authenticator, Authy).</Text>
      <View style={styles.qrContainer}>
        {qrCodeUrl ? (
          <QRCode value={qrCodeUrl} size={250} backgroundColor="white" color="black" />
        ) : (
          <ActivityIndicator />
        )}
      </View>
      <Text style={styles.step}>2. Enter the 6-digit code from your app to complete the setup.</Text>
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
        onPress={handleVerify}
        loading={verifying}
        disabled={verifying || !token}
        style={styles.button}
      >
        Verify & Enable
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  contentContainer: { padding: 20, alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  step: { fontSize: 16, color: '#333', textAlign: 'center', marginBottom: 16, lineHeight: 22 },
  qrContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  input: {
    width: '100%',
    marginBottom: 16,
  },
  button: {
    width: '100%',
    paddingVertical: 8,
  },
});