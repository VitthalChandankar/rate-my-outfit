// File: src/screens/contests/ContestDetailsScreen.js
// World-class contest details screen: immersive banner, clean typography, and a focused user flow.
// Opens the new rating flow (RateEntry -> RateScreen).

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import useContestStore from '../../store/contestStore';
import useAuthStore from '../../store/authStore';
import OutfitCard from '../../components/OutfitCard';
import Avatar from '../../components/Avatar';

const { width } = Dimensions.get('window');
const PADDING_H = 16;

// ---------- helpers ----------
function toMs(ts) {
  if (!ts) return null;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'object' && typeof ts.seconds === 'number') return ts.seconds * 1000;
  if (ts instanceof Date) return ts.getTime();
  return null;
}
function statusFromRange(startMs, endMs, now = Date.now()) {
  if (startMs && endMs) {
    if (now < startMs) return 'upcoming';
    if (now > endMs) return 'ended';
    return 'active';
  }
  if (endMs && now > endMs) return 'ended';
  if (startMs && now < startMs) return 'upcoming';
  return 'active';
}
function rangeLabel(startMs, endMs) {
  if (!startMs || !endMs) return '—';
  const s = new Date(startMs).toLocaleDateString();
  const e = new Date(endMs).toLocaleDateString();
  return `${s} → ${e}`;
}

// A simple, self-contained leaderboard row component
function LeaderboardRow({ item, rank, navigation }) {
  if (!item?.user) return null;

  const isWinner = rank === 1;
  const handlePress = () => {
    if (item.userId) {
      navigation.navigate('UserProfile', { userId: item.userId });
    }
  };

  return (
    <Pressable onPress={handlePress} style={({ pressed }) => [styles.lbRow, pressed && { backgroundColor: '#f9f9f9' }]}>
      <Text style={[styles.lbRank, isWinner && styles.lbRankWinner]}>{rank}</Text>
      <Avatar uri={item.user.profilePicture} size={44} />
      <View style={styles.lbUser}>
        <Text style={styles.lbName} numberOfLines={1}>{item.user.name || 'User'}</Text>
        {!!item.user.username && <Text style={styles.lbUsername}>@{item.user.username}</Text>}
      </View>
      {isWinner && <Ionicons name="trophy" size={20} color="#FFC107" style={styles.lbTrophy} />}
      <Text style={styles.lbScore}>{(item.averageRating || 0).toFixed(2)}</Text>
    </Pressable>
  );
}


export default function ContestDetailsScreen({ route, navigation }) {
  const { contestId } = route.params;
  const { user } = useAuthStore();

  const { fetchEntries, fetchLeaderboard } = useContestStore();
  const entriesBag = useContestStore((s) => s.entries[contestId]);
  const { contest, leaderboard, leaderboardLoading } = useContestStore((s) => ({
    contest: s.contests.find((c) => c.id === contestId) || s.contestsById[contestId],
    leaderboard: s.leaderboards[contestId],
    leaderboardLoading: !s.leaderboards[contestId], // Simple loading check
  }));

  // Contest meta
  const contestData = contest || {};
  const startMs = toMs(contestData.startAt);
  const endMs = toMs(contestData.endAt);
  const status = statusFromRange(startMs, endMs);
  const range = rangeLabel(startMs, endMs);
  const host = contestData.host || 'Host';
  // Use the new 'image' field for the banner
  const bannerImage = contestData.image || contestData.bannerImage || null;

  useEffect(() => {
    // Always fetch leaderboard for both ended and active contests (for the tab)
    // Fetch top 10 as requested
    fetchLeaderboard({ contestId, limit: 10, minVotes: 1 });

    // Only fetch entries if the contest is not ended
    if (status !== 'ended') {
      fetchEntries({ contestId, reset: true });
    }
  }, [contestId, fetchEntries, fetchLeaderboard, status]);

  const entries = entriesBag?.items || [];
  const entriesLoading = entriesBag?.loading && (entries?.length ?? 0) === 0;


  // hero animation
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [fade, rise]);

  const onEnter = () => navigation.navigate('Upload', { contestId });

  const openEntryFlow = (item) => navigation.navigate('RateEntry', { item, mode: 'entry' });

  const StatusDot = () => {
    const style =
      status === 'active' ? styles.statusGreen :
      status === 'upcoming' ? styles.statusAmber :
      styles.statusGray;
    return <View style={[styles.statusDot, style]} />;
  };

  const Header = (
    <View>
      {/* Host banner */}
      {bannerImage ? (
        <View style={styles.bannerWrap}>
          <ExpoImage source={{ uri: bannerImage }} style={styles.bannerImg} contentFit="cover" />
          <View style={styles.bannerOverlay} />
        </View>
      ) : null}

      {/* Meta + actions */}
      <View style={styles.hero}>
        <Text style={styles.title}>{contestData.title || 'Contest'}</Text>
        {!!contestData.theme && <Text style={styles.theme}>{contestData.theme}</Text>}
        <View style={styles.metaRow}>
          <StatusDot />
          <Text style={styles.metaStrong}>{status === 'active' ? 'Active' : status === 'upcoming' ? 'Upcoming' : 'Ended'}</Text>
          <Text style={[styles.metaDim, { marginLeft: 6 }]}>• {range}</Text>
          {!!contestData.country && <Text style={[styles.metaDim, { marginLeft: 6 }]}>• {contestData.country}</Text>}
        </View>
        <View style={styles.pillsRow}>
          <View style={[styles.pill, { backgroundColor: '#EEF2FF' }]}><Text style={[styles.pillText, { color: '#3B82F6' }]}>Host: {host}</Text></View>
          <View style={[styles.pill, { backgroundColor: '#F0FFF4' }]}><Text style={[styles.pillText, { color: '#10B981' }]}>Prize: {contestData.prize || '₹10,000 + Feature'}</Text></View>
          <View style={[styles.pill, { backgroundColor: '#FFF7ED' }]}><Text style={[styles.pillText, { color: '#F97316' }]}>Entry: {contestData.entryFee && contestData.entryFee > 0 ? `₹${contestData.entryFee}` : 'Free'}</Text></View>
        </View>
        
        {/* Conditionally render actions for active/upcoming contests */}
        {status !== 'ended' && (
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={onEnter} style={styles.primaryBtn} activeOpacity={0.85}>
              <Ionicons name="cloud-upload-outline" size={22} color="#fff" />
              <Text style={styles.primaryBtnText}>Submit Your Entry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Section Header */}
      {entries.length > 0 && status !== 'ended' && (
        <Text style={styles.sectionLabel}>Recent Entries</Text>
      )}
      {status === 'ended' && (
        <Text style={[styles.sectionLabel, { textAlign: 'center' }]}>
          Leaderboard
        </Text>
      )}
    </View>
  );

  // Render entries with OutfitCard (contest ribbon is clickable inside)
  const renderEntryCard = ({ item }) => (
    <OutfitCard
      item={{ ...item, type: 'contest' }}
      onPress={(post) => openEntryFlow(post)}
      onRate={(post) => openEntryFlow(post)}
    />
  );

  // If contest has ended, show only the leaderboard.
  if (status === 'ended') {
    return (
      <FlatList
        data={leaderboard || []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={Header}
        renderItem={({ item, index }) => <LeaderboardRow item={item} rank={index + 1} navigation={navigation} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={styles.lbSeparator} />}
        ListEmptyComponent={
          leaderboardLoading ? (
            <ActivityIndicator style={{ marginVertical: 40 }} />
          ) : (
            <Text style={styles.emptyText}>Leaderboard not available.</Text>
          )
        }
      />
    );
  }

  // For active/upcoming contests, show entries.
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <FlatList
        data={entries}
        keyExtractor={(it) => String(it.id)}
        ListHeaderComponent={Header}
        renderItem={renderEntryCard}
        contentContainerStyle={{ paddingBottom: 24 }}
        onEndReachedThreshold={0.4}
        onEndReached={() =>
          !entriesBag?.loading && entriesBag?.hasMore && fetchEntries({ contestId })
        }
        ListFooterComponent={entriesBag?.loading ? (
          <ActivityIndicator style={{ marginVertical: 16 }} />
        ) : null}
        ListEmptyComponent={!entriesLoading ? (
          <Text style={{ textAlign: 'center', marginTop: 24, color: '#666' }}>Be the first to submit an entry!</Text>
        ) : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Banner
  bannerWrap: {
    width: '100%',
    aspectRatio: 4 / 3, // Taller banner for more impact
    backgroundColor: '#EDEDF2',
  },
  bannerImg: { width: '100%', height: '100%' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },

  // Hero/meta
  hero: { paddingHorizontal: PADDING_H, paddingTop: 16, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '900', color: '#111827', letterSpacing: -0.5 },
  theme: { fontSize: 16, color: '#4B5563', marginTop: 4, marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusGreen: { backgroundColor: '#10B981' },
  statusAmber: { backgroundColor: '#F59E0B' },
  statusGray: { backgroundColor: '#9CA3AF' },
  metaStrong: { fontWeight: '900', color: '#111827' },
  metaDim: { color: '#6B7280', fontWeight: '500' },
  pillsRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  pillText: { fontWeight: '800' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 0.2 },

  sectionLabel: { marginTop: 16, marginBottom: 8, fontWeight: '900', color: '#111827', fontSize: 20, paddingHorizontal: PADDING_H },

  // NEW Leaderboard styles
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: PADDING_H,
  },
  lbRank: {
    fontWeight: '900',
    fontSize: 16,
    color: '#6B7280',
    width: 30,
    textAlign: 'center',
    marginRight: 12,
  },
  lbRankWinner: {
    color: '#D97706', // Amber color for winner
  },
  lbUser: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  lbName: {
    fontWeight: 'bold',
    color: '#1F2937',
  },
  lbUsername: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  lbTrophy: {
    marginLeft: 'auto',
  },
  lbScore: {
    fontWeight: '900',
    fontSize: 16,
    color: '#111827',
    marginLeft: 16,
    minWidth: 50,
    textAlign: 'right',
  },
  lbSeparator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: PADDING_H,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    color: '#666'
  },
});
