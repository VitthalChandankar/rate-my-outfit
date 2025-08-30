// src/components/Avatar.js
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

export default function Avatar({ uri, size = 48, ring = false, ringColor = '#7A5AF8', placeholder = 'U' }) {
  const radius = size / 2;
  return (
    <View style={[styles.wrap, ring && { padding: 2, borderRadius: radius, backgroundColor: ringColor }]}>
      {uri ? (
        <ExpoImage
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: radius, backgroundColor: '#EEE' }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.fallback, { width: size, height: size, borderRadius: radius }]}>
          <Text style={{ fontWeight: '900', color: '#7A5AF8', fontSize: size * 0.4 }}>
            {String(placeholder || 'U').slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EDEDF2' },
});
