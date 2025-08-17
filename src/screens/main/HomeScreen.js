// File: src/screens/main/HomeScreen.js
// Description: Feed with stable keys, dedupe, refresh, and pagination.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import useOutfitStore from '../../store/outfitStore';
import OutfitCard from '../../components/OutfitCard';

function ensureKey(item) {
  if (item?.id) return item;
  return { ...item, _localKey: item?._localKey || `local:${Date.now()}:${Math.random().toString(36).slice(2)}` };
}

function dedupeById(items) {
  const map = new Map();
  for (const it of items || []) {
    const key = it?.id || it?._localKey;
    if (!key) continue;
    if (!map.has(key)) map.set(key, it);
  }
  return Array.from(map.values());
}

export default function HomeScreen({ navigation }) {
  const isFocused = useIsFocused();
  const feed = useOutfitStore((s) => s.feed);
  const fetchFeed = useOutfitStore((s) => s.fetchFeed);
  const loading = useOutfitStore((s) => s.loading);
  const refreshing = useOutfitStore((s) => s.refreshing);
  const lastDoc = useOutfitStore((s) => s.lastDoc);

  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    if (isFocused) {
      fetchFeed({ limit: 12, reset: true }).finally(() => setInitialLoaded(true));
    }
  }, [isFocused, fetchFeed]);

  const data = useMemo(() => {
    const withKeys = (feed || []).map(ensureKey);
    return dedupeById(withKeys);
  }, [feed]);

  const keyExtractor = useCallback((item) => String(item?.id || item?._localKey), []);

  const onRefresh = useCallback(() => {
    fetchFeed({ limit: 12, reset: true });
  }, [fetchFeed]);

  const loadMore = useCallback(() => {
    if (!loading && lastDoc) {
      fetchFeed({ limit: 12, reset: false });
    }
  }, [loading, lastDoc, fetchFeed]);

  const renderItem = useCallback(
    ({ item }) => {
      if (!item) return null;
      return (
        <OutfitCard
          item={item}
          onPress={() => item?.id && navigation.navigate('OutfitDetails', { outfitId: item.id })}
        />
      );
    },
    [navigation]
  );

  if (!initialLoaded && loading && (feed?.length ?? 0) === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading feed…</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      contentContainerStyle={styles.container}
      ListEmptyComponent={!loading ? <Text style={styles.empty}>No outfits yet — be the first to upload!</Text> : null}
      ListFooterComponent={loading ? <View style={{ paddingVertical: 16 }}><ActivityIndicator /></View> : null}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, backgroundColor: '#fff', flexGrow: 1 },
  empty: { textAlign: 'center', marginTop: 40, color: '#666' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
