// src/screens/main/HomeScreen.js
// Edge-to-edge feed, uses OutfitCard with contest CTA -> RateEntryScreen.

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import useOutfitStore from '../../store/outfitStore';
import useUserStore from '../../store/UserStore';
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
  const myLikedIds = useUserStore((s) => s.myLikedIds);
  const fetchFeed = useOutfitStore((s) => s.fetchFeed);
  const loading = useOutfitStore((s) => s.loading);
  const refreshing = useOutfitStore((s) => s.refreshing);
  const lastDoc = useOutfitStore((s) => s.lastDoc);

  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    if (isFocused) {
      fetchFeed({ limit: 12, reset: true }).finally(() => setInitialLoaded(true));
    }
  }, [isFocused, fetchFeed]);

  // Set up header with notifications button
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: 'Rate My Outfit',
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={{ marginRight: 10 }}>
          <Ionicons name="notifications-outline" size={24} color="#111" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Add listener for tab press to scroll to top
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      // Only scroll to top if the screen is currently focused
      if (isFocused) {
        listRef.current?.scrollToOffset({ animated: true, offset: 0 });
      }
    });
    return unsubscribe;
  }, [isFocused, fetchFeed]);

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

  const handleContestPress = useCallback((post) => {
    if (!post?.contestId) return;
    navigation.navigate('ContestDetails', { contestId: post.contestId });
  }, [navigation]);

  const handleOpen = useCallback((post) => {
    if (!post?.id) return;
    const isContest = post.type === 'contest' || !!post.contestId;
    if (isContest) handleRate(post);
    else navigation.navigate('OutfitDetails', { outfitId: post.id });
  }, [navigation, handleRate]);

  const handleRate = useCallback((post) => {
    // Navigate to RateEntryScreen with normalized payload
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
          isLiked={myLikedIds.has(item.id)}
        />
      )}
      refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      contentContainerStyle={styles.container}
      ListEmptyComponent={!loading ? <Text style={styles.empty}>No outfits yet — be the first to upload!</Text> : null}
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
});
