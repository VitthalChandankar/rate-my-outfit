// src/screens/admin/ManageShippingScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Card, Title, Paragraph } from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { fbFetchAllShippingDetails } from '../../services/firebase';
import formatDate from '../../utils/formatDate';

function ShippingDetailCard({ item }) {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <Title>{item.fullName}</Title>
        <Paragraph style={styles.detail}>Contest ID: {item.contestId}</Paragraph>
        <Paragraph style={styles.detail}>User ID: {item.userId}</Paragraph>
        <Paragraph style={styles.detail}>Phone: {item.phone}</Paragraph>
        <Paragraph style={styles.address}>
          {item.address1}{item.address2 ? `, ${item.address2}` : ''}{'\n'}
          {item.city}, {item.state} {item.postalCode}{'\n'}
          {item.country}
        </Paragraph>
        <Text style={styles.timestamp}>Submitted: {formatDate(item.submittedAt)}</Text>
      </Card.Content>
    </Card>
  );
}

export default function ManageShippingScreen() {
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const isFocused = useIsFocused();

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    const res = await fbFetchAllShippingDetails();
    if (res.success) {
      setDetails(res.items);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isFocused) {
      fetchDetails();
    }
  }, [isFocused, fetchDetails]);

  return (
    <FlatList
      data={details}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <ShippingDetailCard item={item} />}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchDetails} />}
      ListEmptyComponent={!loading && <Text style={styles.emptyText}>No shipping details submitted yet.</Text>}
      ListHeaderComponent={loading && details.length === 0 ? <ActivityIndicator style={{ marginTop: 20 }} /> : null}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  detail: {
    fontSize: 14,
    color: '#555',
  },
  address: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
  },
  timestamp: {
    marginTop: 8,
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#666',
  },
});