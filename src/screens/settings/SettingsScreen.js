// src/screens/settings/SettingsScreen.js
import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
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
  const { logout } = useAuthStore();

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
    <ScrollView style={styles.container}>
      <SettingsSection title="Account">
        <SettingsRow icon="person-outline" label="Edit Profile" onPress={() => navigation.navigate('EditProfile')} />
        <SettingsRow icon="lock-closed-outline" label="Change Password" onPress={() => Alert.alert('Coming Soon', 'This feature is not yet implemented.')} />
      </SettingsSection>

      <SettingsSection title="Preferences">
        <SettingsRow icon="notifications-outline" label="Notifications" onPress={() => navigation.navigate('NotificationSettings')} />
        <SettingsRow icon="language-outline" label="Language" onPress={() => Alert.alert('Coming Soon', 'Multi-language support is planned for a future update.')} />
      </SettingsSection>

      <SettingsSection title="Support">
        <SettingsRow icon="help-circle-outline" label="Help Center" onPress={() => openLink('https://your-website.com/help')} />
        <SettingsRow icon="chatbubble-ellipses-outline" label="Contact Us" onPress={() => Linking.openURL('mailto:support@yourapp.com?subject=App Support')} />
      </SettingsSection>

      <SettingsSection title="About">
        <SettingsRow icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => openLink('https://your-website.com/privacy')} />
        <SettingsRow icon="document-text-outline" label="Terms of Service" onPress={() => openLink('https://your-website.com/terms')} />
        <View style={styles.row}>
          <Ionicons name="information-circle-outline" size={22} color="#333" style={styles.rowIcon} />
          <Text style={styles.rowLabel}>App Version</Text>
          <Text style={styles.versionText}>{appVersion}</Text>
        </View>
      </SettingsSection>

      <View style={{ marginTop: 24, marginBottom: 40 }}>
        <SettingsRow icon="log-out-outline" label="Logout" color="#FF3B30" onPress={handleLogout} />
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
});

