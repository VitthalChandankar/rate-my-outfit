// src/screens/main/HomeScreen.js
// Edge-to-edge feed, uses OutfitCard with contest CTA -> RateEntryScreen.

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import useOutfitStore from '../../store/outfitStore';
import useUserStore from '../../store/UserStore';
import useNotificationsStore from '../../store/notificationsStore';
import useContestStore from '../../store/contestStore';
import useShareStore from '../../store/shareStore';
import OutfitCard from '../../components/OutfitCard';

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

export default function HomeScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const listRef = useRef(null);
  const { user: authedUser } = useAuthStore();
  const authedUid = authedUser?.uid || authedUser?.user?.uid || null;

  const feed = useOutfitStore((s) => s.feed);
  const toggleLike = useOutfitStore((s) => s.toggleLike);
  const { toggleSave } = useOutfitStore();
  const fetchFeed = useOutfitStore((s) => s.fetchFeed);
  const { myLikedIds, mySavedIds, myBlockerIds } = useUserStore((s) => ({ myLikedIds: s.myLikedIds, mySavedIds: s.mySavedIds, myBlockerIds: s.myBlockerIds }));
  const myBlockedIds = useUserStore((s) => s.myBlockedIds);
  const loading = useOutfitStore((s) => s.loading);
  const refreshing = useOutfitStore((s) => s.refreshing);
  const lastDoc = useOutfitStore((s) => s.lastDoc);

  const contestsById = useContestStore((s) => s.contestsById);

  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const unreadShareCount = useShareStore((s) => s.unreadShareCount);

  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    if (isFocused) {
      // We no longer fetch all contests. Instead, we fetch them on-demand based on the feed.
      fetchFeed({ limit: 12, reset: true }).finally(() => setInitialLoaded(true));
    }
  }, [isFocused, fetchFeed]);

  // This new effect will run whenever the feed is updated.
  useEffect(() => {
    if (!feed || feed.length === 0) return;

    const contestIdsInFeed = [...new Set(feed.map(post => post.contestId).filter(Boolean))];

    if (contestIdsInFeed.length > 0) {
      useContestStore.getState().fetchContestsByIds(contestIdsInFeed);
    }
  }, [feed]); // Dependency on the feed from the store

  // Set up header with notifications button
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: 'Vastrayl',
      headerTitleAlign: 'left',
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Inbox')}>
            <View>
              <Ionicons name="paper-plane-outline" size={24} color="#111" />
              {unreadShareCount > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{unreadShareCount > 9 ? '9+' : unreadShareCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={{ marginRight: 10 }}>
            <View>
              <Ionicons name="notifications-outline" size={24} color="#111" />
              {unreadCount > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      )
    });
  }, [navigation, unreadCount, unreadShareCount]);

  // Add listener for tab press to scroll to top
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      // Only scroll to top if the screen is currently focused
      if (isFocused) {
        listRef.current?.scrollToOffset({ animated: true, offset: 0 });
      }
    });
    return unsubscribe; // No change here, but good to see it's correct
  }, [isFocused, navigation]);

  const data = useMemo(() => {
    // This is a critical performance optimization.
    // By pre-calculating the data for the list here, we ensure that the `item` prop
    // passed to each OutfitCard is stable between re-renders of the HomeScreen.
    // This allows React.memo on OutfitCard to work correctly, preventing
    // unnecessary re-renders of every visible card when the screen's state changes.
    const withKeys = (feed || []).map(ensureKey);
    const deduped = dedupeById(withKeys);
    const filtered = deduped.filter(item => !myBlockedIds.has(item.userId) && !myBlockerIds.has(item.userId));

    return filtered.map(item => ({
      ...item,
      contestData: item.contestId ? contestsById[item.contestId] : null,
    }));
  }, [feed, contestsById, myBlockedIds, myBlockerIds]);

  const keyExtractor = useCallback((item) => String(item?.id || item?._localKey), []);

  const onRefresh = useCallback(() => { fetchFeed({ limit: 12, reset: true }); }, [fetchFeed]);

  const loadMore = useCallback(() => {
    if (!loading && lastDoc) fetchFeed({ limit: 12, reset: false });
  }, [loading, lastDoc, fetchFeed]);

  const handleLike = useCallback((post) => {
    if (!authedUid || !post?.id) return;
    toggleLike(post.id, authedUid, post.userId);
  }, [authedUid, toggleLike]);

  const handleSave = useCallback((outfitId) => {
    if (!authedUid || !outfitId) return;
    toggleSave(outfitId);
  }, [authedUid, toggleSave]);

  const handleLikesPress = useCallback((outfitId) => {
    if (!outfitId) return;
    navigation.navigate('LikedBy', { outfitId });
  }, [navigation]);

  const handleCommentsPress = useCallback(({ outfitId, postOwnerId }) => {
    if (!outfitId) return;
    navigation.navigate('Comments', { outfitId, postOwnerId });
  }, [navigation]);

  const handleSharePress = useCallback((outfitData) => {
    if (!outfitData?.id) return;
    navigation.navigate('SharePost', { outfitData });
  }, [navigation]);

  const handleContestPress = useCallback((post) => {
    if (!post?.contestId) return;
    navigation.navigate('ContestDetails', { contestId: post.contestId });
  }, [navigation]);

  const handleOpen = useCallback((post) => {
    if (!post?.id) return;
    const isContest = post.type === 'contest' || !!post.contestId;
    if (isContest) {
      const contest = contestsById[post.contestId];
      const now = new Date();
      const endMs = contest?.endAt?.toDate ? contest.endAt.toDate().getTime() : (contest?.endAt ? new Date(contest.endAt).getTime() : null);
      const contestIsActive = contest && endMs && endMs > now.getTime();

      if (contestIsActive) {
        handleRate(post);
      } else {
        // If contest is not active, it's either ended or upcoming.
        // If it has ended, default to the leaderboard tab.
        const isEnded = endMs && endMs < now.getTime();
        navigation.navigate('ContestDetails', {
          contestId: post.contestId,
          initialTab: isEnded ? 'leaderboard' : 'entries',
        });
      }
    } else {
      navigation.navigate('OutfitDetails', { outfitId: post.id });
    }
  }, [navigation, contestsById, handleRate]);

  const handleRate = useCallback((post) => {
    // Navigate to RateEntryScreen with normalized payload
    const target = {
      id: post.entryId || post.id, // Prioritize the entryId if it exists
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
  }, [navigation]);

  const handleUserPress = useCallback((post) => {
    const clickedId = post?.userId || post?.user?.uid || null;
    if (!clickedId) return;
    if (authedUid && clickedId === authedUid) {
      navigation.navigate('Profile');
    } else {
      navigation.navigate('UserProfile', { userId: clickedId });
    }
  }, [navigation, authedUid]);

  if (!initialLoaded && loading && (feed?.length ?? 0) === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8, color: '#666' }}>Loading feed…</Text>
      </View>
    );
  }

  // Approximate row height: header ~56 + image 420 + CTA ~44 + footer ~44 + caption/margins ~30 => ~594
  const ROW_HEIGHT = 594;

  const renderItem = useCallback(({ item }) => (
    <OutfitCard
      item={item} // item now includes contestData
      onPress={handleOpen}
      onRate={handleRate}
      onLike={handleLike}
      onUserPress={handleUserPress}
      onPressLikes={handleLikesPress}
      onPressComments={handleCommentsPress}
      onPressContest={handleContestPress}
      onPressShare={handleSharePress}
      isLiked={myLikedIds.has(item.id)}
      isSaved={mySavedIds.has(item.id)}
      onPressSave={handleSave}
    />
  ), [handleOpen, handleRate, handleLike, handleUserPress, handleLikesPress, handleCommentsPress, handleContestPress, handleSharePress, myLikedIds, mySavedIds, handleSave]);

  return (
    <FlatList
      ref={listRef}
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      contentContainerStyle={styles.container}
      ListEmptyComponent={initialLoaded && !loading ? <Text style={styles.empty}>No outfits yet — be the first to upload!</Text> : null}
      ListFooterComponent={loading ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null}
      // Performance tuning
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      updateRowsBatchNumber={6}
      windowSize={7}
      removeClippedSubviews
      getItemLayout={(data, index) => ({
        length: ROW_HEIGHT,
        offset: ROW_HEIGHT * index,
        index,
      })}
    />
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', paddingBottom: 12 },
  empty: { textAlign: 'center', marginTop: 40, color: '#666' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  badgeContainer: {
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: '#FF3B30',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
