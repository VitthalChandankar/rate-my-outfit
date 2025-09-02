// src/screens/profile/EditProfileScreen.js
// Edit profile for the signed-in user: avatar change with compression, optional username,
// independent saves for name/bio. Save disabled if not self.

import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, TextInput, Text, HelperText, Chip } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import useAuthStore from '../../store/authStore';
import useUserStore from '../../store/UserStore';
import { uploadImageToCloudinary } from '../../services/cloudinaryService';
import { ensureUsernameUnique } from '../../services/firebase';
import Avatar from '../../components/Avatar';
import debounce from 'lodash.debounce';

export default function EditProfileScreen({ navigation }) {
  const { user } = useAuthStore();
  const authedUid = user?.uid ?? user?.user?.uid ?? user?.id ?? null;

  const { myProfile, updateProfile, setAvatar, loadMyProfile } = useUserStore();
  const isSelf = !!authedUid && (myProfile?.uid === authedUid || !myProfile);
  useEffect(() => {
    if (authedUid && !myProfile) loadMyProfile(authedUid);
    }, [authedUid, myProfile, loadMyProfile]);

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
      try {
        const res = await ensureUsernameUnique(val, uidX);
        if (res.success) {
          setUnameStatus({ state: 'ok', msg: 'Available' });
        } else {
          setUnameStatus({ state: 'taken', msg: res.error || 'Taken' });
        }
      } catch (e) {
        setUnameStatus({ state: 'error', msg: e?.message || 'Check failed' });
      }
    }, 400)
  ).current;

  const pickAvatar = async () => {
    try {
      if (!isSelf) return Alert.alert('Not allowed', 'Cannot change another user’s avatar.');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Please allow Photos permission to select an image.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: false, quality: 1 });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset?.uri) return;

      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1440 } }],
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
      );

      const up = await uploadImageToCloudinary(manipulated.uri);
      if (!up?.success) throw new Error(up?.error?.message || 'Upload failed');

      // cache-busting in setAvatar (ensure setUserAvatar appends ?v=timestamp server-side)
      await setAvatar(authedUid, up.url);
      Haptics.selectionAsync();
    } catch (e) {
      Alert.alert('Avatar', e?.message || 'Failed to set avatar');
    }
  };

  const onSave = async () => {
    if (!uid || !isSelf) return Alert.alert('Not allowed', 'Cannot edit another user.');
    const userProvidedUsername = (username || '').length > 0;
    if (userProvidedUsername && username.length < 3) return Alert.alert('Username', 'Min 3 chars');

    setSaving(true);
    const payload = {
      name: (name || '').trim(),
      bio: (bio || '').slice(0, 180),
    };
    if (userProvidedUsername) payload.username = String(username || '').trim().toLowerCase();

    const res = await updateProfile(authedUid, payload);
    setSaving(false);
    if (!res?.success) Alert.alert('Save failed', res?.error?.toString?.() || 'Try again');
    else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack?.();
    }
  };

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
          <Button mode="contained-tonal" style={{ marginTop: 8 }} onPress={pickAvatar} disabled={!isSelf}>
            Change Photo
          </Button>
        </View>

        <TextInput label="Name" value={name} onChangeText={setName} style={styles.input} mode="outlined" />
        <TextInput
          label="Username (optional)"
          value={username}
          onChangeText={(v) => {
            const n = norm(v);
            setUsername(n);
            if (n.length >= 3) checkUsername(n, uid);
            else if (n.length === 0) setUnameStatus({ state: 'idle', msg: '' });
            else setUnameStatus({ state: 'invalid', msg: 'Min 3 characters' });
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
        {(unameStatus.state === 'taken' || unameStatus.state === 'invalid' || unameStatus.state === 'error') && (
          <>
            <HelperText type={unameStatus.state === 'error' ? 'info' : 'error'} visible>{unameStatus.msg}</HelperText>
            {(unameStatus.state !== 'error') && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {sugg.map((s) => (
                  <Chip key={s} onPress={() => { setUsername(s); checkUsername(s, uid); }}>{s}</Chip>
                ))}
              </View>
            )}
          </>
        )}

        <TextInput
          label="Bio"
          value={bio}
          onChangeText={setBio}
          style={styles.input}
          mode="outlined"
          multiline
          maxLength={180}
          right={<TextInput.Affix text={`${bio.length}/180`} />}
        />

        <Button mode="contained" onPress={onSave} loading={saving} disabled={!isSelf || saving} style={{ marginTop: 12 }}>
          Save
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#111' },
  input: { marginTop: 12 },
});
