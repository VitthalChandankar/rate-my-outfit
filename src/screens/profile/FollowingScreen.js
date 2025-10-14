// src/screens/profile/FollowingScreen.js
// Instagram-like list: avatar, name, username, and Follow/Following button.

import React, { useEffect, useState, useCallback, memo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, ActivityIndicator, TextInput } from 'react-native';
import { withCloudinaryTransforms, IMG_SQUARE_THUMB } from '../../utils/cloudinaryUrl';
import useUserStore from '../../store/UserStore';
import useAuthStore from '../../store/authStore';
import Avatar from '../../components/Avatar';
import { Ionicons } from '@expo/vector-icons';

const UserRow = memo(({ item, onToggle, isSelf, following, onNavigate }) => {
  const display = {
    name: item.name,
    username: item.username,
    picture: item.picture,
  };

  return (
    <View style={styles.row}>
      <Pressable onPress={onNavigate} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <Avatar uri={withCloudinaryTransforms(display.picture, IMG_SQUARE_THUMB)} size={44} ring />
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
    myBlockedIds,
    relCache,
  } = useUserStore();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const relIdOf = (followerId, followingId) => `${followerId}_${followingId}`;

  // Load initial rows
  useEffect(() => {
    setLoading(true);
    (async () => {
      const res = await fetchFollowing({ userId, reset: true });
      if (res.success && res.items?.length > 0) {
        setRows(res.items);
        // Eagerly load profiles for all fetched users
        const followingIds = res.items.map(item => item.followingId);
        await Promise.all(followingIds.map(id => ensureProfile(id)));
      } else {
        setRows(res.items || []);
      }
      setLoading(false);
    })();
  }, [userId, fetchFollowing, ensureProfile]);

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

  const filteredRows = React.useMemo(() => {
    // First, filter out any users that the logged-in user has blocked.
    const unblockedRows = rows.filter(row => !myBlockedIds.has(row.followingId));

    if (!searchQuery.trim()) {
      return unblockedRows;
    }

    const lowercasedQuery = searchQuery.toLowerCase();
    return unblockedRows.filter(row => {
      const targetId = row.followingId;
      const cached = profilesById[targetId];
      const name = row.followingName || cached?.name || cached?.displayName || '';
      const username = cached?.username || '';
      return name.toLowerCase().includes(lowercasedQuery) || username.toLowerCase().includes(lowercasedQuery);
    });
  }, [rows, searchQuery, profilesById, myBlockedIds]);

  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Not following anyone yet.</Text>
    </View>
  );

  const renderItem = useCallback(({ item }) => {
    const targetId = item.followingId;
    const cached = profilesById[targetId];
    const display = {
      name: item.followingName || cached?.name || cached?.displayName || `User ${String(targetId).slice(0, 6)}`,
      username: item.followingUsername || cached?.username || '',
      picture: item.followingPicture || cached?.profilePicture || null,
    };
    const isSelf = authedId && targetId === authedId;
    const following = !!relCache[relIdOf(authedId, targetId)];

    return <UserRow item={display} onToggle={() => onToggle(targetId)} isSelf={isSelf} following={following} onNavigate={() => navigation.navigate('UserProfile', { userId: targetId })} />;    
  }, [profilesById, authedId, relCache, onToggle, navigation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  return (
    <View style={styles.screenContainer}>
      {route.params?.searchVisible && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            placeholder="Search following..."
            placeholderTextColor="#999"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            clearButtonMode="while-editing"
          />
        </View>
      )}
      <FlatList
        data={filteredRows}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={ListEmpty}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#fff' },
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
});
