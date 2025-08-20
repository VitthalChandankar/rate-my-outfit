// File: src/screens/contests/ContestsListScreen.js
// Best-in-class, modern UI with hero, chips, animated cards, and empty/loading states.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Surface, Chip } from 'react-native-paper';
import useContestStore from '../../store/contestStore';

const { width } = Dimensions.get('window');
const CARD_W = width - 24; // padding 12 on sides

// Helpers
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

// Skeleton placeholder while loading
function CardSkeleton() {
  return (
    <View style={[styles.card, { opacity: 0.8 }]}>
      <View style={styles.skelHeader} />
      <View style={styles.skelRow}>
        <View style={styles.skelPill} />
        <View style={[styles.skelPill, { width: 60 }]} />
        <View style={[styles.skelPill, { width: 40 }]} />
        <View style={[styles.skelLine, { marginLeft: 'auto', width: 110 }]} />
      </View>
      <View style={[styles.skelLine, { width: CARD_W * 0.5, marginTop: 10 }]} />
      <View style={[styles.skelCta, { marginTop: 16 }]} />
    </View>
  );
}

function ContestCard({ item, onPress }) {
  const now = Date.now();
  const startMs = toMs(item.startAt);
  const endMs = toMs(item.endAt);
  const status = statusFromRange(startMs, endMs, now);
  const whenText = whenLabel(startMs, endMs, status);

  const chipStyle =
    status === 'active' ? styles.chipActive : status === 'upcoming' ? styles.chipUpcoming : styles.chipEnded;

  // subtle enter animation
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(6)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [fade, rise]);

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>
      <Surface style={[styles.card]} elevation={2}>
        <View style={styles.badgeRow}>
          <Chip compact style={[styles.chip, chipStyle]}>
            {status === 'active' ? 'Active' : status === 'upcoming' ? 'Upcoming' : 'Ended'}
          </Chip>
          {!!item.country && <Text style={styles.country}>{item.country}</Text>}
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {item.title || 'Contest'}
        </Text>

        {!!item.theme && (
          <Text style={styles.theme} numberOfLines={2}>
            {item.theme}
          </Text>
        )}

        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText}>{whenText}</Text>
          </View>

          <View style={styles.metaSpacer} />

          <View style={[styles.metaPill, styles.pillGhost]}>
            <Text style={[styles.metaPillText, { color: '#555' }]}>
              {item.entryFee && item.entryFee > 0 ? `Entry ₹${item.entryFee}` : 'Free'}
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.ctaBtn}>
          <Text style={styles.ctaText}>View details</Text>
        </TouchableOpacity>
      </Surface>
    </Animated.View>
  );
}

export default function ContestsListScreen({ navigation }) {
  const contests = useContestStore((s) => s.contests);
  const loading = useContestStore((s) => s.contestsLoading);
  const refreshing = useContestStore((s) => s.contestsRefreshing);
  const hasMore = useContestStore((s) => s.hasMoreContests);
  const listContests = useContestStore((s) => s.listContests);

  const [filter, setFilter] = useState('active'); // active | upcoming | ended

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

  const ListHeader = () => (
    <View style={styles.hero}>
      <Text style={styles.heroTitle}>Contests</Text>
      <Text style={styles.heroSub}>Compete, rate, and climb the leaderboard.</Text>
      <View style={styles.filterRow}>
        <Chip
          selected={filter === 'active'}
          onPress={() => setFilter('active')}
          style={[styles.filterChip, filter === 'active' && styles.filterChipSelected]}
        >
          Active
        </Chip>
        <Chip
          selected={filter === 'upcoming'}
          onPress={() => setFilter('upcoming')}
          style={[styles.filterChip, filter === 'upcoming' && styles.filterChipSelected]}
        >
          Upcoming
        </Chip>
        <Chip
          selected={filter === 'ended'}
          onPress={() => setFilter('ended')}
          style={[styles.filterChip, filter === 'ended' && styles.filterChipSelected]}
        >
          Ended
        </Chip>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F7FB' }}>
      <FlatList
        data={contests}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        ListHeaderComponent={<ListHeader />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.3}
        onEndReached={onEnd}
        contentContainerStyle={{ padding: 12, paddingBottom: 28 }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No contests found</Text>
              <Text style={styles.emptySub}>Check back soon or try a different filter.</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loading ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator />
              {/* Skeletons */}
              <View style={{ height: 12 }} />
              <CardSkeleton />
              <CardSkeleton />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Hero
  hero: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 6 },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#18181B' },
  heroSub: { marginTop: 4, color: '#5B5B68' },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  filterChip: { backgroundColor: '#EFEFFE' },
  filterChipSelected: { backgroundColor: '#E2D8FE' },

  // Card
  card: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    width: CARD_W,
    alignSelf: 'center',
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: { borderRadius: 14 },
  chipActive: { backgroundColor: '#EAF5FF' },
  chipUpcoming: { backgroundColor: '#FFF5E6' },
  chipEnded: { backgroundColor: '#F5F5F5' },
  country: { marginLeft: 'auto', color: '#6B7280', fontWeight: '600' },

  title: { fontSize: 18, fontWeight: '900', marginTop: 8, color: '#16161A' },
  theme: { marginTop: 6, color: '#4B5563' },

  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  metaPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  pillGhost: { backgroundColor: '#F8FAFC', marginLeft: 8 },
  metaPillText: { fontWeight: '700', color: '#374151' },
  metaSpacer: { flex: 1 },

  ctaBtn: {
    marginTop: 16,
    backgroundColor: '#7A5AF8',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '800' },

  // Empty
  emptyWrap: { alignItems: 'center', marginTop: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  emptySub: { marginTop: 6, color: '#6B7280' },

  // Skeletons
  skelHeader: { height: 18, width: CARD_W * 0.5, backgroundColor: '#EEE', borderRadius: 6, marginBottom: 10 },
  skelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skelPill: { height: 20, width: 80, backgroundColor: '#EEE', borderRadius: 10 },
  skelLine: { height: 12, backgroundColor: '#EEE', borderRadius: 6, flexGrow: 1 },
  skelCta: { height: 40, backgroundColor: '#EEE', borderRadius: 12 },
});
