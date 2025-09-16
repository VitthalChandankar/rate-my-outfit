// src/screens/details/LikedByScreen.js

import React, { useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Image as ExpoImage } from 'expo-image';

import useOutfitStore from '../../store/outfitStore';
import useAuthStore from '../../store/authStore';
import useUserStore from '../../store/UserStore';

// A simple reusable user row component
function UserRow({ user, onUserPress }) {
  if (!user) return null;
  const initial = (user.name || 'U').trim().charAt(0).toUpperCase();

  return (
    <TouchableOpacity style={styles.userRow} onPress={() => onUserPress(user.id)}>
      <>
        {user.profilePicture ? (
          <ExpoImage source={{ uri: user.profilePicture }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}><Text style={styles.avatarInitial}>{initial}</Text></View>
        )}
        <View>
          <Text style={styles.userName}>{user.name || 'User'}</Text>
          {!!user.username && <Text style={styles.userHandle}>@{user.username}</Text>}
        </View>
      </>
    </TouchableOpacity>
  );
}

export default function LikedByScreen({ route }) {
  const { outfitId } = route.params;
  const navigation = useNavigation();
  const { user: authedUser } = useAuthStore();

  const myBlockedIds = useUserStore((s) => s.myBlockedIds);
  const { fetchLikers, likers } = useOutfitStore();
  const likersBag = likers[outfitId] || { users: [], loading: true, hasMore: true };
  const filteredUsers = likersBag.users.filter(u => !myBlockedIds.has(u.id));

  useEffect(() => {
    if (outfitId) {
      fetchLikers({ outfitId, reset: true });
    }
  }, [outfitId, fetchLikers]);

  const loadMore = useCallback(() => {
    if (!likersBag.loading && likersBag.hasMore) {
      fetchLikers({ outfitId });
    }
  }, [likersBag.loading, likersBag.hasMore, outfitId, fetchLikers]);

  const handleUserPress = (userId) => {
    if (authedUser?.uid === userId) {
      navigation.navigate('Profile');
    } else {
      navigation.navigate('UserProfile', { userId });
    }
  };

  if (likersBag.loading && likersBag.users.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={filteredUsers}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <UserRow user={item} onUserPress={handleUserPress} />}
      contentContainerStyle={styles.container}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={likersBag.loading ? <ActivityIndicator style={{ margin: 20 }} /> : null}
      ListEmptyComponent={
        !likersBag.loading ? <Text style={styles.emptyText}>No one has liked this post yet.</Text> : null
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#666',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EEE', marginRight: 12 },
  avatarFallback: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#7A5AF8', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarInitial: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  userName: { fontWeight: 'bold', fontSize: 16 },
  userHandle: { color: '#666', marginTop: 2 },
});
