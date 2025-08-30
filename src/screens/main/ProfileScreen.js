// src/screens/main/ProfileScreen.js
// Premium profile UI: gradient header, avatar with gradient ring, pill stats,
// glossy segmented bar, refined actions (Edit/Share/Logout), and crisp 3-col grid.

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
import { Button, Surface } from 'react-native-paper';
import useAuthStore from '../../store/authStore';
import useOutfitStore from '../../store/outfitStore';
import useUserStore from '../../store/UserStore';
import Avatar from '../../components/Avatar';

const { width } = Dimensions.get('window');
const SAFE_H = Platform.select({ ios: 44, android: 0, default: 0 });
const OUTER_PAD = 16;
const COLS = 3;
const GAP = 4;

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
    Animated.timing(fadeIn, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [fadeIn]);

  const postsCount = (myProfile?.stats?.postsCount ?? 0) || (data?.length ?? 0);

  const SegBar = () => {
    const idx = { posts: 0, achievements: 1, contests: 2 }[tab] ?? 0;
    const IND_W = (width - OUTER_PAD * 2 - 8) / 3; // fits container
    const anim = useRef(new Animated.Value(idx)).current;
    useEffect(() => {
      Animated.timing(anim, { toValue: idx, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    }, [idx, anim]);
    const left = anim.interpolate({ inputRange: [0, 1, 2], outputRange: [4, 4 + IND_W, 4 + IND_W * 2] });

    return (
      <View style={styles.segmentWrap}>
        <Animated.View style={[styles.segmentIndicator, { width: IND_W, left }]} />
        {['posts', 'achievements', 'contests'].map((k) => {
          const sel = tab === k;
          const label = k === 'posts' ? 'Posts' : k === 'achievements' ? 'Achievements' : 'Contests';
          return (
            <Pressable
              key={k}
              onPress={() => setTab(k)}
              style={({ pressed }) => [styles.segmentTab, pressed && { opacity: 0.95 }]}
            >
              <Text style={[styles.segmentText, sel && styles.segmentTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  const Header = () => (
    <View style={styles.header}>
      {/* Gradient header backdrop */}
      <View style={styles.headerBg}>
        <View style={styles.gradA} />
        <View style={styles.gradB} />
      </View>

      <View style={styles.headerRow}>
        {/* Avatar with gradient ring */}
        <View style={styles.avatarRing}>
          <Avatar uri={myProfile?.profilePicture} size={92} ring />
        </View>

        {/* Pill stats */}
        <View style={styles.statsRow}>
          <Pressable onPress={() => navigation.navigate('Followers', { userId: uid })} style={({ pressed }) => [styles.pill, pressed && { opacity: 0.9 }]}>
            <Text style={styles.pillValue}>{myProfile?.stats?.followersCount || 0}</Text>
            <Text style={styles.pillLabel}>Followers</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Following', { userId: uid })} style={({ pressed }) => [styles.pill, pressed && { opacity: 0.9 }]}>
            <Text style={styles.pillValue}>{myProfile?.stats?.followingCount || 0}</Text>
            <Text style={styles.pillLabel}>Following</Text>
          </Pressable>
          <View style={styles.pill}>
            <Text style={styles.pillValue}>{postsCount}</Text>
            <Text style={styles.pillLabel}>Posts</Text>
          </View>
        </View>
      </View>

      {/* Name / username / bio */}
      <Text style={styles.name}>{myProfile?.name || myProfile?.displayName || 'Your Name'}</Text>
      {!!myProfile?.username && <Text style={styles.username}>@{myProfile.username}</Text>}
      {!!myProfile?.bio && <Text style={styles.bio}>{myProfile.bio}</Text>}

      {/* Actions */}
      <View style={styles.actionsRow}>
        <Button mode="contained" onPress={() => navigation.navigate('EditProfile')} style={styles.actionMain} labelStyle={styles.actionMainText}>
          Edit Profile
        </Button>
        <Button mode="elevated" onPress={() => { /* TODO: share */ }} style={styles.actionGhost} labelStyle={styles.actionGhostText}>
          Share
        </Button>
        <Button mode="outlined" onPress={logout} style={styles.actionGhost} labelStyle={styles.actionGhostText}>
          Logout
        </Button>
      </View>

      {/* Segmented control */}
      <SegBar />
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
  const listEmpty =
    tab === 'posts'
      ? !loading && <Text style={styles.empty}>No uploads yet — be the first to upload!</Text>
      : tab === 'achievements'
      ? <AchievementsEmpty />
      : <ContestsEmpty />;

  if (loading && (myOutfits?.length ?? 0) === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8, color: '#666' }}>Loading…</Text>
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
  header: {
    paddingTop: SAFE_H ? SAFE_H / 2 : 12,
    paddingHorizontal: OUTER_PAD,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  headerBg: {
    position: 'absolute',
    left: 0, right: 0, top: 0,
    height: 160,
    overflow: 'hidden',
  },
  gradA: {
    position: 'absolute',
    left: -40, right: -40, top: -80, height: 200,
    backgroundColor: '#7A5AF8', opacity: 0.25, borderBottomLeftRadius: 60, borderBottomRightRadius: 60,
    transform: [{ skewY: '-6deg' }],
  },
  gradB: {
    position: 'absolute',
    left: -20, right: -20, top: -60, height: 180,
    backgroundColor: '#D946EF', opacity: 0.18, borderBottomLeftRadius: 50, borderBottomRightRadius: 50,
    transform: [{ skewY: '5deg' }],
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  avatarRing: {
    padding: 3,
    borderRadius: 52,
    backgroundColor: '#EDE7FF',
  },
  statsRow: { flexDirection: 'row', marginLeft: 'auto', gap: 10, paddingRight: 2 },
  pill: {
    backgroundColor: '#F7F7FB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 84,
  },
  pillValue: { fontWeight: '900', color: '#111827', fontSize: 16 },
  pillLabel: { color: '#6B7280', marginTop: 2, fontSize: 12 },
  name: { fontWeight: '900', color: '#111827', fontSize: 20, marginTop: 12, letterSpacing: -0.2 },
  username: { color: '#6B7280', marginTop: 4, fontWeight: '700' },
  bio: { marginTop: 6, color: '#4B5563' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionMain: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#7A5AF8',
  },
  actionMainText: { color: '#fff', fontWeight: '900', letterSpacing: 0.2 },
  actionGhost: {
    flex: 1,
    borderRadius: 12,
  },
  actionGhostText: { fontWeight: '800' },
  segmentWrap: {
    marginTop: 16,
    width: width - OUTER_PAD * 2,
    alignSelf: 'center',
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(122,90,248,0.08)',
    overflow: 'hidden',
    position: 'relative',
    flexDirection: 'row',
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  segmentIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  segmentTab: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  segmentText: { fontWeight: '700', color: '#6B7280' },
  segmentTextActive: { color: '#1F2937' },

  gridItem: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
    marginTop: 6,
  },
  gridItemPressed: { transform: [{ scale: 0.985 }] },
  gridImage: { width: '100%', height: '100%' },

  empty: { textAlign: 'center', marginTop: 40, color: '#666' },
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontWeight: '900', color: '#1F2937' },
  emptySub: { marginTop: 6, color: '#6B7280' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
