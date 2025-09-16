// src/screens/settings/ReportProblemScreen.js
import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, SegmentedButtons } from 'react-native-paper';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import showAlert from '../../utils/showAlert';
import useAuthStore from '../../store/authStore';
import useUserStore from '../../store/UserStore';
import { createProblemReport } from '../../services/firebase';

export default function ReportProblemScreen({ navigation }) {
  const { user } = useAuthStore();
  const { myProfile } = useUserStore();
  const [category, setCategory] = useState('bug');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      showAlert('Missing Description', 'Please describe the problem you are experiencing.');
      return;
    }
    if (!user?.uid || !myProfile) {
      showAlert('Error', 'Could not identify user. Please try again.');
      return;
    }

    setLoading(true);

    const reportData = {
      reporterId: user.uid,
      reporterName: myProfile.name || 'N/A',
      reporterUsername: myProfile.username || 'N/A',
      category,
      description,
      appVersion: Application.nativeApplicationVersion,
      deviceInfo: {
        os: Device.osName,
        osVersion: Device.osVersion,
        device: Device.modelName,
      },
    };

    const res = await createProblemReport(reportData);
    setLoading(false);

    if (res.success) {
      showAlert(
        'Report Sent',
        'Thank you for your feedback! Our team will review your report.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else {
      showAlert('Submission Failed', res.error?.message || 'Could not send your report. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Report a Problem</Text>
      <Text style={styles.subtitle}>Help us improve Rate My Outfit by describing the issue you've encountered.</Text>

      <Text style={styles.label}>Category</Text>
      <SegmentedButtons
        value={category}
        onValueChange={setCategory}
        buttons={[
          { value: 'bug', label: 'Bug' },
          { value: 'user', label: 'User' },
          { value: 'content', label: 'Content' },
          { value: 'other', label: 'Other' },
        ]}
        style={styles.segmentedButtons}
      />

      <TextInput
        label="Description"
        value={description}
        onChangeText={setDescription}
        mode="outlined"
        multiline
        numberOfLines={6}
        style={styles.input}
        maxLength={1000}
      />

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        Submit Report
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  contentContainer: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  segmentedButtons: { marginBottom: 20 },
  input: { minHeight: 120, textAlignVertical: 'top' },
  button: { marginTop: 24, paddingVertical: 8 },
});