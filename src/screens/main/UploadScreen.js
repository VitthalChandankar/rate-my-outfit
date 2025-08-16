// File: src/screens/main/UploadScreen.js
// Description: Camera/Gallery pick, robust URI resolution (content:// -> file://), preview, caption, upload.

import React, { useMemo, useState } from 'react';
import { Alert, Keyboard, Platform, StyleSheet, View } from 'react-native';
import {
  Button,
  IconButton,
  Text,
  TextInput,
  Surface,
  Snackbar,
  ProgressBar,
  Divider,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuthStore from '../../store/authStore';
import useOutfitStore from '../../store/outfitStore';

export default function UploadScreen({ navigation }) {
  const { user } = useAuthStore();
  const uploadOutfit = useOutfitStore((s) => s.uploadOutfit);

  const [selectedUri, setSelectedUri] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [snack, setSnack] = useState({ visible: false, text: '' });

  const canUpload = useMemo(() => !!selectedUri && caption.trim().length > 0 && !uploading, [selectedUri, caption, uploading]);

  const showSnack = (text) => setSnack({ visible: true, text });
  const hideSnack = () => setSnack({ visible: false, text: '' });

  const ensureLibraryPermission = async () => {
    const { granted, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (granted) return true;
    if (canAskAgain) showSnack('Please allow Photos/Media permission to select an image.');
    else Alert.alert('Permission blocked', 'Open Settings and enable Photos/Media for this app.');
    return false;
  };
  const ensureCameraPermission = async () => {
    const { granted, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
    if (granted) return true;
    if (canAskAgain) showSnack('Please allow Camera permission to take a photo.');
    else Alert.alert('Permission blocked', 'Open Settings and enable Camera for this app.');
    return false;
  };

  // Resolve asset to a usable file:// URI (handles content:// on Android)
  const resolveToFileUri = async (maybeUri) => {
    if (!maybeUri) return null;
    try {
      if (maybeUri.startsWith('file://')) return maybeUri;

      if (Platform.OS === 'android' && maybeUri.startsWith('content://')) {
        const fileName = `picked_${Date.now()}.jpg`;
        const dest = FileSystem.cacheDirectory + fileName;
        // Copy from content:// to cache file
        await FileSystem.copyAsync({ from: maybeUri, to: dest });
        return dest;
      }

      // Fallback: try to read and rewrite to cache if scheme unknown
      const fileName = `picked_${Date.now()}.jpg`;
      const dest = FileSystem.cacheDirectory + fileName;
      await FileSystem.copyAsync({ from: maybeUri, to: dest });
      return dest;
    } catch (e) {
      console.warn('resolveToFileUri failed:', e);
      return null;
    }
  };

  // Extracts a URI from the picker result and resolves it when needed
  const extractAndResolveUri = async (result) => {
    if (!result) return null;

    // Modern shape
    if (typeof result.canceled === 'boolean') {
      if (result.canceled) return null;
      const asset = Array.isArray(result.assets) ? result.assets[0] : null;
      // Prefer uri, else some environments expose path/file
      const raw = asset?.uri || asset?.file || asset?.path || null;
      if (!raw) return null;
      const resolved = await resolveToFileUri(raw);
      return resolved || raw;
    }

    // Legacy shape
    if (!result.cancelled && result.uri) {
      const resolved = await resolveToFileUri(result.uri);
      return resolved || result.uri;
    }

    return null;
  };

  // Normalize orientation on Android
  const normalizeOrientationIfNeeded = async (uri) => {
    try {
      if (Platform.OS === 'android') {
        const manipulated = await ImageManipulator.manipulateAsync(
          uri,
          [{ rotate: 0 }],
          { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
        );
        return manipulated.uri || uri;
      }
      return uri;
    } catch (e) {
      console.warn('orientation normalize failed:', e);
      return uri;
    }
  };

  const pickFromLibrary = async () => {
    try {
      Keyboard.dismiss();
      const ok = await ensureLibraryPermission();
      if (!ok) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        selectionLimit: 1,
        quality: 0.9,
      });

      console.log('Picker (gallery) canceled:', result?.canceled, 'assets:', Array.isArray(result?.assets) ? result.assets.length : 0);

      const uriRaw = await extractAndResolveUri(result);
      if (uriRaw) {
        const uri = await normalizeOrientationIfNeeded(uriRaw);
        setSelectedUri(uri);
        Haptics.selectionAsync();
      } else {
        showSnack('No image returned from picker.');
      }
    } catch (e) {
      console.error('pickFromLibrary error:', e);
      Alert.alert('Picker error', e?.message || 'Failed to open image library.');
    }
  };

  const takePhoto = async () => {
    try {
      Keyboard.dismiss();
      const okCam = await ensureCameraPermission();
      if (!okCam) return;

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.9,
      });

      console.log('Picker (camera) canceled:', result?.canceled, 'assets:', Array.isArray(result?.assets) ? result.assets.length : 0);

      const uriRaw = await extractAndResolveUri(result);
      if (uriRaw) {
        const uri = await normalizeOrientationIfNeeded(uriRaw);
        setSelectedUri(uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        showSnack('No image captured.');
      }
    } catch (e) {
      console.error('takePhoto error:', e);
      Alert.alert('Camera error', e?.message || 'Failed to open camera.');
    }
  };

  const clearSelection = () => setSelectedUri(null);

  const handleUpload = async () => {
    if (!selectedUri) {
      Alert.alert('No image', 'Please choose or capture an image first.');
      return;
    }
    if (caption.trim().length === 0) {
      Alert.alert('Add a caption', 'Please enter a caption before uploading.');
      return;
    }

    setUploading(true);
    setUploadProgress(0.2);

    try {
      const step = () => setUploadProgress((p) => Math.min(1, p + 0.2));
      const timer = setInterval(step, 350);

      const res = await uploadOutfit({
        imageUri: selectedUri,
        caption: caption.trim(),
        tags: [],
      });

      clearInterval(timer);
      setUploadProgress(1);

      if (res?.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCaption('');
        setSelectedUri(null);
        setSnack({ visible: true, text: 'Uploaded successfully.' });
        setTimeout(() => navigation.navigate?.('Home'), 350);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Upload failed', res?.error?.message || 'Please try again later.');
      }
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('upload error:', e);
      Alert.alert('Upload failed', e?.message || 'Please try again later.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.title}>Upload Outfit</Text>
        <IconButton icon="close" size={22} onPress={() => navigation.goBack?.()} accessibilityLabel="Close" />
      </View>

      <View style={styles.container}>
        <Surface style={styles.card} elevation={1}>
          <View style={styles.previewWrap}>
            {selectedUri ? (
              <>
                <ExpoImage
                  source={{ uri: selectedUri }}
                  style={styles.preview}
                  contentFit="cover"
                  transition={120}
                />
                <IconButton
                  icon="close-circle"
                  size={24}
                  onPress={clearSelection}
                  mode="contained-tonal"
                  style={styles.clearBtn}
                  accessibilityLabel="Remove selected image"
                />
              </>
            ) : (
              <View style={styles.placeholder}>
                <IconButton icon="image-multiple" size={30} disabled />
                <Text style={{ opacity: 0.7 }}>No image selected</Text>
              </View>
            )}
          </View>

          <View style={styles.actionsRow}>
            <Button mode="contained" icon="image-outline" onPress={pickFromLibrary} style={styles.actionBtn}>
              Pick image
            </Button>
            <Button mode="outlined" icon="camera-outline" onPress={takePhoto} style={styles.actionBtn}>
              Camera
            </Button>
          </View>

          <Divider style={{ marginVertical: 12 }} />

          <TextInput
            mode="outlined"
            label="Caption"
            placeholder="Share something about your fit..."
            value={caption}
            onChangeText={setCaption}
            multiline
            style={styles.input}
          />

          {uploading && (
            <View style={{ marginTop: 12 }}>
              <ProgressBar indeterminate={uploadProgress === 0} progress={uploadProgress || 0.1} />
              <Text style={{ marginTop: 6, opacity: 0.7 }}>Uploading...</Text>
            </View>
          )}

          <Button mode="elevated" icon="cloud-upload" onPress={handleUpload} disabled={!canUpload} style={styles.uploadBtn}>
            {uploading ? 'Uploading...' : 'Upload Outfit'}
          </Button>
        </Surface>
      </View>

      <Snackbar visible={snack.visible} onDismiss={hideSnack} duration={2200}>
        {snack.text}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontWeight: '700' },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 4 },
  card: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#ffffff',
  },
  previewWrap: { width: '100%', height: 340, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F4F4F4' },
  preview: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  clearBtn: { position: 'absolute', right: 6, top: 6, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16 },
  actionsRow: { marginTop: 12, flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  actionBtn: { flex: 1 },
  input: { marginTop: 4 },
  uploadBtn: { marginTop: 16 },
});
