// src/screens/auth/PhoneNumberScreen.js

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { auth, createUser } from '../../services/firebase'; // Assuming auth is exported from firebase.js

export default function PhoneNumberScreen({ route, navigation }) {
  const initialPhoneNumber = route.params?.phoneNumber || '';
  const recaptchaVerifier = useRef(null);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const otpInputRef = useRef(null);
  const [verificationId, setVerificationId] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Automatically trigger OTP sending when the screen loads with a phone number
  useEffect(() => {
    if (initialPhoneNumber && !verificationId) {
      sendVerificationCode();
    }
  }, [initialPhoneNumber]);

  const sendVerificationCode = async () => {
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const phoneProvider = new PhoneAuthProvider(auth);
      const verId = await phoneProvider.verifyPhoneNumber(
        `+91${phoneNumber}`, // Assuming Indian country code for now. A country picker would be a good addition.
        recaptchaVerifier.current
      );
      setVerificationId(verId);
      Alert.alert('OTP Sent!', 'Please check your messages for the verification code.');
      setTimeout(() => otpInputRef.current?.focus(), 500);
    } catch (e) {
      setError(e.message || 'Failed to send OTP. Please check the number and try again.');
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async () => {
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
      const result = await signInWithCredential(auth, credential);
      const user = result.user;

      // Check if a user document already exists. If not, create one.
      const userDocRef = doc(getFirestore(), 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        // This is a new user, create their profile and then prompt for a password.
        await createUser(user.uid, user.phoneNumber, 'New User');
        navigation.navigate('CreatePassword');
      } else {
        // Existing user, they are now logged in.
        // The onAuthChange listener will handle navigation.
      }
    } catch (e) {
      setError(e.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={auth.app.options}
        // For web, invisible reCAPTCHA. For native, it's a safety net.
      />
      <Text style={styles.title}>{verificationId ? 'Enter OTP' : 'Enter Phone Number'}</Text>
      
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {!verificationId ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            maxLength={10}
          />
          <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={sendVerificationCode} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send OTP</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            ref={otpInputRef}
            style={styles.input}
            placeholder="6-digit code"
            keyboardType="number-pad"
            value={verificationCode}
            onChangeText={setVerificationCode}
            maxLength={6}
          />
          <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={confirmCode} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Confirm & Login</Text>}
          </TouchableOpacity>
        </>
      )}
      <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading}>
        <Text style={styles.backText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    width: '100%',
    backgroundColor: '#FF5A5F',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
  },
  backText: {
    marginTop: 20,
    color: '#666',
  },
  errorText: {
    color: 'red',
    marginBottom: 12,
  },
});