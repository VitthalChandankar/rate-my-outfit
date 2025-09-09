// src/screens/profile/UserProfileScreen.js
// Public profile for other users: Follow/Unfollow, no Edit button, Instagram-like stats row.

import React, { useEffect, useState, useCallback } from 'react';
import { Alert, StyleSheet, Text, View, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as Haptics from 'expo-haptics';

import useAuthStore from '../../store/authStore';
import useUserStore from '../../store/UserStore';
import { fetchUserOutfits } from '../../services/firebase';
import Avatar from '../../components/Avatar';
import ProfileGridItem from '../../components/ProfileGridItem';

export default function UserProfileScreen({ route, navigation }) {
  const { userId } = route.params || {};
  const { user } = useAuthStore();
  const authedId = user?.uid || user?.user?.uid || null;

  const { loadUserProfile, profilesById, isFollowing, follow, unfollow, relCache } = useUserStore();
  const profile = profilesById[userId];

  // Define the relationship key helper locally
  const relIdOf = (followerId, followingId) => `${followerId}_${followingId}`;
  // Get the following status reactively from the store's cache
  const rel = relCache[relIdOf(authedId, userId)];

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (userId) loadUserProfile(userId);
  }, [userId, loadUserProfile]);

  const loadPosts = useCallback(async (isReset = false) => {
    if (loading || refreshing) return;
    if (isReset) setRefreshing(true); else setLoading(true);

    const startAfter = isReset ? null : lastDoc;
    const res = await fetchUserOutfits(userId, { startAfterDoc: startAfter, limitCount: 24 });

    if (res.success) {
      const newItems = res.items || [];
      setPosts(isReset ? newItems : [...posts, ...newItems]);
      setLastDoc(res.last);
      setHasMore(!!res.last && newItems.length > 0);
    }

    if (isReset) setRefreshing(false); else setLoading(false);
  }, [userId, loading, refreshing, lastDoc, posts]);

  useEffect(() => {
    // This effect populates the cache if the relationship status isn't already known.
    if (authedId && userId && authedId !== userId && rel === undefined) {
      isFollowing(authedId, userId);
    }
  }, [authedId, userId, isFollowing, rel]);

  useEffect(() => {
    loadPosts(true); // Initial load
  }, [userId]);

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

    // The store handles the optimistic update of `relCache`.
    // The component will re-render automatically with the new `rel` value.
    if (rel) {
      const res = await unfollow(authedId, userId);
      if (res.success) loadUserProfile(userId); // Re-fetch profile to update counts
    } else {
      const res = await follow(authedId, userId);
      if (res.success) loadUserProfile(userId); // Re-fetch profile to update counts
    }
    Haptics.selectionAsync();
  };

  const renderItem = useCallback(({ item }) => (
    <ProfileGridItem item={item} onPress={handlePostPress} />
  ), [handlePostPress]);

  const onRefresh = () => loadPosts(true);
  const onEndReached = () => {
    if (!loading && hasMore) {
      loadPosts(false);
    }
  };

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
      ListEmptyComponent={!loading && !refreshing ? <Text style={{ textAlign: 'center', marginTop: 24, color: '#666' }}>No posts</Text> : null}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={loading ? <ActivityIndicator style={{ margin: 20 }} /> : null}
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
