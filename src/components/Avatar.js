// File: src/components/Avatar.js
// Description: Circle avatar with fallback initials

import { Image, StyleSheet, Text, View } from 'react-native';

export default function Avatar({ uri, name = '', size = 40 }) {
  const initials = (name || 'U').split(' ').map((n) => n[0]).slice(0, 2).join('');

  return uri ? (
    <Image source={{ uri }} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]} />
  ) : (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: '#FF5A5F', alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: '#fff', fontWeight: '700' }}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: '#ddd',
  },
});
