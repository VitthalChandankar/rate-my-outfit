// src/screens/settings/BlockedUsersScreen.js
import React, { useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import useUserStore from '../../store/UserStore';
import Avatar from '../../components/Avatar';

function BlockedUserRow({ user, onUnblock }) {
  if (!user) return null;

  return (
    <View style={styles.row}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <Avatar uri={user.profilePicture} size={44} ring />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={styles.name}>{user.name || 'User'}</Text>
          {!!user.username && <Text style={styles.sub}>@{user.username}</Text>}
        </View>
      </View>
      <Pressable
        onPress={onUnblock}
        style={({ pressed }) => [styles.unblockBtn, pressed && { opacity: 0.9 }]}
      >
        <Text style={styles.unblockText}>Unblock</Text>
      </Pressable>
    </View>
  );
}

export default function BlockedUsersScreen() {
  const isFocused = useIsFocused();
  const { blockedUsers, blockedUsersLoading, fetchBlockedUsers, unblockUser } = useUserStore();

  useEffect(() => {
    if (isFocused) {
      fetchBlockedUsers();
    }
  }, [isFocused, fetchBlockedUsers]);

  const handleUnblock = useCallback((userId) => {
    unblockUser(userId);
  }, [unblockUser]);

  const renderItem = useCallback(({ item }) => (
    <BlockedUserRow user={item} onUnblock={() => handleUnblock(item.id)} />
  ), [handleUnblock]);

  if (blockedUsersLoading && blockedUsers.length === 0) {
    return <View style={styles.center}><ActivityIndicator /></View>;
  }

  return (
    <FlatList
      data={blockedUsers}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.container}
      ListEmptyComponent={
        !blockedUsersLoading ? <Text style={styles.emptyText}>You haven't blocked anyone.</Text> : null
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#fff', padding: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#666' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  name: { fontWeight: '700', color: '#111' },
  sub: { color: '#777', marginTop: 2, fontSize: 12 },
  unblockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#EFEFF4',
  },
  unblockText: { color: '#111', fontWeight: '700' },
});