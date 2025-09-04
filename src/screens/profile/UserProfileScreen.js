// src/screens/profile/UserProfileScreen.js
// Public profile for other users: Follow/Unfollow, no Edit button, Instagram-like stats row.

import React, { useEffect, useState, useMemo } from 'react';
import { Alert, StyleSheet, Text, View, FlatList, Pressable, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as Haptics from 'expo-haptics';

import useAuthStore from '../../store/authStore';
import useUserStore from '../../store/UserStore';
import useOutfitStore from '../../store/outfitStore';
import Avatar from '../../components/Avatar';

const { width } = Dimensions.get('window');
const OUTER_PAD = 16;
const COLS = 3;
const GAP = 4;

export default function UserProfileScreen({ route, navigation }) {
  const { userId } = route.params || {};
  const { user } = useAuthStore();
  const authedId = user?.uid || user?.user?.uid || null;

  const { loadUserProfile, profilesById, isFollowing, follow, unfollow } = useUserStore();
  const profile = profilesById[userId];

  const { fetchUserOutfits } = useOutfitStore();

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [rel, setRel] = useState(false);

  useEffect(() => {
    if (userId) loadUserProfile(userId);
  }, [userId, loadUserProfile]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!authedId || authedId === userId) return;
      const res = await isFollowing(authedId, userId);
      if (mounted && res.success) setRel(res.following);
    })();
    return () => { mounted = false; };
  }, [authedId, userId, isFollowing]);

  useEffect(() => {
    (async () => {
      setLoadingPosts(true);
      const res = await fetchUserOutfits(userId, { limitCount: 60 });
      setLoadingPosts(false);
      if (res.success) setPosts(res.items || []);
    })();
  }, [userId, fetchUserOutfits]);

  const tileSize = useMemo(() => {
    return Math.floor((width - OUTER_PAD * 2 - GAP * (COLS - 1)) / COLS);
  }, []);

  const onToggleFollow = async () => {
    if (!authedId) return Alert.alert('Sign in', 'Please sign in to follow');
    if (authedId === userId) return;
    if (rel) {
      const r = await unfollow(authedId, userId);
      if (r.success) {
        setRel(false);
        // refresh header counters after client-side decrement
        await loadUserProfile(userId);
      }
    } else {
      const r = await follow(authedId, userId);
      if (r.success) {
        setRel(true);
        await loadUserProfile(userId);
      }
    }
    Haptics.selectionAsync();
  };

  return (
    <FlatList
      data={posts}
      keyExtractor={(it) => String(it.id)}
      numColumns={3}
      contentContainerStyle={{ paddingHorizontal: OUTER_PAD, paddingBottom: 24 }}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.avatarRing}>
              <Avatar uri={profile?.profilePicture} size={96} ring />
            </View>
            <View style={styles.statsRow}>
              <Pressable onPress={() => navigation.navigate('Followers', { userId })} style={styles.statBlock}>
                <Text style={styles.statValue}>{profile?.stats?.followersCount || 0}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate('Following', { userId })} style={styles.statBlock}>
                <Text style={styles.statValue}>{profile?.stats?.followingCount || 0}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </Pressable>
              <View style={styles.statBlock}>
                <Text style={styles.statValue}>{profile?.stats?.postsCount || posts.length}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
            </View>
          </View>

          <Text style={styles.name}>{profile?.name || profile?.displayName || 'User'}</Text>
          {!!profile?.username && <Text style={styles.username}>@{profile.username}</Text>}
          {!!profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          {authedId !== userId && (
            <Pressable onPress={onToggleFollow} style={({ pressed }) => [styles.followBtn, pressed && { opacity: 0.9 }]}>
              <Text style={styles.followText}>{rel ? 'Following' : 'Follow'}</Text>
            </Pressable>
          )}
        </View>
      }
      renderItem={({ item, index }) => {
        const isEndOfRow = (index + 1) % COLS === 0;
        return (
          <Pressable
            onPress={() => navigation.navigate('OutfitDetails', { outfitId: item.id })}
            style={({ pressed }) => [
              styles.gridItem,
              { width: tileSize, height: tileSize },
              !isEndOfRow && { marginRight: GAP },
              pressed && { transform: [{ scale: 0.985 }] }
            ]}
          >
            <ExpoImage source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={250} />
          </Pressable>
        );
      }}
      ListEmptyComponent={!loadingPosts ? <Text style={{ textAlign: 'center', marginTop: 24, color: '#666' }}>No posts</Text> : null}
    />
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 12, backgroundColor: '#fff', paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: OUTER_PAD, marginTop: 8 },
  avatarRing: { padding: 3, borderRadius: 52, backgroundColor: '#EDE7FF' },
  statsRow: { flexDirection: 'row', marginLeft: 'auto', gap: 16, paddingRight: 2 },
  statBlock: { alignItems: 'center' },
  statValue: { fontWeight: '900', color: '#111827', fontSize: 18 },
  statLabel: { color: '#6B7280', marginTop: 2, fontSize: 12 },

  name: { fontWeight: '900', color: '#111827', fontSize: 20, marginTop: 12, paddingHorizontal: OUTER_PAD },
  username: { color: '#6B7280', marginTop: 4, fontWeight: '700', paddingHorizontal: OUTER_PAD },
  bio: { marginTop: 6, color: '#4B5563', paddingHorizontal: OUTER_PAD },

  followBtn: {
    marginTop: 12,
    marginHorizontal: OUTER_PAD,
    backgroundColor: '#7A5AF8',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  followText: { color: '#fff', fontWeight: '900' },

  gridItem: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
    marginTop: 6,
  },
});
