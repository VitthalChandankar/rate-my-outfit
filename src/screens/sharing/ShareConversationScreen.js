// src/screens/sharing/ShareConversationScreen.js
import React, { useCallback, useRef, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Animated, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Image as ExpoImage } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import useShareStore from '../../store/shareStore';
import useAuthStore from '../../store/authStore';
import formatDate from '../../utils/formatDate';
import { withCloudinaryTransforms, IMG_GRID } from '../../utils/cloudinaryUrl';

const REACTIONS = ['❤️', '🔥', '😂', '👍'];

function ReactionEmoji({ emoji, isSelected, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isSelected ? 1.3 : 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  }, [isSelected, scaleAnim]);

  return (
    <TouchableOpacity onPress={onPress} style={styles.reactionButton}>
      <Animated.Text style={[styles.emoji, { opacity: isSelected ? 1 : 0.5 }, { transform: [{ scale: scaleAnim }] }]}>
        {emoji}
      </Animated.Text>
    </TouchableOpacity>
  );
}

function ShareRow({ item, onReact, onDelete, onOpen, isSentByUser }) {
  const transformedUrl = withCloudinaryTransforms(item.outfitImageUrl, IMG_GRID);

  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(item)}>
        <Animated.Text style={[styles.deleteButtonText, { transform: [{ scale }] }]}>
          Delete
        </Animated.Text>
      </TouchableOpacity>
    );
  };

  const rowContainerStyle = isSentByUser ? styles.sentRow : styles.receivedRow;
  const bubbleStyle = isSentByUser ? styles.sentBubble : styles.receivedBubble;
  const nameStyle = isSentByUser ? styles.sentName : styles.receivedName;
  const captionStyle = isSentByUser ? styles.sentCaption : styles.receivedCaption;

  return (
    <View style={[styles.shareRowContainer, rowContainerStyle]}>
      <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
        {/* New wrapper view to contain the bubble and the overlayed reaction */}
        <View>
          <View style={[styles.bubble, bubbleStyle]}>
            <TouchableOpacity onPress={() => onOpen(item)}>
              <Text style={nameStyle}>{isSentByUser ? 'You' : item.senderName}</Text>
              <ExpoImage source={{ uri: transformedUrl }} style={styles.thumbnail} contentFit="cover" />
              {item.outfitCaption ? <Text style={[styles.caption, captionStyle]}>{item.outfitCaption}</Text> : null}
              {/* Apply conditional style to timestamp */}
              <Text style={[styles.timestamp, isSentByUser && styles.sentTimestamp]}>{formatDate(item.createdAt)}</Text>
            </TouchableOpacity>
            {/* Reactions for received messages remain inside */}
            {!isSentByUser && (
              <View style={styles.reactions}>
                {REACTIONS.map(emoji => (
                  <ReactionEmoji key={emoji} emoji={emoji} isSelected={item.reaction === emoji} onPress={() => onReact({ shareId: item.id, reaction: emoji })} />
                ))}
              </View>
            )}
          </View>
          {/* Reaction for sent messages is now a sibling, allowing it to overlay without clipping */}
          {isSentByUser && item.reaction && (
            <View style={styles.sentReaction}>
              <Text style={styles.sentReactionEmoji}>{item.reaction}</Text>
            </View>
          )}
        </View>
      </Swipeable>
    </View>
  );
}

export default function ShareConversationScreen({ route }) {
  const navigation = useNavigation();
  const { otherUserId } = route.params;
  const { user } = useAuthStore();
  const { sharesByConversation, reactToShare, softDeleteShare, hardDeleteShare, markShareAsRead } = useShareStore();
  const flatListRef = useRef(null);
  const didInitialScroll = useRef(false);

  const displayedShares = React.useMemo(() => {
    const shares = sharesByConversation[otherUserId] || [];
    return [...shares].reverse(); // Reverse to show oldest first, newest at the bottom
  }, [sharesByConversation, otherUserId]);

  // Effect to scroll to the first unread message or the end of the list
  useEffect(() => {
    if (displayedShares.length > 0 && flatListRef.current && !didInitialScroll.current) {
      const firstUnreadIndex = displayedShares.findIndex(
        share => !share.read && share.recipientId === user.uid
      );

      // Use a timeout to ensure the list has rendered before scrolling.
      setTimeout(() => {
        if (!flatListRef.current) return;

        if (firstUnreadIndex !== -1) {
          flatListRef.current.scrollToIndex({
            index: firstUnreadIndex,
            animated: true,
            viewPosition: 0.5, // Center the item
          });
        } else {
          // If no unread, scroll to the very end
          flatListRef.current.scrollToEnd({ animated: true });
        }
        didInitialScroll.current = true; // Mark that we've done the initial scroll
      }, 200);
    }
  }, [displayedShares, user.uid]);

  const handleOpenPost = (share) => {
    if (!share.read && share.recipientId === user.uid) {
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

  const handleDelete = (share) => {
    const isSentByUser = share.senderId === user.uid;

    if (isSentByUser) {
      // Sender: show options
      Alert.alert(
        "Delete Message",
        "This will permanently delete this message.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete for Me",
            onPress: () => softDeleteShare({ shareId: share.id, userType: 'sender' }),
          },
          {
            text: "Delete for Everyone",
            style: "destructive",
            onPress: () => hardDeleteShare(share.id),
          },
        ],
        { cancelable: true }
      );
    } else {
      // Recipient: just delete for me
      Alert.alert(
        "Delete Message",
        "This message will be removed from your inbox. The sender will still be able to see it.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => softDeleteShare({ shareId: share.id, userType: 'recipient' }) },
        ],
        { cancelable: true }
      );
    }
  };

  return (
    <FlatList
      ref={flatListRef}
      data={displayedShares}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ShareRow
          item={item}
          onReact={reactToShare}
          onDelete={handleDelete}
          onOpen={handleOpenPost}
          isSentByUser={item.senderId === user.uid}
        />
      )}
      style={styles.container}
      // By removing `inverted`, the list now flows from top to bottom (oldest to newest)
      getItemLayout={(data, index) => (
        // Provide an estimated height for performance with scrollToIndex
        { length: 300, offset: 300 * index, index }
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  shareRowContainer: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sentRow: {
    alignItems: 'flex-end',
  },
  receivedRow: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 15,
  },
  sentBubble: {
    backgroundColor: '#7A5AF8',
  },
  receivedBubble: {
    backgroundColor: '#F3F4F6',
  },
  senderName: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sentName: {
    color: '#fff',
  },
  receivedName: {
    color: '#111',
  },
  thumbnail: {
    width: 200,
    height: 250,
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
  },
  caption: {
    marginTop: 8,
  },
  sentCaption: {
    color: '#fff',
  },
  receivedCaption: {
    color: '#333',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  sentTimestamp: {
    marginRight: 10, // Pushes timestamp away from the right edge to make space for the reaction
    color: 'rgba(255, 255, 255, 0.8)',
  },
  reactions: {
    flexDirection: 'row',
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  reactionButton: {
    padding: 4,
  },
  emoji: {
    fontSize: 18,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sentReaction: {
    position: 'absolute',
    bottom: 2, // Position slightly *above* the bottom edge to prevent clipping
    right: 2,  // Position slightly *in from* the right edge to prevent clipping
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 1, // Ensure the reaction renders on top of the message bubble
  },
  sentReactionEmoji: {
    fontSize: 14,
  },
});