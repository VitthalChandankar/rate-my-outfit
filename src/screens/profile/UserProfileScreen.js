// src/screens/profile/UserProfileScreen.js
// Public profile for other users: Follow/Unfollow, no Edit button, Instagram-like stats row.

import React, { useEffect, useState, useCallback } from 'react';
import { Alert, StyleSheet, Text, View, FlatList, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as Haptics from 'expo-haptics';

import useAuthStore from '../../store/authStore';
import useUserStore from '../../store/UserStore';
import useOutfitStore from '../../store/outfitStore';
import Avatar from '../../components/Avatar';
import ProfileGridItem from '../../components/ProfileGridItem';

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

  const handlePostPress = useCallback((post) => {
    if (!post?.id) return;
    const isContest = post.type === 'contest' || !!post.contestId;
    if (isContest) {
      const target = {
        id: post.id,
        userId: post.userId || post.user?.uid || '',
        userName: post.user?.name || 'Creator',
        userPhoto: post.user?.profilePicture || null,
        imageUrl: post.imageUrl || null,
        caption: post.caption || '',
        createdAt: post.createdAt || null,
        contestId: post.contestId || null,
        averageRating: Number(post.averageRating ?? 0) || 0,
        ratingsCount: Number(post.ratingsCount ?? 0) || 0,
      };
      navigation.navigate('RateEntry', { item: target, mode: 'entry' });
    } else {
      navigation.navigate('OutfitDetails', { outfitId: post.id });
    }
  }, [navigation]);

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

  const renderItem = useCallback(({ item }) => (
    <ProfileGridItem item={item} onPress={handlePostPress} />
  ), [handlePostPress]);

  return (
    <FlatList
      data={posts}
      keyExtractor={(it) => String(it.id)}
      numColumns={3}
      columnWrapperStyle={{ margin: -1 }}
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
      renderItem={renderItem}
      ListEmptyComponent={!loadingPosts ? <Text style={{ textAlign: 'center', marginTop: 24, color: '#666' }}>No posts</Text> : null}
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 12, backgroundColor: '#fff', paddingBottom: 16, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  avatarRing: { padding: 3, borderRadius: 52, backgroundColor: '#EDE7FF' },
  statsRow: { flexDirection: 'row', marginLeft: 'auto', gap: 16, paddingRight: 2 },
  statBlock: { alignItems: 'center' },
  statValue: { fontWeight: '900', color: '#111827', fontSize: 18 },
  statLabel: { color: '#6B7280', marginTop: 2, fontSize: 12 },

  name: { fontWeight: '900', color: '#111827', fontSize: 20, marginTop: 12 },
  username: { color: '#6B7280', marginTop: 4, fontWeight: '700' },
  bio: { marginTop: 6, color: '#4B5563' },

  followBtn: {
    marginTop: 12,
    backgroundColor: '#7A5AF8',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  followText: { color: '#fff', fontWeight: '900' },
});
