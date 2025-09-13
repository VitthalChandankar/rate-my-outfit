// src/screens/contests/CreateContestScreen.js
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { TextInput, Button, Text, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import DateTimePicker from '@react-native-community/datetimepicker';
import useContestStore from '../../store/contestStore';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';

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

export default function CreateContestScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [prize, setPrize] = useState('');
  const [host, setHost] = useState('');
  const [country, setCountry] = useState('');
  const [imageUri, setImageUri] = useState(null);

  const [startAt, setStartAt] = useState(new Date());
  const [endAt, setEndAt] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Default to 1 week from now
  const [showPicker, setShowPicker] = useState(null); // 'start' or 'end'

  const [loading, setLoading] = useState(false);
  const createContest = useContestStore((s) => s.createContest);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Use enum for consistency
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
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

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || (showPicker === 'start' ? startAt : endAt);
    setShowPicker(null);
    if (showPicker === 'start') {
      setStartAt(currentDate);
    } else {
      setEndAt(currentDate);
    }
  };

  const handleSave = async () => {
    if (!title || !theme || !prize || !host || !country || !imageUri) {
      Alert.alert('Missing Fields', 'Please fill out all fields and select a banner image.');
      return;
    }
    if (endAt <= startAt) {
      Alert.alert('Invalid Dates', 'The end date must be after the start date.');
      return;
    }

    setLoading(true);
    const res = await createContest({
      title,
      theme,
      prize,
      host,
      country: country.toUpperCase(), // Store as uppercase code e.g., IN, US, GLOBAL
      imageUri,
      startAt,
      endAt,
    });
    setLoading(false);

    if (res.success) {
      Alert.alert('Success', 'Contest created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to create contest.');
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
            <Text style={styles.imagePickerText}>Tap to select banner (16:9)</Text>
          </View>
        )}
      </TouchableOpacity>

      <TextInput label="Title" value={title} onChangeText={setTitle} mode="outlined" style={styles.input} />
      <TextInput label="Theme / Description" value={theme} onChangeText={setTheme} mode="outlined" style={styles.input} multiline />
      <TextInput label="Prize (e.g., ₹10,000 or $500)" value={prize} onChangeText={setPrize} mode="outlined" style={styles.input} />
      <TextInput label="Host Name" value={host} onChangeText={setHost} mode="outlined" style={styles.input} />
      <TextInput label="Country Code (e.g., IN, US, or GLOBAL)" value={country} onChangeText={setCountry} mode="outlined" style={styles.input} autoCapitalize="characters" />

      <View style={styles.dateRow}>
        <View style={styles.dateInput}>
          <Text style={styles.dateLabel}>Start Date</Text>
          <Button icon="calendar" mode="outlined" onPress={() => setShowPicker('start')}>
            {startAt.toLocaleDateString()}
          </Button>
        </View>
        <View style={styles.dateInput}>
          <Text style={styles.dateLabel}>End Date</Text>
          <Button icon="calendar" mode="outlined" onPress={() => setShowPicker('end')}>
            {endAt.toLocaleDateString()}
          </Button>
        </View>
      </View>

      {showPicker && (
        <DateTimePicker
          value={showPicker === 'start' ? startAt : endAt}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      <Button
        mode="contained"
        onPress={handleSave}
        loading={loading}
        disabled={loading}
        style={styles.button}
        labelStyle={styles.buttonLabel}
      >
        Create Contest
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
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dateInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  dateLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    marginLeft: 8,
  },
  button: {
    marginTop: 24,
    paddingVertical: 8,
    backgroundColor: '#7A5AF8',
  },
  buttonLabel: {
    color: '#fff',
    fontWeight: 'bold',
  },
});