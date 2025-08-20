// File: src/screens/contests/ContestsListScreen.js

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Surface, Chip } from 'react-native-paper';
import useContestStore from '../../store/contestStore';

// Small safe time helpers
function toMs(ts) {
  if (!ts) return null;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'object' && typeof ts.seconds === 'number') return ts.seconds * 1000;
  if (ts instanceof Date) return ts.getTime();
  return null;
}

function ContestCard({ item, onPress }) {
  const now = Date.now();
  const startMs = toMs(item.startAt);
  const endMs = toMs(item.endAt);

  const active = startMs != null && endMs != null ? now >= startMs && now <= endMs : false;
  const ended = endMs != null ? now > endMs : false;

  const status = active ? 'Active' : ended ? 'Ended' : 'Upcoming';

  const whenText = active && endMs
    ? `Ends ${new Date(endMs).toLocaleDateString()}`
    : ended && endMs
    ? `Ended ${new Date(endMs).toLocaleDateString()}`
    : startMs
    ? `Starts ${new Date(startMs).toLocaleDateString()}`
    : '—';

  const statusChipStyle =
    active ? styles.chipActive : ended ? styles.chipEnded : styles.chipUpcoming;

  return (
    <Surface style={styles.card} elevation={1}>
      <Text style={styles.title} numberOfLines={1}>
        {item.title || 'Contest'}
      </Text>

      <View style={styles.metaRow}>
        <Chip compact style={[styles.chip, statusChipStyle]}>{status}</Chip>
        {!!item.theme && <Text style={styles.subtitle} numberOfLines={1}>{item.theme}</Text>}
        {!!item.country && <Text style={styles.subtitle}> • {item.country}</Text>}
        <Text style={styles.when}>{whenText}</Text>
      </View>

      {!!item.entryFee && item.entryFee > 0 ? (
        <Text style={styles.subtitle}>Entry: {item.entryFee}</Text>
      ) : (
        <Text style={styles.subtitle}>Free</Text>
      )}

      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.cta}>View details</Text>
      </TouchableOpacity>
    </Surface>
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
    <ContestCard
      item={item}
      onPress={() => navigation.navigate('ContestDetails', { contestId: item.id })}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.filters}>
        <Chip
          selected={filter === 'active'}
          onPress={() => setFilter('active')}
          style={styles.filterChip}
        >
          Active
        </Chip>
        <Chip
          selected={filter === 'upcoming'}
          onPress={() => setFilter('upcoming')}
          style={styles.filterChip}
        >
          Upcoming
        </Chip>
        <Chip
          selected={filter === 'ended'}
          onPress={() => setFilter('ended')}
          style={styles.filterChip}
        >
          Ended
        </Chip>
      </View>

      <FlatList
        data={contests}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReachedThreshold={0.4}
        onEndReached={onEnd}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        ListEmptyComponent={!loading ? <Text style={{ textAlign: 'center', marginTop: 24, color: '#666' }}>No contests found.</Text> : null}
        ListFooterComponent={loading ? <View style={{ paddingVertical: 16 }}><ActivityIndicator /></View> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 10, gap: 8 },
  filterChip: { marginRight: 8 },
  card: { borderRadius: 16, padding: 14, marginBottom: 12, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { marginTop: 6, color: '#555' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  chip: { borderRadius: 14 },
  chipActive: { backgroundColor: '#EAF5FF' },
  chipUpcoming: { backgroundColor: '#FFF5E6' },
  chipEnded: { backgroundColor: '#F6F6F6' },
  when: { marginLeft: 'auto', color: '#888' },
  cta: { marginTop: 12, fontWeight: '700', color: '#7A5AF8' },
});
