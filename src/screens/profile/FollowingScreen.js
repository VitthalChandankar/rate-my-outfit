// src/screens/profile/FollowingScreen.js
// Instagram-like list: avatar, name, username, and Follow/Following button.

import React, { useEffect, useState, useCallback, memo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import useUserStore from '../../store/UserStore';
import useAuthStore from '../../store/authStore';
import Avatar from '../../components/Avatar';

const UserRow = memo(({ item, onToggle, isSelf, following, onNavigate }) => {
  const display = {
    name: item.name,
    username: item.username,
    picture: item.picture,
  };

  return (
    <View style={styles.row}>
      <Pressable onPress={onNavigate} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <Avatar uri={display.picture} size={44} ring />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={styles.name}>{display.name}</Text>
          {!!display.username && <Text style={styles.sub}>@{display.username}</Text>}
        </View>
      </Pressable>
      {!isSelf && (
        <Pressable
          onPress={onToggle}
          style={({ pressed }) => [styles.followBtn, following && styles.followingBtn, pressed && { opacity: 0.9 }]}
        >
          <Text style={[styles.followText, following && styles.followingText]}>
            {following ? 'Following' : 'Follow'}
          </Text>
        </Pressable>
      )}
    </View>
  );
});

export default function FollowingScreen({ route, navigation }) {
  const { userId } = route.params || {};
  const { user } = useAuthStore();
  const authedId = user?.uid || user?.user?.uid || null;

  const {
    fetchFollowing,
    loadUserProfile,
    profilesById,
    isFollowing,
    follow,
    unfollow,
    relCache,
  } = useUserStore();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const relIdOf = (followerId, followingId) => `${followerId}_${followingId}`;

  // Load initial rows
  useEffect(() => {
    setLoading(true);
    (async () => {
      const res = await fetchFollowing({ userId, reset: true });
      if (res.success) setRows(res.items || []);
      setLoading(false);
    })();
  }, [userId, fetchFollowing]);

  const ensureProfile = useCallback(async (uid) => {
    if (!uid) return null;
    const cached = profilesById[uid];
    if (cached) return cached;
    const res = await loadUserProfile(uid);
    return res.success ? res.profile : null;
  }, [profilesById, loadUserProfile]);

  const onToggle = useCallback((targetId) => {
    if (!authedId || authedId === targetId) return;
    const currentlyFollowing = relCache[relIdOf(authedId, targetId)];
    if (currentlyFollowing) {
      unfollow(authedId, targetId);
    } else {
      follow(authedId, targetId);
    }
  }, [authedId, follow, unfollow, relCache]);

  // Pre-warm relation flags
  useEffect(() => {
    if (!authedId || !rows.length) return;
    // Check cache for any missing relationship statuses and fetch them
    rows.forEach(r => {
      const targetId = r.followingId;
      if (authedId !== targetId && relCache[relIdOf(authedId, targetId)] === undefined) {
        isFollowing(authedId, targetId);
      }
    });
  }, [authedId, rows, relCache, isFollowing]);

  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Not following anyone yet.</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  
  const renderItem = useCallback(({ item }) => {
    const targetId = item.followingId;
    const cached = profilesById[targetId];
    const display = {
      name: item.followingName || cached?.name || cached?.displayName || `User ${String(targetId).slice(0, 6)}`,
      username: cached?.username || '',
      picture: item.followingPicture || cached?.profilePicture || null,
    };
    const isSelf = authedId && targetId === authedId;
    const following = !!relCache[relIdOf(authedId, targetId)];

    return <UserRow item={display} onToggle={() => onToggle(targetId)} isSelf={isSelf} following={following} onNavigate={() => navigation.navigate('UserProfile', { userId: targetId })} />;
  }, [profilesById, authedId, relCache, onToggle, navigation]);

  return (
    <FlatList
      data={rows}
      keyExtractor={(it) => it.id}
      contentContainerStyle={{ padding: 12 }}
      ListEmptyComponent={ListEmpty}
      renderItem={renderItem}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      onEndReachedThreshold={0.5}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  name: { fontWeight: '700', color: '#111' },
  sub: { color: '#777', marginTop: 2, fontSize: 12 },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#111',
  },
  followText: { color: '#fff', fontWeight: '900' },
  followingBtn: {
    backgroundColor: '#EFEFF4',
  },
  followingText: { color: '#111' },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
