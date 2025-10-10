// src/screens/sharing/InboxScreen.js
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, RefreshControl, Alert, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { Snackbar } from 'react-native-paper';
import useShareStore from '../../store/shareStore';
import useAuthStore from '../../store/authStore';
import formatDate from '../../utils/formatDate';
import Avatar from '../../components/Avatar';

function ConversationRow({ conversation, onPress, onDelete }) {
  const { otherUser, lastShare, unreadCount } = conversation;
  const { user: currentUser } = useAuthStore();

  let lastMessage = '';
  if (lastShare) {
    const direction = lastShare.senderId === currentUser.uid ? 'sent' : 'received';
    if (direction === 'sent') {
      lastMessage = `You: ${lastShare.outfitCaption || 'Shared a post'}`;
    } else {
      lastMessage = lastShare.outfitCaption || 'Shared a post';
    }
  }

  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => onDelete(conversation)}
      >
        <Animated.Text style={[styles.deleteButtonText, { transform: [{ scale }] }]}>
          Delete
        </Animated.Text>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <TouchableOpacity style={styles.row} onPress={() => onPress(conversation)}>
        <Avatar uri={otherUser.profilePicture} size={50} />
        <View style={styles.content}>
          <View style={styles.rowTop}>
            <Text style={styles.name}>{otherUser.name}</Text>
            {lastShare?.createdAt && <Text style={styles.timestamp}>{formatDate(lastShare.createdAt)}</Text>}
          </View>
          <View style={styles.rowBottom}>
            <Text style={[styles.lastMessage, unreadCount > 0 && styles.unreadText]} numberOfLines={1}>
              {lastMessage}
            </Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

export default function InboxScreen({ navigation }) {
  const { user } = useAuthStore();
  const { conversations, conversationsLoading, fetchConversations, markAllSharesAsRead, deleteConversation, undoDeleteConversation } = useShareStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isUndoVisible, setIsUndoVisible] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (user?.uid) {
        fetchConversations();
        markAllSharesAsRead(user.uid);
      }
    }, [user?.uid, fetchConversations, markAllSharesAsRead])
  );

  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;
    const lowercasedQuery = searchQuery.toLowerCase();
    return conversations.filter(
      conv =>
        conv.otherUser.name?.toLowerCase().includes(lowercasedQuery) ||
        conv.otherUser.username?.toLowerCase().includes(lowercasedQuery)
    );
  }, [conversations, searchQuery]);

  const handleConversationPress = (conversation) => {
    navigation.navigate('ShareConversation', {
      otherUserId: conversation.otherUser.uid,
      userName: conversation.otherUser.name,
    });
  };

  const handleDeleteConversation = useCallback((conversation) => {
    deleteConversation(conversation.otherUser.uid);
    setIsUndoVisible(true);
  }, [deleteConversation]);

  const handleUndo = () => undoDeleteConversation();

  const onRefresh = useCallback(() => {
    if (user?.uid) fetchConversations();
  }, [user?.uid, fetchConversations]);

  if (conversationsLoading && conversations.length === 0) {
    return <View style={styles.center}><ActivityIndicator /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          placeholder="Search conversations..."
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
      </View>
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.otherUser.uid}
        renderItem={({ item }) => <ConversationRow conversation={item} onPress={handleConversationPress} onDelete={handleDeleteConversation} />}
        ListEmptyComponent={
          !conversationsLoading ? <Text style={styles.emptyText}>No messages yet.</Text> : null
        }
        refreshControl={<RefreshControl refreshing={conversationsLoading} onRefresh={onRefresh} />}
      />
      <Snackbar
        visible={isUndoVisible}
        onDismiss={() => setIsUndoVisible(false)}
        action={{
          label: 'Undo',
          onPress: handleUndo,
        }}
        duration={4500} // Slightly less than the store timeout
      >
        Conversation deleted.
        </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#666', fontSize: 16 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 16, color: '#111' },
  row: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
  },
  content: { flex: 1, marginLeft: 12 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontWeight: 'bold', fontSize: 16 },
  timestamp: { fontSize: 12, color: '#6B7280' },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  lastMessage: { color: '#6B7280', flex: 1 },
  unreadText: { color: '#111', fontWeight: 'bold' },
  unreadBadge: {
    backgroundColor: '#7A5AF8',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  deleteButton: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});