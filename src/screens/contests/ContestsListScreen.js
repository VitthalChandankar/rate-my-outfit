// File: src/screens/contests/ContestsListScreen.js
// Premium UI: glassy segmented control (Active/Upcoming/Ended), refined hero typography,
// animated cards, and polished empty/loading states.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Surface } from 'react-native-paper';
import useContestStore from '../../store/contestStore';
import useAuthStore from '../../store/authStore';

const { width } = Dimensions.get('window');
const PADDING_H = 16;
const CARD_W = width - PADDING_H * 2;

// ----- time helpers -----
function toMs(ts) {
  if (!ts) return null;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'object' && typeof ts.seconds === 'number') return ts.seconds * 1000;
  if (ts instanceof Date) return ts.getTime();
  return null;
}
function statusFromRange(startMs, endMs, now = Date.now()) {
  if (startMs != null && endMs != null) {
    if (now < startMs) return 'upcoming';
    if (now > endMs) return 'ended';
    return 'active';
  }
  if (endMs != null && now > endMs) return 'ended';
  if (startMs != null && now < startMs) return 'upcoming';
  return 'active';
}
function whenLabel(startMs, endMs, status) {
  if (status === 'active' && endMs) return `Ends ${new Date(endMs).toLocaleDateString()}`;
  if (status === 'ended' && endMs) return `Ended ${new Date(endMs).toLocaleDateString()}`;
  if (status === 'upcoming' && startMs) return `Starts ${new Date(startMs).toLocaleDateString()}`;
  return '—';
}

// ----- Segmented Control (glassy) -----
function SegmentedControl({ value, onChange }) {
  const tabs = [
    { key: 'active', label: 'Active' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'ended', label: 'Ended' },
  ];
  const idx = Math.max(0, tabs.findIndex((t) => t.key === value));
  const anim = useRef(new Animated.Value(idx)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: idx,
      duration: 240,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [idx, anim]);

  const IND_W = (CARD_W - 12) / tabs.length; // container has padding 6
  const left = anim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [6, 6 + IND_W, 6 + 2 * IND_W],
  });

  return (
    <View style={styles.segmentWrap}>
      <Animated.View style={[styles.segmentIndicator, { width: IND_W, left }]} />
      {tabs.map((t, i) => {
        const selected = value === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            style={styles.segmentTab}
            activeOpacity={0.85}
            onPress={() => onChange(t.key)}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ----- Card Skeleton -----
function CardSkeleton() {
  return (
    <View style={[styles.card, { opacity: 0.85 }]}>
      <View style={styles.skelHeader} />
      <View style={styles.skelLine} />
      <View style={[styles.skelPillRow]}>
        <View style={styles.skelPill} />
        <View style={[styles.skelPill, { width: 90 }]} />
        <View style={[styles.skelPill, { width: 110, marginLeft: 'auto' }]} />
      </View>
      <View style={[styles.skelCta, { marginTop: 14 }]} />
    </View>
  );
}

// ----- Contest Card -----
function ContestCard({ item, onPress }) {
  const now = Date.now();
  const startMs = toMs(item.startAt);
  const endMs = toMs(item.endAt);
  const status = statusFromRange(startMs, endMs, now);
  const whenText = whenLabel(startMs, endMs, status);

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [fade, rise]);

  const statusColors =
    status === 'active'
      ? { bg: '#EAF5FF', fg: '#0F6CBD' }
      : status === 'upcoming'
      ? { bg: '#FFF5E6', fg: '#9A5D00' }
      : { bg: '#F3F4F6', fg: '#6B7280' };

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>
      <Surface style={styles.card} elevation={2}>
        {/* header row */}
        <View style={styles.headerRow}>
          <View style={[styles.badge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.badgeText, { color: statusColors.fg }]}>
              {status === 'active' ? 'Active' : status === 'upcoming' ? 'Upcoming' : 'Ended'}
            </Text>
          </View>
          {!!item.country && <Text style={styles.country}>{item.country}</Text>}
        </View>

        {/* title + theme */}
        <Text style={styles.title} numberOfLines={1}>
          {item.title || 'Contest'}
        </Text>
        {!!item.theme && (
          <Text style={styles.theme} numberOfLines={2}>
            {item.theme}
          </Text>
        )}

        {/* meta pills */}
        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText}>{whenText}</Text>
          </View>
          <View style={{ width: 8 }} />
          <View style={[styles.metaPill, styles.metaPillGhost]}>
            <Text style={[styles.metaPillText, { color: '#4B5563' }]}>
              {item.entryFee && item.entryFee > 0 ? `Entry ₹${item.entryFee}` : 'Free'}
            </Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.ctaBtn}>
          <Text style={styles.ctaText}>View details</Text>
        </TouchableOpacity>
      </Surface>
    </Animated.View>
  );
}

export default function ContestsListScreen({ navigation }) {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const allContests = useContestStore((s) => s.contests);
  const loading = useContestStore((s) => s.contestsLoading);
  const refreshing = useContestStore((s) => s.contestsRefreshing);
  const hasMore = useContestStore((s) => s.hasMoreContests);
  const listContests = useContestStore((s) => s.listContests);

  const [filter, setFilter] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter the contests on the client side for instant UI updates
  const contests = useMemo(() => {
    const now = Date.now();
    const lowercasedQuery = searchQuery.trim().toLowerCase();

    return allContests.filter((c) => {
      const startMs = toMs(c.startAt);
      const endMs = toMs(c.endAt);
      const status = statusFromRange(startMs, endMs, now);
      const statusMatch = status === filter;
      const queryMatch = lowercasedQuery ? c.title?.toLowerCase().includes(lowercasedQuery) : true;
      return statusMatch && queryMatch;
    });
  }, [allContests, filter, searchQuery]);

  useEffect(() => {
    listContests({ limit: 20, reset: true, status: filter });
  }, [filter, listContests]);

  const onRefresh = useCallback(
    () => listContests({ limit: 20, reset: true, status: filter }),
    [filter, listContests]
  );

  const onEnd = useCallback(() => {
    if (!loading && hasMore) listContests({ limit: 20, reset: false, status: filter });
  }, [loading, hasMore, filter, listContests]);

  const renderItem = ({ item }) => (
    <ContestCard item={item} onPress={() => navigation.navigate('ContestDetails', { contestId: item.id })} />
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header content is now outside the FlatList to prevent re-renders from closing the keyboard */}
      <View style={styles.hero}>
        <View style={styles.heroHeader}>
          <Text style={styles.heroTitle}>Contests</Text>
          {isAdmin && (
            <TouchableOpacity onPress={() => navigation.navigate('CreateContest')} style={styles.hostButton}>
              <Ionicons name="add-circle" size={28} color="#7A5AF8" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.heroSub}>Compete, rate, and climb the leaderboard.</Text>
        <SegmentedControl value={filter} onChange={setFilter} />
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            placeholder="Search contests by title..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            clearButtonMode="while-editing"
          />
        </View>
      </View>
      <FlatList
        data={contests}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.25}
        onEndReached={onEnd}
        contentContainerStyle={{ paddingBottom: 28 }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No contests</Text>
              <Text style={styles.emptySub}>Try a different filter or check back later.</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loading ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator />
              <View style={{ height: 12 }} />
              <CardSkeleton />
              <CardSkeleton />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F7FB' },

  // Hero header
  hero: { paddingHorizontal: PADDING_H, paddingTop: 14, paddingBottom: 8 },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  hostButton: {
    padding: 4,
  },
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -0.3 },
  heroSub: { marginTop: 6, color: '#5B5B68', fontSize: 14 },

  // Segmented
  segmentWrap: {
    marginTop: 14,
    width: CARD_W,
    alignSelf: 'center',
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(122,90,248,0.08)',
    overflow: 'hidden',
    position: 'relative',
    flexDirection: 'row',
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  segmentIndicator: {
    position: 'absolute',
    top: 6,
    bottom: 6,
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

  // Card
  card: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    width: CARD_W,
    alignSelf: 'center',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  badgeText: { fontWeight: '800', fontSize: 12 },
  country: { marginLeft: 'auto', color: '#6B7280', fontWeight: '700' },

  title: { fontSize: 18, fontWeight: '900', marginTop: 10, color: '#111827', letterSpacing: -0.2 },
  theme: { marginTop: 6, color: '#4B5563' },

  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  metaPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#F3F4F6' },
  metaPillGhost: { backgroundColor: '#F8FAFC' },
  metaPillText: { fontWeight: '800', color: '#1F2937' },

  ctaBtn: {
    marginTop: 16,
    backgroundColor: '#7A5AF8',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '900', letterSpacing: 0.2 },

  // Empty
  emptyWrap: { alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1F2937' },
  emptySub: { marginTop: 6, color: '#6B7280' },

  // Skeletons
  skelHeader: { height: 20, width: CARD_W * 0.55, backgroundColor: '#EEE', borderRadius: 8, marginBottom: 12 },
  skelLine: { height: 14, width: CARD_W * 0.8, backgroundColor: '#EEE', borderRadius: 7 },
  skelPillRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  skelPill: { height: 22, width: 70, backgroundColor: '#EEE', borderRadius: 11 },
  skelCta: { height: 44, backgroundColor: '#EEE', borderRadius: 12 },

  // Search Bar
  searchContainer: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#111827',
  },
});
