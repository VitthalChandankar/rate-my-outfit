//ProfileScreen: the owner’s self profile inside the MainTabs. 
//It shows personal stats, own uploads, and provides actions like Edit Profile.
// It assumes the current authenticated user.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Animated,
  Easing,
  Dimensions,
  Platform,
  FlatList,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import useAuthStore from '../../store/authStore';
import useOutfitStore from '../../store/outfitStore';
import useUserStore from '../../store/UserStore';

const { width } = Dimensions.get('window');
const SAFE_H = Platform.select({ ios: 44, android: 0, default: 0 });
const OUTER_PAD = 12;
const COLS = 3;
const GAP = 3;

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
  const uid = user?.uid || user?.user?.uid;
  const { myProfile, loadMyProfile } = useUserStore();

  const myOutfits = useOutfitStore((s) => s.myOutfits);
  const fetchMyOutfits = useOutfitStore((s) => s.fetchMyOutfits);
  const loading = useOutfitStore((s) => s.myOutfitsLoading);
  const hasMore = useOutfitStore((s) => s.myOutfitsHasMore);
  const refreshing = useOutfitStore((s) => s.myOutfitsRefreshing);

  const [tab, setTab] = useState('posts'); // posts | achievements | contests

  useEffect(() => {
    fetchMyOutfits({ reset: true });
    if (uid) loadMyProfile(uid);
  }, [fetchMyOutfits, uid, loadMyProfile]);

  const data = useMemo(() => {
    const withKeys = (myOutfits || []).map(ensureKey);
    return dedupeById(withKeys);
  }, [myOutfits]);

  const onRefresh = useCallback(() => fetchMyOutfits({ reset: true }), [fetchMyOutfits]);
  const onEnd = useCallback(() => {
    if (!loading && hasMore) fetchMyOutfits({ reset: false });
  }, [loading, hasMore, fetchMyOutfits]);

  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [fadeIn]);

  const SegBar = () => (
    <View style={styles.segWrap}>
      {['posts', 'achievements', 'contests'].map((k) => {
        const sel = tab === k;
        return (
          <Pressable key={k} onPress={() => setTab(k)} style={({ pressed }) => [styles.segItem, sel && styles.segItemActive, pressed && { opacity: 0.95 }]}>
            <Text style={[styles.segText, sel && styles.segTextActive]}>{k === 'posts' ? 'Posts' : k === 'achievements' ? 'Achievements' : 'Contests'}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const Header = () => (
    <View style={styles.header}>
      <View style={styles.headerBg} />
      <View style={styles.headerRow}>
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarInitial}>{(myProfile?.name || 'U').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.statsRow}>
          <Pressable onPress={() => navigation.navigate('Followers', { userId: uid })} style={{ alignItems: 'center' }}>
            <Text style={styles.statValue}>{myProfile?.stats?.followersCount || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Following', { userId: uid })} style={{ alignItems: 'center' }}>
            <Text style={styles.statValue}>{myProfile?.stats?.followingCount || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.statValue}>{myProfile?.stats?.postsCount || data.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
        </View>
      </View>

      <Text style={styles.name}>{myProfile?.name || myProfile?.displayName || 'Your Name'}</Text>
      {!!myProfile?.username && <Text style={styles.username}>@{myProfile.username}</Text>}
      {!!myProfile?.bio && <Text style={styles.bio}>{myProfile.bio}</Text>}

      <View style={styles.actionsRow}>
        <Pressable onPress={() => navigation.navigate('EditProfile')} style={({ pressed }) => [styles.btn, styles.btnOutline, pressed && { opacity: 0.95 }]}>
          <Text style={[styles.btnText, styles.btnTextOutline]}>Edit Profile</Text>
        </Pressable>
        <Pressable onPress={() => {}} style={({ pressed }) => [styles.btn, styles.btnOutline, pressed && { opacity: 0.95 }]}>
          <Text style={[styles.btnText, styles.btnTextOutline]}>Share</Text>
        </Pressable>
      </View>

      <View style={styles.segStickyWrap}>
        <SegBar />
      </View>
      <View style={{ height: 8 }} />
    </View>
  );

  const renderItem = useCallback(
    ({ item, index }) => {
      const key = item?.id || item?._localKey;
      const uri = item?.imageUrl;
      const tileSize = Math.floor((width - OUTER_PAD * 2 - GAP * (COLS - 1)) / COLS);
      const isEndOfRow = (index + 1) % COLS === 0;
      return (
        <Pressable
          key={key}
          onPress={() => item?.id && navigation.navigate('OutfitDetails', { outfitId: item.id })}
          style={({ pressed }) => [
            styles.gridItem,
            { width: tileSize, height: tileSize },
            !isEndOfRow && { marginRight: GAP },
            pressed && styles.gridItemPressed,
          ]}
        >
          {uri ? (
            <ExpoImage source={{ uri }} style={styles.gridImage} contentFit="cover" transition={250} />
          ) : (
            <View />
          )}
        </Pressable>
      );
    },
    [navigation]
  );

  // Simple placeholders for Achievements/Contests tabs (wire real data later)
  const AchievementsEmpty = () => (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>No achievements yet</Text>
      <Text style={styles.emptySub}>Join contests and earn badges.</Text>
    </View>
  );
  const ContestsEmpty = () => (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>No contest history</Text>
      <Text style={styles.emptySub}>Enter active contests to see them here.</Text>
    </View>
  );

  const listData = tab === 'posts' ? data : [];
  const listEmpty = tab === 'posts' ? (!loading ? <Text style={styles.empty}>No uploads yet — be the first to upload!</Text> : null)
    : tab === 'achievements' ? <AchievementsEmpty /> : <ContestsEmpty />;

  if (loading && (myOutfits?.length ?? 0) === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text>Loading…</Text>
      </View>
    );
  }

  return (
    <Animated.View style={{ flex: 1, backgroundColor: '#FFFFFF', opacity: fadeIn }}>
      <FlatList
        data={listData}
        keyExtractor={(item) => String(item?.id || item?._localKey)}
        renderItem={renderItem}
        ListHeaderComponent={Header}
        stickyHeaderIndices={[13]}
        refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.35}
        onEndReached={onEnd}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={loading ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null}
        contentContainerStyle={{ paddingHorizontal: OUTER_PAD, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    paddingTop: SAFE_H ? SAFE_H / 2 : 12,
    paddingHorizontal: OUTER_PAD,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  headerBg: {
    position: 'absolute',
    left: 0, right: 0, top: 0,
    height: 140,
    backgroundColor: '#F8F7FB',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  avatar: { width: 92, height: 92, borderRadius: 46, backgroundColor: '#EEE' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 28, fontWeight: '900', color: '#7A5AF8' },
  statsRow: { flexDirection: 'row', marginLeft: 'auto', gap: 20, paddingRight: 4 },
  statValue: { fontWeight: '900', color: '#111827', fontSize: 18, textAlign: 'center' },
  statLabel: { color: '#6B7280', marginTop: 2, fontSize: 12, textAlign: 'center' },
  name: { fontWeight: '900', color: '#111827', fontSize: 18, marginTop: 8 },
  username: { color: '#6B7280', marginTop: 2, fontWeight: '700' },
  bio: { marginTop: 6, color: '#4B5563' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { flex: 1, backgroundColor: '#7A5AF8', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '900' },
  btnOutline: { backgroundColor: '#F3F4F6' },
  btnTextOutline: { color: '#111827' },
  segStickyWrap: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    paddingHorizontal: OUTER_PAD,
    paddingVertical: 8,
  },
  segWrap: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    padding: 4,
  },
  segItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  segItemActive: {
    backgroundColor: '#FFFFFF',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  segText: { color: '#6B7280', fontWeight: '700' },
  segTextActive: { color: '#111827' },
  gridItem: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
    marginTop: 3,
  },
  gridItemPressed: { transform: [{ scale: 0.99 }] },
  gridImage: { width: '100%', height: '100%' },
  empty: { textAlign: 'center', marginTop: 40, color: '#666' },
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontWeight: '900', color: '#1F2937' },
  emptySub: { marginTop: 6, color: '#6B7280' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
