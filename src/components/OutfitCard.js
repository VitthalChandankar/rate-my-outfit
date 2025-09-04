// src/components/OutfitCard.js
// Instagram-like full-bleed card with contest ribbon and Rate CTA for contest posts.
// Normal posts: like/comment/share and caption below image.

import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import formatDate from '../utils/formatDate';
import { withCloudinaryTransforms, IMG_FEED } from '../utils/cloudinaryUrl';

function AvatarCircle({ uri, name }) {
  const initial = (name || 'U').trim().charAt(0).toUpperCase();
  return uri ? (
    <ExpoImage source={{ uri }} style={styles.avatar} contentFit="cover" transition={200} />
  ) : (
    <View style={styles.avatarFallback}><Text style={styles.avatarInitial}>{initial}</Text></View>
  );
}

export default function OutfitCard({ item, onPress, onRate }) {
  const raw = item || null;
  if (!raw) return null;

  const id = raw.id || raw._localKey || null;
  const imageUrl = raw.imageUrl || raw.image || null;

  const type = raw.type || (raw.contestId ? 'contest' : 'normal');
  const isContest = type === 'contest';
  const averageRating = Number(raw.averageRating ?? 0) || 0;

  const user = raw.user || {};
  const userId = raw.userId || user.uid || '';
  const userName =
    user.name ||
    raw.userName ||
    (userId ? `User ${String(userId).slice(0, 6)}` : 'User');
  const userPhoto = user.profilePicture || raw.userPhoto || null;

  const caption = typeof raw.caption === 'string' ? raw.caption : '';
  const createdAt = raw.createdAt || raw.created_at || null;

  const timeText = useMemo(() => {
    try { return createdAt ? formatDate(createdAt) : ''; } catch { return ''; }
  }, [createdAt]);

  const transformedUrl = useMemo(
    () => (imageUrl ? withCloudinaryTransforms(imageUrl, IMG_FEED) : null),
    [imageUrl]
  );

  const handleOpen = () => { if (typeof onPress === 'function') onPress({ ...raw, id }); };
  const handleRate = () => { if (typeof onRate === 'function') onRate({ ...raw, id }); };

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.header}>
        <AvatarCircle uri={userPhoto} name={userName} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={styles.userName}>{userName}</Text>
          {!!timeText && <Text style={styles.time}>{timeText}</Text>}
        </View>
        {isContest ? (
          <View style={styles.sponsoredBadge}>
            <Text style={styles.sponsoredText}>Contest Entry</Text>
          </View>
        ) : null}
      </View>

      {/* Media */}
      <TouchableOpacity activeOpacity={0.9} onPress={handleOpen}>
        {transformedUrl ? (
          <ExpoImage source={{ uri: transformedUrl }} style={styles.image} contentFit="cover" transition={250} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]} />
        )}
      </TouchableOpacity>

      {/* Ribbon/CTA row (clickable) */}
      {isContest ? (
        <Pressable style={styles.ctaBar} onPress={handleRate}>
          <Text style={styles.ctaText}>Rate my Outfit</Text>
          <Text style={styles.ctaBtnText}>›</Text>
        </Pressable>
      ) : null}

      {/* Footer actions */}
      <View style={styles.footer}>
        <View style={styles.actionsLeft}>
          <TouchableOpacity style={styles.action}><Text>❤</Text></TouchableOpacity>
          <TouchableOpacity style={styles.action}><Text>💬</Text></TouchableOpacity>
          <TouchableOpacity style={styles.action}><Text>↗</Text></TouchableOpacity>
        </View>
        <View style={{ marginLeft: 'auto' }}>
          {isContest ? <Text style={styles.avgRating}>Avg {averageRating.toFixed(1)}</Text> : null}
        </View>
      </View>

      {/* Caption (only for normal posts, per request) */}
      {!isContest && !!caption && <Text style={{ paddingHorizontal: 12, paddingBottom: 12, color: '#333' }}>{caption}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginVertical: 10, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  userName: { fontWeight: '700' },
  time: { color: '#888', fontSize: 12 },

  sponsoredBadge: { backgroundColor: '#FFE4F2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  sponsoredText: { color: '#C2185B', fontWeight: '800', fontSize: 12 },

  image: { width: '100%', height: 420, backgroundColor: '#F4F4F4' },
  imagePlaceholder: { backgroundColor: '#EEE' },

  // Ribbon bar
  ctaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFEBF5',
  },
  ctaText: { fontWeight: '800', color: '#C2185B' },
  ctaBtnText: { color: '#7A5AF8', fontWeight: '900', fontSize: 18 },

  footer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  actionsLeft: { flexDirection: 'row', gap: 14 },
  action: { paddingHorizontal: 6, paddingVertical: 4 },
  avgRating: { fontWeight: '900', color: '#111' },

  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEE' },
  avatarFallback: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#7A5AF8', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontWeight: '700' },
});
