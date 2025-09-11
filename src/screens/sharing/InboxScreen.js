// src/screens/sharing/InboxScreen.js
import React, { useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import useShareStore from '../../store/shareStore';
import formatDate from '../../utils/formatDate';
import { withCloudinaryTransforms, IMG_GRID } from '../../utils/cloudinaryUrl';

const REACTIONS = ['❤️', '🔥', '😂', '👍'];

function ShareRow({ item, onReact, onOpen }) {
  const transformedUrl = withCloudinaryTransforms(item.outfitImageUrl, IMG_GRID);

  return (
    <TouchableOpacity style={[styles.row, !item.read && styles.unread]} onPress={() => onOpen(item)}>
      <ExpoImage source={{ uri: item.senderProfilePicture }} style={styles.avatar} />
      <View style={styles.content}>
        <Text style={styles.message}>
          <Text style={styles.senderName}>{item.senderName || 'Someone'}</Text> shared a post with you.
        </Text>
        <Text style={styles.timestamp}>{formatDate(item.createdAt)}</Text>
        <View style={styles.reactions}>
          {REACTIONS.map(emoji => (
            <TouchableOpacity key={emoji} onPress={() => onReact(item.id, emoji)} style={styles.reactionButton}>
              <Text style={[styles.emoji, item.reaction === emoji && styles.emojiSelected]}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <ExpoImage source={{ uri: transformedUrl }} style={styles.thumbnail} />
    </TouchableOpacity>
  );
}

export default function InboxScreen({ navigation }) {
  const { shares, loadingShares, hasMoreShares, fetchShares, reactToShare, markShareAsRead } = useShareStore();

  useEffect(() => {
    fetchShares({ reset: true });
  }, [fetchShares]);

  const handleOpenPost = (share) => {
    if (!share.read) {
      markShareAsRead(share.id);
    }
    navigation.navigate('OutfitDetails', { outfitId: share.outfitId });
  };

  const onRefresh = useCallback(() => fetchShares({ reset: true }), [fetchShares]);
  const onEndReached = useCallback(() => {
    if (!loadingShares && hasMoreShares) {
      fetchShares({ reset: false });
    }
  }, [loadingShares, hasMoreShares, fetchShares]);

  if (loadingShares && shares.length === 0) {
    return <View style={styles.center}><ActivityIndicator /></View>;
  }

  return (
    <FlatList
      data={shares}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ShareRow item={item} onReact={reactToShare} onOpen={handleOpenPost} />}
      onRefresh={onRefresh}
      refreshing={loadingShares}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        !loadingShares ? <Text style={styles.emptyText}>Your inbox is empty.</Text> : null
      }
      ListFooterComponent={loadingShares && shares.length > 0 ? <ActivityIndicator style={{ margin: 20 }} /> : null}
      style={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#666',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
  },
  unread: {
    backgroundColor: 'rgba(122, 90, 248, 0.05)',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
  },
  senderName: {
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginLeft: 12,
    backgroundColor: '#f0f0f0',
  },
  reactions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  reactionButton: {
    padding: 4,
  },
  emoji: {
    fontSize: 20,
    opacity: 0.5,
  },
  emojiSelected: {
    opacity: 1,
    transform: [{ scale: 1.2 }],
  },
});