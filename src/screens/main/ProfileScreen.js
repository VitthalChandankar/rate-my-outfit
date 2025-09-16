// src/screens/main/ProfileScreen.js
// Premium self profile: gradient header, avatar ring, clean stats row (no boxes),
// segmented control, crisp grid, and actions (Edit/Share/Logout) for the signed-in user.
// ProfileScreen: the owner’s self profile inside the MainTabs.

import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
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
import AchievementBadge from '../../components/AchievementBadge';

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

export default function ProfileScreen({ navigation, route }) {
  const isFocused = useIsFocused();
  const { user, logout } = useAuthStore();
  const uid = user?.uid || user?.user?.uid || null;

  const { myProfile, loadMyProfile } = useUserStore();
  const isAdmin = myProfile?.isAdmin;
  const mySavedIds = useUserStore((s) => s.mySavedIds);
  const { setCoverPhoto, myAchievements, fetchMyAchievements, markAchievementAsSeen } = useUserStore();

  const { myOutfits, fetchMyOutfits, loading, refreshing, hasMore, deleteOutfit, savedOutfits, fetchSavedOutfits, savedOutfitsLoading, toggleSave } = useOutfitStore();
  const { contestsById } = useContestStore();

  const [tab, setTab] = useState('posts'); // posts | achievements | saved
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    if (isFocused) {
      // When focused, check for initialTab param and set it.
      // This allows other screens to navigate here and open a specific tab.
      if (route.params?.initialTab) {
        setTab(route.params.initialTab);
        // Optional: clear the param so it doesn't re-trigger on next focus
        // This is useful if the user navigates away and back to the profile tab manually.
        // For robustness, let's clear it.
        navigation.setParams({ initialTab: null });
      }
      // Always fetch posts when the screen is focused
      fetchMyOutfits({ reset: true }).finally(() => setInitialLoadComplete(true));
      if (uid) loadMyProfile(uid);
    }
  }, [isFocused, fetchMyOutfits, uid, loadMyProfile, navigation, route.params?.initialTab]);

  useEffect(() => {
    if (isFocused && tab === 'saved') fetchSavedOutfits(uid);
    if (isFocused && tab === 'achievements') {
      fetchMyAchievements(uid);
    }
  }, [isFocused, tab, fetchSavedOutfits, fetchMyAchievements, uid, mySavedIds]);

  const handleCoverPhotoChange = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [16, 9], // Enforce a widescreen aspect ratio
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      const uri = result.assets[0].uri;
      Alert.alert(
        'Update Cover Photo',
        'Do you want to set this as your new cover photo?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Update', onPress: () => setCoverPhoto(uid, uri) },
        ]
      );
    }
  };

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
      // When viewing your own profile, tapping a contest entry should go to the contest details page.
      navigation.navigate('ContestDetails', { contestId: post.contestId });
    } else {
      // For normal posts, go to the outfit details page.
      navigation.navigate('OutfitDetails', { outfitId: post.id });
    }
  }, [navigation]);

  const onRefresh = useCallback(() => fetchMyOutfits({ reset: true }), [fetchMyOutfits]);

  const onEnd = useCallback(() => {
    if (!loading && hasMore) fetchMyOutfits({ reset: false });
  }, [loading, hasMore, fetchMyOutfits]);

  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [fadeIn]);

  const showRatingsOnMyProfile = myProfile?.preferences?.showRatingsOnMyProfile ?? true;

  const renderItem = useCallback(({ item }) => (
    <ProfileGridItem item={item} onPress={handlePostPress} onLongPress={handlePostLongPress} showRating={showRatingsOnMyProfile} />
  ), [handlePostPress, handlePostLongPress, showRatingsOnMyProfile]);

  const renderAchievementItem = useCallback(({ item }) => (
    <AchievementBadge item={item} onReveal={markAchievementAsSeen} />
  ), [markAchievementAsSeen]);

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

  const SegBar = ({ tab, setTab }) => {
    const tabs = ['posts', 'achievements', 'saved'];
    const idx = tabs.indexOf(tab) ?? 0;
    const IND_W = (width - OUTER_PAD * 2) / 3;
    const anim = useRef(new Animated.Value(idx)).current;
    useEffect(() => {
      Animated.timing(anim, { toValue: idx, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    }, [idx, anim]);
    const left = anim.interpolate({ inputRange: [0, 1, 2], outputRange: [0, IND_W, IND_W * 2] });

    return (
      <View style={styles.segmentWrap}>
        {tabs.map((k) => {
          const sel = tab === k;
          const label = k.charAt(0).toUpperCase() + k.slice(1);
          return (
            <Pressable key={k} onPress={() => setTab(k)} style={({ pressed }) => [styles.segmentTab, pressed && { opacity: 0.95 }]}>
              <Text style={[styles.segmentText, sel && styles.segmentTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
        <Animated.View style={[styles.segmentIndicator, { width: IND_W, left }]} />
      </View>
    );
  };

  const ProfileHeader = () => {
    const postsCount = Math.max(0, myProfile?.stats?.postsCount ?? 0);
    return (
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.9} onPress={handleCoverPhotoChange} style={styles.coverPhotoContainer}>
          <ExpoImage source={{ uri: myProfile?.coverPhoto }} style={styles.coverPhoto} contentFit="cover" />
          <View style={styles.coverOverlay} />
          <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>

        <View style={styles.profileDetails}>
          <Avatar uri={myProfile?.profilePicture} size={88} ring ringColor="#fff" />
          <View style={styles.infoContainer}>
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{myProfile?.name || 'Your Name'}</Text>
              {!!myProfile?.username && <Text style={styles.username}>@{myProfile.username}</Text>}
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statBlock}><Text style={styles.statValue}>{postsCount}</Text><Text style={styles.statLabel}>Posts</Text></View>
              <Pressable onPress={() => navigation.navigate('Followers', { userId: uid })} style={styles.statBlock}><Text style={styles.statValue}>{myProfile?.stats?.followersCount || 0}</Text><Text style={styles.statLabel}>Followers</Text></Pressable>
              <Pressable onPress={() => navigation.navigate('Following', { userId: uid })} style={styles.statBlock}><Text style={styles.statValue}>{myProfile?.stats?.followingCount || 0}</Text><Text style={styles.statLabel}>Following</Text></Pressable>
            </View>
          </View>
        </View>

        {!!myProfile?.bio && <Text style={styles.bio}>{myProfile.bio}</Text>}
        {isAdmin && (
          <Button mode="outlined" onPress={() => navigation.navigate('AdminDashboard')} style={styles.adminButton}>
            Admin Dashboard
          </Button>
        )}
        <Button mode="contained" onPress={() => navigation.navigate('EditProfile')} style={styles.actionMain} labelStyle={styles.actionMainText}>Edit Profile</Button>
        <SegBar tab={tab} setTab={setTab} />
      </View>
    );
  };

  const listData = tab === 'posts' ? data : tab === 'saved' ? savedOutfits : myAchievements;
  const listEmpty =
    tab === 'posts'
    ? (initialLoadComplete && !loading && !refreshing ? <Text style={styles.empty}>No uploads yet — be the first to upload!</Text> : null) //TODO : add cute image that no post yet and encourage the user to post
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
        columnWrapperStyle={tab === 'achievements' ? styles.achievementsGrid : { margin: -1 }}
        renderItem={renderItem} // This is fine
        ListHeaderComponent={<ProfileHeader />}
        refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.35}
        onEndReached={onEnd}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={loading ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null}
        showsVerticalScrollIndicator={false} // This is fine
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
  header: { backgroundColor: '#FFFFFF', paddingBottom: 8 },
  coverPhotoContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#EAEAEA',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  profileDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: OUTER_PAD,
    marginTop: -20, // Controls the overlap of the avatar
  },
  infoContainer: {
    marginTop: 20,
    flex: 1,
    marginLeft: 40,
  },
  nameContainer: {
    // Container for name and username
  },
  name: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },
  username: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 2,
  },
  settingsButton: {
    position: 'absolute',
    top: SAFE_H > 0 ? SAFE_H + 8 : 24,
    right: 16,
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  bio: {
    marginTop: 16,
    paddingHorizontal: OUTER_PAD,
    color: '#4B5563',
    fontSize: 14,
  },
  statsAndActions: {
    paddingHorizontal: OUTER_PAD,
    marginTop: 16,
  },
  statsRow: { flexDirection: 'row', gap: 20, marginTop: 8 },
  statBlock: { alignItems: 'center' },
  statValue: { fontWeight: '900', color: '#111827', fontSize: 18, textAlign: 'center' },
  statLabel: { color: '#6B7280', marginTop: 2, fontSize: 12, textAlign: 'center' },
  actionMain: {
    borderRadius: 12,
    backgroundColor: '#7A5AF8',
    marginTop: 12,
    marginHorizontal: OUTER_PAD,
  },
  adminButton: {
    marginTop: 16,
    marginHorizontal: OUTER_PAD,
    borderColor: '#A43B76',
  },
  actionMainText: { color: '#fff', fontWeight: '900', letterSpacing: 0.2 },

  segmentWrap: {
    marginTop: 16,
    width: width - OUTER_PAD * 2,
    alignSelf: 'center',
    height: 40,
    position: 'relative',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  segmentIndicator: {
    position: 'absolute',
    bottom: -1,
    height: 2,
    backgroundColor: '#111827',
  },
  segmentTab: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  segmentText: { fontWeight: '700', color: '#6B7280' },
  segmentTextActive: { color: '#1F2937' },

  empty: { textAlign: 'center', marginTop: 40, color: '#666' },
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontWeight: '900', color: '#1F2937' },
  emptySub: { marginTop: 6, color: '#6B7280' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  achievementsGrid: {
    justifyContent: 'flex-start',
  },
});
