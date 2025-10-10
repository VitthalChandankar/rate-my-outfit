// src/screens/admin/ManagePostReportsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Button } from 'react-native-paper';
import { fbFetchReportedPosts, fbAdminUpdatePostStatus } from '../../services/firebase';
import { Image as ExpoImage } from 'expo-image';
import formatDate from '../../utils/formatDate';

function ReportedPostRow({ item, onRestore, onDelete }) {
  return (
    <View style={styles.row}>
      <ExpoImage source={{ uri: item.imageUrl }} style={styles.thumbnail} />
      <View style={styles.info}>
        <Text style={styles.caption} numberOfLines={2}>{item.caption || 'No caption'}</Text>
        <Text style={styles.meta}>Status: <Text style={{fontWeight: 'bold'}}>{item.status}</Text></Text>
        <Text style={styles.meta}>Reports: {item.reportsCount || 0}</Text>
        <Text style={styles.meta}>By: {item.user?.name || item.userId}</Text>
        <Text style={styles.meta}>On: {formatDate(item.createdAt)}</Text>
      </View>
      <View style={styles.actions}>
        <Button mode="contained-tonal" onPress={() => onRestore(item.id)} disabled={item.status === 'active'}>Restore</Button>
        <Button mode="contained" buttonColor="#B91C1C" onPress={() => onDelete(item.id)} style={{marginTop: 8}}>Delete</Button>
      </View>
    </View>
  );
}

export default function ManagePostReportsScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    const startAfter = reset ? null : lastDoc;
    const res = await fbFetchReportedPosts({ startAfterDoc: startAfter });
    if (res.success) {
      setPosts(prev => {
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
    fetchPosts(true);
  }, []);

  const handleRestore = async (outfitId) => {
    Alert.alert("Restore Post?", "This will reset the report count and make the post active again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Restore", onPress: async () => {
        const res = await fbAdminUpdatePostStatus({ outfitId, status: 'active' });
        if (res.success) {
          setPosts(prev => prev.filter(p => p.id !== outfitId));
        } else {
          Alert.alert("Error", "Could not restore post.");
        }
      }}
    ]);
  };

  const handleDelete = async (outfitId) => {
     Alert.alert("Delete Post?", "This will mark the post as deleted and notify the user.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        const res = await fbAdminUpdatePostStatus({ outfitId, status: 'deleted' });
        if (res.success) {
          setPosts(prev => prev.map(p => p.id === outfitId ? {...p, status: 'deleted'} : p));
        } else {
          Alert.alert("Error", "Could not delete post.");
        }
      }}
    ]);
  };

  return (
    <FlatList
      data={posts}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <ReportedPostRow item={item} onRestore={handleRestore} onDelete={handleDelete} />}
      onEndReached={() => hasMore && fetchPosts()}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchPosts(true)} />}
      ListEmptyComponent={!loading && <Text style={styles.emptyText}>No reported posts found.</Text>}
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