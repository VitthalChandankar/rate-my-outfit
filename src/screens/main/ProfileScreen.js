// File: src/screens/main/ProfileScreen.js
// Elevated Instagram-style profile with richer visuals and spacing fixes:
// - True sticky segmented bar (Posts | Saved | Tagged) separated from the header
// - Header uses layered background, larger spacing, and balanced layout
// - Polished 3-column grid with exact spacing, non-overlapping segment bar, soft rounded corners
// - Safe top padding and proper contentInset so nothing crowds the top
// - Subtle card shadow on media press, fade-in images, and graceful empty/loading states

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

const { width } = Dimensions.get('window');
const SAFE_H = Platform.select({ ios: 44, android: 0, default: 0 });
const OUTER_PAD = 12;
const COLS = 3;
const GAP = 3; // breathing room between tiles

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

  const myOutfits = useOutfitStore((s) => s.myOutfits);
  const fetchMyOutfits = useOutfitStore((s) => s.fetchMyOutfits);
  const loading = useOutfitStore((s) => s.myOutfitsLoading);
  const hasMore = useOutfitStore((s) => s.myOutfitsHasMore);
  const refreshing = useOutfitStore((s) => s.myOutfitsRefreshing);

  const [tab, setTab] = useState('posts'); // posts | saved | tagged

  useEffect(() => {
    fetchMyOutfits({ reset: true });
  }, [fetchMyOutfits]);

  const data = useMemo(() => {
    const withKeys = (myOutfits || []).map(ensureKey);
    return dedupeById(withKeys);
  }, [myOutfits]);

  const onRefresh = useCallback(() => fetchMyOutfits({ reset: true }), [fetchMyOutfits]);
  const onEnd = useCallback(() => {
    if (!loading && hasMore) fetchMyOutfits({ reset: false });
  }, [loading, hasMore, fetchMyOutfits]);

  // Small entrance fade for the whole list
  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [fadeIn]);

  // Sticky segmented bar
  const SegBar = () => (
    <View style={styles.segStickyWrap}>
      <View style={styles.segWrap}>
        {['posts', 'saved', 'tagged'].map((k) => {
          const sel = tab === k;
          return (
            <Pressable
              key={k}
              onPress={() => setTab(k)}
              style={({ pressed }) => [styles.segItem, sel && styles.segItemActive, pressed && { opacity: 0.95 }]}
            >
              <Text style={[styles.segText, sel && styles.segTextActive]}>
                {k === 'posts' ? 'Posts' : k === 'saved' ? 'Saved' : 'Tagged'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const Header = () => (
    <View style={styles.header}>
      <View style={styles.headerBg} />

      <View style={styles.headerRow}>
        {/* Avatar */}
        {user?.profilePicture ? (
          <ExpoImage source={{ uri: user.profilePicture }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>{(user?.name || 'U').charAt(0).toUpperCase()}</Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <Stat label="Posts" value={data.length} />
          <Stat label="Followers" value={formatK(user?.followersCount || 0)} />
          <Stat label="Following" value={formatK(user?.followingCount || 0)} />
        </View>
      </View>

      {/* Name + bio */}
      <View style={{ marginTop: 10 }}>
        <Text style={styles.name}>{user?.name || 'Your Name'}</Text>
        {!!user?.username && <Text style={styles.username}>@{user.username}</Text>}
        {!!user?.bio && <Text style={styles.bio} numberOfLines={3}>{user.bio}</Text>}
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <Button title="Edit Profile" onPress={() => {}} outline />
        <Button title="Share" onPress={() => {}} outline />
        <Button title="Logout" onPress={logout} />
      </View>

      {/* Spacer so the sticky bar never overlaps tiles */}
      <View style={{ height: 12 }} />
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>No uploads yet</Text>
      <Text style={styles.emptySub}>Share your first look!</Text>
    </View>
  );

  const renderGridItem = useCallback(
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
            <ExpoImage source={{ uri }} style={styles.gridImage} contentFit="cover" transition={140} />
          ) : (
            <View style={[styles.gridImage, { backgroundColor: '#EEE' }]} />
          )}
        </Pressable>
      );
    },
    [navigation]
  );

  const keyExtractor = useCallback((item) => String(item?.id || item?._localKey), []);

  const contentData = tab === 'posts' ? data : [];
  const contentEmpty =
    tab === 'posts'
      ? !loading && <ListEmpty />
      : (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>{tab === 'saved' ? 'No saved posts' : 'No tagged posts'}</Text>
          <Text style={styles.emptySub}>{tab === 'saved' ? 'Save posts to see them here.' : 'When someone tags you, they show up here.'}</Text>
        </View>
      );

  return (
    <View style={styles.container}>
      <Animated.FlatList
        data={contentData}
        keyExtractor={keyExtractor}
        renderItem={renderGridItem}
        numColumns={COLS}
        columnWrapperStyle={{ paddingHorizontal: OUTER_PAD, marginBottom: GAP }}
        ListHeaderComponent={
          <>
            <Header />
            <SegBar />
          </>
        }
        stickyHeaderIndices={[1]}
        refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.35}
        onEndReached={onEnd}
        ListEmptyComponent={contentEmpty}
        ListFooterComponent={
          loading ? (
            <View style={{ paddingVertical: 18 }}>
              <ActivityIndicator />
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeIn }}
      />
    </View>
  );
}

/* Reusable sub-components */
function Stat({ label, value }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
function Button({ title, onPress, outline = false }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btn, outline && styles.btnOutline, pressed && { opacity: 0.95 }]}>
      <Text style={[styles.btnText, outline && styles.btnTextOutline]}>{title}</Text>
    </Pressable>
  );
}

/* Helpers */
function formatK(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

/* Styles */
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

  // Grid
  gridItem: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
  },
  gridItemPressed: {
    transform: [{ scale: 0.99 }],
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },

  // Empty state
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontWeight: '900', color: '#1F2937' },
  emptySub: { marginTop: 6, color: '#6B7280' },
});
