// src/screens/contests/ShippingDetailsScreen.js
import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuthStore from '../../store/authStore';
import { fbSaveShippingDetails } from '../../services/firebase';

export default function ShippingDetailsScreen({ route, navigation }) {
  const { contestId, prize } = route.params;
  const { user } = useAuthStore();

  const [fullName, setFullName] = useState(user?.name || '');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState(user?.country || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!fullName || !address1 || !city || !state || !postalCode || !country || !phone) {
      Alert.alert('Missing Information', 'Please fill out all required fields.');
      return;
    }

    setLoading(true);
    const details = {
      fullName,
      address1,
      address2,
      city,
      state,
      postalCode,
      country,
      phone,
    };

    const res = await fbSaveShippingDetails({ contestId, userId: user.uid, details });
    setLoading(false);

    if (res.success) {
      Alert.alert(
        'Details Submitted!',
        'Thank you! We have received your shipping information and will process your prize shortly.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else {
      Alert.alert('Error', res.error?.message || 'Could not save your details. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Congratulations!</Text>
        <Text style={styles.subtitle}>You've won: {prize}. Please provide your shipping details below to claim your prize.</Text>

        <TextInput label="Full Name" value={fullName} onChangeText={setFullName} mode="outlined" style={styles.input} />
        <TextInput label="Phone Number" value={phone} onChangeText={setPhone} mode="outlined" style={styles.input} keyboardType="phone-pad" />
        <TextInput label="Address Line 1" value={address1} onChangeText={setAddress1} mode="outlined" style={styles.input} />
        <TextInput label="Address Line 2 (Optional)" value={address2} onChangeText={setAddress2} mode="outlined" style={styles.input} />
        <TextInput label="City" value={city} onChangeText={setCity} mode="outlined" style={styles.input} />
        <TextInput label="State / Province" value={state} onChangeText={setState} mode="outlined" style={styles.input} />
        <TextInput label="Postal Code" value={postalCode} onChangeText={setPostalCode} mode="outlined" style={styles.input} />
        <TextInput label="Country" value={country} onChangeText={setCountry} mode="outlined" style={styles.input} />

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          Submit Details
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 16,
    paddingVertical: 8,
  },
});