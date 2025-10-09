// File: src/screens/contests/LeaderboardScreen.js
// Description: Modern leaderboard with avatars, usernames, and scores.
// can be used for global leaderboard later, we can adapt this component easily.
// Usage 1 (standalone screen): navigate with { contestId } in route params.
// Usage 2 (embedded component): import and render <LeaderboardList contestId="..." />

import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useContestStore from '../../store/contestStore';
import Avatar from '../../components/Avatar';

// NEW: Component for a single winner in the top 3 podium
const WinnerCard = ({ user, rank, onUserPress }) => {
  const isFirst = rank === 1;
  const size = isFirst ? 80 : 60;
  const containerStyle = isFirst ? styles.winnerCardFirst : styles.winnerCard;

  return (
    <Pressable onPress={() => onUserPress(user.userId)} style={[styles.winnerCardContainer, isFirst && styles.winnerCardContainerFirst]}>
      <View style={containerStyle}>
        <Text style={styles.winnerRank}>{rank}</Text>
        <Avatar uri={user.user?.profilePicture} size={size} ring={isFirst} ringColor="#FFD700" />
        <Text style={styles.winnerName} numberOfLines={1}>{user.user?.name || 'User'}</Text>
        <Text style={styles.winnerScore}>{(user.averageRating || 0).toFixed(1)}</Text>
      </View>
    </Pressable>
  );
};

// NEW: Component to display the top 3 winners in a podium layout
function TopThree({ topThree, onUserPress }) {
  if (!topThree || topThree.length === 0) {
    return null;
  }

  // Ensure we have placeholders if there are fewer than 3 winners
  const first = topThree[0];
  const second = topThree[1];
  const third = topThree[2];

  return (
    <View style={styles.topThreeContainer}>
      {second ? (
        <WinnerCard user={second} rank={2} onUserPress={onUserPress} />
      ) : <View style={styles.winnerCardContainer} /> /* Placeholder */}
      {first ? (
        <WinnerCard user={first} rank={1} onUserPress={onUserPress} />
      ) : <View style={styles.winnerCardContainer} /> /* Placeholder */}
      {third ? (
        <WinnerCard user={third} rank={3} onUserPress={onUserPress} />
      ) : <View style={styles.winnerCardContainer} /> /* Placeholder */}
    </View>
  );
}

export function LeaderboardList({ contestId, limit = 50, minVotes = 1, ListHeaderComponent }) {
  const navigation = useNavigation();
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

  const handleUserPress = useCallback((userId) => {
    if (userId) {
      navigation.navigate('UserProfile', { userId });
    }
  }, [navigation]);

  const topThree = rows.slice(0, 3);
  const restOfList = rows.slice(3);

  const renderItem = useCallback(({ item, index }) => {
    return (
      <Pressable onPress={() => handleUserPress(item.userId)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: '#f9f9f9' }]}>
        <Text style={styles.rank}>{index + 4}</Text>
        <Avatar uri={item.user?.profilePicture} name={item.user?.name} size={40} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.name} numberOfLines={1}>
            {item.user?.name || `User ${String(item.userId || '').slice(0, 6)}`}
          </Text>
          <Text style={styles.sub}>
            {item.ratingsCount ? `${item.ratingsCount} votes` : '—'}
          </Text>
        </View>
        <Text style={styles.score}>{(item.averageRating || 0).toFixed(1)}</Text>
      </Pressable>
    );
  }, [handleUserPress]);

  return (
    <FlatList
      data={restOfList}
      keyExtractor={(it) => it.id || it.entryId || `${it.userId}-${(it.imageUrl || '').slice(-6)}`}
      renderItem={renderItem}
      onRefresh={onRefresh}
      refreshing={false}
      contentContainerStyle={{ paddingBottom: 24 }}
      ListHeaderComponent={
        <>
          {ListHeaderComponent || <Text style={styles.title}>Leaderboard</Text>}
          <TopThree topThree={topThree} onUserPress={handleUserPress} />
          {restOfList.length > 0 && <Text style={styles.listTitle}>All Ranks</Text>}
        </>
      }
      ListEmptyComponent={
        !loading ? (
          <Text style={{ textAlign: 'center', color: '#666', marginTop: 24 }}>
            {topThree?.length === 0 && restOfList?.length === 0 ? "No leaderboard yet." : null}
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
  title: { fontSize: 22, fontWeight: '800', marginTop: 8, marginBottom: 8, paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  rank: { width: 28, textAlign: 'center', fontWeight: '800', color: '#555' },
  name: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 12, color: '#888', marginTop: 2 },
  score: { fontSize: 16, fontWeight: '800', color: '#7A5AF8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Top 3 Podium Styles
  topThreeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingVertical: 20,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  winnerCardContainer: {
    alignItems: 'center',
    flex: 1,
  },
  winnerCardContainerFirst: {
    // The middle item can be normal, its content is what's elevated
  },
  winnerCard: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    width: '90%',
  },
  winnerCardFirst: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 16,
    backgroundColor: '#fff',
    width: '95%',
    marginBottom: 20, // Elevate it
    shadowColor: '#7A5AF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  winnerRank: {
    position: 'absolute',
    top: -12,
    backgroundColor: '#7A5AF8',
    color: '#fff',
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: 'bold',
    zIndex: 1,
  },
  winnerName: { marginTop: 8, fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  winnerScore: { marginTop: 4, fontSize: 16, fontWeight: '900', color: '#7A5AF8' },
  listTitle: { fontSize: 18, fontWeight: '800', marginTop: 16, marginBottom: 8, paddingHorizontal: 16, color: '#333' },
});
