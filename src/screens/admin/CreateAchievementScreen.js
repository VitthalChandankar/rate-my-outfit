// src/screens/admin/CreateAchievementScreen.js
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { createOrUpdateAchievement } from '../../services/firebase';

// Helper to handle different URI types, especially for Android
const resolveAssetUri = async (uri) => {
  if (!uri) return null;
  if (Platform.OS === 'android' && uri.startsWith('content://')) {
    try {
      const cacheUri = FileSystem.cacheDirectory + `picked_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: uri, to: cacheUri });
      return cacheUri;
    } catch (e) {
      console.error('Failed to copy content URI to cache:', e);
      Alert.alert('Image Error', 'Could not process the selected image.');
      return null;
    }
  }
  return uri;
};

export default function CreateAchievementScreen({ route, navigation }) {
  const existingAchievement = route.params?.achievement;

  const [id, setId] = useState(existingAchievement?.id || '');
  const [title, setTitle] = useState(existingAchievement?.title || '');
  const [description, setDescription] = useState(existingAchievement?.description || '');
  const [imageUri, setImageUri] = useState(existingAchievement?.imageUrl || null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Use enum for consistency with working files
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert('Error', 'Could not get the image. Please try again.');
        return;
      }

      // Resolve the URI to handle Android's content:// scheme
      const fileUri = await resolveAssetUri(asset.uri);
      if (fileUri) {
        setImageUri(fileUri);
      }
    } catch (error) {
      console.error('Image picking failed:', error);
      Alert.alert('Error', 'An unexpected error occurred while picking the image.');
    }
  };

  const handleSave = async () => {
    if (!id || !title || !description || !imageUri) {
      Alert.alert('Missing Fields', 'Please fill out all fields and select an image.');
      return;
    }
    setLoading(true);
    const res = await createOrUpdateAchievement({
      id: id.toLowerCase().replace(/\s+/g, '_'), // Sanitize ID
      title,
      description,
      imageUri,
    });
    setLoading(false);

    if (res.success) {
      Alert.alert('Success', 'Achievement saved successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to save achievement.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
        {imageUri ? (
          <ExpoImage source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={styles.imagePickerPlaceholder}>
            <Ionicons name="camera" size={32} color="#888" />
            <Text style={styles.imagePickerText}>Tap to select badge image</Text>
          </View>
        )}
      </TouchableOpacity>

      <TextInput
        label="Achievement ID (e.g., first_post)"
        value={id}
        onChangeText={setId}
        mode="outlined"
        style={styles.input}
        autoCapitalize="none"
        disabled={!!existingAchievement}
      />
      <TextInput
        label="Title"
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label="Description"
        value={description}
        onChangeText={setDescription}
        mode="outlined"
        style={styles.input}
        multiline
      />
      <Button
        mode="contained"
        onPress={handleSave}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        {existingAchievement ? 'Update Achievement' : 'Create Achievement'}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  contentContainer: { padding: 16 },
  imagePicker: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center', marginBottom: 16, alignSelf: 'center', borderWidth: 1, borderColor: '#E0E0E0', overflow: 'hidden' },
  image: { width: '100%', height: '100%', borderRadius: 60 },
  imagePickerPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerText: { color: '#666', fontWeight: '500', textAlign: 'center', marginTop: 8 },
  input: { marginBottom: 12 },
  button: { marginTop: 16, paddingVertical: 8 },
});