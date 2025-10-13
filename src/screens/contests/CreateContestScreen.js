// src/screens/contests/CreateContestScreen.js
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { TextInput, Button, Text, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import DateTimePicker from '@react-native-community/datetimepicker';
import showAlert from '../../utils/showAlert';
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
      showAlert('Image Error', 'Could not process the selected image.');
      return null;
    }
  }
  return uri;
};

const AchievementInput = ({ rank, imageUri, onPickImage, title, onTitleChange, description, onDescriptionChange }) => (
  <View style={styles.achievementSection}>
    <Text style={styles.achievementRank}>{rank} Place</Text>
    <View style={styles.achievementRow}>
      <TouchableOpacity onPress={onPickImage} style={styles.badgePicker}>
        {imageUri ? (
          <ExpoImage source={{ uri: imageUri }} style={styles.badgeImage} contentFit="cover" />
        ) : (
          <View style={styles.badgePlaceholder}>
            <Ionicons name="shield-outline" size={24} color="#888" />
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.achievementInputs}>
        <TextInput label="Achievement Title" value={title} onChangeText={onTitleChange} mode="outlined" dense />
        <TextInput
          label="Description"
          value={description}
          onChangeText={onDescriptionChange}
          mode="outlined"
          dense
          style={{ marginTop: 8 }}
        />
      </View>
    </View>
  </View>
);

export default function CreateContestScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [prize, setPrize] = useState('');
  const [host, setHost] = useState('');
  const [country, setCountry] = useState('');
  const [imageUri, setImageUri] = useState(null);

  // State for creating achievements on the fly
  const [ach1, setAch1] = useState({ imageUri: null, title: '', description: '' });
  const [ach2, setAch2] = useState({ imageUri: null, title: '', description: '' });
  const [ach3, setAch3] = useState({ imageUri: null, title: '', description: '' });

  // State for linking existing achievements
  const [linkAchId1, setLinkAchId1] = useState('');
  const [linkAchId2, setLinkAchId2] = useState('');
  const [linkAchId3, setLinkAchId3] = useState('');

  const [startAt, setStartAt] = useState(new Date());
  const [endAt, setEndAt] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Default to 1 week from now
  const [showPicker, setShowPicker] = useState(null); // 'start' or 'end'

  const [loading, setLoading] = useState(false);
  const createContest = useContestStore((s) => s.createContest);

  const pickImage = async (setImageCallback) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Use enum for consistency
        allowsEditing: false, // Allow free crop on next step
        aspect: [16, 9],
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        showAlert('Error', 'Could not get the image. Please try again.');
        return;
      }

      // Resolve the URI to handle Android's content:// scheme
      const fileUri = await resolveAssetUri(asset.uri);
      if (fileUri) {
        setImageCallback(fileUri);
      }
    } catch (error) {
      console.error('Image picking failed:', error);
      showAlert('Error', 'An unexpected error occurred while picking the image.');
    }
  };

  const pickBadgeImage = async (setAchState) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Badges are square
        quality: 1,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        showAlert('Error', 'Could not get the image. Please try again.');
        return;
      }

      const fileUri = await resolveAssetUri(asset.uri);
      if (fileUri) setAchState(prev => ({ ...prev, imageUri: fileUri }));
    } catch (error) {
      showAlert('Error', 'An unexpected error occurred while picking the image.');
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
      showAlert('Missing Fields', 'Please fill out all fields and select a banner image.');
      return;
    }
    if (endAt <= startAt) {
      showAlert('Invalid Dates', 'The end date must be after the start date.');
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
      // Pass new achievement data
      ach1,
      ach2,
      ach3,
      // Pass linked achievement IDs
      linkAchId1,
      linkAchId2,
      linkAchId3,
    });
    setLoading(false);

    if (res.success) {
      showAlert('Success', 'Contest created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      showAlert('Error', res.error?.message || 'Failed to create contest.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <TouchableOpacity onPress={() => pickImage(setImageUri)} style={styles.imagePicker}>
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

      <Text style={styles.sectionTitle}>Create Winner Achievements</Text>
      <AchievementInput
        rank="1st"
        imageUri={ach1.imageUri}
        onPickImage={() => pickBadgeImage(setAch1)}
        title={ach1.title}
        onTitleChange={text => setAch1(prev => ({ ...prev, title: text }))}
        description={ach1.description}
        onDescriptionChange={text => setAch1(prev => ({ ...prev, description: text }))}
      />
      <AchievementInput
        rank="2nd"
        imageUri={ach2.imageUri}
        onPickImage={() => pickBadgeImage(setAch2)}
        title={ach2.title}
        onTitleChange={text => setAch2(prev => ({ ...prev, title: text }))}
        description={ach2.description}
        onDescriptionChange={text => setAch2(prev => ({ ...prev, description: text }))}
      />
      <AchievementInput
        rank="3rd"
        imageUri={ach3.imageUri}
        onPickImage={() => pickBadgeImage(setAch3)}
        title={ach3.title}
        onTitleChange={text => setAch3(prev => ({ ...prev, title: text }))}
        description={ach3.description}
        onDescriptionChange={text => setAch3(prev => ({ ...prev, description: text }))}
      />

      <Text style={styles.sectionTitle}>Or Link Existing Achievements</Text>
      <TextInput label="1st Place Achievement ID (Optional)" value={linkAchId1} onChangeText={setLinkAchId1} mode="outlined" style={styles.input} autoCapitalize="none" />
      <TextInput label="2nd Place Achievement ID (Optional)" value={linkAchId2} onChangeText={setLinkAchId2} mode="outlined" style={styles.input} autoCapitalize="none" />
      <TextInput label="3rd Place Achievement ID (Optional)" value={linkAchId3} onChangeText={setLinkAchId3} mode="outlined" style={styles.input} autoCapitalize="none" />

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
  sectionTitle: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  achievementSection: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
  },
  achievementRank: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgePicker: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  badgeImage: { width: '100%', height: '100%' },
  badgePlaceholder: {},
  achievementInputs: { flex: 1 },
});