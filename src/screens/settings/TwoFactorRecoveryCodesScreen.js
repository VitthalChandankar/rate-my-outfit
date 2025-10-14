// src/screens/settings/TwoFactorRecoveryCodesScreen.js
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Text, Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

function CodeRow({ code }) {
  return (
    <View style={styles.codeRow}>
      <Text style={styles.codeText}>{code}</Text>
    </View>
  );
}

export default function TwoFactorRecoveryCodesScreen({ route, navigation }) {
  const { recoveryCodes = [] } = route.params;

  const handleContinue = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Go back two screens to the main Settings screen
    navigation.pop(2);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Ionicons name="shield-checkmark" size={60} color="#34C759" style={{ alignSelf: 'center' }} />
      <Text style={styles.title}>2FA Enabled!</Text>
      <Text style={styles.subtitle}>
        Save these recovery codes in a safe place, like a password manager.
        If you lose your device, you will need one of these codes to log in.
      </Text>

      <Card style={styles.card}>
        <Card.Content style={styles.codesContainer}>
          {recoveryCodes.map((code, index) => (
            <CodeRow key={index} code={code} />
          ))}
        </Card.Content>
      </Card>

      <Text style={styles.warning}>
        Treat these codes like your password. They will not be shown again.
      </Text>

      <Button
        mode="contained"
        onPress={handleContinue}
        style={styles.button}
      >
        I have saved these codes
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#F9FAFB',
  },
  codesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 10,
  },
  codeRow: {
    width: '48%',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  codeText: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', letterSpacing: 1 },
  warning: { color: '#D92D20', textAlign: 'center', marginTop: 20, fontWeight: '500' },
  button: { marginTop: 24, paddingVertical: 8 },
});