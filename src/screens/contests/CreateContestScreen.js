// src/screens/contests/CreateContestScreen.js
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Timestamp } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import useContestStore from '../../store/contestStore';

export default function CreateContestScreen({ navigation }) {
  const { createContest } = useContestStore();

  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [prize, setPrize] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  // State for the date picker
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  });
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState('start'); // 'start' or 'end'

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setIsPickerVisible(false); // Always hide picker after interaction
    if (selectedDate) {
      if (pickerTarget === 'start') {
        setStartDate(selectedDate);
      } else {
        setEndDate(selectedDate);
      }
    }
  };

  const handleCreateContest = async () => {
    if (!title || !theme || !prize || !imageUri || !startDate || !endDate) {
      Alert.alert('Missing Fields', 'Please fill out all fields and select an image.');
      return;
    }

    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    if (endTimestamp.toMillis() <= startTimestamp.toMillis()) {
        Alert.alert('Invalid Date Range', 'End date must be after the start date.');
        return;
    }

    setLoading(true);
    const res = await createContest({
      title,
      theme,
      prize,
      imageUri,
      startAt: startTimestamp,
      endAt: endTimestamp,
      host: 'RateMyOutfit Team', // Or get from admin profile
      country: 'all',
    });
    setLoading(false);

    if (res.success) {
      Alert.alert('Success', 'Contest created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('Error', res.error || 'Failed to create contest. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
        {imageUri ? (
          <ExpoImage source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <Text style={styles.imagePickerText}>Tap to select a banner image (4:3)</Text>
        )}
      </TouchableOpacity>

      <TextInput
        label="Contest Title"
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label="Theme / Description"
        value={theme}
        onChangeText={setTheme}
        mode="outlined"
        style={styles.input}
        multiline
        numberOfLines={3}
      />
      <TextInput
        label="Prize"
        value={prize}
        onChangeText={setPrize}
        mode="outlined"
        style={styles.input}
      />
      <TouchableOpacity onPress={() => { setPickerTarget('start'); setIsPickerVisible(true); }}>
        <View pointerEvents="none">
          <TextInput
            label="Start Date"
            value={startDate.toLocaleDateString()}
            mode="outlined"
            style={styles.input}
          />
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => { setPickerTarget('end'); setIsPickerVisible(true); }}>
        <View pointerEvents="none">
          <TextInput
            label="End Date"
            value={endDate.toLocaleDateString()}
            mode="outlined"
            style={styles.input}
          />
        </View>
      </TouchableOpacity>

      <Button
        mode="contained"
        onPress={handleCreateContest}
        loading={loading}
        disabled={loading}
        style={styles.button}
        labelStyle={styles.buttonLabel}
      >
        Create Contest
      </Button>

      {isPickerVisible && (
        <DateTimePicker
          value={pickerTarget === 'start' ? startDate : endDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          minimumDate={new Date()} // Prevent picking past dates
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  contentContainer: { padding: 16 },
  imagePicker: { width: '100%', aspectRatio: 4 / 3, backgroundColor: '#F0F0F0', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#E0E0E0', borderStyle: 'dashed' },
  image: { width: '100%', height: '100%', borderRadius: 12 },
  imagePickerText: { color: '#666', fontWeight: '500' },
  input: { marginBottom: 12 },
  button: { marginTop: 16, paddingVertical: 8, borderRadius: 12 },
  buttonLabel: { fontWeight: 'bold' },
});