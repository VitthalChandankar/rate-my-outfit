// src/screens/profile/FollowersScreen.js
// Instagram-like list: avatar, name, username, and Follow/Following button.

import React, { useEffect, useState, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import useUserStore from '../../store/UserStore';
import useAuthStore from '../../store/authStore';
import Avatar from '../../components/Avatar';

export default function FollowersScreen({ route, navigation }) {
  const { userId } = route.params || {};
  const { user } = useAuthStore();
  const authedId = user?.uid || user?.user?.uid || null;

  const {
    fetchFollowers,
    loadUserProfile,
    profilesById,
    isFollowing,
    follow,
    unfollow,
  } = useUserStore();

  const [rows, setRows] = useState([]);

  // Load initial rows
  useEffect(() => {
    (async () => {
      const res = await fetchFollowers({ userId, reset: true });
      if (res.success) setRows(res.items || []);
    })();
  }, [userId, fetchFollowers]);

  // Helper to ensure profile data for username/name if not denormalized
  const ensureProfile = useCallback(async (uid) => {
    if (!uid) return null;
    const cached = profilesById[uid];
    if (cached) return cached;
    const res = await loadUserProfile(uid);
    return res.success ? res.profile : null;
  }, [profilesById, loadUserProfile]);

  const onToggle = useCallback(async (targetId, currentlyFollowing, index) => {
    if (!authedId) return;
    if (authedId === targetId) return; // ignore self
    let ok = false;
    if (currentlyFollowing) {
      const r = await unfollow(authedId, targetId);
      ok = !!r.success;
    } else {
      const r = await follow(authedId, targetId);
      ok = !!r.success;
    }
    if (ok) {
      // Refresh button state by checking relation again
      const rel = await isFollowing(authedId, targetId);
      setRows((prev) => {
        const copy = [...prev];
        const it = copy[index];
        if (it) it._following = !!rel.following;
        return copy;
      });
    }
  }, [authedId, follow, unfollow, isFollowing]);

  // Pre-warm relation flags
  useEffect(() => {
    (async () => {
      if (!authedId) return;
      const updates = await Promise.all((rows || []).map(async (r) => {
        const rel = await isFollowing(authedId, r.followerId);
        return { ...r, _following: !!rel.following };
      }));
      setRows(updates);
    })();
  }, [authedId, rows.length]); // run when length changes

  return (
    <FlatList
      data={rows}
      keyExtractor={(it) => it.id}
      contentContainerStyle={{ padding: 12 }}
      renderItem={({ item, index }) => {
        const targetId = item.followerId;
        const cached = profilesById[targetId];
        const display = {
          name: item.followerName || cached?.name || cached?.displayName || `User ${String(targetId).slice(0, 6)}`,
          username: cached?.username || '',
          picture: item.followerPicture || cached?.profilePicture || null,
        };
        const isSelf = authedId && targetId === authedId;
        const following = !!item._following;

        return (
          <View style={styles.row}>
            <Pressable onPress={() => navigation.navigate('UserProfile', { userId: targetId })} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Avatar uri={display.picture} size={44} ring />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.name}>{display.name}</Text>
                {!!display.username && <Text style={styles.sub}>@{display.username}</Text>}
              </View>
            </Pressable>
            {!isSelf && (
              <Pressable
                onPress={() => onToggle(targetId, following, index)}
                style={({ pressed }) => [styles.followBtn, following && styles.followingBtn, pressed && { opacity: 0.9 }]}
              >
                <Text style={[styles.followText, following && styles.followingText]}>
                  {following ? 'Following' : 'Follow'}
                </Text>
              </Pressable>
            )}
          </View>
        );
      }}
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
    backgroundColor: '#111', // dark (Instagram-like)
  },
  followText: { color: '#fff', fontWeight: '900' },
  followingBtn: {
    backgroundColor: '#EFEFF4',
  },
  followingText: { color: '#111' },
});
