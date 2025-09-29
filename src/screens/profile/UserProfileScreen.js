// src/screens/profile/UserProfileScreen.js
// Public profile for other users: Follow/Unfollow, no Edit button, Instagram-like stats row.

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import showAlert from '../../utils/showAlert';
import { firestore } from '../../services/firebase';
import * as Haptics from 'expo-haptics';

import useAuthStore from '../../store/authStore';
import useUserStore from '../../store/UserStore';
import useContestStore from '../../store/contestStore';
import { fetchUserOutfits, fetchUserAchievements } from '../../services/firebase';
import Avatar from '../../components/Avatar';
import ProfileGridItem from '../../components/ProfileGridItem';
import AchievementBadge from '../../components/AchievementBadge';

const { width } = Dimensions.get('window');
const OUTER_PAD = 16;
const SAFE_H = Platform.select({ ios: 44, android: 0, default: 0 });

export default function UserProfileScreen({ route, navigation }) {
  const { userId } = route.params || {};
  const { user } = useAuthStore();
  const authedId = user?.uid || user?.user?.uid || null;
  const { showActionSheetWithOptions } = useActionSheet();

  const { loadUserProfile, profilesById, isFollowing, follow, unfollow, relCache, myBlockedIds, blockUser, unblockUser } = useUserStore();
  const { contestsById, listContests } = useContestStore();
  const profile = profilesById[userId];

  // Define the relationship key helper locally
  const relIdOf = (followerId, followingId) => `${followerId}_${followingId}`;
  // Get the following status reactively from the store's cache
  const rel = relCache[relIdOf(authedId, userId)];
  const isBlockedByMe = myBlockedIds.has(userId);

  const [posts, setPosts] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [tab, setTab] = useState('posts'); // 'posts' | 'achievements'
  const [viewerIsBlocked, setViewerIsBlocked] = useState(false);
  const [checkingBlock, setCheckingBlock] = useState(true);

  const [achievementsLoading, setAchievementsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const checkReverseBlock = async () => {
      if (!authedId || !userId || authedId === userId) {
        setCheckingBlock(false);
        return;
      }
      setCheckingBlock(true);
      try {
        // Check if the profile owner (userId) has blocked the viewer (authedId).
        const blockRef = doc(firestore, 'blocks', `${userId}_${authedId}`);
        const blockSnap = await getDoc(blockRef);
        setViewerIsBlocked(blockSnap.exists());
      } catch (error) {
        console.error("Error checking block status:", error);
        setViewerIsBlocked(false); // Fail open for safety
      } finally {
        setCheckingBlock(false);
      }
    };
    checkReverseBlock();

    if (userId) {
      loadUserProfile(userId);
      listContests({ status: 'all', reset: true });

      // Hide the default navigation header. We will render our own buttons inside the component.
      navigation.setOptions({ headerShown: false });
    }
  }, [userId, authedId, loadUserProfile, listContests, navigation]);

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

  useEffect(() => {
    const loadAchievements = async () => {
      if (userId) {
        setAchievementsLoading(true);
        const res = await fetchUserAchievements(userId);
        if (res.success) {
          setAchievements(res.items);
        }
        setAchievementsLoading(false);
      }
    };

    if (tab === 'achievements') loadAchievements();
  }, [tab, userId]);

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

  const onToggleFollow = async () => {
    if (!authedId) return showAlert('Sign in', 'Please sign in to follow');
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

  const openUserMenu = () => {
    const options = [isBlockedByMe ? 'Unblock' : 'Block', 'Report', 'Cancel'];
    const destructiveButtonIndex = 0;
    const cancelButtonIndex = 2;

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        destructiveButtonIndex: isBlockedByMe ? undefined : destructiveButtonIndex,
        title: profile?.name || 'User Actions',
      },
      (selectedIndex) => {
        if (selectedIndex === 0) { // Block/Unblock
          const action = isBlockedByMe ? unblockUser : blockUser;
          const actionName = isBlockedByMe ? 'Unblock' : 'Block';
          showAlert(
            `${actionName} ${profile?.name || 'user'}?`,
            isBlockedByMe ? 'They will be able to see your posts and follow you again.' : 'They will no longer be able to see your posts or follow you. They will not be notified.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: actionName, style: 'destructive', onPress: () => action(userId) },
            ]
          );
        } else if (selectedIndex === 1) { // Report
          showAlert('Report User', 'This functionality is coming soon.');
        }
      }
    );
  };

  const showRatingsToOthers = profile?.preferences?.showRatingsToOthers ?? true;

  const renderPostItem = useCallback(({ item }) => (
    <ProfileGridItem item={item} onPress={handlePostPress} showRating={showRatingsToOthers} />
  ), [handlePostPress, showRatingsToOthers]);

  const renderAchievementItem = useCallback(({ item }) => (
    <AchievementBadge item={item} />
  ), []);

  const onRefresh = () => {
    if (tab === 'posts') loadPosts(true);
    else {
      // You could add a refresh for achievements here if needed
    }
  };

  const onEndReached = () => {
    if (tab === 'posts' && !loading && hasMore) {
      loadPosts(false);
    }
  };

  const SegBar = ({ tab, setTab }) => {
    const tabs = ['posts', 'achievements'];
    const idx = tabs.indexOf(tab) ?? 0;
    const IND_W = (width - OUTER_PAD * 2) / 2;
    const anim = useRef(new Animated.Value(idx)).current;
    useEffect(() => {
      Animated.timing(anim, { toValue: idx, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    }, [idx, anim]);
    const left = anim.interpolate({ inputRange: [0, 1], outputRange: [0, IND_W] });

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
    const postsCount = Math.max(0, profile?.stats?.postsCount ?? 0);
    return (
      <View style={styles.header}>
        <View style={styles.coverPhotoContainer}>
          <ExpoImage source={{ uri: profile?.coverPhoto }} style={styles.coverPhoto} contentFit="cover" />
          <View style={styles.coverOverlay} />

          {/* Custom Header Buttons, mimicking ProfileScreen for stability */}
          <Pressable onPress={() => navigation.goBack()} style={styles.headerButtonLeft}>
            <Ionicons name="arrow-back" size={24} color="#fff" style={styles.iconShadow} />
          </Pressable>
          <Pressable onPress={openUserMenu} style={styles.headerButtonRight}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#fff" style={styles.iconShadow} />
          </Pressable>

        </View>

        <View style={styles.profileDetails}>
          <Avatar uri={profile?.profilePicture} size={88} ring ringColor="#fff" />
          <View style={styles.infoContainer}>
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{profile?.name || profile?.displayName || 'User'}</Text>
              {!!profile?.username && <Text style={styles.username}>@{profile.username}</Text>}
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statBlock}><Text style={styles.statValue}>{postsCount}</Text><Text style={styles.statLabel}>Posts</Text></View>
              <Pressable onPress={() => navigation.navigate('Followers', { userId })} style={styles.statBlock}><Text style={styles.statValue}>{profile?.stats?.followersCount || 0}</Text><Text style={styles.statLabel}>Followers</Text></Pressable>
              <Pressable onPress={() => navigation.navigate('Following', { userId })} style={styles.statBlock}><Text style={styles.statValue}>{profile?.stats?.followingCount || 0}</Text><Text style={styles.statLabel}>Following</Text></Pressable>
            </View>
          </View>
        </View>

        {!!profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

        {authedId !== userId && (
          <Pressable onPress={onToggleFollow} style={({ pressed }) => [styles.actionMain, rel && styles.followingBtn, pressed && { opacity: 0.9 }]}>
            <Text style={[styles.actionMainText, rel && styles.followingBtnText]}>{rel ? 'Following' : 'Follow'}</Text>
          </Pressable>
        )}
        <SegBar tab={tab} setTab={setTab} />
      </View>
    );
  };

  const listData = tab === 'posts' ? posts : achievements;
  const listLoading = tab === 'posts' ? loading : achievementsLoading;
  const renderItem = tab === 'posts' ? renderPostItem : renderAchievementItem;
  const listEmpty = !listLoading && !refreshing ? (
    <Text style={{ textAlign: 'center', marginTop: 24, color: '#666' }}>
      {tab === 'posts' ? 'No posts yet.' : 'No achievements yet.'}
    </Text>
  ) : null;

  if (checkingBlock) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (viewerIsBlocked) {
    return (
      <View style={styles.center}>
        <Ionicons name="eye-off-outline" size={48} color="#9CA3AF" />
        <Text style={styles.unavailableTitle}>Profile Unavailable</Text>
        <Text style={styles.unavailableSubtext}>You can't view this profile.</Text>
      </View>
    );
  }

  // If user is blocked, show a different UI
  if (isBlockedByMe) {
    return (
      <View style={styles.center}>
        <Text style={styles.blockedText}>You have blocked this user.</Text>
        <Pressable onPress={() => unblockUser(userId)} style={[styles.actionMain, { width: '60%' }]}>
          <Text style={styles.actionMainText}>Unblock</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      key={tab}
      data={listData}
      keyExtractor={(it) => String(it.id)}
      numColumns={3}
      columnWrapperStyle={tab === 'achievements' ? styles.achievementsGrid : { margin: -1 }}
      ListHeaderComponent={<ProfileHeader />}
      renderItem={renderItem}
      ListEmptyComponent={listEmpty}
      contentContainerStyle={{ paddingBottom: 24, backgroundColor: '#fff' }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={listLoading ? <ActivityIndicator style={{ margin: 20 }} /> : null}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  unavailableTitle: { fontSize: 18, color: '#333', marginTop: 12, fontWeight: '600' },
  unavailableSubtext: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  blockedText: { fontSize: 18, color: '#333', marginBottom: 20 },
  header: { backgroundColor: '#FFFFFF', paddingBottom: 8 },
  coverPhotoContainer: { width: '100%', height: 180, backgroundColor: '#EAEAEA' },
  coverPhoto: { width: '100%', height: '100%' },
  coverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  headerButtonLeft: {
    position: 'absolute',
    top: SAFE_H > 0 ? SAFE_H + 8 : 24,
    left: 16,
    padding: 8, // Keep a good touch area
  },
  headerButtonRight: {
    position: 'absolute',
    top: SAFE_H > 0 ? SAFE_H + 8 : 24,
    right: 16,
    padding: 8, // Keep a good touch area
  },
  iconShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  profileDetails: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: OUTER_PAD, marginTop: -20 },
  infoContainer: { marginTop: 20, flex: 1, marginLeft: 40 },
  nameContainer: {},
  statsRow: { flexDirection: 'row', gap: 20, marginTop: 8 },
  statBlock: { alignItems: 'center' },
  statValue: { fontWeight: '900', color: '#111827', fontSize: 18 },
  statLabel: { color: '#6B7280', marginTop: 2, fontSize: 12 },
  name: { fontSize: 22, fontWeight: '900', color: '#111827' },
  username: { color: '#6B7280', marginTop: 4, fontWeight: '700' },
  bio: { marginTop: 16, paddingHorizontal: OUTER_PAD, color: '#4B5563', fontSize: 14 },
  actionMain: {
    borderRadius: 12,
    backgroundColor: '#7A5AF8',
    marginTop: 12,
    marginHorizontal: OUTER_PAD,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionMainText: { color: '#fff', fontWeight: '900', letterSpacing: 0.2 },
  followingBtn: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  followingBtnText: {
    color: '#374151',
  },
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
  achievementsGrid: {
    justifyContent: 'flex-start',
  },
});
