// src/screens/ads/CreateAdScreen.js
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { TextInput, Button, Text, Chip } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import showAlert from '../../utils/showAlert';
import { Ionicons } from '@expo/vector-icons';
import { uploadImage, fbCreateAdvertisement } from '../../services/firebase';
import useAuthStore from '../../store/authStore';

export default function CreateAdScreen({ navigation }) {
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [callToAction, setCallToAction] = useState('Learn More');
  const [imageUri, setImageUri] = useState(null);
  const [durationDays, setDurationDays] = useState(7); // Default to 7 days
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission Denied', 'Sorry, we need camera roll permissions.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!title || !targetUrl || !imageUri) {
      showAlert('Missing Fields', 'Please fill out all fields and select an ad image.');
      return;
    }
    if (!targetUrl.startsWith('http')) {
      showAlert('Invalid URL', 'Please enter a valid URL starting with http:// or https://');
      return;
    }

    setLoading(true);
    // 1. Upload image
    const uploadRes = await uploadImage(imageUri);
    if (!uploadRes.success) {
      setLoading(false);
      showAlert('Upload Failed', 'Could not upload the ad image.');
      return;
    }

    // 2. Create ad document
    const res = await fbCreateAdvertisement({
      advertiserId: user.uid,
      title,
      targetUrl,
      callToAction,
      imageUrl: uploadRes.url,
      planId: 'basic', // This would come from your payment/plan selection flow
      durationDays, // Pass the selected duration
    });
    setLoading(false);

    if (res.success) {
      showAlert('Success', 'Your ad has been created!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      showAlert('Error', res.error?.message || 'Failed to create ad.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
        {imageUri ? (
          <ExpoImage source={{ uri: imageUri }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={styles.imagePickerPlaceholder}>
            <Ionicons name="image-outline" size={40} color="#888" />
            <Text style={styles.imagePickerText}>Tap to select Ad Creative (16:9)</Text>
          </View>
        )}
      </TouchableOpacity>

      <TextInput label="Ad Title (e.g., 'Summer Sale')" value={title} onChangeText={setTitle} mode="outlined" style={styles.input} />
      <TextInput label="Target URL (e.g., https://yourstore.com)" value={targetUrl} onChangeText={setTargetUrl} mode="outlined" style={styles.input} autoCapitalize="none" keyboardType="url" />
      <TextInput label="Call to Action (e.g., 'Shop Now')" value={callToAction} onChangeText={setCallToAction} mode="outlined" style={styles.input} />

      <Text style={styles.label}>Select Ad Duration</Text>
      <View style={styles.durationContainer}>
        {[7, 14, 30].map(days => (
          <Chip
            key={days}
            selected={durationDays === days}
            onPress={() => setDurationDays(days)}
            style={styles.chip}
          >
            {days} days
          </Chip>
        ))}
      </View>

      <Button
        mode="contained"
        onPress={handleSave}
        loading={loading}
        disabled={loading}
        style={styles.button}
        labelStyle={styles.buttonLabel}
      >
        Create Ad
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    contentContainer: { padding: 16 },
    imagePicker: {
      width: '100%',
      aspectRatio: 16 / 9,
      backgroundColor: '#F0F0F0',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E0E0E0',
      overflow: 'hidden',
    },
    image: { width: '100%', height: '100%' },
    imagePickerPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    imagePickerText: { color: '#666', fontWeight: '500', marginTop: 8 },
    input: { marginBottom: 12 },
    button: {
      marginTop: 16,
      paddingVertical: 8,
      backgroundColor: '#7A5AF8',
    },
    buttonLabel: {
      color: '#fff',
      fontWeight: 'bold',
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: '#333',
      marginTop: 16,
      marginBottom: 8,
    },
    durationContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    chip: { backgroundColor: '#F3F4F6' },
});