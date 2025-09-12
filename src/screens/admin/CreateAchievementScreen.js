// src/screens/admin/CreateAchievementScreen.js
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { createOrUpdateAchievement } from '../../services/firebase';

export default function CreateAchievementScreen({ route, navigation }) {
  const existingAchievement = route.params?.achievement;

  const [id, setId] = useState(existingAchievement?.id || '');
  const [title, setTitle] = useState(existingAchievement?.title || '');
  const [description, setDescription] = useState(existingAchievement?.description || '');
  const [imageUri, setImageUri] = useState(existingAchievement?.imageUrl || null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
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
          <Text style={styles.imagePickerText}>Tap to select badge image (1:1)</Text>
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
  imagePicker: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center', marginBottom: 16, alignSelf: 'center', borderWidth: 1, borderColor: '#E0E0E0', borderStyle: 'dashed' },
  image: { width: '100%', height: '100%', borderRadius: 60 },
  imagePickerText: { color: '#666', fontWeight: '500', textAlign: 'center' },
  input: { marginBottom: 12 },
  button: { marginTop: 16, paddingVertical: 8 },
});