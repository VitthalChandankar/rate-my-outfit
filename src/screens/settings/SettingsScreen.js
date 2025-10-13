// src/screens/settings/SettingsScreen.js
import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Switch } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import showAlert from '../../utils/showAlert';
import useAuthStore from '../../store/authStore';
import useUserStore from '../../store/UserStore';
import i18n from '../../config/i18n';
import * as Application from 'expo-application';

// Reusable row component
const SettingsRow = ({ icon, label, onPress, color, isLast = false }) => (
  <TouchableOpacity style={styles.row} onPress={onPress}>
    <Ionicons name={icon} size={22} color={color || '#333'} style={styles.rowIcon} />
    <Text style={[styles.rowLabel, { color: color || '#333' }]}>{label}</Text>
    {label !== 'Logout' && !isLast && <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />}
  </TouchableOpacity>
);

// Section component
const SettingsSection = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

export default function SettingsScreen({ navigation }) {
  const { logout, deleteAccount } = useAuthStore();
  const { user } = useAuthStore();
  const { myProfile, updateProfile } = useUserStore();

  // Local state for optimistic UI updates to prevent toggle flicker.
  const [localPreferences, setLocalPreferences] = useState(myProfile?.preferences || {});

  // Sync local state if the profile is updated from the server (e.g., on initial load).
  useEffect(() => {
    if (myProfile?.preferences) {
      setLocalPreferences(myProfile.preferences);
    }
  }, [myProfile?.preferences]);

  const handleToggle = (key, value) => {
    if (!user?.uid || !myProfile) return;

    // Update local state immediately for a smooth UI.
    const newPrefs = { ...localPreferences, [key]: value };
    setLocalPreferences(newPrefs);
    updateProfile(user.uid, { preferences: newPrefs });
  };

  const handleLogout = () => {
    showAlert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleDeleteAccount = () => {
    showAlert(
      'Delete Account?',
      'This is permanent and cannot be undone. All your posts, ratings, and data will be deleted forever.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteAccount();
            if (!res.success) showAlert('Error', res.error?.message || 'Could not delete account. Please try again.');
          },
        },
      ]
    );
  };
  const appVersion = Application.nativeApplicationVersion || '1.0.0';

  return (
    <ScrollView style={styles.container}>
     <SettingsSection title={i18n.t('settings.account')}>
        <SettingsRow icon="shield-checkmark-outline" label="Verification" onPress={() => navigation.navigate('Verification')} color="#7A5AF8" />
        <SettingsRow icon="person-outline" label={i18n.t('settings.editProfile')} onPress={() => navigation.navigate('EditProfile')} />
        <SettingsRow icon="hand-left-outline" label="Blocked Accounts" onPress={() => navigation.navigate('BlockedUsers')} />
        <SettingsRow icon="lock-closed-outline" label={i18n.t('settings.changePassword')} onPress={() => showAlert('Coming Soon', 'This feature is not yet implemented.')} />
        <SettingsRow icon="keypad-outline" label="Two-Factor Authentication" onPress={() => showAlert('Coming Soon', 'This feature will be available in a future update.')} />
      </SettingsSection>

      <SettingsSection title={i18n.t('settings.preferences')}>
        <SettingsRow icon="notifications-outline" label={i18n.t('settings.notifications')} onPress={() => navigation.navigate('NotificationSettings')} />
        <SettingsRow icon="language-outline" label={i18n.t('settings.language')} onPress={() => navigation.navigate('Language')} />
      </SettingsSection>

      <SettingsSection title="Privacy">
        <View style={styles.sectionBody}>
          <View style={styles.switchRow}>
            <Text style={styles.rowLabel}>Show ratings on my profile</Text>
            <Switch
              value={localPreferences.showRatingsOnMyProfile ?? true}
              onValueChange={(val) => handleToggle('showRatingsOnMyProfile', val)}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.rowLabel}>Show ratings to other users</Text>
            <Switch
              value={localPreferences.showRatingsToOthers ?? true}
              onValueChange={(val) => handleToggle('showRatingsToOthers', val)}
            />
          </View>
        </View>
        <Text style={styles.helperText}>Controls visibility of average ratings on your contest posts on profile</Text>
     </SettingsSection>

     <SettingsSection title="Business">
        <SettingsRow icon="megaphone-outline" label="Publish Ads on Vastrayl" onPress={() => navigation.navigate('CreateAd')} color="#7A5AF8" />
      </SettingsSection>

     <SettingsSection title={i18n.t('settings.support')}>
        <SettingsRow icon="help-circle-outline" label={i18n.t('settings.helpCenter')} onPress={() => navigation.navigate('HelpCenter')} />
        <SettingsRow icon="chatbubble-ellipses-outline" label={i18n.t('settings.contactUs')} onPress={() => Linking.openURL('mailto:support@yourapp.com?subject=App Support')} />
        </SettingsSection>

        <SettingsSection title={i18n.t('settings.about')}>
        <SettingsRow icon="shield-checkmark-outline" label={i18n.t('settings.privacyPolicy')} onPress={() => navigation.navigate('PrivacyPolicy')} />
        <SettingsRow icon="document-text-outline" label={i18n.t('settings.termsOfService')} onPress={() => navigation.navigate('TermsOfService')} />
        <View style={styles.row}>
          <Ionicons name="information-circle-outline" size={22} color="#333" style={styles.rowIcon} />
          <Text style={styles.rowLabel}>{i18n.t('settings.appVersion')}</Text>
          <Text style={styles.versionText}>{appVersion}</Text>
        </View>
      </SettingsSection>

      <View style={{ marginTop: 24, marginBottom: 40 }}>
        <SettingsRow icon="log-out-outline" label={i18n.t('settings.logout')} color="#FF3B30" onPress={handleLogout} />
        <SettingsRow icon="trash-bin-outline" label="Delete Account" color="#FF3B30" onPress={handleDeleteAccount} isLast={true} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7FB',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    paddingHorizontal: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  rowIcon: {
    marginRight: 16,
    width: 24,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
  },
  versionText: {
    fontSize: 16,
    color: '#6B7280',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8, // Reduced padding for switch rows
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  helperText: {
    paddingHorizontal: 16,
    marginTop: 8,
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 18,
  },
});
