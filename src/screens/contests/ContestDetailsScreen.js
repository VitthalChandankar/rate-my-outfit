// File: src/screens/contests/ContestDetailsScreen.js
// Contest details with host banner, rich meta, animated tabs, and integrated Enter/Rate/Leaderboard.
// Opens the new rating flow (RateEntry -> RateScreen).

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Surface } from 'react-native-paper';
import { Image as ExpoImage } from 'expo-image';

import useContestStore from '../../store/contestStore';
import useAuthStore from '../../store/authStore';
import OutfitCard from '../../components/OutfitCard';
import { LeaderboardList } from './LeaderboardScreen';

const { width } = Dimensions.get('window');
const PADDING_H = 16;
const CARD_W = width - PADDING_H * 2;

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

// ---------- Animated Segmented ----------
function SegTabs({ value, onChange }) {
  const tabs = [
    { key: 'enter', label: 'Enter' },
    { key: 'rate', label: 'Rate' },
    { key: 'leaderboard', label: 'Leaderboard' },
  ];
  const idx = Math.max(0, tabs.findIndex((t) => t.key === value));
  const anim = useRef(new Animated.Value(idx)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: idx, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [idx, anim]);

  const IND_W = (CARD_W - 8) / tabs.length;
  const left = anim.interpolate({ inputRange: [0, 1, 2], outputRange: [4, 4 + IND_W, 4 + IND_W * 2] });

  return (
    <View style={styles.tabsWrap}>
      <Animated.View style={[styles.tabsIndicator, { width: IND_W, left }]} />
      {tabs.map((t) => {
        const selected = t.key === value;
        return (
          <TouchableOpacity key={t.key} onPress={() => onChange(t.key)} style={styles.tabBtn} activeOpacity={0.9}>
            <Text style={[styles.tabText, selected && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ---------- Entry quick rate row ----------
function EntryRateCard({ item, onRate, onFlagAI }) {
  return (
    <View style={styles.entryCard}>
      <Text style={styles.entryCaption}>{item.caption || 'Entry'}</Text>
      <Text style={styles.entryMeta}>
        {(item.averageRating || 0).toFixed(1)} · {item.ratingsCount || 0} votes
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {[1,2,3,4,5,6,7,8,9,10].map((n) => (
          <TouchableOpacity
            key={n}
            onPress={() => onRate(n)}
            style={[styles.ratePill, { backgroundColor: n >= 8 ? '#EAF5FF' : n >= 5 ? '#F7F7FF' : '#FFF7F7' }]}
            activeOpacity={0.85}
          >
            <Text style={{ fontWeight: '800' }}>{n}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={onFlagAI} style={[styles.ratePill, { backgroundColor: '#111' }]}>
          <Text style={{ color: '#fff', fontWeight: '900' }}>Looks AI</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ContestDetailsScreen({ route, navigation }) {
  const { contestId } = route.params;
  const { user } = useAuthStore();

  const fetchEntries = useContestStore((s) => s.fetchEntries);
  const entriesBag = useContestStore((s) => s.entries[contestId]);
  const rateEntry = useContestStore((s) => s.rateEntry);
  const fetchLeaderboard = useContestStore((s) => s.fetchLeaderboard);
  const getContestById = useContestStore((s) => s.contestById?.(contestId)); // optional selector

  const [tab, setTab] = useState('enter');

  useEffect(() => {
    fetchEntries({ contestId, reset: true });
    fetchLeaderboard({ contestId, limit: 50, minVotes: 5 });
  }, [contestId, fetchEntries, fetchLeaderboard]);

  const entries = entriesBag?.items || [];
  const loading = entriesBag?.loading && (entries?.length ?? 0) === 0;

  // Contest meta
  const contest = getContestById || {};
  const startMs = toMs(contest.startAt) || toMs(entries[0]?.contestStartAt) || toMs(entries[0]?.startAt);
  const endMs = toMs(contest.endAt) || toMs(entries[0]?.contestEndAt) || toMs(entries[0]?.endAt);
  const status = statusFromRange(startMs, endMs);
  const range = rangeLabel(startMs, endMs);
  const host = contest.host || 'Host';
  const bannerImage = contest.bannerImage || null;
  const bannerCaption = contest.bannerCaption || '';

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

  const onRate = async (entryId, value, item) => {
    if (!user?.uid) return Alert.alert('Sign in', 'Please sign in to rate.');
    if (user.uid === item.userId) return Alert.alert('Not allowed', 'You can’t rate your own entry.');
    const res = await rateEntry({ entryId, contestId, rating: value, aiFlag: false });
    if (!res.success) Alert.alert('Error', 'Could not submit rating.');
  };

  const onFlagAI = async (entryId, item) => {
    if (!user?.uid) return Alert.alert('Sign in', 'Please sign in to flag.');
    if (user.uid === item.userId) return Alert.alert('Not allowed', 'You can’t flag your own entry.');
    const res = await rateEntry({ entryId, contestId, rating: 0, aiFlag: true });
    if (!res.success) Alert.alert('Error', 'Could not submit flag.');
  };

  const openEntryFlow = (item) => navigation.navigate('RateEntry', { item, mode: 'entry' });

  const renderRateItem = ({ item }) => (
    <EntryRateCard
      item={item}
      onRate={(v) => onRate(item.id, v, item)}
      onFlagAI={() => onFlagAI(item.id, item)}
    />
  );

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
          <View style={styles.bannerContent}>
            <Text style={styles.bannerHost}>{host}</Text>
            {!!bannerCaption && (
              <Text style={styles.bannerCaption}>{bannerCaption}</Text>
            )}
          </View>
        </View>
      ) : null}

      {/* Meta + actions */}
      <View style={styles.hero}>
        <View style={styles.metaRow}>
          <StatusDot />
          <Text style={styles.metaStrong}>{status === 'active' ? 'Active' : status === 'upcoming' ? 'Upcoming' : 'Ended'}</Text>
          <Text style={[styles.metaDim, { marginLeft: 6 }]}>• {range}</Text>
          {!!contest.country && <Text style={[styles.metaDim, { marginLeft: 6 }]}>• {contest.country}</Text>}
        </View>
        <View style={styles.pillsRow}>
          <View style={[styles.pill, { backgroundColor: '#EEF2FF' }]}><Text style={[styles.pillText, { color: '#3B82F6' }]}>Host: {host}</Text></View>
          <View style={[styles.pill, { backgroundColor: '#F0FFF4' }]}><Text style={[styles.pillText, { color: '#10B981' }]}>Prize: {contest.prize || '₹10,000 + Feature'}</Text></View>
          <View style={[styles.pill, { backgroundColor: '#FFF7ED' }]}><Text style={[styles.pillText, { color: '#F97316' }]}>Entry: {contest.entryFee && contest.entryFee > 0 ? `₹${contest.entryFee}` : 'Free'}</Text></View>
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={onEnter} style={styles.primaryBtn} activeOpacity={0.9}>
            <Text style={styles.primaryBtnText}>Upload Outfit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab('rate')} style={styles.secondaryBtn} activeOpacity={0.9}>
            <Text style={styles.secondaryBtnText}>Go to Rate</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SegTabs value={tab} onChange={setTab} />
      {tab === 'enter' && <Text style={[styles.sectionLabel, { paddingHorizontal: PADDING_H }]}>Reference & Recent entries</Text>}
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

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {tab === 'enter' && (
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
          ListEmptyComponent={!loading ? (
            <Text style={{ textAlign: 'center', marginTop: 24, color: '#666' }}>No entries yet.</Text>
          ) : null}
        />
      )}

      {tab === 'rate' && (
        <FlatList
          data={entries}
          keyExtractor={(it) => String(it.id)}
          ListHeaderComponent={Header}
          renderItem={renderRateItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
          onEndReachedThreshold={0.4}
          onEndReached={() =>
            !entriesBag?.loading && entriesBag?.hasMore && fetchEntries({ contestId })
          }
          ListFooterComponent={entriesBag?.loading ? (
            <ActivityIndicator style={{ marginVertical: 16 }} />
          ) : null}
          ListEmptyComponent={!loading ? (
            <Text style={{ textAlign: 'center', marginTop: 24, color: '#666' }}>No entries yet.</Text>
          ) : null}
        />
      )}

      {tab === 'leaderboard' && (
        <FlatList
          data={[]}
          keyExtractor={() => 'header-only'}
          ListHeaderComponent={Header}
          renderItem={null}
          ListEmptyComponent={<LeaderboardList contestId={contestId} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Banner
  bannerWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#EDEDF2',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    overflow: 'hidden',
  },
  bannerImg: { width: '100%', height: '100%' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  bannerContent: { position: 'absolute', left: PADDING_H, right: PADDING_H, bottom: 12 },
  bannerHost: { color: '#fff', fontWeight: '900', fontSize: 16 },
  bannerCaption: { color: '#F3F4F6', marginTop: 2, fontWeight: '600' },

  // Hero/meta
  hero: { paddingHorizontal: PADDING_H, paddingTop: 10, paddingBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusGreen: { backgroundColor: '#10B981' },
  statusAmber: { backgroundColor: '#F59E0B' },
  statusGray: { backgroundColor: '#9CA3AF' },
  metaStrong: { fontWeight: '900', color: '#111827' },
  metaDim: { color: '#6B7280' },
  pillsRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  pillText: { fontWeight: '800' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  primaryBtn: { flex: 1, backgroundColor: '#7A5AF8', paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 0.2 },
  secondaryBtn: { paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#EEF2FF' },
  secondaryBtnText: { color: '#3B82F6', fontWeight: '900' },

  // Tabs
  tabsWrap: {
    width: CARD_W,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(122,90,248,0.08)',
    overflow: 'hidden',
    position: 'relative',
    flexDirection: 'row',
    paddingHorizontal: 4,
    alignItems: 'center',
    alignSelf: 'center',
  },
  tabsIndicator: {
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
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  tabText: { fontWeight: '700', color: '#6B7280' },
  tabTextActive: { color: '#1F2937' },

  sectionLabel: { marginTop: 12, fontWeight: '900', color: '#111827' },

  // Entry quick-rate
  entryCard: { borderRadius: 14, padding: 12, backgroundColor: '#fff', marginHorizontal: 12, marginTop: 6 },
  entryCaption: { fontWeight: '800' },
  entryMeta: { color: '#777', marginTop: 4 },
  ratePill: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, marginRight: 8, marginTop: 8 },
});
