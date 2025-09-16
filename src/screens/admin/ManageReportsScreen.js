// src/screens/admin/ManageReportsScreen.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { List, Badge } from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { listProblemReports } from '../../services/firebase';
import formatDate from '../../utils/formatDate';

const statusColors = {
  new: '#007AFF',
  in_progress: '#FF9500',
  resolved: '#34C759',
};

export default function ManageReportsScreen({ navigation }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isFocused = useIsFocused();

  // Use refs to manage pagination state to prevent re-creating fetch function
  const lastDocRef = useRef(null);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);

  const fetchReports = useCallback(async (isReset = false) => {
    // Prevent multiple fetches from running at the same time
    if (loadingRef.current) return;
    loadingRef.current = true;

    if (isReset) {
      setRefreshing(true);
      lastDocRef.current = null;
      hasMoreRef.current = true;
    } else {
      if (!hasMoreRef.current) {
        loadingRef.current = false;
        return; // No more items to fetch
      }
      setLoading(true);
    }

    const res = await listProblemReports({ startAfterDoc: lastDocRef.current });

    if (res.success) {
      const newItems = res.items || [];
      setReports(prevReports => isReset ? newItems : [...prevReports, ...newItems]);
      lastDocRef.current = res.last;
      hasMoreRef.current = !!res.last;
    }

    if (isReset) { setRefreshing(false); } else { setLoading(false); }
    loadingRef.current = false;
  }, []); // Empty dependency array makes this function stable

  useEffect(() => {
    if (isFocused) {
      fetchReports(true);
    }
  }, [isFocused, fetchReports]);

  const onRefresh = () => fetchReports(true);
  const onEndReached = () => {
    fetchReports(false);
  };

  const filteredReports = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return reports;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return reports.filter(report => {
      const category = report.category || '';
      const name = report.reporterName || '';
      const username = report.reporterUsername || '';
      const description = report.description || '';

      return category.toLowerCase().includes(lowercasedQuery) ||
             name.toLowerCase().includes(lowercasedQuery) ||
             username.toLowerCase().includes(lowercasedQuery) ||
             description.toLowerCase().includes(lowercasedQuery);
    });
  }, [reports, searchQuery]);

  const renderItem = ({ item }) => (
    <List.Item
      title={`${item.category.toUpperCase()}: by ${item.reporterName || 'Unknown'}`}
      description={`@${item.reporterUsername} - ${formatDate(item.createdAt)}`}
      left={props => <List.Icon {...props} icon="alert-circle-outline" />}
      right={() => (
        <Badge style={[styles.badge, { backgroundColor: statusColors[item.status] || '#666' }]}>
          {item.status}
        </Badge>
      )}
      onPress={() => {
        navigation.navigate('ReportDetails', { report: item });
      }}
    />
  );

  if (loading && reports.length === 0) {
    return <View style={styles.center}><ActivityIndicator /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          placeholder="Search reports..."
          placeholderTextColor="#999"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>
      <FlatList
        data={filteredReports}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading && !refreshing ? <ActivityIndicator style={{ margin: 20 }} /> : null}
        ListEmptyComponent={!loading && !refreshing ? <Text style={styles.emptyText}>No problem reports found.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#666' },
  badge: {
    alignSelf: 'center',
    marginRight: 8,
    color: '#fff',
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
  },
});