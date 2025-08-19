// File: src/screens/contests/LeaderboardScreen.js
// Description: Modern leaderboard with avatars, usernames, and scores.
// can be used for global leaderboard later, we can adapt this component easily.
// Usage 1 (standalone screen): navigate with { contestId } in route params.
// Usage 2 (embedded component): import and render <LeaderboardList contestId="..." />

import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import useContestStore from '../../store/contestStore';
import Avatar from '../../components/Avatar';

export function LeaderboardList({ contestId, limit = 50, minVotes = 10 }) {
  const rows = useContestStore((s) => s.leaderboards[contestId] || []);
  const fetchLeaderboard = useContestStore((s) => s.fetchLeaderboard);
  const loadingBag = useContestStore((s) => s.entries[contestId]); // used to show footer spinner if needed
  const loading = loadingBag?.loading === true && rows.length === 0;

  useEffect(() => {
    if (contestId) {
      fetchLeaderboard({ contestId, limit, minVotes });
    }
  }, [contestId, limit, minVotes, fetchLeaderboard]);

  const onRefresh = useCallback(() => {
    fetchLeaderboard({ contestId, limit, minVotes });
  }, [contestId, limit, minVotes, fetchLeaderboard]);

  const renderItem = ({ item, index }) => (
    <View style={styles.row}>
      <Text style={styles.rank}>{index + 1}</Text>
      <Avatar uri={item.userPhoto} name={item.userName} size={40} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.name} numberOfLines={1}>
          {item.userName || `User ${String(item.userId || '').slice(0, 6)}`}
        </Text>
        <Text style={styles.sub}>
          {item.ratingsCount ? `${item.ratingsCount} votes` : '—'}
        </Text>
      </View>
      <Text style={styles.score}>{(item.averageRating || 0).toFixed(1)}</Text>
    </View>
  );

  return (
    <FlatList
      data={rows}
      keyExtractor={(it) => it.id || it.entryId || `${it.userId}-${(it.imageUrl || '').slice(-6)}`}
      renderItem={renderItem}
      onRefresh={onRefresh}
      refreshing={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
      ListHeaderComponent={
        <Text style={styles.title}>Leaderboard</Text>
      }
      ListEmptyComponent={
        !loading ? (
          <Text style={{ textAlign: 'center', color: '#666', marginTop: 24 }}>
            No leaderboard yet.
          </Text>
        ) : null
      }
      ListFooterComponent={
        loading ? (
          <View style={{ paddingVertical: 16 }}>
            <ActivityIndicator />
          </View>
        ) : null
      }
    />
  );
}

// Standalone screen wrapper (expects route.params.contestId)
export default function LeaderboardScreen({ route }) {
  const contestId = route?.params?.contestId || null;
  if (!contestId) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#666' }}>contestId missing</Text>
      </View>
    );
  }
  return <LeaderboardList contestId={contestId} />;
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', marginTop: 8, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  rank: { width: 28, textAlign: 'center', fontWeight: '800', color: '#555' },
  name: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 12, color: '#888', marginTop: 2 },
  score: { fontSize: 16, fontWeight: '800', color: '#7A5AF8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
