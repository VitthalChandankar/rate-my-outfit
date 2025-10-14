// src/screens/profile/EditProfileScreen.js
// Edit profile for the signed-in user: avatar change with compression, optional username,
// independent saves for name/bio. Save disabled if not self.

import React, { useRef, useState, useEffect } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, TouchableOpacity } from 'react-native';
import { Button, TextInput, Text, HelperText, Chip } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import CountryPicker from 'react-native-country-picker-modal';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import showAlert from '../../utils/showAlert';
import * as Haptics from 'expo-haptics';

import useAuthStore from '../../store/authStore';
import useUserStore from '../../store/UserStore'; // keep correct casing to match file
import { uploadImageToCloudinary } from '../../services/cloudinaryService';
import { withCloudinaryTransforms, IMG_SQUARE_THUMB } from '../../utils/cloudinaryUrl';
import { ensureUsernameUnique } from '../../services/firebase';
import Avatar from '../../components/Avatar';
import debounce from 'lodash.debounce';

export default function EditProfileScreen({ navigation }) {
  const { user } = useAuthStore();
  const authedUid = user?.uid ?? user?.user?.uid ?? user?.id ?? null;

  const { myProfile, updateProfile, setAvatar, loadMyProfile } = useUserStore();
  const isSelf = !!authedUid && (myProfile?.uid === authedUid || !myProfile);

  // Hydrate if needed
  useEffect(() => {
    if (authedUid && !myProfile) loadMyProfile(authedUid);
  }, [authedUid, myProfile, loadMyProfile]);

  const [name, setName] = useState(myProfile?.name || myProfile?.displayName || '');
  const [username, setUsername] = useState(myProfile?.username || '');
  const [bio, setBio] = useState(myProfile?.bio || '');
  const [countryCode, setCountryCode] = useState(myProfile?.country || 'IN');
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [gender, setGender] = useState(myProfile?.gender || null);
  const [dob, setDob] = useState(myProfile?.dob?.toDate ? myProfile.dob.toDate() : null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unameStatus, setUnameStatus] = useState({ state: 'idle', msg: '' }); // idle|checking|ok|taken|invalid|error

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
      if (!isSelf) return showAlert('Not allowed', 'Cannot change another user’s avatar.');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showAlert('Permission required', 'Please allow Photos permission to select an image.');
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

      // cache-busting handled server-side in setUserAvatar
      await setAvatar(authedUid, up.identifier);
      Haptics.selectionAsync();
    } catch (e) {
      showAlert('Avatar', e?.message || 'Failed to set avatar');
    }
  };

  const onSave = async () => {
    if (!authedUid || !isSelf) return showAlert('Not allowed', 'Cannot edit another user.');
    const userProvidedUsername = (username || '').length > 0;
    if (userProvidedUsername && username.length < 3) return showAlert('Username', 'Min 3 chars');

    setSaving(true);
    const payload = {
      name: (name || '').trim(),
      bio: (bio || '').slice(0, 180),
      country: countryCode,
      gender: gender,
      dob: dob,
    };
    if (userProvidedUsername) payload.username = String(username || '').trim().toLowerCase();

    const res = await updateProfile(authedUid, payload);
    setSaving(false);
    if (!res?.success) showAlert('Save failed', res?.error?.toString?.() || 'Try again');
    else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack?.();
    }
  };

  // Suggestions when invalid/taken
  const userProvidedUsername = (username || '').length > 0;
  const sugg = userProvidedUsername && (unameStatus.state === 'taken' || unameStatus.state === 'invalid')
    ? mkSuggestions(username || name)
    : [];

  // UI preserved; only binding/logic fixed
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Edit Profile</Text>

          <View style={{ alignItems: 'center', marginTop: 12 }}>
          <Avatar uri={withCloudinaryTransforms(myProfile?.profilePicture, IMG_SQUARE_THUMB)} size={96} ring />
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
              if (n.length >= 3) checkUsername(n, authedUid);
              else if (n.length === 0) setUnameStatus({ state: 'idle', msg: '' });
              else setUnameStatus({ state: 'invalid', msg: 'Min 3 characters' });
            }}
            style={styles.input}
            mode="outlined"
            autoCapitalize="none"
            right={
              unameStatus.state === 'checking' ? <TextInput.Icon icon="progress-clock" /> :
              unameStatus.state === 'ok' ? <TextInput.Icon icon="check" color="#10B981" /> :
              (unameStatus.state === 'taken' || unameStatus.state === 'invalid')
                ? <TextInput.Icon icon="close" color="#EF4444" onPress={() => { setUsername(''); setUnameStatus({ state: 'idle', msg: '' }); }} />
                : null
            }
          />

          {(unameStatus.state === 'taken' || unameStatus.state === 'invalid' || unameStatus.state === 'error') && (
            <>
              <HelperText type={unameStatus.state === 'error' ? 'info' : 'error'} visible>
                {unameStatus.msg}
              </HelperText>
              {(unameStatus.state !== 'error') && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {sugg.map((s) => (
                    <Chip key={s} onPress={() => { setUsername(s); checkUsername(s, authedUid); }}>
                      {s}
                    </Chip>
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

          <Text style={styles.label}>Country</Text>
          <TouchableOpacity onPress={() => setCountryPickerVisible(true)} style={styles.countryPickerButton}>
            <CountryPicker
              {...{
                countryCode,
                withFilter: true,
                withFlag: true,
                withCallingCodeButton: false,
                withCountryNameButton: true,
                onSelect: (c) => setCountryCode(c.cca2),
                onClose: () => setCountryPickerVisible(false),
                visible: countryPickerVisible,
              }}
            />
          </TouchableOpacity>

          <Text style={styles.label}>Gender</Text>
          <View style={styles.chipContainer}>
            {['male', 'female', 'other', 'prefer_not_to_say'].map(g => (
              <Chip key={g} selected={gender === g} onPress={() => setGender(g)} style={styles.chip}>
                {g.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Chip>
            ))}
          </View>

          <Text style={styles.label}>Date of Birth</Text>
          <Button icon="calendar" mode="outlined" onPress={() => setShowDatePicker(true)} style={{ marginTop: 6 }}>
            {dob ? dob.toLocaleDateString() : 'Select Date'}
          </Button>
          {showDatePicker && (
            <DateTimePicker
              value={dob || new Date(2000, 0, 1)}
              mode="date"
              display="default"
              maximumDate={new Date(Date.now() - (13 * 365 * 24 * 60 * 60 * 1000))}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) setDob(selectedDate);
              }}
            />
          )}

          <Button mode="contained" onPress={onSave} loading={saving} disabled={!isSelf || saving} style={{ marginTop: 12 }}>
            Save
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  wrap: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#111' },
  input: { marginTop: 12 },
  label: {
    marginTop: 16,
    color: '#666',
    fontSize: 14,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  countryPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    marginTop: 8,
  },
  chip: {
    // Add any specific chip styling if needed
  },
});
