// src/screens/sharing/InboxScreen.js
import React, { useEffect, useCallback, useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler'; // Import Swipeable
import { Image as ExpoImage } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import useShareStore from '../../store/shareStore';
import useAuthStore from '../../store/authStore';
import formatDate from '../../utils/formatDate';
import { withCloudinaryTransforms, IMG_GRID } from '../../utils/cloudinaryUrl';

const REACTIONS = ['❤️', '🔥', '😂', '👍'];

function ReactionEmoji({ emoji, isSelected, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animate when the `isSelected` prop changes.
    Animated.spring(scaleAnim, {
      toValue: isSelected ? 1.3 : 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  }, [isSelected, scaleAnim]);

  return (
    <TouchableOpacity onPress={onPress} style={styles.reactionButton}>
      <Animated.Text
        style={[styles.emoji, { opacity: isSelected ? 1 : 0.5 }, { transform: [{ scale: scaleAnim }] }]}
      >
        {emoji}
      </Animated.Text>
    </TouchableOpacity>
  );
}

function ShareRow({ item, onReact, onOpen, onDelete }) {
  const [isSwiping, setIsSwiping] = useState(false);
  const transformedUrl = withCloudinaryTransforms(item.outfitImageUrl, IMG_GRID);

  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => onDelete(item.id)}
      >
        <Animated.Text style={[styles.deleteButtonText, { transform: [{ scale }] }]}>
          Delete
        </Animated.Text>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      onSwipeableWillOpen={() => setIsSwiping(true)}
      onSwipeableWillClose={() => setIsSwiping(false)}
    >
      <TouchableOpacity style={[styles.row, !item.read && styles.unread, isSwiping && styles.swiping]} onPress={() => onOpen(item)}>
      <ExpoImage source={{ uri: item.senderProfilePicture }} style={styles.avatar} />
      <View style={styles.content}>
        <Text style={styles.message}>
          <Text style={styles.senderName}>{item.senderName || 'Someone'}</Text> shared a post with you.
        </Text>
        <Text style={styles.timestamp}>{formatDate(item.createdAt)}</Text>
        <View style={styles.reactions}>
          {REACTIONS.map(emoji => (
            <ReactionEmoji
              key={emoji}
              emoji={emoji}
              isSelected={item.reaction === emoji}
              onPress={() => onReact({ shareId: item.id, reaction: emoji })}
            />
          ))}
        </View>
      </View>
      <ExpoImage source={{ uri: transformedUrl }} style={styles.thumbnail} />
      </TouchableOpacity>
    </Swipeable>
  );
}

export default function InboxScreen({ navigation }) {
  const { user } = useAuthStore();
  const {
    shares,
    loadingShares,
    hasMoreShares,
    fetchShares,
    reactToShare,
    markShareAsRead,
    markAllSharesAsRead,
    deleteShare,
    subscribeToUnreadCount,
  } = useShareStore();

  useEffect(() => {
    fetchShares({ reset: true });
    if (user?.uid) {
      subscribeToUnreadCount(user.uid);
    }
  }, [fetchShares, user?.uid, subscribeToUnreadCount]);

  // When the screen is focused, mark all shares as read.
  useFocusEffect(
    useCallback(() => {
      if (user?.uid) {
        markAllSharesAsRead(user.uid);
      }
    }, [user?.uid, markAllSharesAsRead])
  );

  const handleOpenPost = (share) => {
    if (!share.read) {
      markShareAsRead(share.id);
    }

    const outfitData = share.outfitData;
    const isContestPost = outfitData && outfitData.type === 'contest' && outfitData.contestId;

    if (isContestPost) {
      const item = { id: outfitData.entryId || outfitData.id, ...outfitData };
      navigation.navigate('RateEntry', { item, mode: 'entry' });
    } else {
      navigation.navigate('OutfitDetails', { outfitId: share.outfitId });
    }
  };

  const onRefresh = useCallback(() => { if (user?.uid) fetchShares({ reset: true }); }, [fetchShares, user?.uid]);
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
      renderItem={({ item }) => <ShareRow item={item} onReact={reactToShare} onOpen={handleOpenPost} onDelete={deleteShare} />}
      refreshControl={<RefreshControl refreshing={loadingShares} onRefresh={onRefresh} />}
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
  swiping: {
    backgroundColor: '#f5f5f5',
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
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
    width: 100, // Fixed width for the delete button
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});