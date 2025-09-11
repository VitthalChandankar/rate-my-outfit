// src/screens/auth/CompleteProfileScreen.js

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import CountryPicker from 'react-native-country-picker-modal';

import useAuthStore from '../../store/authStore';
import useUserStore from '../../store/UserStore';
import { uploadImage, ensureUsernameUnique } from '../../services/firebase';
import Avatar from '../../components/Avatar';

export default function CompleteProfileScreen({ navigation }) {
  const { user, setOnboardingCompleted } = useAuthStore();
  const { myProfile, updateProfile, setAvatar } = useUserStore();

  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('IN');
  const [country, setCountry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [avatarUri, setAvatarUri] = useState(null);

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleFinish = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const updates = {};

      // 1. Validate and prepare username
      if (username.trim()) {
        const unameRes = await ensureUsernameUnique(username.trim(), user.uid);
        if (!unameRes.success) {
          throw new Error(unameRes.error || 'Username is invalid or already taken.');
        }
        updates.username = unameRes.username;
      }

      // 2. Prepare phone, country, city
      if (phone.trim() && country) {
        updates.phone = `+${country.callingCode[0]}${phone.trim()}`;
        updates.country = country.name;
        // For city, you might add another input or use a location API
        // updates.city = '...';
      }

      // 3. Upload avatar if selected
      if (avatarUri) {
        const uploadRes = await uploadImage(avatarUri);
        if (uploadRes.success) {
          updates.profilePicture = uploadRes.url; // Add to the updates payload
        } else {
          throw new Error('Could not upload your avatar. Please try again.');
        }
      }

      // 4. Mark profile as complete and save all data
      updates.profileCompleted = true;
      const finalRes = await updateProfile(user.uid, updates);

      if (!finalRes.success) {
        throw new Error(finalRes.error || 'Failed to save your profile.');
      }

      // 5. Set the flag to show the Welcome screen. The AppNavigator will handle the redirection.
      setOnboardingCompleted(true);

    } catch (e) {
      Alert.alert('Error', e.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    // Mark profile as complete even if skipped, so we don't ask again.
    setLoading(true);
    await updateProfile(user.uid, { profileCompleted: true });
    setLoading(false);
    setOnboardingCompleted(true);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Complete Your Profile</Text>
      <Text style={styles.subtitle}>Choose a unique username and add a profile picture.</Text>

      <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarPicker}>
        <Avatar uri={avatarUri || myProfile?.profilePicture} size={120} />
        <View style={styles.cameraIcon}>
          <Ionicons name="camera" size={24} color="#fff" />
        </View>
      </TouchableOpacity>

      <View style={styles.inputContainer}>
        <Ionicons name="at" size={20} color="#888" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          maxLength={20}
          autoCapitalize="none"
          editable={!loading}
        />
      </View>
      <Text style={styles.helperText}>Your username must be unique. 3-20 characters, letters, numbers, '.', '_'</Text>

      <View style={styles.inputContainer}>
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
        <Ionicons name="caret-down" size={12} color="#888" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          editable={!loading}
        />
      </View>
      <Text style={styles.helperText}>Optional. Used for account recovery and login. Not shown on your profile.</Text>

      <TouchableOpacity
        style={[
          styles.button,
          (loading) && { opacity: 0.7 },
        ]}
        onPress={handleFinish}
        disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Finish</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleSkip} disabled={loading}>
        <Text style={styles.skipText}>Skip for Now</Text>
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700', color: '#222', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 32, textAlign: 'center' },
  avatarPicker: { marginBottom: 16, position: 'relative' },
  cameraIcon: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#FF5A5F',
    borderRadius: 15,
    padding: 6,
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
  input: { flex: 1, fontSize: 16, color: '#333' },
  helperText: {
    fontSize: 12,
    color: '#666',
    width: '100%',
    marginBottom: 16,
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
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  skipText: { fontSize: 16, color: '#666', marginTop: 8 },
});