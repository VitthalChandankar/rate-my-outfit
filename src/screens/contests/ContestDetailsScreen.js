// File: src/screens/contests/ContestDetailsScreen.js
// World-class contest details screen: immersive banner, clean typography, and a focused user flow.

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Alert,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import useContestStore from '../../store/contestStore';
import { Surface } from 'react-native-paper';
import OutfitCard from '../../components/OutfitCard';
import { LeaderboardList } from './LeaderboardScreen';
import useUserStore from '../../store/UserStore';

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

function formatDate(ms) {
  if (!ms) return '—';
  const date = new Date(ms);
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('en-US', options).toUpperCase();
}

function countryCodeToFlag(isoCode) {
  if (!isoCode || isoCode.length !== 2) return '';
  // Formula to convert a 2-letter country code to a flag emoji
  return isoCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397));
}

export default function ContestDetailsScreen({ route, navigation }) {
  const { contestId, initialTab = 'entries' } = route.params;

  const [activeTab, setActiveTab] = useState(initialTab); // 'entries' | 'leaderboard'
  const myProfile = useUserStore((s) => s.myProfile);

  const { fetchEntries, fetchLeaderboard } = useContestStore();
  const entriesBag = useContestStore((s) => s.entries[contestId]);
  const { contest } = useContestStore((s) => ({
    contest: s.contests.find((c) => c.id === contestId) || s.contestsById[contestId],
  }));

  const contestData = contest || {}

  const startMs = toMs(contestData.startAt);
  const endMs = toMs(contestData.endAt);
  const status = statusFromRange(startMs, endMs);

  const host = contestData.host || 'Host';

  const countryDisplay = React.useMemo(() => {
    if (!contestData.country) return 'N/A';
    if (contestData.country === 'GLOBAL') return '🌐 Global';
    return `${countryCodeToFlag(contestData.country)} ${contestData.country.toUpperCase()}`;
  }, [contestData.country]);

  useFocusEffect(
    React.useCallback(() => {
      // After a short delay, check if the profile is loaded and if the country is missing.
      const timer = setTimeout(() => {
        if (myProfile && !myProfile.country) {
          Alert.alert(
            'Country Required',
            'To participate in contests, please add your country to your profile.',
            [
              { text: 'Later', style: 'cancel', onPress: () => navigation.goBack() },
              { text: 'Add Country', onPress: () => navigation.navigate('EditProfile') }
            ]
          );
        }
      }, 500);
      return () => clearTimeout(timer);
    }, [myProfile, navigation])
  );
 
  const bannerImage = contestData.image || contestData.bannerImage || null;

  useEffect(() => {
    fetchLeaderboard({ contestId, limit: 50, minVotes: 1 });
    fetchEntries({ contestId, reset: true });
 
  }, [contestId, fetchEntries, fetchLeaderboard, status]);

  const entries = entriesBag?.items || [];
  const entriesLoading = entriesBag?.loading && (entries?.length ?? 0) === 0;


  const onParticipate = () => navigation.navigate('Upload', { contestId });


  const openEntryFlow = (item) => navigation.navigate('RateEntry', { item, mode: 'entry' });

  const InfoCard = ({ icon, label, value }) => (
    <View style={styles.infoCard}>
      <Ionicons name={icon} size={24} color="#8A63F8" style={styles.infoIcon} />
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  const Header = () => (
    <View style={styles.headerContainer}>
      <Surface style={styles.mainCard} elevation={4}>
        <View style={styles.mainCardInner}>
          {/* Banner */}
          {bannerImage && (
            <ExpoImage source={{ uri: bannerImage }} style={styles.bannerImg} contentFit="cover" />
          )}

          {/* Details */}
          <View style={styles.detailsContainer}>
            <Text style={styles.title}>{contestData.title || 'Contest'}</Text>
            {!!contestData.theme && <Text style={styles.theme}>{contestData.theme}</Text>}
            <View style={styles.infoGrid}>
              <InfoCard icon="calendar-outline" label="Starts" value={formatDate(startMs)} />
              <InfoCard icon="flag-outline" label="Ends" value={formatDate(endMs)} />
              <InfoCard icon="person-outline" label="Host" value={host} />
              <InfoCard icon="gift-outline" label="Prize" value={contestData.prize || 'Feature'} />
              <InfoCard icon="globe-outline" label="Region" value={countryDisplay} />
            </View>
            
            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={onParticipate}
                style={[styles.button, styles.primaryBtn, status !== 'active' && styles.disabledBtn]}
                activeOpacity={0.8}
                disabled={status !== 'active'}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>Participate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Surface>

     {/* Tabs */}
     <View style={styles.tabContainer}>
        <Pressable onPress={() => setActiveTab('entries')} style={[styles.tab, activeTab === 'entries' && styles.activeTab]}>
          <Text style={[styles.tabText, activeTab === 'entries' && styles.activeTabText]}>Recent Entries</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab('leaderboard')} style={[styles.tab, activeTab === 'leaderboard' && styles.activeTab]}>
          <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.activeTabText]}>Leaderboard</Text>
        </Pressable>
      </View>
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
    <View style={styles.screen}>
      {activeTab === 'entries' && (
        <FlatList
          data={entries}
          keyExtractor={(it) => String(it.id)}
          ListHeaderComponent={<Header />}
          renderItem={renderEntryCard}
          contentContainerStyle={{ paddingBottom: 24 }}
          onEndReachedThreshold={0.4}
          onEndReached={() => !entriesBag?.loading && entriesBag?.hasMore && fetchEntries({ contestId })}
          ListFooterComponent={entriesBag?.loading ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null}
          ListEmptyComponent={!entriesLoading ? <Text style={styles.emptyText}>Be the first to submit an entry!</Text> : null}
        />
      )}
      {activeTab === 'leaderboard' && (
        <LeaderboardList contestId={contestId} ListHeaderComponent={<Header />} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F8FA' },
  headerContainer: { paddingVertical: 16, alignItems: 'center' },
  mainCard: {
    width: width - PADDING_H * 2,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  mainCardInner: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  bannerImg: { width: '100%', height: 180 },
  detailsContainer: { padding: PADDING_H },
  title: { fontSize: 24, fontWeight: '900', color: '#1A1A1A', letterSpacing: -0.5 },
  theme: { fontSize: 14, color: '#555', marginTop: 4, marginBottom: 16, lineHeight: 21 },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -4,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    width: '48%',
    marginBottom: 8,
  },
  infoIcon: { marginRight: 10 },
  infoLabel: { fontSize: 12, color: '#666', fontWeight: '600' },
  infoValue: { fontSize: 14, color: '#1A1A1A', fontWeight: '800', marginTop: 2 },
 
  actionsRow: { flexDirection: 'row', marginTop: 16 },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtn: { backgroundColor: '#7A5AF8' },
  disabledBtn: { backgroundColor: '#C5C5C5' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: PADDING_H,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#7A5AF8',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#666',
  },
  activeTabText: {
    color: '#7A5AF8',
  },
 
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    color: '#666'
  },
});
