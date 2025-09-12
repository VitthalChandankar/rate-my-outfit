// src/screens/auth/PhoneNumberScreen.js

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform, KeyboardAvoidingView, ScrollView, AppState } from 'react-native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import CountryPicker from 'react-native-country-picker-modal';
import { useTheme } from '../../theme/ThemeContext';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { auth, createUser } from '../../services/firebase'; // Assuming auth is exported from firebase.js

export default function PhoneNumberScreen({ route, navigation }) {
  const initialPhoneNumber = route.params?.phoneNumber || '';
  const { colors } = useTheme();
  const recaptchaVerifier = useRef(null);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [countryCode, setCountryCode] = useState('IN');
  const [country, setCountry] = useState({ cca2: 'IN', callingCode: ['91'], name: 'India' });
  const [verificationId, setVerificationId] = useState(null);
  const [verificationCode, setVerificationCode] = useState(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const otpInputs = useRef([]);

 

  const sendVerificationCode = useCallback(async () => {
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const phoneProvider = new PhoneAuthProvider(auth);
      const verId = await phoneProvider.verifyPhoneNumber(
        `+${country.callingCode[0]}${phoneNumber}`,
        recaptchaVerifier.current // The ref to the modal is the verifier
      );
      setVerificationId(verId);
      Alert.alert('OTP Sent!', 'Please check your messages for the verification code.');
      setTimeout(() => otpInputs.current[0]?.focus(), 500);
    } catch (e) {
      setError(e.message || 'Failed to send OTP. Please check the number and try again.');
    } finally {
      setLoading(false);
    }
  }, [loading, country, phoneNumber, recaptchaVerifier]);


  const confirmCode = async () => {
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, verificationCode.join(''));
      const result = await signInWithCredential(auth, credential);
      const user = result.user;

      // Check if a user document already exists. If not, create one.
      const userDocRef = doc(getFirestore(), 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        // This is a new user, create their profile and then prompt for a password.
        await createUser(user.uid, null, 'New User', user.phoneNumber);
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

  useEffect(() => {
    if (initialPhoneNumber && !verificationId) {
      sendVerificationCode();
    }
  }, [initialPhoneNumber, verificationId, sendVerificationCode]);


  // --- OTP Input Logic ---
  const handleOtpChange = (text, index) => {
    const newOtp = [...verificationCode];
    newOtp[index] = text;
    setVerificationCode(newOtp);

    // Focus next input
    if (text && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !verificationCode[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
      <FirebaseRecaptchaVerifierModal
          ref={recaptchaVerifier}
          firebaseConfig={auth.app.options}
          // This will be invisible unless verification fails multiple times
        />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <Text style={[styles.title, { color: colors.text }]}>{verificationId ? 'Enter OTP' : 'Enter Phone Number'}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {verificationId
              ? `We've sent a 6-digit code to +${country.callingCode[0]} ${phoneNumber}`
              : 'We’ll send you a code to verify your number.'}
          </Text>

          {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}

          {!verificationId ? (
            <>
              <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <CountryPicker
                  {...{
                    countryCode,
                    withFilter: true,
                    withFlag: true,
                    withCountryNameButton: false,
                    withAlphaFilter: true,
                    withCallingCode: true,
                    onSelect: (country) => {
                      setCountryCode(country.cca2);
                      setCountry(country);
                    },
                  }}
                />
             <Text style={[styles.callingCode, { color: colors.text }]}>+{country.callingCode[0]}</Text>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Mobile number"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  autoFocus
                />
              </View>
              <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }, loading && { opacity: 0.7 }]} onPress={sendVerificationCode} disabled={loading}>
                {loading ? <ActivityIndicator color={colors.textOnAccent} /> : <Text style={[styles.buttonText, { color: colors.textOnAccent }]}>Send OTP</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
             <View style={styles.otpInputContainer}>
                {Array(6).fill(0).map((_, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (otpInputs.current[index] = ref)}
                    style={[styles.otpBox, { borderColor: colors.gray300, color: colors.text }]}
                    keyboardType="number-pad"
                    maxLength={1}
                    onChangeText={(text) => handleOtpChange(text, index)}
                    onKeyPress={(e) => handleBackspace(e, index)}
                    value={verificationCode[index]}
                  />
                ))}
              </View>
              <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }, loading && { opacity: 0.7 }]} onPress={confirmCode} disabled={loading}>
                {loading ? <ActivityIndicator color={colors.textOnAccent} /> : <Text style={[styles.buttonText, { color: colors.textOnAccent }]}>Confirm & Login</Text>}
              </TouchableOpacity>
            </>
          )}
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading}>
              <Text style={[styles.backText, { color: colors.textSecondary }]}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, marginBottom: 32, textAlign: 'center' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    width: '100%',
    height: 50,
  },
  callingCode: {
    fontSize: 16,
    fontWeight: '500',
    marginHorizontal: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    width: '100%',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
  },
  errorText: {
    marginBottom: 12,
    textAlign: 'center',
  },
  otpInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  otpBox: {
    width: 48,
    height: 52,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
  },
});