// File: src/screens/contests/ContestDetailsScreen.js
// Premium contest details with hero, animated tabs, rich metadata, prize/fee section,
// smooth list transitions, and integrated actions (Enter, Rate, Leaderboard).

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
function dateRangeLabel(startMs, endMs) {
  if (!startMs || !endMs) return '—';
  const s = new Date(startMs).toLocaleDateString();
  const e = new Date(endMs).toLocaleDateString();
  return `${s} → ${e}`;
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

  const IND_W = (CARD_W - 8) / tabs.length; // padding 4 on container
  const left = anim.interpolate({ inputRange: [0, 1, 2], outputRange: [4, 4 + IND_W, 4 + IND_W * 2] });

  return (
    <View style={styles.tabsWrap}>
      <Animated.View style={[styles.tabsIndicator, { width: IND_W, left }]} />
      {tabs.map((t) => {
        const selected = t.key === value;
        return (
          <TouchableOpacity key={t.key} style={styles.tabBtn} activeOpacity={0.9} onPress={() => onChange(t.key)}>
            <Text style={[styles.tabText, selected && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ---------- Entry quick rate row (kept, but visually improved) ----------
function EntryRateCard({ item, onRate, onFlagAI }) {
  return (
    <Surface style={styles.entryCard} elevation={1}>
      <Text style={styles.entryCaption} numberOfLines={1}>{item.caption || 'Entry'}</Text>
      <Text style={styles.entryMeta}>{(item.averageRating || 0).toFixed(1)} · {item.ratingsCount || 0} votes</Text>
      <View style={{ flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' }}>
        {[0,1,2,3,4,5,6,7,8,9,10].map((n) => (
          <TouchableOpacity
            key={n}
            onPress={() => onRate(n)}
            style={[styles.ratePill, { backgroundColor: n >= 8 ? '#EAF5FF' : n >= 5 ? '#F7F7FF' : '#FFF7F7' }]}
            activeOpacity={0.85}
          >
            <Text style={{ fontWeight: '800' }}>{n}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={onFlagAI} style={[styles.ratePill, { backgroundColor: '#FFEFF5' }]} activeOpacity={0.85}>
          <Text style={{ fontWeight: '800', color: '#E91E63' }}>Looks AI</Text>
        </TouchableOpacity>
      </View>
    </Surface>
  );
}

export default function ContestDetailsScreen({ route, navigation }) {
  const { contestId } = route.params;
  const { user } = useAuthStore();

  const fetchEntries = useContestStore((s) => s.fetchEntries);
  const entriesBag = useContestStore((s) => s.entries[contestId]);
  const rateEntry = useContestStore((s) => s.rateEntry);
  const fetchLeaderboard = useContestStore((s) => s.fetchLeaderboard);

  const [tab, setTab] = useState('enter'); // enter | rate | leaderboard

  useEffect(() => {
    fetchEntries({ contestId, reset: true });
    fetchLeaderboard({ contestId, limit: 50, minVotes: 5 });
  }, [contestId, fetchEntries, fetchLeaderboard]);

  const entries = entriesBag?.items || [];
  const loading = entriesBag?.loading && (entries?.length ?? 0) === 0;

  // ----- hero meta (passed via navigation state or loaded elsewhere if you have selector) -----
  // If you have a contests map in store, you can pick it by id. For now, derive from first entry if available.
  const sample = entries[0] || {};
  const startMs = toMs(sample.contestStartAt || sample.startAt);
  const endMs = toMs(sample.contestEndAt || sample.endAt);
  const now = Date.now();
  const status = statusFromRange(startMs, endMs, now);
  const range = dateRangeLabel(startMs, endMs);

  // hero animation
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [fade, rise]);

  const onEnter = () => {
    navigation.navigate('Upload', { contestId });
  };

  const onRate = async (entryId, value, item) => {
    if (!user?.uid) return Alert.alert('Sign in', 'Please sign in to rate.');
    if (user.uid === item.userId) {
      Alert.alert('Not allowed', 'You can’t rate your own entry.');
      return;
    }
    const res = await rateEntry({ entryId, contestId, rating: value, aiFlag: false });
    if (!res.success) Alert.alert('Error', 'Could not submit rating.');
  };

  const onFlagAI = async (entryId, item) => {
    if (!user?.uid) return Alert.alert('Sign in', 'Please sign in to flag.');
    if (user.uid === item.userId) {
      Alert.alert('Not allowed', 'You can’t flag your own entry.');
      return;
    }
    const res = await rateEntry({ entryId, contestId, rating: 0, aiFlag: true });
    if (!res.success) Alert.alert('Error', 'Could not submit flag.');
  };

  const openEntryFlow = (item) => {
    // Modern rating flow you added earlier
    navigation.navigate('RateEntry', { item, mode: 'entry' });
  };

  const renderRateItem = ({ item }) => (
    <View style={{ marginBottom: 12 }}>
      <OutfitCard item={item} onPress={() => openEntryFlow(item)} />
      <EntryRateCard item={item} onRate={(v) => onRate(item.id, v, item)} onFlagAI={() => onFlagAI(item.id, item)} />
    </View>
  );

  // ----- Header: hero + about/prize/fee -----
  const PrizePill = ({ label, value, tone = 'primary' }) => {
    const tones = {
      primary: { bg: '#EEF2FF', fg: '#3B82F6' },
      accent: { bg: '#F3E8FF', fg: '#7A5AF8' },
      success: { bg: '#E8F7EE', fg: '#10B981' },
      warn: { bg: '#FFF7E6', fg: '#F59E0B' },
    };
    const t = tones[tone] || tones.primary;
    return (
      <View style={[styles.pill, { backgroundColor: t.bg }]}>
        <Text style={[styles.pillText, { color: t.fg }]} numberOfLines={1}>
          {label}: {value}
        </Text>
      </View>
    );
  };

  const header = (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>
      <View style={styles.hero}>
        <Text style={styles.title}>Contest</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          Show your best styling for this theme. Compete, get rated, and win!
        </Text>

        <View style={styles.metaRow}>
          <View style={[styles.statusDot, status === 'active' ? styles.statusGreen : status === 'upcoming' ? styles.statusAmber : styles.statusGray]} />
          <Text style={styles.metaStrong}>
            {status === 'active' ? 'Active' : status === 'upcoming' ? 'Upcoming' : 'Ended'}
          </Text>
          <Text style={styles.metaDim}> • {range}</Text>
        </View>

        {/* Prize & Fee strip (example; data can be fetched from contests/{id}) */}
        <View style={styles.pillsRow}>
          <PrizePill label="Host" value={sample.host || 'Myntra'} tone="accent" />
          <PrizePill label="Prize" value={sample.prize || '₹10,000 + Feature'} tone="success" />
          <PrizePill label="Entry" value={sample.entryFee && sample.entryFee > 0 ? `₹${sample.entryFee}` : 'Free'} tone={sample.entryFee > 0 ? 'warn' : 'primary'} />
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={onEnter} style={styles.primaryBtn} activeOpacity={0.92}>
            <Text style={styles.primaryBtnText}>Upload Outfit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab('rate')} style={styles.secondaryBtn} activeOpacity={0.9}>
            <Text style={styles.secondaryBtnText}>Go to Rate</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 14 }}>
          <SegTabs value={tab} onChange={setTab} />
        </View>

        {tab === 'enter' && (
          <Text style={styles.sectionLabel}>Recent entries</Text>
        )}
      </View>
    </Animated.View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F7FB' }}>
      {tab === 'enter' && (
        <View style={{ flex: 1 }}>
          {header}
          {loading ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator />
            </View>
          ) : (
            <FlatList
              data={entries}
              keyExtractor={(it) => it.id}
              renderItem={({ item }) => (
                <View style={{ paddingHorizontal: PADDING_H, marginBottom: 10 }}>
                  <OutfitCard item={item} onPress={() => openEntryFlow(item)} />
                </View>
              )}
              contentContainerStyle={{ paddingBottom: 24 }}
              onEndReachedThreshold={0.4}
              onEndReached={() =>
                !entriesBag?.loading && entriesBag?.hasMore && fetchEntries({ contestId })
              }
              ListFooterComponent={
                entriesBag?.loading ? (
                  <View style={{ paddingVertical: 16 }}>
                    <ActivityIndicator />
                  </View>
                ) : null
              }
              ListEmptyComponent={
                !loading ? (
                  <Text style={{ textAlign: 'center', color: '#666', marginTop: 24 }}>
                    No entries yet.
                  </Text>
                ) : null
              }
              ListHeaderComponent={null}
            />
          )}
        </View>
      )}

      {tab === 'rate' && (
        <View style={{ flex: 1 }}>
          {header}
          <FlatList
            data={entries}
            keyExtractor={(it) => it.id}
            renderItem={renderRateItem}
            contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
            onEndReachedThreshold={0.4}
            onEndReached={() =>
              !entriesBag?.loading && entriesBag?.hasMore && fetchEntries({ contestId })
            }
            ListFooterComponent={
              entriesBag?.loading ? (
                <View style={{ paddingVertical: 16 }}>
                  <ActivityIndicator />
                </View>
              ) : null
            }
            ListEmptyComponent={
              !loading ? (
                <Text style={{ textAlign: 'center', marginTop: 24, color: '#666' }}>
                  No entries yet.
                </Text>
              ) : null
            }
          />
        </View>
      )}

      {tab === 'leaderboard' && (
        <View style={{ flex: 1 }}>
          {header}
          <LeaderboardList contestId={contestId} limit={50} minVotes={5} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Hero
  hero: { paddingHorizontal: PADDING_H, paddingTop: 12, paddingBottom: 10 },
  title: { fontSize: 26, fontWeight: '900', color: '#0F172A', letterSpacing: -0.3 },
  subtitle: { marginTop: 6, color: '#5B5B68' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusGreen: { backgroundColor: '#10B981' },
  statusAmber: { backgroundColor: '#F59E0B' },
  statusGray: { backgroundColor: '#9CA3AF' },
  metaStrong: { fontWeight: '900', color: '#111827' },
  metaDim: { color: '#6B7280' },

  pillsRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  pillText: { fontWeight: '800' },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#7A5AF8',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 0.2 },
  secondaryBtn: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
  },
  secondaryBtnText: { color: '#3B82F6', fontWeight: '900' },

  // Segmented tabs
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

  // Button used in hero for Enter
  enterBtn: {
    backgroundColor: '#7A5AF8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
  },
});
