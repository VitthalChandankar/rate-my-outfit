// File: src/components/OutfitCard.js
// Description: Safe, resilient card UI for feed/profile lists.

import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import formatDate from '../utils/formatDate';

// Optional tiny avatar circle with fallback initial
function AvatarCircle({ uri, name }) {
  const initial = (name || 'U').trim().charAt(0).toUpperCase();
  if (uri) {
    return <Image source={{ uri }} style={styles.avatar} />;
  }
  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarInitial}>{initial}</Text>
    </View>
  );
}

export default function OutfitCard(props) {
  // Support both props.item and legacy props.outfit
  const raw = props.item || props.outfit || null;
  if (!raw) return null;

  // Normalize fields with safe fallbacks
  const id = raw.id || raw._localKey || null;
  const imageUrl = raw.imageUrl || raw.image || null;
  const caption = typeof raw.caption === 'string' ? raw.caption : '';
  const userId = raw.userId || raw.user?.uid || '';
  const userName =
    raw.userName ||
    raw.user?.name ||
    raw.user?.displayName ||
    (userId ? `User ${String(userId).slice(0, 6)}` : 'User');
  const userPhoto =
    raw.userPhoto ||
    raw.user?.photoURL ||
    raw.user?.profilePicture ||
    null;
  const avg = Number.isFinite(raw.averageRating) ? raw.averageRating : 0;
  const createdAt = raw.createdAt || raw.created_at || null;

  // Human-readable date; fall back to empty string if formatter expects a Firestore TS
  const timeText = useMemo(() => {
    try {
      if (!createdAt) return '';
      return formatDate(createdAt);
    } catch {
      return '';
    }
  }, [createdAt]);

  const handlePress = () => {
    if (typeof props.onPress === 'function') {
      // Prefer passing the normalized object; preserve original for compatibility
      props.onPress({ ...raw, id });
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={props.onPress ? 0.8 : 1}
      onPress={props.onPress ? handlePress : undefined}
      style={styles.card}
    >
      {/* Header */}
      <View style={styles.header}>
        <AvatarCircle uri={userPhoto} name={userName} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.userName} numberOfLines={1}>
            {userName}
          </Text>
          {!!timeText && (
            <Text style={styles.time} numberOfLines={1}>
              {timeText}
            </Text>
          )}
        </View>
        <View style={styles.ratingBadge}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{avg.toFixed(1)}</Text>
        </View>
      </View>

      {/* Image */}
      {imageUrl ? (
        <ExpoImage
          source={{ uri: imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]} />
      )}

      {/* Caption */}
      {!!caption && <Text style={styles.caption}>{caption}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  userName: { fontWeight: '700' },
  time: { color: '#888', fontSize: 12 },
  ratingBadge: {
    backgroundColor: '#FF5A5F',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  image: { width: '100%', height: 360, backgroundColor: '#F4F4F4' },
  imagePlaceholder: { backgroundColor: '#EEE' },
  caption: { padding: 12, color: '#333' },

  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF5A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontWeight: '700' },
});
