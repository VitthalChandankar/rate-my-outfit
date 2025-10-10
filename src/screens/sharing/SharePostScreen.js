// src/screens/sharing/SharePostScreen.js
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import useShareStore from '../../store/shareStore';

function UserRow({ user, onSend, isSent }) {
  return (
    <View style={styles.row}>
      <ExpoImage source={{ uri: user.profilePicture }} style={styles.avatar} />
      <View style={styles.userInfo}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.username}>@{user.username}</Text>
      </View>
      <TouchableOpacity
        style={[styles.sendButton, isSent && styles.sentButton]}
        onPress={() => onSend(user)}
        disabled={isSent}
      >
        <Text style={[styles.sendButtonText, isSent && styles.sentButtonText]}>
          {isSent ? 'Sent' : 'Send'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function SharePostScreen({ route, navigation }) {
  const { outfitData } = route.params;
  const { mutuals, loadingMutuals, fetchMutuals, sendShare } = useShareStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sentTo, setSentTo] = useState(new Set());

  useEffect(() => {
    fetchMutuals();
  }, [fetchMutuals]);

  const filteredMutuals = useMemo(() => {
    if (!searchQuery) return mutuals;
    const lowercasedQuery = searchQuery.toLowerCase();
    return mutuals.filter(
      user =>
        user.name?.toLowerCase().includes(lowercasedQuery) ||
        user.username?.toLowerCase().includes(lowercasedQuery)
    );
  }, [mutuals, searchQuery]);

  const handleSend = async (recipient) => {
    if (sentTo.has(recipient.uid)) return;

    setSentTo(prev => new Set(prev).add(recipient.uid));

    const res = await sendShare({ recipientId: recipient.uid, outfitData });

    if (!res.success) {
      Alert.alert('Error', 'Could not send the post. Please try again.');
      setSentTo(prev => {
        const newSet = new Set(prev);
        console.log(`Removing ${recipient.uid} from sentTo due to error`); // Add this line
        newSet.delete(recipient.uid);
        return newSet;
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          placeholder="Search for a friend..."
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      {loadingMutuals ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredMutuals}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => (
            <UserRow
              user={item}
              onSend={handleSend}
              isSent={sentTo.has(item.uid)}
            />
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No mutual followers found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    margin: 16,
    borderRadius: 12,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  username: {
    color: '#6B7280',
    marginTop: 2,
  },
  sendButton: {
    backgroundColor: '#7A5AF8',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sentButton: {
    backgroundColor: '#E5E7EB', // A neutral grey color
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sentButtonText: {
    color: '#6B7280', // A darker grey for the text
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#6B7280',
  },
});