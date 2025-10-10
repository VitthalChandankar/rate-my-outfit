// src/screens/main/SearchScreen.js
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import useUserStore from '../../store/UserStore';
import useAuthStore from '../../store/authStore'; // adjust path if your auth store lives elsewhere
import Avatar from '../../components/Avatar';
import LottieView from 'lottie-react-native';
import SearchUserAnimation from '../../../assets/lottie/Search_user_animation.json';
import { SafeAreaView } from 'react-native-safe-area-context';

// If `firebaseSearchUsers` lives in your project, import it accordingly:
import { firebaseSearchUsers } from '../../services/firebase';

export function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const { profilesById, loadUserProfile, follow, unfollow, relCache, isFollowing } = useUserStore();
  const { user } = useAuthStore();
  const authedId = user?.uid || user?.user?.uid || null;

  const inputRef = useRef(null);

  const handleSearch = useCallback(async (text) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await firebaseSearchUsers(text);
      if (res?.success) {
        setSearchResults(res.users || []);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.warn('Search error', err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    // Dismiss keyboard then re-focus input for quick typing if you prefer
    // Keyboard.dismiss();
    if (inputRef.current && typeof inputRef.current.focus === 'function') {
      inputRef.current.focus();
    }
  }, []);

  const renderItem = ({ item }) => {
    const display = {
      name: item.name || 'User',
      username: item.username,
      picture: item.picture,
    };

    const isSelf = authedId && item.id === authedId;
    const relIdOf = (followerId, followingId) => `${followerId}_${followingId}`;
    const following = !!relCache[relIdOf(authedId, item.id)];

    const onToggleFollow = () => {
      if (!authedId || authedId === item.id) return;

      if (following) {
        unfollow(authedId, item.id);
      } else {
        follow(authedId, item.id);
      }
    };

    return (
      <View style={styles.row}>
        <TouchableOpacity
          onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
        >
          <Avatar uri={display.picture} size={44} ring />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.name}>{display.name}</Text>
            {!!display.username && <Text style={styles.sub}>@{display.username}</Text>}
          </View>
        </TouchableOpacity>
        {!isSelf && (
          <TouchableOpacity
            onPress={onToggleFollow}
            style={[styles.followBtn, following && styles.followingBtn]}
          >
            <Text style={[styles.followText, following && styles.followingText]}>
              {following ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          placeholder="Search users by name or username..."
          placeholderTextColor="#999"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
          onSubmitEditing={() => {
            // optional: trigger a final search on submit (already happens onChange)
            if (searchQuery.trim()) handleSearch(searchQuery.trim());
            Keyboard.dismiss();
          }}
          // `clearButtonMode` is iOS-only; we provide a cross icon for cross-platform
          clearButtonMode="never"
        />
        {/* Clear button (cross) shown only when there's text */}
        {searchQuery.length > 0 ? (
          <TouchableOpacity
            onPress={clearSearch}
            accessibilityLabel="Clear search"
            accessibilityRole="button"
            style={styles.clearBtn}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="close-circle" size={18} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : searchResults.length > 0 ? (
        <FlatList
          keyboardShouldPersistTaps="handled"
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12 }}
        />
      ) : searchQuery.trim() ? (
        <Text style={styles.emptyText}>No users found.</Text>
      ) : (
        // Initial empty state with animation
        <View style={styles.emptyContainer}>
          <LottieView
            source={SearchUserAnimation}
            autoPlay
            loop
            style={styles.lottieAnimation}
          />
          <Text style={styles.emptyTitle}>Search for People</Text>
          <Text style={styles.emptySubtitle}>Find friends, creators, and people you know by their name or username.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 40, fontSize: 16 },
  clearBtn: { marginLeft: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  name: { fontWeight: '700', color: '#111' },
  sub: { color: '#777', marginTop: 2, fontSize: 12 },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#111',
  },
  followText: { color: '#fff', fontWeight: '900' },
  followingBtn: {
    backgroundColor: '#EFEFF4',
  },
  followingText: { color: '#111' },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#666' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: {
    flex: 1, // Make the container take up all available space
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  lottieAnimation: {
    width: 200,
    height: 200,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
});
