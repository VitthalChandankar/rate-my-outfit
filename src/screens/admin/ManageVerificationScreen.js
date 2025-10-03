// src/screens/admin/ManageVerificationScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { List, Badge, SegmentedButtons } from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { listVerificationApplications } from '../../services/firebase';
import formatDate from '../../utils/formatDate';

const statusColors = {
  pending: '#FF9500',
  approved: '#34C759',
  rejected: '#FF3B30',
};

export default function ManageVerificationScreen({ navigation }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const isFocused = useIsFocused();

  const fetchApplications = useCallback(async (isReset = false) => {
    if (isReset) setRefreshing(true); else setLoading(true);

    const res = await listVerificationApplications({ status: filter });

    if (res.success) {
      setApplications(res.items || []);
    }

    if (isReset) setRefreshing(false); else setLoading(false);
  }, [filter]);

  useEffect(() => {
    if (isFocused) {
      fetchApplications(true);
    }
  }, [isFocused, fetchApplications, filter]);

  const onRefresh = () => fetchApplications(true);

  const filteredApplications = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return applications;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return applications.filter(app => {
      const name = app.fullName || '';
      const username = app.username || '';
      return name.toLowerCase().includes(lowercasedQuery) ||
             username.toLowerCase().includes(lowercasedQuery);
    });
  }, [applications, searchQuery]);

  const renderItem = ({ item }) => (
    <List.Item
      title={`${item.fullName} (@${item.username})`}
      description={`Plan: ${item.plan} - Applied on ${formatDate(item.createdAt)}`}
      left={props => <List.Icon {...props} icon="account-check-outline" />}
      right={() => (
        <Badge style={[styles.badge, { backgroundColor: statusColors[item.status] || '#666' }]}>
          {item.status}
        </Badge>
      )}
      onPress={() => navigation.navigate('VerificationDetails', { applicationId: item.id })}
    />
  );

  if (loading && applications.length === 0) {
    return <View style={styles.center}><ActivityIndicator /></View>;
  }

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={filter}
        onValueChange={setFilter}
        style={styles.segmentedButtons}
        buttons={[
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
        ]}
      />
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          placeholder="Search by name or username..."
          placeholderTextColor="#999"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>
      <FlatList
        data={filteredApplications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        style={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No {filter} verification requests.</Text>}
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
  segmentedButtons: {
    margin: 16,
  },
  listContainer: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    marginHorizontal: 16,
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