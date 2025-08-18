// File: src/screens/contests/ContestsListScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Surface, Chip } from 'react-native-paper';
import useContestStore from '../../store/contestStore';
import formatDate from '../../utils/formatDate';

function ContestCard({ item, onPress }) {
  const now = Date.now();
  const s = item.startAt?.seconds ? item.startAt.seconds * 1000 : item.startAt;
  const e = item.endAt?.seconds ? item.endAt.seconds * 1000 : item.endAt;
  const active = now >= s && now <= e;
  const ended = now > e;
  const status = active ? 'Active' : ended ? 'Ended' : 'Upcoming';
  return (
    <Surface style={styles.card} elevation={1}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={styles.title}>{item.title || 'Contest'}</Text>
        <Chip compact style={[styles.chip, active ? styles.chipActive : ended ? styles.chipEnded : styles.chipUpcoming]}>
          {status}
        </Chip>
      </View>
      {!!item.theme && <Text style={styles.subtitle}>{item.theme}</Text>}
      <View style={styles.metaRow}>
        {!!item.country && <Chip compact mode="outlined">{item.country}</Chip>}
        {!!item.entryFee && item.entryFee > 0 ? <Chip compact mode="flat">Entry: {item.entryFee}</Chip> : <Chip compact mode="flat">Free</Chip>}
        <Text style={styles.when}>
          {active ? `Ends ${formatDate(e)}` : ended ? `Ended ${formatDate(e)}` : `Starts ${formatDate(s)}`}
        </Text>
      </View>
      <Text onPress={onPress} style={styles.cta}>View details</Text>
    </Surface>
  );
}

export default function ContestsListScreen({ navigation }) {
  const contests = useContestStore((s) => s.contests);
  const loading = useContestStore((s) => s.contestsLoading);
  const refreshing = useContestStore((s) => s.contestsRefreshing);
  const last = useContestStore((s) => s.contestsLast);
  const hasMore = useContestStore((s) => s.hasMoreContests);
  const listContests = useContestStore((s) => s.listContests);

  const [filter, setFilter] = useState('active');

  useEffect(() => {
    listContests({ limit: 20, reset: true, status: filter });
  }, [filter, listContests]);

  const onRefresh = useCallback(() => listContests({ limit: 20, reset: true, status: filter }), [filter, listContests]);
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
        <Chip selected={filter === 'active'} onPress={() => setFilter('active')} style={styles.filterChip}>Active</Chip>
        <Chip selected={filter === 'upcoming'} onPress={() => setFilter('upcoming')} style={styles.filterChip}>Upcoming</Chip>
        <Chip selected={filter === 'ended'} onPress={() => setFilter('ended')} style={styles.filterChip}>Ended</Chip>
      </View>
      <FlatList
        data={contests}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />}
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
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  chip: { borderRadius: 14 },
  chipActive: { backgroundColor: '#EAF5FF' },
  chipUpcoming: { backgroundColor: '#FFF5E6' },
  chipEnded: { backgroundColor: '#F6F6F6' },
  when: { marginLeft: 'auto', color: '#888' },
  cta: { marginTop: 12, fontWeight: '700', color: '#7A5AF8' },
});
