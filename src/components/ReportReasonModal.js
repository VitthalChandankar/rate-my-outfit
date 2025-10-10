// src/components/ReportReasonModal.js
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { Text, Button, TextInput, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

const REPORT_REASONS = [
  { key: 'spam', label: 'Spam or misleading' },
  { key: 'hate_speech', label: 'Hate speech or symbols' },
  { key: 'harassment', label: 'Harassment or bullying' },
  { key: 'nudity', label: 'Nudity or sexual content' },
  { key: 'violence', label: 'Violence or dangerous acts' },
  { key: 'intellectual_property', label: 'Intellectual property violation' },
  { key: 'self_harm', label: 'Self-harm or suicide' },
  { key: 'other', label: 'Other (please specify)' },
];

export default function ReportReasonModal({ isVisible, onClose, onReportConfirm, post }) {
  const [selectedReason, setSelectedReason] = useState(null);
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSelectReason = (reasonKey) => {
    setSelectedReason(reasonKey);
    if (reasonKey !== 'other') {
      setCustomReason(''); // Clear custom reason if a predefined one is selected
    }
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      // You might want to show a toast or alert here
      return;
    }

    setSubmitting(true);
    const finalReason = selectedReason === 'other' && customReason.trim()
      ? customReason.trim()
      : REPORT_REASONS.find(r => r.key === selectedReason)?.label || selectedReason;

    await onReportConfirm(post, finalReason);
    setSubmitting(false);
    // Reset state after submission
    setSelectedReason(null);
    setCustomReason('');
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOuterContainer}>
        {/* Backdrop that can be tapped to close */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        {/* The actual content sheet */}
        <View style={styles.modalContainer}>
        <View style={styles.content}>
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>
          <Text style={styles.title}>Report Post</Text>
          <Text style={styles.subtitle}>Help us understand the issue. What's wrong with this post?</Text>

          <ScrollView style={styles.reasonsContainer}>
            {REPORT_REASONS.map((reason) => (
              <Chip
                key={reason.key}
                icon={selectedReason === reason.key ? 'check' : undefined}
                selected={selectedReason === reason.key}
                onPress={() => handleSelectReason(reason.key)}
                style={styles.chip}
                textStyle={styles.chipText}
                selectedColor="#7A5AF8"
              >
                {reason.label}
              </Chip>
            ))}
          </ScrollView>

          {selectedReason === 'other' && (
            <TextInput
              label="Please specify"
              value={customReason}
              onChangeText={setCustomReason}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.customReasonInput}
              maxLength={200}
            />
          )}

          <View style={styles.buttonContainer}>
            <Button mode="outlined" onPress={onClose} disabled={submitting} style={styles.cancelButton}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting || !selectedReason}
              style={styles.submitButton}
            >
              Submit Report
            </Button>
          </View>
        </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOuterContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdrop: {
    flex: 1, // Takes up all space above the content sheet
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '65%', // Take up 65% of the screen height from the bottom
    // The padding is now on the inner content view
  },
  content: {
    flex: 1, // Ensure content fills the modal container
    width: '100%',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  reasonsContainer: {
    marginBottom: 15,
  },
  chip: {
    marginVertical: 4,
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    borderWidth: 1,
  },
  chipText: {
    color: '#333',
    fontWeight: '500',
  },
  customReasonInput: {
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#D92D20', // Red for destructive action
  },
  handleContainer: {
    alignItems: 'center',
    paddingBottom: 10, // Give it some space from the title
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#D1D5DB', // A light grey color
  },
});