// src/screens/profile/UserProfileScreen.js
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View, FlatList, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as Haptics from 'expo-haptics';
import useAuthStore from '../../store/authStore';
import useUserStore from '../../store/UserStore';
import useOutfitStore from '../../store/outfitStore';
import Avatar from '../../components/Avatar';

export default function UserProfileScreen({ route, navigation }) {
  const { userId } = route.params || {};
  const { user } = useAuthStore();
  const authedId = user?.uid || user?.user?.uid;
  const { loadUserProfile, profilesById, isFollowing, follow, unfollow } = useUserStore();
  const profile = profilesById[userId];
  const { fetchUserOutfits } = useOutfitStore();
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [rel, setRel] = useState(false);

  useEffect(() => {
    loadUserProfile(userId);
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

  const onToggleFollow = async () => {
    if (!authedId) return Alert.alert('Sign in', 'Please sign in to follow');
    if (authedId === userId) return;
    if (rel) {
      const r = await unfollow(authedId, userId);
      if (r.success) setRel(false);
    } else {
      const r = await follow(authedId, userId);
      if (r.success) setRel(true);
    }
    Haptics.selectionAsync();
  };

  const tileSize = 118;

  return (
    <FlatList
      data={posts}
      keyExtractor={(it) => String(it.id)}
      numColumns={3}
      contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 140, backgroundColor: '#F8F7FB' }} />
          <View style={styles.row}>
            <Avatar uri={profile?.profilePicture} size={92} ring />
            <View style={styles.stats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile?.stats?.followersCount || 0}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile?.stats?.followingCount || 0}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile?.stats?.postsCount || posts.length}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
            </View>
          </View>
          <Text style={styles.name}>{profile?.name || profile?.displayName || 'User'}</Text>
          {!!profile?.username && <Text style={styles.username}>@{profile.username}</Text>}
          {!!profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          {authedId !== userId && (
            <Pressable onPress={onToggleFollow} style={({ pressed }) => [styles.followBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}>
              <Text style={styles.followText}>{rel ? 'Following' : 'Follow'}</Text>
            </Pressable>
          )}
        </View>
      }
      renderItem={({ item, index }) => {
        const isEndOfRow = (index + 1) % 3 === 0;
        return (
          <Pressable
            onPress={() => navigation.navigate('OutfitDetails', { outfitId: item.id })}
            style={({ pressed }) => [
              styles.gridItem,
              !isEndOfRow && { marginRight: 3 },
              pressed && { transform: [{ scale: 0.99 }] }
            ]}
          >
            <ExpoImage source={{ uri: item.imageUrl }} style={{ width: tileSize, height: tileSize }} contentFit="cover" transition={250} />
          </Pressable>
        );
      }}
      ListEmptyComponent={!loadingPosts ? <Text style={{ textAlign: 'center', marginTop: 24, color: '#666' }}>No posts</Text> : null}
    />
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  stats: { flexDirection: 'row', marginLeft: 'auto', gap: 20, paddingRight: 4 },
  statItem: { alignItems: 'center' },
  statValue: { fontWeight: '900', color: '#111827' },
  statLabel: { color: '#6B7280', marginTop: 2, fontSize: 12 },
  name: { fontWeight: '900', color: '#111827', fontSize: 18, marginTop: 8 },
  username: { color: '#6B7280', marginTop: 2, fontWeight: '700' },
  bio: { marginTop: 6, color: '#4B5563' },
  followBtn: { marginTop: 12, backgroundColor: '#7A5AF8', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  followText: { color: '#fff', fontWeight: '900' },
  gridItem: { borderRadius: 10, overflow: 'hidden', backgroundColor: '#F2F2F7', marginTop: 3 },
});
