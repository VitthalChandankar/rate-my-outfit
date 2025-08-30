// src/screens/profile/EditProfileScreen.js
import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, TextInput, Text, HelperText, Chip } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import useAuthStore from '../../store/authStore';
import useUserStore from '../../store/UserStore';
import * as ImageManipulator from 'expo-image-manipulator';
import { uploadImageToCloudinary } from '../../services/cloudinaryService';
import { ensureUsernameUnique } from '../../services/firebase';
import Avatar from '../../components/Avatar';
import debounce from 'lodash.debounce';

export default function EditProfileScreen({ navigation }) {
  const { user } = useAuthStore();
  const uid = user?.uid || user?.user?.uid || user?.id;
  const { myProfile, updateProfile, setAvatar } = useUserStore();
  const [name, setName] = useState(myProfile?.name || myProfile?.displayName || '');
  const [username, setUsername] = useState(myProfile?.username || '');
  const [bio, setBio] = useState(myProfile?.bio || '');
  const [saving, setSaving] = useState(false);
  const [unameStatus, setUnameStatus] = useState({ state: 'idle', msg: '' }); // idle|checking|ok|taken|invalid

  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9._]/g, '');
  const mkSuggestions = (base) => {
    const b = norm(base).slice(0, 16) || 'style';
    const rand = () => Math.floor(Math.random() * 900 + 100);
    return [b, `${b}_${rand()}`, `${b}.${rand()}`, `${b}${rand()}`].filter((v, i, a) => a.indexOf(v) === i);
  };

  const checkUsername = useRef(
    debounce(async (val, uidX) => {
      if (!val || val.length < 3) {
        setUnameStatus({ state: 'invalid', msg: 'Min 3 characters' });
        return;
      }
      setUnameStatus({ state: 'checking', msg: 'Checking…' });
      const res = await ensureUsernameUnique(val, uidX);
      if (res.success) {
        setUnameStatus({ state: 'ok', msg: 'Available' });
      } else {
        setUnameStatus({ state: 'taken', msg: res.error || 'Taken' });
      }
    }, 400)
  ).current;

  const pickAvatar = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ selectionLimit: 1, quality: 1 });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset?.uri) return;
  
      // Compress and bound size BEFORE uploading to Cloudinary (<= 10MB)
      const manip = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1440 } }], // bound max width, preserve aspect ratio
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
      );
  
      const uploaded = await uploadImageToCloudinary(manip.uri);
      if (!uploaded?.success) throw new Error(uploaded?.error?.message || 'Upload failed');
      await setAvatar(uid, uploaded.url);
      Haptics.selectionAsync();
    } catch (e) {
      Alert.alert('Avatar', e?.message || 'Failed to set avatar');
    }
  };

  // handle independent saves
const onSave = async () => {
  if (!uid) return;
  // Only require min length if user provided a username
  const userProvidedUsername = (username || '').length > 0;
  if (userProvidedUsername && username.length < 3) {
    return Alert.alert('Username', 'Min 3 chars');
  }
  setSaving(true);
  const payload = {
    name: (name || '').trim(),
    bio: (bio || '').slice(0, 180),
  };
  // Only send username if user provided a non-empty value (server will skip if unchanged)
  if (userProvidedUsername) payload.username = String(username || '').trim().toLowerCase();

  const res = await updateProfile(uid, payload);
  setSaving(false);
  if (!res?.success) Alert.alert('Save failed', res?.error?.toString?.() || 'Try again');
  else {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack?.();
  }
};

//Suggestions only when the user typed and value is invalid/taken (no suggestions for empty):
const userProvidedUsername = (username || '').length > 0;
const sugg = userProvidedUsername && (unameStatus.state === 'taken' || unameStatus.state === 'invalid')
  ? mkSuggestions(username || name)
  : [];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={styles.title}>Edit Profile</Text>
        <View style={{ alignItems: 'center', marginTop: 12 }}>
          <Avatar uri={myProfile?.profilePicture} size={96} ring />
          <Button mode="contained-tonal" style={{ marginTop: 8 }} onPress={pickAvatar}>Change Photo</Button>
        </View>

        <TextInput label="Name" value={name} onChangeText={setName} style={styles.input} mode="outlined" />
        <TextInput
          label="Username"
          value={username}
          
          onChangeText={(v) => {
            const n = norm(v);
            setUsername(n);
            if (n.length >= 3) {
              checkUsername(n, uid);
            } else if (n.length === 0) {
              setUnameStatus({ state: 'idle', msg: '' });
            } else {
              setUnameStatus({ state: 'invalid', msg: 'Min 3 characters' });
            }
          }}
          style={styles.input}
          mode="outlined"
          autoCapitalize="none"
          right={
            unameStatus.state === 'checking' ? <TextInput.Icon icon="progress-clock" />
            : unameStatus.state === 'ok' ? <TextInput.Icon icon="check" color="#10B981" />
            : (unameStatus.state === 'taken' || unameStatus.state === 'invalid')
            ? <TextInput.Icon icon="close" color="#EF4444" onPress={() => { setUsername(''); setUnameStatus({ state: 'idle', msg: '' }); }} />
            : null
         }
        />
        {(unameStatus.state === 'taken' || unameStatus.state === 'invalid') && (
          <>
            <HelperText type="error" visible>{unameStatus.msg}</HelperText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {sugg.map((s) => (
                <Chip key={s} onPress={() => { setUsername(s); checkUsername(s, uid); }}>{s}</Chip>
              ))}
            </View>
          </>
        )}

        <TextInput label="Bio" value={bio} onChangeText={setBio} style={styles.input} mode="outlined" multiline maxLength={180} right={<TextInput.Affix text={`${bio.length}/180`} />} />

        <Button mode="contained" onPress={onSave} loading={saving} disabled={saving} style={{ marginTop: 12 }}>Save</Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#111' },
  input: { marginTop: 12 },
});
