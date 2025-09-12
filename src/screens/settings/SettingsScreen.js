// src/screens/settings/SettingsScreen.js
import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Alert, Linking, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import i18n from '../../config/i18n';
import * as Application from 'expo-application';
import { useTheme } from '../../theme/ThemeContext';

// Reusable row component
const SettingsRow = ({ icon, label, onPress, color, isLast = false }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={[styles.row, { backgroundColor: colors.surface, borderBottomColor: colors.border }, isLast && { borderBottomWidth: 0 }]} onPress={onPress}>
      <Ionicons name={icon} size={22} color={color || colors.text} style={styles.rowIcon} />
      <Text style={[styles.rowLabel, { color: color || colors.text }]}>{label}</Text>
      {label !== 'Logout' && !isLast && <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />}
    </TouchableOpacity>
  );
};

// Section component
const SettingsSection = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

export default function SettingsScreen({ navigation }) {
  const { logout } = useAuthStore();
  const { colors, isDark, toggleTheme } = useTheme();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const openLink = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(`Don't know how to open this URL: ${url}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open the link.');
    }
  };

  const appVersion = Application.nativeApplicationVersion || '1.0.0';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
     <SettingsSection title={i18n.t('settings.account')}>
        <SettingsRow icon="person-outline" label={i18n.t('settings.editProfile')} onPress={() => navigation.navigate('EditProfile')} isLast />
        <SettingsRow icon="lock-closed-outline" label={i18n.t('settings.changePassword')} onPress={() => Alert.alert('Coming Soon', 'This feature is not yet implemented.')} />
      </SettingsSection>

      <SettingsSection title={i18n.t('settings.preferences')}>
        <SettingsRow icon="notifications-outline" label={i18n.t('settings.notifications')} onPress={() => navigation.navigate('NotificationSettings')} />
        <SettingsRow icon="language-outline" label={i18n.t('settings.language')} onPress={() => navigation.navigate('Language')} />
        <View style={[styles.row, { backgroundColor: colors.surface, borderBottomWidth: 0 }]}>
          <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={22} color={colors.text} style={styles.rowIcon} />
          <Text style={[styles.rowLabel, { color: colors.text }]}>Dark Mode</Text>
          <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: colors.gray300, true: colors.primary }} thumbColor={colors.white} />
        </View>
     </SettingsSection>

     <SettingsSection title={i18n.t('settings.support')}>
        <SettingsRow icon="help-circle-outline" label={i18n.t('settings.helpCenter')} onPress={() => openLink('https://your-website.com/help')} />
        <SettingsRow icon="chatbubble-ellipses-outline" label={i18n.t('settings.contactUs')} onPress={() => Linking.openURL('mailto:support@yourapp.com?subject=App Support')} />
        </SettingsSection>

        <SettingsSection title={i18n.t('settings.about')}>
        <SettingsRow icon="shield-checkmark-outline" label={i18n.t('settings.privacyPolicy')} onPress={() => openLink('https://your-website.com/privacy')} />
        <SettingsRow icon="document-text-outline" label={i18n.t('settings.termsOfService')} onPress={() => openLink('https://your-website.com/terms')} />
        <View style={[styles.row, { backgroundColor: colors.surface, borderBottomWidth: 0 }]}>
          <Ionicons name="information-circle-outline" size={22} color={colors.text} style={styles.rowIcon} />
          <Text style={[styles.rowLabel, { color: colors.text }]}>{i18n.t('settings.appVersion')}</Text>
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>{appVersion}</Text>
        </View>
      </SettingsSection>

      <View style={{ marginTop: 24, marginBottom: 40 }}>
      <SettingsRow icon="log-out-outline" label={i18n.t('settings.logout')} color={colors.logout} onPress={handleLogout} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  },
});
