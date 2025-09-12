// src/screens/main/HomeScreen.js
// Edge-to-edge feed, uses OutfitCard with contest CTA -> RateEntryScreen.

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import useOutfitStore from '../../store/outfitStore';
import useUserStore from '../../store/UserStore';
import useNotificationsStore from '../../store/notificationsStore';
import useContestStore from '../../store/contestStore';
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
  const { colors } = useTheme();

  const listRef = useRef(null);
  const { user: authedUser } = useAuthStore();
  const authedUid = authedUser?.uid || authedUser?.user?.uid || null;

  const feed = useOutfitStore((s) => s.feed);
  const toggleLike = useOutfitStore((s) => s.toggleLike);
  const myLikedIds = useUserStore((s) => s.myLikedIds);
  const fetchFeed = useOutfitStore((s) => s.fetchFeed);
  const loading = useOutfitStore((s) => s.loading);
  const refreshing = useOutfitStore((s) => s.refreshing);
  const lastDoc = useOutfitStore((s) => s.lastDoc);

  const contestsById = useContestStore((s) => s.contestsById);
  const listContests = useContestStore((s) => s.listContests);

  const unreadCount = useNotificationsStore((s) => s.unreadCount);

  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    if (isFocused) {
      listContests({ status: 'all', reset: true }); // Fetch all contests to populate cache
      fetchFeed({ limit: 12, reset: true }).finally(() => setInitialLoaded(true));
    }
  }, [isFocused, fetchFeed]);

  // Set up header with notifications button
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: 'Rate My Outfit',
      headerStyle: { backgroundColor: colors.surface },
      headerTitleStyle: { color: colors.text },
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.navigate('Inbox')} style={{ marginRight: 16 }}>
            <Ionicons name="paper-plane-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={{ marginRight: 10 }}>
            <View>
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
              {unreadCount > 0 && (
                <View style={[styles.badgeContainer, { backgroundColor: colors.badge }]}>
                  <Text style={[styles.badgeText, { color: colors.badgeText }]}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      )
    });
  }, [navigation, unreadCount, colors]);

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
    const withKeys = (feed || []).map(ensureKey);
    return dedupeById(withKeys);
  }, [feed]);

  const keyExtractor = useCallback((item) => String(item?.id || item?._localKey), []);

  const onRefresh = useCallback(() => { fetchFeed({ limit: 12, reset: true }); }, [fetchFeed]);

  const loadMore = useCallback(() => {
    if (!loading && lastDoc) fetchFeed({ limit: 12, reset: false });
  }, [loading, lastDoc, fetchFeed]);

  const handleLike = useCallback((post) => {
    if (!authedUid || !post?.id) return;
    toggleLike(post.id, authedUid, post.userId);
  }, [authedUid, toggleLike]);

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
      const contestIsActive = contest && contest.endAt && (contest.endAt.toDate ? contest.endAt.toDate() : new Date(contest.endAt)) > now;

      if (contestIsActive) {
        handleRate(post);
      } else {
        navigation.navigate('ContestDetails', { contestId: post.contestId });
      }
    } else {
      navigation.navigate('OutfitDetails', { outfitId: post.id });
    }
  }, [navigation, handleRate]);

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
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={{ marginTop: 8, color: colors.textSecondary }}>Loading feed…</Text>
      </View>
    );
  }

  // Approximate row height: header ~56 + image 420 + CTA ~44 + footer ~44 + caption/margins ~30 => ~594
  const ROW_HEIGHT = 594;

  return (
    <FlatList
      ref={listRef}
      data={data}
      keyExtractor={keyExtractor}
      renderItem={({ item }) => (
        <OutfitCard
          item={item}
          onPress={handleOpen}
          onRate={handleRate}
          onLike={handleLike}
          onUserPress={handleUserPress}
          onPressLikes={handleLikesPress}
          onPressComments={handleCommentsPress}
          onPressContest={handleContestPress}
          onPressShare={handleSharePress}
          isLiked={myLikedIds.has(item.id)}
        />
      )}
      refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      ListEmptyComponent={!loading ? <Text style={[styles.empty, { color: colors.textSecondary }]}>No outfits yet — be the first to upload!</Text> : null}
      ListFooterComponent={loading ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} /> : null}
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
  container: { paddingBottom: 12 },
  empty: { textAlign: 'center', marginTop: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badgeContainer: {
    position: 'absolute',
    right: -6,
    top: -3,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});
