// src/screens/notifications/NotificationsScreen.js
import React, { useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Image as ExpoImage } from 'expo-image';
import showAlert from '../../utils/showAlert';
import { Ionicons } from '@expo/vector-icons';
import useNotificationsStore from '../../store/notificationsStore';
import { withCloudinaryTransforms, IMG_SQUARE_THUMB } from '../../utils/cloudinaryUrl';
import useAuthStore from '../../store/authStore';
import formatDate from '../../utils/formatDate';

function NotificationRow({ item, onNotificationPress }) {
  if (!item) return null;

  let iconName = 'ellipse';
  let iconColor = '#ccc';
  let message = <Text style={styles.message}>New activity</Text>;

  if (item.type === 'like') {
    iconName = 'heart';
    iconColor = '#FF3B30';
    message = <Text style={styles.message}><Text style={styles.senderName}>{item.senderName}</Text> liked your outfit.</Text>;
  } else if (item.type === 'comment') {
    iconName = 'chatbubble';
    iconColor = '#007AFF';
    message = <Text style={styles.message}><Text style={styles.senderName}>{item.senderName}</Text> commented: "{item.commentText}"</Text>;
  } else if (item.type === 'follow') {
    iconName = 'person-add';
    iconColor = '#34C759';
    message = <Text style={styles.message}><Text style={styles.senderName}>{item.senderName}</Text> started following you.</Text>;
  } else if (item.type === 'contest_win') {
    iconName = 'trophy';
    iconColor = item.rank === 1 ? '#FFD700' : item.rank === 2 ? '#C0C0C0' : '#CD7F32'; // Gold, Silver, Bronze
    message = <Text style={styles.message}>Congratulations! You won the <Text style={styles.senderName}>"{item.contestTitle || 'contest'}"</Text>.</Text>;
  } else if (item.type === 'achievement') {
    iconName = 'shield-checkmark';
    iconColor = '#5856D6'; // Indigo
      message = <Text style={styles.message}>Achievement unlocked: <Text style={styles.senderName}>{item.body || 'New Badge'}</Text></Text>; // To mark achievement as seen only when the user click on profile button it shoudl not call when the user clicks to notification for achivement
  } else if (item.type === 'post_deleted') {
    iconName = 'trash-bin';
    iconColor = '#EF4444'; // Red
    message = <Text style={styles.message}>{item.body || 'Your post was removed.'}</Text>;
  }

  return (
    <TouchableOpacity style={[styles.row, !item.read && styles.unreadRow]} onPress={() => onNotificationPress(item)}>
      <>
        <View style={[styles.iconContainer, { backgroundColor: iconColor }]}>
          <Ionicons name={iconName} size={20} color="#fff" />
        </View>
        <View style={styles.textContainer}>
          {message}
          <Text style={styles.timestamp}>{formatDate(item.createdAt)}</Text>
        </View>
        {item.outfitImage && (
          <ExpoImage source={{ uri: withCloudinaryTransforms(item.outfitImage, IMG_SQUARE_THUMB) }} style={styles.thumbnail} contentFit="cover" />
        )}
      </>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const {
    notifications,
    loading,
    refreshing,
    hasMore,
    fetchNotifications,
    markAllAsRead,
  } = useNotificationsStore();

  useEffect(() => {
    if (user?.uid) fetchNotifications({ userId: user.uid, reset: true });
    // When the screen is focused, mark all notifications as read
    const unsubscribe = navigation.addListener('focus', () => {
      if (user?.uid) markAllAsRead(user.uid);
    });
    return unsubscribe;
  }, [fetchNotifications, navigation, markAllAsRead, user?.uid]);

  const onRefresh = useCallback(() => {
    if (user?.uid) fetchNotifications({ userId: user.uid, reset: true });
  }, [fetchNotifications, user?.uid]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      if (user?.uid) fetchNotifications({ userId: user.uid, reset: false });
    }
  }, [loading, hasMore, fetchNotifications, user?.uid]);

  const handleNotificationPress = (notification) => {
    if (notification.type === 'follow') {
      navigation.navigate('UserProfile', { userId: notification.senderId });
    } else if (notification.type === 'contest_win' && notification.contestId) {
      // If there's a physical prize, go to shipping details screen.
      if (notification.prize) {
        navigation.navigate('ShippingDetails', { contestId: notification.contestId, prize: notification.prize });
      } else {
        navigation.navigate('ContestDetails', { contestId: notification.contestId, initialTab: 'leaderboard' });
      }
    } else if (notification.type === 'post_deleted') {
      showAlert('Post Removed', 'This post was removed due to community guideline violations.');
    } else if (notification.outfitId) {
      navigation.navigate('OutfitDetails', { outfitId: notification.outfitId });
    } else if (notification.type === 'achievement') {
      navigation.navigate('Profile', { initialTab: 'achievements' });
    }
  };

  if (loading && notifications.length === 0) {
    return <View style={styles.center}><ActivityIndicator /></View>;
  }

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <NotificationRow item={item} onNotificationPress={handleNotificationPress} />}
      contentContainerStyle={styles.container}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListFooterComponent={loading ? <ActivityIndicator style={{ margin: 20 }} /> : null}
      ListEmptyComponent={
        !loading ? <Text style={styles.emptyText}>You have no notifications.</Text> : null
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#666' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  unreadRow: {
    backgroundColor: 'rgba(122, 90, 248, 0.05)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: { flex: 1 },
  message: { fontSize: 15, lineHeight: 20 },
  senderName: { fontWeight: 'bold' },
  timestamp: { color: '#6B7280', fontSize: 12, marginTop: 4 },
  thumbnail: { width: 50, height: 50, borderRadius: 8, marginLeft: 12 },
});