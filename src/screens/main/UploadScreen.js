// File: src/screens/main/UploadScreen.js
// Description: Pick image, enter caption & tags, upload.

import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import useAuthStore from '../../store/authStore';
import useOutfitStore from '../../store/outfitStore';

export default function UploadScreen({ navigation }) {
  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const uploadOutfit = useOutfitStore((s) => s.uploadOutfit);
  const { user } = useAuthStore();

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please grant gallery permissions to upload photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.cancelled) setImage(result.uri);
  };

  const handleUpload = async () => {
    if (!image) {
      Alert.alert('No image', 'Please choose an image first.');
      return;
    }
    setUploading(true);
    const res = await uploadOutfit({ imageUri: image, caption, tags: [] });
    setUploading(false);
    if (res.success) {
      setCaption('');
      setImage(null);
      Alert.alert('Uploaded', 'Your outfit was uploaded successfully.');
      navigation.navigate('Home');
    } else {
      Alert.alert('Upload failed', res.error?.message || 'Try again later.');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.pickBtn} onPress={pickImage}>
        <Text style={styles.pickText}>Pick an image</Text>
      </TouchableOpacity>

      {image ? <Image source={{ uri: image }} style={styles.preview} /> : <View style={styles.placeholder}><Text style={{ color: '#aaa' }}>No image selected</Text></View>}

      <TextInput
        style={styles.input}
        placeholder="Write a caption..."
        value={caption}
        onChangeText={setCaption}
      />

      <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload} disabled={uploading}>
        {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.uploadText}>Upload Outfit</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  pickBtn: { backgroundColor: '#FF5A5F', padding: 12, borderRadius: 10, alignItems: 'center' },
  pickText: { color: '#fff', fontWeight: '600' },
  preview: { width: '100%', height: 320, marginTop: 12, borderRadius: 12 },
  placeholder: { width: '100%', height: 320, marginTop: 12, borderRadius: 12, backgroundColor: '#F4F4F4', alignItems: 'center', justifyContent: 'center' },
  input: { marginTop: 12, backgroundColor: '#F6F6F6', borderRadius: 10, padding: 12, fontSize: 16 },
  uploadBtn: { marginTop: 16, backgroundColor: '#FF5A5F', padding: 14, borderRadius: 10, alignItems: 'center' },
  uploadText: { color: '#fff', fontWeight: '700' },
});
