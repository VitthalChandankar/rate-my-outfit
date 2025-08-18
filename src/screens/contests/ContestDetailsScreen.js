// File: src/screens/contests/ContestDetailsScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Chip, SegmentedButtons, Surface } from 'react-native-paper';
import useContestStore from '../../store/contestStore';
import useAuthStore from '../../store/authStore';
import OutfitCard from '../../components/OutfitCard';
import { withCloudinaryTransforms, IMG_DETAIL, IMG_FEED } from '../../utils/cloudinaryUrl';

function EntryRateCard({ item, onRate, onFlagAI }) {
  // Minimal row with quick 0–10 and AI toggle
  return (
    <Surface style={styles.entryCard} elevation={1}>
      <Text style={styles.entryCaption} numberOfLines={1}>{item.caption || 'Outfit'}</Text>
      <Text style={styles.entryMeta}>{(item.averageRating || 0).toFixed(1)} · {item.ratingsCount || 0} votes</Text>
      <View style={{ flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' }}>
        {[0,1,2,3,4,5,6,7,8,9,10].map((n) => (
          <TouchableOpacity key={n} onPress={() => onRate(n)} style={[styles.ratePill, { backgroundColor: n >= 8 ? '#EAF5FF' : n >= 5 ? '#F7F7FF' : '#FFF7F7' }]}>
            <Text style={{ fontWeight: '700' }}>{n}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={onFlagAI} style={[styles.ratePill, { backgroundColor: '#FFEFF5' }]}>
          <Text style={{ fontWeight: '700', color: '#E91E63' }}>Looks AI</Text>
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
  const leaderboard = useContestStore((s) => s.leaderboards[contestId]);

  const [tab, setTab] = useState('enter'); // enter | rate | leaderboard

  useEffect(() => {
    // Preload entries and leaderboard
    fetchEntries({ contestId, reset: true });
    fetchLeaderboard({ contestId, limit: 50, minVotes: 5 });
  }, [contestId, fetchEntries, fetchLeaderboard]);

  const entries = entriesBag?.items || [];
  const loading = entriesBag?.loading && (entries?.length ?? 0) === 0;

  const onEnter = () => {
    // Navigate to your UploadScreen and pass contestId
    navigation.navigate('Upload', { contestId });
  };

  const onRate = async (entryId, value) => {
    if (!user?.uid) return Alert.alert('Sign in', 'Please sign in to rate.');
    const res = await rateEntry({ entryId, contestId, rating: value, aiFlag: false });
    if (!res.success) Alert.alert('Error', 'Could not submit rating.');
  };

  const onFlagAI = async (entryId) => {
    if (!user?.uid) return Alert.alert('Sign in', 'Please sign in to flag.');
    const res = await rateEntry({ entryId, contestId, rating: 0, aiFlag: true });
    if (!res.success) Alert.alert('Error', 'Could not submit flag.');
  };

  const renderRateItem = ({ item }) => (
    <View style={{ marginBottom: 12 }}>
      <OutfitCard item={item} onPress={() => navigation.navigate('OutfitDetails', { outfitId: item.id })} />
      <EntryRateCard item={item} onRate={(v) => onRate(item.id, v)} onFlagAI={() => onFlagAI(item.id)} />
    </View>
  );

  const renderLeaderItem = ({ item, index }) => (
    <View style={styles.row}>
      <Text style={styles.rank}>{index + 1}</Text>
      <Text style={styles.name} numberOfLines={1}>{item.caption || 'Outfit'}</Text>
      <Text style={styles.score}>{(item.averageRating || 0).toFixed(1)}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <SegmentedButtons
        value={tab}
        onValueChange={setTab}
        buttons={[
          { value: 'enter', label: 'Enter' },
          { value: 'rate', label: 'Rate' },
          { value: 'leaderboard', label: 'Leaderboard' },
        ]}
        style={{ margin: 12 }}
      />

      {tab === 'enter' && (
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: '800' }}>Join this contest</Text>
          <Text style={{ color: '#666', marginTop: 6 }}>Upload your best outfit to compete and climb the leaderboard.</Text>
          <TouchableOpacity onPress={onEnter} style={styles.enterBtn} activeOpacity={0.8}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>Upload Outfit</Text>
          </TouchableOpacity>
          <Text style={{ marginTop: 16, fontWeight: '700' }}>Recent entries</Text>
          {loading ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}><ActivityIndicator /></View>
          ) : (
            <FlatList
              data={entries}
              keyExtractor={(it) => it.id}
              renderItem={({ item }) => <OutfitCard item={item} onPress={() => navigation.navigate('OutfitDetails', { outfitId: item.id })} />}
              contentContainerStyle={{ paddingVertical: 8 }}
              onEndReachedThreshold={0.4}
              onEndReached={() => !entriesBag?.loading && entriesBag?.hasMore && fetchEntries({ contestId })}
            />
          )}
        </View>
      )}

      {tab === 'rate' && (
        <FlatList
          data={entries}
          keyExtractor={(it) => it.id}
          renderItem={renderRateItem}
          contentContainerStyle={{ padding: 12 }}
          onEndReachedThreshold={0.4}
          onEndReached={() => !entriesBag?.loading && entriesBag?.hasMore && fetchEntries({ contestId })}
          ListFooterComponent={entriesBag?.loading ? <View style={{ paddingVertical: 16 }}><ActivityIndicator /></View> : null}
        />
      )}

      {tab === 'leaderboard' && (
        <FlatList
          data={leaderboard || []}
          keyExtractor={(it) => it.id}
          renderItem={renderLeaderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#666', marginTop: 24 }}>No leaderboard yet.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  entryCard: { borderRadius: 14, padding: 12, backgroundColor: '#fff', marginHorizontal: 12, marginTop: 6 },
  entryCaption: { fontWeight: '700' },
  entryMeta: { color: '#777', marginTop: 4 },
  ratePill: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, marginRight: 8, marginTop: 8 },
  enterBtn: { backgroundColor: '#7A5AF8', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomColor: '#eee', borderBottomWidth: 1 },
  rank: { width: 28, textAlign: 'center', fontWeight: '800', color: '#555' },
  name: { flex: 1, fontWeight: '600' },
  score: { fontWeight: '800', color: '#7A5AF8' },
});
