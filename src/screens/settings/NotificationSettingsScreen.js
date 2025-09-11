// src/screens/settings/NotificationSettingsScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, Alert } from 'react-native';
import useUserStore from '../../store/UserStore';
import useAuthStore from '../../store/authStore';

const SettingsRow = ({ label, value, onValueChange, disabled }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Switch value={value} onValueChange={onValueChange} disabled={disabled} />
  </View>
);

export default function NotificationSettingsScreen() {
  const { myProfile, updateProfile, updateMyPushToken } = useUserStore();
  const { pushToken } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);

  // Get the current preference, default to true if not set
  const notificationsEnabled = myProfile?.preferences?.notificationsEnabled ?? true;

  const handleToggleNotifications = async (newValue) => {
    if (isSaving || !myProfile?.uid) return;
    setIsSaving(true);

    // 1. Update the preference flag in the user's profile document.
    const res = await updateProfile(myProfile.uid, {
      preferences: {
        ...myProfile.preferences,
        notificationsEnabled: newValue,
      },
    });

    // 2. Also register or unregister the push token for this specific device.
    // This stops the device from receiving pushes, even if the backend doesn't check the preference.
    if (pushToken) {
      await updateMyPushToken(pushToken, !newValue); // `remove` is true when `newValue` is false.
    }

    if (!res.success) {
      Alert.alert('Error', 'Could not update your notification settings. Please try again.');
    }
    setIsSaving(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionBody}>
        <SettingsRow
          label="Enable Push Notifications"
          value={notificationsEnabled}
          onValueChange={handleToggleNotifications}
          disabled={isSaving}
        />
      </View>
      <Text style={styles.helperText}>
        Manage notifications for likes, comments, and new followers.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7FB',
    paddingTop: 20,
  },
  sectionBody: {
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  rowLabel: {
    fontSize: 16,
    color: '#333',
  },
  helperText: {
    paddingHorizontal: 16,
    marginTop: 12,
    color: '#6B7280',
    fontSize: 13,
  },
});
