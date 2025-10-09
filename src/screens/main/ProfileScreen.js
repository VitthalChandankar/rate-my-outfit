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
// AchievementBadge will be dynamically imported to avoid useInsertionEffect warnings
// import AchievementBadge from '../../components/AchievementBadge';
import VerificationBadge from '../../components/VerificationBadge';

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

  // Use granular selectors for state from Zustand. This ensures the component
  // re-renders correctly when only specific parts of the store change,
  // which is crucial for the achievement reset feature to work reliably.
  const myProfile = useUserStore(s => s.myProfile);
  const loadMyProfile = useUserStore(s => s.loadMyProfile);
  const setCoverPhoto = useUserStore(s => s.setCoverPhoto);
  const myAchievements = useUserStore(s => s.myAchievements);
  const myAchievementsLoading = useUserStore(s => s.myAchievementsLoading);
  const fetchMyAchievements = useUserStore(s => s.fetchMyAchievements);
  const markAchievementAsSeen = useUserStore(s => s.markAchievementAsSeen);
  const mySavedIds = useUserStore((s) => s.mySavedIds);

  const isAdmin = myProfile?.isAdmin;

  // Use granular selectors for the outfit store to prevent unnecessary re-renders.
  const {
    myOutfits,
    fetchMyOutfits,
    myOutfitsLoading,
    myOutfitsRefreshing,
    myOutfitsHasMore,
    deleteOutfit,
    savedOutfits,
    fetchSavedOutfits,
    savedOutfitsLoading,
    toggleSave,
  } = useOutfitStore(state => ({
    myOutfits: state.myOutfits,
    fetchMyOutfits: state.fetchMyOutfits,
    myOutfitsLoading: state.myOutfitsLoading,
    myOutfitsRefreshing: state.myOutfitsRefreshing,
    myOutfitsHasMore: state.myOutfitsHasMore,
    deleteOutfit: state.deleteOutfit,
    savedOutfits: state.savedOutfits,
    fetchSavedOutfits: state.fetchSavedOutfits,
    savedOutfitsLoading: state.savedOutfitsLoading,
    toggleSave: state.toggleSave,
  }));
  const { contestsById } = useContestStore();

  const [tab, setTab] = useState('posts'); // posts | achievements | saved
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Lazy-load AchievementBadge to avoid running its hooks during the ProfileScreen initial render
  const [AchievementBadgeComp, setAchievementBadgeComp] = useState(null);
  useEffect(() => {
    let mounted = true;
    // Only load when achievements tab could be shown or profile mounts
    (async () => {
      try {
        const mod = await import('../../components/AchievementBadge');
        if (mounted) setAchievementBadgeComp(() => mod.default);
      } catch (e) {
        // ignore - we'll render fallback content if import fails
      }
    })();
    return () => { mounted = false; };
  }, []);

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
  }, [isFocused, tab, fetchSavedOutfits, fetchMyAchievements, uid]);

  const handleCoverPhotoChange = async () => {
    try {
      // Ensure user has granted permission to access the media library.
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Please grant permission to access your photo library to change the cover photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Corrected from MediaType to MediaTypeOptions
        allowsEditing: true,
        aspect: [16, 9],
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
    } catch (error) {
      console.error("handleCoverPhotoChange error:", error);
      Alert.alert('Error', 'An unexpected error occurred while trying to select a photo.');
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

  const onRefresh = useCallback(() => {
    if (tab === 'posts') {
      fetchMyOutfits({ reset: true });
    } else if (tab === 'achievements') {
      fetchMyAchievements(uid);
    } else if (tab === 'saved') {
      fetchSavedOutfits(uid);
    }
  }, [tab, fetchMyOutfits, fetchMyAchievements, fetchSavedOutfits, uid]);

  const onEnd = useCallback(() => {
    if (tab === 'posts' && !myOutfitsLoading && myOutfitsHasMore) fetchMyOutfits({ reset: false });
  }, [tab, myOutfitsLoading, myOutfitsHasMore, fetchMyOutfits]);

  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [fadeIn]);

  const showRatingsOnMyProfile = myProfile?.preferences?.showRatingsOnMyProfile ?? true;

  const renderItem = useCallback(({ item }) => (
    <ProfileGridItem item={item} onPress={handlePostPress} onLongPress={handlePostLongPress} showRating={showRatingsOnMyProfile} />
  ), [handlePostPress, handlePostLongPress, showRatingsOnMyProfile]);

  // Use the dynamically loaded component if available; otherwise show a simple placeholder for achievements grid items.
  const renderAchievementItem = useCallback(({ item }) => {
    if (AchievementBadgeComp) {
      const Comp = AchievementBadgeComp;
      return <Comp item={item} onReveal={markAchievementAsSeen} />;
    }
    // fallback placeholder while AchievementBadge module loads
    return (
      <Pressable style={{ width: Math.floor((width - OUTER_PAD * 2 - GAP * (COLS - 1)) / COLS), height: 120, alignItems: 'center', justifyContent: 'center' }}>
      </Pressable>
    );
  }, [AchievementBadgeComp, markAchievementAsSeen]);

  const SavedEmpty = () => (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>No saved posts</Text>
      <Text style={styles.emptySub}>Tap the bookmark icon on a post to save it.</Text>
    </View>
  );

  const AchievementsEmpty = () => (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>No achievements yet</Text>
      <Text style={styles.emptySub}>Join contests and earn badges.</Text>
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
        <View style={styles.coverPhotoContainer}>
          <TouchableOpacity activeOpacity={0.9} onPress={handleCoverPhotoChange} style={StyleSheet.absoluteFill}>
            <>
              <ExpoImage source={{ uri: myProfile?.coverPhoto }} style={styles.coverPhoto} contentFit="cover" />
              <View style={styles.coverOverlay} />
            </>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileDetails}>
          <Avatar uri={myProfile?.profilePicture} size={88} ring ringColor="#fff" />
          <View style={styles.infoContainer}>
            <View style={styles.nameContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.name}>{myProfile?.name || 'Your Name'}</Text>
                <VerificationBadge level={myProfile?.verification?.level} size={22} />
              </View>
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
  const isListLoading = tab === 'posts' ? myOutfitsLoading : tab === 'saved' ? savedOutfitsLoading : myAchievementsLoading;
  const isRefreshing = tab === 'posts' ? myOutfitsRefreshing : tab === 'saved' ? savedOutfitsLoading : myAchievementsLoading;
  const renderItemToUse = tab === 'posts' || tab === 'saved' ? renderItem : renderAchievementItem;

  const listEmpty = !isListLoading && !isRefreshing ? (
    tab === 'posts' ? (initialLoadComplete ? <Text style={styles.empty}>No uploads yet — be the first to upload!</Text> : null)
    : tab === 'achievements' ? <AchievementsEmpty />
    : <SavedEmpty />
  ) : null;

  // Show loading indicator only on initial load of the 'posts' tab
  if (myOutfitsLoading && !myOutfitsRefreshing && (myOutfits?.length ?? 0) === 0 && tab === 'posts') {
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
        renderItem={renderItemToUse}
        ListHeaderComponent={<ProfileHeader />}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.35}
        onEndReached={onEnd}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={isListLoading && !isRefreshing ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null}
        showsVerticalScrollIndicator={false}
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
    marginTop: -20,
  },
  infoContainer: {
    marginTop: 20,
    flex: 1,
    marginLeft: 40,
  },
  nameContainer: {},
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
