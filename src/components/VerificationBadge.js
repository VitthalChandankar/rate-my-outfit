// src/components/VerificationBadge.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const badgeStyles = {
  basic: {
    icon: 'checkmark-circle',
    color: '#007AFF', // Blue
  },
  premium: {
    icon: 'checkmark-circle',
    color: '#FFB800', // Gold
  },
  pro: {
    icon: 'shield-checkmark',
    color: '#7A5AF8', // Purple
  },
};

export default function VerificationBadge({ level, size = 18 }) {
  if (!level || level === 'none' || !badgeStyles[level]) {
    return null;
  }

  const { icon, color } = badgeStyles[level];

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});