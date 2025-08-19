// Description: Rich, animated progress UI with distinct contest vs normal themes and robust upload flow.

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Alert, Keyboard, Platform, StyleSheet, View, Animated, Easing } from 'react-native';
import {
Button,
IconButton,
Text,
TextInput,
Surface,
Snackbar,
Divider,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuthStore from '../../store/authStore';
import useOutfitStore from '../../store/outfitStore'; // general feed upload
import useContestStore from '../../store/contestStore'; // contest entry upload
import { uploadImageToCloudinary } from '../../services/cloudinaryService'; // direct Cloudinary when entering contests

const hasImageManipulator = !!ImageManipulator?.manipulateAsync;

export default function UploadScreen({ navigation, route }) {
const contestId = route?.params?.contestId || null;
const isContest = !!contestId;

const { user } = useAuthStore();
const uploadOutfit = useOutfitStore((s) => s.uploadOutfit);
const createEntry = useContestStore((s) => s.createEntry);

const [selectedUri, setSelectedUri] = useState(null);
const [caption, setCaption] = useState('');
const [uploading, setUploading] = useState(false);
const [phase, setPhase] = useState('idle'); // idle | preparing | uploading | finalizing | done | error
const [progress, setProgress] = useState(0);
const [snack, setSnack] = useState({ visible: false, text: '' });

// Animated progress bar with gradient illusion via moving highlight
const progAnim = useRef(new Animated.Value(0)).current;
useEffect(() => {
if (uploading) {
Animated.loop(
Animated.timing(progAnim, {
toValue: 1,
duration: 1400,
easing: Easing.inOut(Easing.quad),
useNativeDriver: false,
})
).start();
} else {
progAnim.stopAnimation();
progAnim.setValue(0);
}
}, [uploading, progAnim]);

const canUpload = useMemo(
() => !!selectedUri && caption.trim().length > 0 && !uploading,
[selectedUri, caption, uploading]
);

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

const resolveToFileUri = async (maybeUri) => {
if (!maybeUri) return null;
try {
if (maybeUri.startsWith('file://')) return maybeUri;

  if (Platform.OS === 'android' && maybeUri.startsWith('content://')) {
    const ext = '.jpg';
    const fileName = `picked_${Date.now()}${ext}`;
    const dest = FileSystem.cacheDirectory + fileName;
    await FileSystem.copyAsync({ from: maybeUri, to: dest });
    return dest;
  }

  const ext = '.jpg';
  const fileName = `picked_${Date.now()}${ext}`;
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

 // Normalize orientation on Android (guard for missing native)
const normalizeOrientationIfNeeded = async (uri) => {
try {
if (Platform.OS === 'android' && hasImageManipulator) {
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
console.log(
  'Picker (gallery) canceled:',
  result?.canceled,
  'assets:',
  Array.isArray(result?.assets) ? result.assets.length : 0
);
const uriRaw = await extractAndResolveUri(result);
if (uriRaw) {
const uri = await normalizeOrientationIfNeeded(uriRaw);
setSelectedUri(uri);
Haptics.selectionAsync();
} else showSnack('No image returned from picker.');
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
const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
const uriRaw = await extractAndResolveUri(result);
if (uriRaw) {
const uri = await normalizeOrientationIfNeeded(uriRaw);
setSelectedUri(uri);
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
} else showSnack('No image captured.');
} catch (e) {
console.error('takePhoto error:', e);
Alert.alert('Camera error', e?.message || 'Failed to open camera.');
}
};

// Fancy progress helper
const startProgressProgram = () => {
setProgress(0.08);
setPhase('preparing');
const tickers = [];
// Preparing phase bumps quickly to ~0.3
tickers.push(setTimeout(() => { setProgress(0.18); }, 250));
tickers.push(setTimeout(() => { setProgress(0.28); setPhase('uploading'); }, 500));
// Uploading phase bumps linearly
tickers.push(setTimeout(() => { setProgress(0.45); }, 900));
tickers.push(setTimeout(() => { setProgress(0.62); }, 1300));
tickers.push(setTimeout(() => { setProgress(0.78); }, 1700));
// Finalizing
tickers.push(setTimeout(() => { setPhase('finalizing'); setProgress(0.9); }, 2100));
return () => tickers.forEach(clearTimeout);
};

const clearSelection = () => setSelectedUri(null);

const handleUpload = async () => {
if (!selectedUri) return Alert.alert('No image', 'Please choose or capture an image first.');
if (caption.trim().length === 0) return Alert.alert('Add a caption', 'Please enter a caption before uploading.');
if (!user?.uid) return Alert.alert('Not signed in', 'Please sign in before uploading.');

setUploading(true);
const stopProgram = startProgressProgram();

try {
  let res;
  if (isContest) {
    // Contest entry: Cloudinary upload, then createEntry
    const uploaded = await uploadImageToCloudinary(selectedUri);
    if (!uploaded?.success) {
      res = uploaded;
    } else {
      setProgress((p) => Math.max(p, 0.92));
      res = await createEntry({
        contestId,
        imageUrl: uploaded.url,
        caption: caption.trim(),
        tags: [],
      });
    }
  } else {
    // General feed
    res = await uploadOutfit({
      userId: user.uid,
      imageUri: selectedUri,
      caption: caption.trim(),
      tags: [],
    });
  }

  setProgress(1);
  setPhase('done');
  stopProgram();

  if (res?.success) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCaption('');
    setSelectedUri(null);
    setSnack({ visible: true, text: isContest ? 'Entry submitted!' : 'Uploaded successfully.' });
    setTimeout(() => {
      if (isContest) navigation.navigate?.('ContestDetails', { contestId });
      else navigation.navigate?.('Home');
    }, 350);
  } else {
    throw new Error(res?.error?.message || 'Upload failed');
  }
} catch (e) {
  setPhase('error');
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  console.error('upload error:', e);
  Alert.alert('Upload failed', e?.message || 'Please try again later.');
} finally {
  setUploading(false);
  setTimeout(() => setProgress(0), 500);
}
};

// Themed progress bar
const ProgressBarFancy = () => {
if (!uploading && progress <= 0) return null;
const widthPct = `${Math.round(progress * 100)}%`;

const shimmerPos = progAnim.interpolate({
  inputRange: [0, 1],
  outputRange: ['0%', '100%'],
});

const theme = isContest
? { bg: '#F3E8FF', bar: '#7A5AF8', accent: '#B794F4', icon: 'trophy' }
: { bg: '#E6F4FF', bar: '#1E90FF', accent: '#8EC5FF', icon: 'cloud-upload' };


return (
  <View style={[styles.progressWrap, { backgroundColor: theme.bg }]}>
    <View style={[styles.progressBar, { width: widthPct, backgroundColor: theme.bar }]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            left: shimmerPos,
            backgroundColor: theme.accent,
          },
        ]}
      />
    </View>
    <View style={styles.progressMeta}>
      <Text style={{ fontWeight: '700' }}>
        {isContest ? 'Submitting entry' : 'Uploading'}
      </Text>
      <Text style={{ color: '#666' }}>
        {phase === 'preparing' && 'Preparing…'}
        {phase === 'uploading' && 'Uploading…'}
        {phase === 'finalizing' && 'Finalizing…'}
        {phase === 'done' && 'Done'}
        {phase === 'error' && 'Error'}
      </Text>
    </View>
  </View>
);
};

return (
<SafeAreaView style={styles.safe} edges={['top']}>
<View style={styles.header}>
<Text variant="titleLarge" style={styles.title}>
{isContest ? 'Enter Contest' : 'Upload Outfit'}
</Text>
<IconButton icon="close" size={22} onPress={() => navigation.goBack?.()} accessibilityLabel="Close" />
</View>

  <View style={styles.container}>
    <Surface style={styles.card} elevation={1}>
      <View style={styles.previewWrap}>
        {selectedUri ? (
          <>
            <ExpoImage source={{ uri: selectedUri }} style={styles.preview} contentFit="cover" transition={120} />
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
        label={isContest ? 'Caption for your contest entry' : 'Caption'}
        placeholder="Share something about your fit..."
        value={caption}
        onChangeText={setCaption}
        multiline
        style={styles.input}
      />

      <ProgressBarFancy />

      <Button
        mode="elevated"
        icon="cloud-upload"
        onPress={handleUpload}
        disabled={!canUpload}
        style={styles.uploadBtn}
      >
        {uploading ? (isContest ? 'Submitting...' : 'Uploading...') : (isContest ? 'Submit Entry' : 'Upload Outfit')}
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
card: { borderRadius: 16, padding: 14, backgroundColor: '#ffffff' },
previewWrap: { width: '100%', height: 340, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F4F4F4' },
preview: { width: '100%', height: '100%' },
placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
clearBtn: { position: 'absolute', right: 6, top: 6, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16 },
actionsRow: { marginTop: 12, flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
actionBtn: { flex: 1 },
input: { marginTop: 4 },
uploadBtn: { marginTop: 16 },

// Fancy progress
progressWrap: { marginTop: 12, borderRadius: 12, padding: 8 },
progressBar: { height: 10, borderRadius: 6, overflow: 'hidden' },
shimmer: { position: 'absolute', width: 40, height: 10, opacity: 0.3 },
progressMeta: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
});