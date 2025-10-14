// File: src/screens/main/UploadScreen.js

// Rich, animated progress UI with distinct contest vs normal themes and robust upload flow.
// Keyboard-safe: caption always visible on iOS/Android, auto-scrolls on focus, Done actions dismiss keyboard.
// Restores iconified buttons (Pick Image, Camera, Submit) and preserves all existing functionality.

import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Keyboard,
  Platform,
  StyleSheet,
  View,
  Animated,
  Easing,
  KeyboardAvoidingView,
  ScrollView,
  Pressable,
  InputAccessoryView,
  findNodeHandle,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import {
  Button,
  IconButton,
  Text,
  TextInput,
  Surface,
  Snackbar,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Image as ExpoImage } from 'expo-image';
import showAlert from '../../utils/showAlert';
import { SafeAreaView } from 'react-native-safe-area-context';

import useAuthStore from '../../store/authStore';
import useOutfitStore from '../../store/outfitStore'; // general feed upload
import useContestStore from '../../store/contestStore'; // contest entry upload
import useUserStore from '../../store/UserStore'; // ADDED: read myProfile meta

import { uploadImageToCloudinary } from '../../services/cloudinaryService'; // direct Cloudinary when entering contests

const hasImageManipulator = !!ImageManipulator?.manipulateAsync;

export default function UploadScreen({ navigation, route }) {
  // Use local state for contestId to handle navigation lifecycle correctly.
  const [contestId, setContestId] = useState(null);
  const isContest = !!contestId;
  const isFocused = useIsFocused();

  // Effect 1: Sync state from route params when the screen is focused.
  useEffect(() => {
    if (isFocused) {
      setContestId(route.params?.contestId || null);
    }
  }, [isFocused, route.params?.contestId]);

  // Effect 2: Clean up params when the screen is blurred (left).
  // This prevents the contestId from persisting when the user switches tabs.
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      if (route.params?.contestId) {
        navigation.setParams({ contestId: undefined });
      }
    });
    return unsubscribe;
  }, [navigation, route.params]);

  const { user } = useAuthStore();
  const uploadOutfit = useOutfitStore((s) => s.uploadOutfit);
  const createEntry = useContestStore((s) => s.createEntry);
  const { myProfile } = useUserStore(); // ADDED

  const [selectedUri, setSelectedUri] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | preparing | uploading | finalizing | done | error
  const [progress, setProgress] = useState(0);
  const [snack, setSnack] = useState({ visible: false, text: '' });

  // Animated progress shimmer
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
    else showAlert('Permission blocked', 'Open Settings and enable Photos/Media for this app.');
    return false;
  };

  const ensureCameraPermission = async () => {
    const { granted, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
    if (granted) return true;
    if (canAskAgain) showSnack('Please allow Camera permission to take a photo.');
    else showAlert('Permission blocked', 'Open Settings and enable Camera for this app.');
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
      // iOS or path-like
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

  // Normalize orientation on Android
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
      const uriRaw = await extractAndResolveUri(result);
      if (uriRaw) {
        const uri = await normalizeOrientationIfNeeded(uriRaw);
        setSelectedUri(uri);
        Haptics.selectionAsync();
      } else showSnack('No image returned from picker.');
    } catch (e) {
      console.error('pickFromLibrary error:', e);
      showAlert('Picker error', e?.message || 'Failed to open image library.');
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
      showAlert('Camera error', e?.message || 'Failed to open camera.');
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
    Keyboard.dismiss();
    if (!selectedUri) return showAlert('No image', 'Please choose or capture an image first.');
    if (caption.trim().length === 0) return showAlert('Add a caption', 'Please enter a caption before uploading.');
    if (!user?.uid) return showAlert('Not signed in', 'Please sign in before uploading.');


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
            imageUrl: uploaded.identifier, // Pass the identifier
            caption: caption.trim(),
            tags: [],
          });
        }
      } else {
        // General feed: minimal addition -> include userMeta
        const meta = myProfile ? {
          uid: myProfile.uid,
          name: myProfile.name || myProfile.displayName || '',
          username: myProfile.username || '',
          profilePicture: myProfile.profilePicture || null,
        } : null;

        res = await uploadOutfit({
          userId: user.uid,
          imageUri: selectedUri,
          caption: caption.trim(),
          tags: [],
          userMeta: meta,       // ADDED
          type: 'normal',       // ADDED
          contestId: null,      // ADDED
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

        // Note: Keeping navigation exactly as-is to preserve current behavior
        setTimeout(() => {
          Keyboard.dismiss();
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
      showAlert('Upload failed', e?.message || 'Please try again later.');
   
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  // iOS InputAccessoryView for Done button above keyboard
  const inputAccessoryViewID = 'captionDoneBar';

  // Themed progress bar
  const ProgressBarFancy = () => {
    if (!uploading && progress <= 0) return null;
    const widthPct = `${Math.round(progress * 100)}%`;
    const shimmerPos = progAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });
    const theme = isContest
      ? { bg: '#F3E8FF', bar: '#7A5AF8', accent: '#B794F4', label: 'Submitting entry' }
      : { bg: '#E6F4FF', bar: '#1E90FF', accent: '#8EC5FF', label: 'Uploading' };
    return (
      <View style={[styles.progressWrap, { backgroundColor: theme.bg }]}>
        <View style={[styles.progressBar, { backgroundColor: '#FFFFFF' }]}>
          <View style={{ width: widthPct, height: '100%', backgroundColor: theme.bar }} />
          <Animated.View
            style={[
              styles.shimmer,
              { left: shimmerPos, backgroundColor: theme.accent },
            ]}
          />
        </View>
        <View style={styles.progressMeta}>
          <Text variant="labelMedium">{theme.label}</Text>
          <Text variant="labelMedium">{Math.round(progress * 100)}%</Text>
        </View>
      </View>
    );
  };

  // Auto-scroll caption into view on focus (iOS improvement)
  const scrollRef = useRef(null);
  const captionRef = useRef(null);
  const onCaptionFocus = () => {
    // Small delay lets keyboard animate; then scroll caption visibly into view
    setTimeout(() => {
      try {
        const node = findNodeHandle(captionRef.current);
        if (node && scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard) {
          scrollRef.current.scrollResponderScrollNativeHandleToKeyboard(
            node,
            90, // extra offset above keyboard
            true
          );
        } else {
          // Fallback: scroll to end
          scrollRef.current?.scrollToEnd?.({ animated: true });
        }
      } catch {
        scrollRef.current?.scrollToEnd?.({ animated: true });
      }
    }, 120);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
      {/* Tap outside to dismiss */}
        <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
          >
          {/* Header */}
          <View style={styles.header}>
              <Text variant="titleMedium" style={styles.title}>
              {isContest ? 'Enter Contest' : 'Upload Outfit'}
            </Text>
            <IconButton
              icon="close"
                size={20}
              onPress={() => {
                Keyboard.dismiss();
                navigation.goBack?.();
              }}
              accessibilityLabel="Close"
            />
          </View>

          {/* Preview card */}
            <Surface style={styles.card} elevation={1}>
            <View style={styles.previewWrap}>
              {selectedUri ? (
                <>
                    <ExpoImage source={{ uri: selectedUri }} style={styles.preview} contentFit="cover" transition={120} />
                    <IconButton
                      icon="close"
                      size={18}
                      onPress={clearSelection}
                      style={styles.clearBtn}
                      accessibilityLabel="Remove selected image"
                    />
                </>
              ) : (
                  <View style={styles.placeholder}>
                    <IconButton icon="image-multiple" size={30} disabled />
                    <Text variant="labelLarge">No image selected</Text>
                  </View>
              )}
            </View>

            {/* Actions (restored: icons and filled Pick Image) */}
            <View style={styles.actionsRow}>
                <Button
                  mode="contained" // filled as requested
                  icon="image"
                  onPress={pickFromLibrary}
                  style={styles.actionBtn}
                  disabled={uploading}
                >
                Pick image
              </Button>
                <Button
                  mode="outlined"
                  icon="camera"
                  onPress={takePhoto}
                  style={styles.actionBtn}
                  disabled={uploading}
                >
                Camera
              </Button>
            </View>

            {/* Caption */}
            <TextInput
              ref={captionRef}
                label={isContest ? 'Caption for your contest entry' : 'Caption'}
                mode="outlined"
              value={caption}
              onChangeText={setCaption}
              style={styles.input}
              multiline
                numberOfLines={3}
                returnKeyType="done"
                blurOnSubmit
              onFocus={onCaptionFocus}
                onSubmitEditing={Keyboard.dismiss}
                keyboardAppearance={Platform.OS === 'ios' ? 'default' : undefined}
                inputAccessoryViewID={Platform.OS === 'ios' ? 'captionDoneBar' : undefined}
                disabled={uploading}
            />

          {/* iOS Done bar */}
          {Platform.OS === 'ios' && (
            <InputAccessoryView nativeID={inputAccessoryViewID}>
              <View style={styles.accessoryBar}>
                    <Button compact onPress={Keyboard.dismiss}>Done</Button>
              </View>
            </InputAccessoryView>
          )}

          {/* Progress */}
          <ProgressBarFancy />
            </Surface>

          {/* Upload CTA (restored icon) */}
          <Button
            mode="contained"
              icon={isContest ? 'trophy' : 'cloud-upload'}
            onPress={handleUpload}
            style={styles.uploadBtn}
              disabled={!canUpload}
          >
            {uploading ? (isContest ? 'Submitting...' : 'Uploading...') : (isContest ? 'Submit Entry' : 'Upload Outfit')}
          </Button>
        </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>

      {/* Snackbar */}
      <Snackbar visible={snack.visible} onDismiss={hideSnack} duration={2500}>
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
  card: { borderRadius: 16, padding: 14, backgroundColor: '#ffffff' },
  previewWrap: { width: '100%', height: 340, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F4F4F4' },
  preview: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  clearBtn: { position: 'absolute', right: 6, top: 6, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16 },
  actionsRow: { marginTop: 12, flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  actionBtn: { flex: 1 },
  input: { marginTop: 10 },
  uploadBtn: { marginTop: 16 },
  // Fancy progress
  progressWrap: { marginTop: 12, borderRadius: 12, padding: 8 },
  progressBar: { height: 10, borderRadius: 6, overflow: 'hidden' },
  shimmer: { position: 'absolute', width: 40, height: 10, opacity: 0.3 },
  progressMeta: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  // iOS accessory bar
  accessoryBar: {
    backgroundColor: '#F2F2F7',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D1D6',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
});
