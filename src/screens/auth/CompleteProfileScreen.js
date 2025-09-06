// src/screens/auth/CompleteProfileScreen.js

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import useAuthStore from '../../store/authStore';
import useUserStore from '../../store/UserStore';
import { uploadImage } from '../../services/firebase';
import Avatar from '../../components/Avatar';

export default function CompleteProfileScreen() {
  const { user } = useAuthStore();
  const { myProfile, updateProfile, setAvatar } = useUserStore();

  const [username, setUsername] = useState('');
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
      if (!username.trim() && !avatarUri) return; // Do nothing if both are empty
      // Step 1: Update username if provided
      if (username.trim()) {
        const usernameRes = await updateProfile(user.uid, { username: username.trim() });
        if (!usernameRes.success) {
          Alert.alert('Error', usernameRes.error || 'Username is invalid or already taken.');
          setLoading(false);
          return;
        }
      }

      // Step 2: Upload and set avatar if selected
      if (avatarUri) {
        const uploadRes = await uploadImage(avatarUri);
        if (uploadRes.success) {
          await setAvatar(user.uid, uploadRes.url);
        } else {
          Alert.alert('Avatar Error', 'Could not upload your avatar. You can try again later from your profile.');
        }
      }

      // The auth state listener in AppNavigator will handle navigation into the app.
      // We don't need to do anything else here.
    } catch (e) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // The "Skip" button will simply let the auth state change do its work.
  // For a better UX, we could set a flag in AsyncStorage to not show this again.
  const handleSkip = () => {
    // This function is intentionally left blank.
    // The AppNavigator will detect the authenticated state and move the user forward.
  };

  return (
    <View style={styles.container}>
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
          autoCapitalize="none"
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          (loading || (!username.trim() && !avatarUri)) && { opacity: 0.7 },
        ]}
        onPress={handleFinish}
        disabled={loading || (!username.trim() && !avatarUri)}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Finish</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleSkip} disabled={loading}>
        <Text style={styles.skipText}>Skip for Now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700', color: '#222', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 32, textAlign: 'center' },
  avatarPicker: { marginBottom: 24, position: 'relative' },
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