// src/screens/admin/ManageAIFlagsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Button } from 'react-native-paper';
import { fbFetchAIFlaggedEntries, fbAdminUpdateAIStatus } from '../../services/firebase';
import { Image as ExpoImage } from 'expo-image';
import formatDate from '../../utils/formatDate';
const AIFlaggedRow = React.memo(({ item, onClear, onDelete }) => {
    return (
        <View style={styles.row}>
            <ExpoImage source={{ uri: item.imageUrl }} style={styles.thumbnail} />
            <View style={styles.info}>
                <Text style={styles.caption} numberOfLines={2}>{item.caption || 'No caption'}</Text>
                <Text style={styles.meta}>Status: <Text style={{ fontWeight: 'bold' }}>{item.status}</Text></Text>
                <Text style={styles.meta}>AI Flags: {item.aiFlagsCount || 0}</Text>
                <Text style={styles.meta}>By: {item.user?.name || item.userId}</Text>
                <Text style={styles.meta}>On: {formatDate(item.createdAt)}</Text>
            </View>
            <View style={styles.actions}>
                <Button mode="contained-tonal" onPress={() => onClear(item.id, item.outfitId)}>Clear Flags</Button>
                <Button mode="contained" buttonColor="#B91C1C" onPress={() => onDelete(item.id, item.outfitId)} style={{ marginTop: 8 }}>Delete</Button>
            </View>
        </View>
    );
});

export default function ManageAIFlagsScreen() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchEntries = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    const startAfter = reset ? null : lastDoc;
    const res = await fbFetchAIFlaggedEntries({ startAfterDoc: startAfter });
    if (res.success) {
      setEntries(prev => {
        const newItems = res.items || [];
        const combined = reset ? newItems : [...prev, ...newItems];
        return Array.from(new Map(combined.map(item => [item.id, item])).values());
      });
      setLastDoc(res.last);
      setHasMore(!!res.last);
    }
    setLoading(false);
  }, [loading, lastDoc]);

  useEffect(() => {
    fetchEntries(true);
  }, []);

  const handleClearFlags = useCallback(async (entryId, outfitId) => {
    Alert.alert("Clear AI Flags?", "This will reset the AI flag count and make the entry active again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", onPress: async () => {
        const res = await fbAdminUpdateAIStatus({ entryId, outfitId, action: 'clear' });
        if (res.success) {
          setEntries(prev => prev.filter(p => p.id !== entryId)); // Remove from list
        } else {
          Alert.alert("Error", "Could not clear flags for this entry.");
        }
      }}
    ]);
  }, []);

  const handleDelete = useCallback(async (entryId, outfitId) => {
     Alert.alert("Delete Entry?", "This will mark the entry as deleted.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        const res = await fbAdminUpdateAIStatus({ entryId, outfitId, action: 'delete' });
        if (res.success) {
          setEntries(prev => prev.filter(p => p.id !== entryId)); // Remove from list
        } else {
          Alert.alert("Error", "Could not delete entry.");
        }
      }}
    ]);
  }, []);

  return (
    <FlatList
      data={entries}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <AIFlaggedRow item={item} onClear={handleClearFlags} onDelete={handleDelete} />}
      onEndReached={() => hasMore && fetchEntries()}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchEntries(true)} />}
      ListEmptyComponent={!loading && <Text style={styles.emptyText}>No AI-flagged entries found.</Text>}
      ListFooterComponent={loading && <ActivityIndicator style={{ margin: 20 }} />}
      style={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  row: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  thumbnail: { width: 80, height: 100, borderRadius: 8, backgroundColor: '#f0f0f0' },
  info: { flex: 1, marginLeft: 10, justifyContent: 'center' },
  caption: { fontWeight: 'bold', marginBottom: 4 },
  meta: { fontSize: 12, color: '#666' },
  actions: { justifyContent: 'center' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#666' },
});