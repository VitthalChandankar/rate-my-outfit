// src/screens/main/ProfileScreen.js
// Premium self profile: gradient header, avatar ring, clean stats row (no boxes),
// segmented control, crisp grid, and actions (Edit/Share/Logout) for the signed-in user.
// ProfileScreen: the owner’s self profile inside the MainTabs.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  TouchableOpacity,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Image as ExpoImage } from 'expo-image';
import { Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import useAuthStore from '../../store/authStore';
import useOutfitStore from '../../store/outfitStore';
import useUserStore from '../../store/UserStore';
import { fetchOutfitsByIds } from '../../services/firebase';
import useContestStore from '../../store/contestStore';
import Avatar from '../../components/Avatar';
import ProfileGridItem from '../../components/ProfileGridItem';

const { width } = Dimensions.get('window');
const SAFE_H = Platform.select({ ios: 44, android: 0, default: 0 });

// Layout constants
const OUTER_PAD = 16;
const COLS = 3;
const GAP = 2;

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

const SegBar = ({ tab, setTab }) => {
  const tabs = ['posts', 'achievements', 'saved'];
  const idx = tabs.indexOf(tab) ?? 0;
  const IND_W = (width - OUTER_PAD * 2 - 8) / 3;
  const anim = useRef(new Animated.Value(idx)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: idx, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [idx, anim]);
  const left = anim.interpolate({ inputRange: [0, 1, 2], outputRange: [4, 4 + IND_W, 4 + IND_W * 2] });

  return (
    <View style={styles.segmentWrap}>
      <Animated.View style={[styles.segmentIndicator, { width: IND_W, left }]} />
      {tabs.map((k) => {
        const sel = tab === k;
        const label = k.charAt(0).toUpperCase() + k.slice(1);
        return (
          <Pressable key={k} onPress={() => setTab(k)} style={({ pressed }) => [styles.segmentTab, pressed && { opacity: 0.95 }]}>
            <Text style={[styles.segmentText, sel && styles.segmentTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const ProfileHeader = ({ myProfile, uid, navigation, logout, tab, setTab }) => {
  const postsCount = Math.max(0, myProfile?.stats?.postsCount ?? 0);

  return (
    <View style={styles.header}>
      <View style={styles.headerBg}>
        <View style={styles.gradA} />
        <View style={styles.gradB} />
      </View>

      <View style={styles.headerRow}>
        <Avatar uri={myProfile?.profilePicture} size={96} ring />
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{postsCount}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('Followers', { userId: uid })} style={styles.statBlock}>
            <Text style={styles.statValue}>{myProfile?.stats?.followersCount || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Following', { userId: uid })} style={styles.statBlock}>
            <Text style={styles.statValue}>{myProfile?.stats?.followingCount || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.bioContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{myProfile?.name || myProfile?.displayName || 'Your Name'}</Text>
          <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        {!!myProfile?.username && <Text style={styles.username}>@{myProfile.username}</Text>}
        {!!myProfile?.bio && <Text style={styles.bio}>{myProfile.bio}</Text>}
      </View>

      <View style={styles.actionsContainer}>
        <Button mode="contained" onPress={() => navigation.navigate('EditProfile')} style={styles.actionMain} labelStyle={styles.actionMainText}>Edit Profile</Button>
      </View>

      <SegBar tab={tab} setTab={setTab} />
      <View style={{ height: 8 }} />
    </View>
  );
};

export default function ProfileScreen({ navigation }) {
  const isFocused = useIsFocused();
  const { user, logout } = useAuthStore();
  const uid = user?.uid || user?.user?.uid || null;

  const { myProfile, loadMyProfile } = useUserStore();
  const mySavedIds = useUserStore((s) => s.mySavedIds);

  const { myOutfits, fetchMyOutfits, loading, refreshing, hasMore, deleteOutfit, savedOutfits, fetchSavedOutfits, savedOutfitsLoading, toggleSave } = useOutfitStore();
  const { contestsById } = useContestStore();

  const [tab, setTab] = useState('posts'); // posts | achievements | saved

  useEffect(() => {
    if (isFocused) {
      // Always fetch posts when the screen is focused
      fetchMyOutfits({ reset: true }); 
      if (uid) loadMyProfile(uid);
    }
  }, [isFocused, fetchMyOutfits, uid, loadMyProfile]);

  useEffect(() => {
    if (isFocused && tab === 'saved') fetchSavedOutfits(uid);
  }, [isFocused, tab, fetchSavedOutfits, uid, mySavedIds]);

  const data = useMemo(() => {
    const withKeys = (myOutfits || []).map(ensureKey);
    return dedupeById(withKeys);
  }, [myOutfits]);

  const handlePostLongPress = useCallback((post) => {
    if (!post?.id) return;

    if (tab === 'saved') {
      Alert.alert(
        "Saved Post",
        "What would you like to do?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "View Post", onPress: () => handlePostPress(post) },
          {
            text: "Unsave",
            style: "destructive",
            onPress: () => toggleSave(post.id),
          },
        ]
      );
    } else {
      Alert.alert(
        "Post Options",
        "What would you like to do?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "View Post", onPress: () => handlePostPress(post) },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteOutfit(post),
          },
        ]
      );
    }
  }, [handlePostPress, deleteOutfit, tab, toggleSave]);

  const handlePostPress = useCallback((post) => {
    if (!post?.id) return;
    const isContest = post.type === 'contest' || !!post.contestId;
    if (isContest) {
      const contest = contestsById[post.contestId];
      const now = new Date();
      const contestIsActive = contest && contest.endAt && (contest.endAt.toDate ? contest.endAt.toDate() : new Date(contest.endAt)) > now;

      if (contestIsActive) {
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
        navigation.navigate('ContestDetails', { contestId: post.contestId });
      }
    } else {
      navigation.navigate('OutfitDetails', { outfitId: post.id });
    }
  }, [navigation, contestsById]);

  const onRefresh = useCallback(() => fetchMyOutfits({ reset: true }), [fetchMyOutfits]);

  const onEnd = useCallback(() => {
    if (!loading && hasMore) fetchMyOutfits({ reset: false });
  }, [loading, hasMore, fetchMyOutfits]);

  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [fadeIn]);

  const renderItem = useCallback(({ item }) => (
    <ProfileGridItem item={item} onPress={handlePostPress} onLongPress={handlePostLongPress} />
  ), [handlePostPress, handlePostLongPress]);

  const AchievementsEmpty = () => (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>No achievements yet</Text>
      <Text style={styles.emptySub}>Join contests and earn badges.</Text>
    </View>
  );

  const SavedEmpty = () => (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>No saved posts</Text>
      <Text style={styles.emptySub}>Tap the bookmark icon on a post to save it.</Text>
    </View>
  );

  const listData = tab === 'posts' ? data : tab === 'saved' ? savedOutfits : [];
  const listEmpty =
    tab === 'posts'
      ? (!loading && !refreshing ? <Text style={styles.empty}>No uploads yet — be the first to upload!</Text> : null)
      : tab === 'achievements'
      ? <AchievementsEmpty />
      : <SavedEmpty />;

  if (loading && (myOutfits?.length ?? 0) === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8, color: '#666' }}>Loading…</Text>
      </View>
    );
  }

  // Grid item height equals tile size; include marginTop ~6
  const tileSize = Math.floor((width - OUTER_PAD * 2 - GAP * (COLS - 1)) / COLS);
  const ROW_HEIGHT = tileSize + 6;

  return (
    <Animated.View style={{ flex: 1, backgroundColor: '#FFFFFF', opacity: fadeIn }}>
      <FlatList
        data={listData}
        keyExtractor={(item) => String(item?.id || item?._localKey)}
        numColumns={3}
        columnWrapperStyle={{ margin: -1 }} // This is fine
        renderItem={renderItem} // This is fine
        ListHeaderComponent={<ProfileHeader myProfile={myProfile} uid={uid} navigation={navigation} logout={logout} tab={tab} setTab={setTab} />}
        refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.35}
        onEndReached={onEnd}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={loading ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null}
        showsVerticalScrollIndicator={false}
        // Performance tuning for grid
        initialNumToRender={18}
        maxToRenderPerBatch={24}
        windowSize={9}
        removeClippedSubviews
        getItemLayout={(data, index) => ({
          length: ROW_HEIGHT,
          offset: ROW_HEIGHT * index,
          index,
        })}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    // The header now controls its own padding
    paddingTop: SAFE_H ? SAFE_H / 2 : 12,
    paddingHorizontal: OUTER_PAD,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    position: 'relative',
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
  statsRow: { flexDirection: 'row', flex: 1, justifyContent: 'space-around', marginLeft: 16 },
  statBlock: { alignItems: 'center' },
  statValue: { fontWeight: '900', color: '#111827', fontSize: 18, textAlign: 'center' },
  statLabel: { color: '#6B7280', marginTop: 2, fontSize: 12, textAlign: 'center' },

  bioContainer: {
    marginTop: 12,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: { fontWeight: '900', color: '#111827', fontSize: 20, letterSpacing: -0.2 },
  settingsButton: { padding: 4 },
  username: { color: '#6B7280', marginTop: 4, fontWeight: '700' },
  bio: { marginTop: 6, color: '#4B5563' },

  actionsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  actionMain: { flex: 1, borderRadius: 12, backgroundColor: '#1ABC9C' },
  actionMainText: { color: '#fff', fontWeight: '900', letterSpacing: 0.2 },
  actionGhost: { flex: 1, borderRadius: 12 },
  actionGhostText: { fontWeight: '800' },

  segmentWrap: {
    marginTop: 16,
    width: width - OUTER_PAD * 2,
    alignSelf: 'center',
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(26, 188, 156, 0.08)',
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

  empty: { textAlign: 'center', marginTop: 40, color: '#666' },
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontWeight: '900', color: '#1F2937' },
  emptySub: { marginTop: 6, color: '#6B7280' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
});
