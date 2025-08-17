// File: src/screens/main/ProfileScreen.js
// Description: Profile header + list with stable keys and dedupe.

import React, { useCallback, useEffect, useMemo } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import useAuthStore from '../../store/authStore';
import useOutfitStore from '../../store/outfitStore';
import OutfitCard from '../../components/OutfitCard';

function ensureKey(item) {
  if (item?.id) return item;
  return { ...item, _localKey: item?._localKey || `local:${Date.now()}:${Math.random().toString(36).slice(2)}` };
}

function dedupeById(items) {
  const map = new Map();
  for (const it of items || []) {
    const key = it?.id || it?._localKey;
    if (!key) continue;
    if (!map.has(key)) map.set(key, it);
  }
  return Array.from(map.values());
}

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuthStore();
  const myOutfits = useOutfitStore((s) => s.myOutfits);
  const fetchMyOutfits = useOutfitStore((s) => s.fetchMyOutfits);

  useEffect(() => {
    fetchMyOutfits();
  }, [fetchMyOutfits]);

  const data = useMemo(() => {
    const withKeys = (myOutfits || []).map(ensureKey);
    return dedupeById(withKeys);
  }, [myOutfits]);

  const keyExtractor = useCallback((item) => String(item?.id || item?._localKey), []);

  const renderItem = useCallback(
    ({ item }) => {
      if (!item) return null;
      return (
        <OutfitCard
          item={item}
          onPress={() => item?.id && navigation.navigate('OutfitDetails', { outfitId: item.id })}
        />
      );
    },
    [navigation]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {user?.profilePicture ? (
          <Image source={{ uri: user.profilePicture }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{(user?.name || 'U').charAt(0)}</Text>
          </View>
        )}
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.name}>{user?.name || 'Your Name'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={{ color: '#FF5A5F', fontWeight: '700' }}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>My Outfits</Text>

      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 32, color: '#666' }}>No uploads yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarPlaceholder: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FF5A5F', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: '700' },
  email: { color: '#666' },
  logoutBtn: { marginLeft: 'auto' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 8 },
});
