// src/components/OutfitCard.js
// Instagram-like full-bleed card with contest ribbon and Rate CTA for contest posts.
// Normal posts: like/comment/share and caption below image.

import React, { useMemo, memo, useRef, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Pressable, Platform, Animated, Easing, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import formatDate from '../utils/formatDate';
import { withCloudinaryTransforms, IMG_FEED } from '../utils/cloudinaryUrl';

const { width } = Dimensions.get('window');

function AvatarCircle({ uri, name }) {
  const initial = (name || 'U').trim().charAt(0).toUpperCase();
  return uri ? (
    <ExpoImage source={{ uri }} style={styles.avatar} contentFit="cover" transition={200} />
  ) : (
    <View style={styles.avatarFallback}><Text style={styles.avatarInitial}>{initial}</Text></View>
  );
}

function formatCount(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
}

// Custom hook for the countdown timer logic
const useCountdown = (endTime) => {
  const [timeLeft, setTimeLeft] = useState(''); // Will be in HH:MM:SS format
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!endTime) {
      setShow(false);
      return;
    }

    const end = endTime?.toDate ? endTime.toDate() : new Date(endTime);

    const interval = setInterval(() => {
      const now = new Date();
      const difference = end.getTime() - now.getTime();

      if (difference <= 0) {
        setShow(false);
        setTimeLeft('');
        clearInterval(interval);
        return;
      }

      const shouldShow = difference < 24 * 60 * 60 * 1000;
      setShow(shouldShow);

      if (shouldShow) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        setTimeLeft(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  return { timeLeft, show };
};

const OutfitCard = memo(({ item, onPress, onRate, onUserPress, onLike, isLiked, isSaved, onPressSave, onPressLikes, onPressComments, onPressContest, onPressShare }) => {
  const raw = item || null;
  if (!raw) return null;

  const id = raw.id || raw._localKey || null;
  const imageUrl = raw.imageUrl || raw.image || null;

  const type = raw.type || (raw.contestId ? 'contest' : 'normal');
  const contestData = raw.contestData || null;
  const isContest = type === 'contest';
  const averageRating = Number(raw.averageRating ?? 0) || 0;
  const commentsCount = Number(raw.commentsCount ?? 0) || 0;
  const likesCount = Number(raw.likesCount ?? 0) || 0;
  const ratingsCount = Number(raw.ratingsCount ?? 0) || 0;

  const user = raw.user || {};
  const userId = raw.userId || user.uid || '';
  const userName = user.name || raw.userName || (userId ? `User ${String(userId).slice(0, 6)}` : 'User');
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

  const countdown = useCountdown(contestData?.endAt);

  const flowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isContest) {
      Animated.loop(
        Animated.timing(flowAnim, {
          toValue: 1,
          duration: 4000, // A moderate speed for a smooth flow
          easing: Easing.linear, // Constant speed for a continuous flow
          useNativeDriver: true,
        })
      ).start();
    }
  }, [isContest, flowAnim]);

  const flowTranslateX = flowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -width] });

  const handleOpen = () => { if (typeof onPress === 'function') onPress({ ...raw, id }); };
  const handleRate = () => { if (typeof onRate === 'function') onRate(raw); };
  const handleLike = () => { if (typeof onLike === 'function') onLike(raw); };
  const handleLikesPress = () => { if (typeof onPressLikes === 'function') onPressLikes(id); };
  const handleSavePress = () => { if (typeof onPressSave === 'function') onPressSave(id); };
  const handleCommentsPress = () => { if (typeof onPressComments === 'function') onPressComments({ outfitId: id, postOwnerId: userId }); };
  const handleContestTap = () => { if (typeof onPressContest === 'function') onPressContest(raw); };
  const handleShare = () => { if (typeof onPressShare === 'function') onPressShare(raw); };

  const handleUserTap = () => {
    if (typeof onUserPress === 'function') {
      onUserPress({
        id,
        user: {
          uid: userId,
          name: userName,
          profilePicture: userPhoto,
        },
        ...raw,
      });
    }
  };

  return (
    <View style={styles.card}>
      {/* Header row (avatar + name/time are clickable to open user's profile) */}
      <View style={styles.header}>
        <Pressable style={styles.headerUserInfo} onPress={handleUserTap}>
          <>
            <AvatarCircle uri={userPhoto} name={userName} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.userName}>{userName}</Text>
              {!!timeText && <Text style={styles.time}>{timeText}</Text>}
            </View>
          </>
        </Pressable>
        <View style={styles.headerRightActions}>
          {isContest ? (
            <Pressable onPress={handleContestTap} style={styles.contestLink}>
              <Ionicons name="trophy-outline" size={16} color="#7A5AF8" />
              <Text style={styles.contestLinkText}>View Contest</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Media */}
      <TouchableOpacity activeOpacity={0.9} onPress={handleOpen}>
        <>
          {transformedUrl ? (
            <ExpoImage
              source={{ uri: transformedUrl }}
              style={styles.image}
              contentFit="cover"
              transition={250}
              onError={(e) => {
                // On Android, image requests are cancelled during fast scrolls, which is expected.
                // This check prevents spamming the console with non-critical warnings.
                const errorMessage = e?.error?.message || '';
                if (Platform.OS === 'android' && errorMessage.includes('CANCEL')) {
                  return;
                }
                console.warn(`OutfitCard failed to load image: ${transformedUrl}`, e.error);
              }}
            />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]} />
          )}

          {isContest && ratingsCount > 0 && (
            <View style={styles.ratingOverlay}>
              <Text style={styles.ratingText}>{averageRating.toFixed(1)}</Text>
              <Ionicons name="star" size={12} color="#111" style={{ marginHorizontal: 2 }} />
              <View style={styles.separator} />
              <Text style={styles.ratingCountText}>{formatCount(ratingsCount)}</Text>
            </View>
          )}

          {/* NEW: Promotional Countdown Ribbon */}
          {isContest && countdown.show && (
            <LinearGradient
              colors={['#8E2DE2', '#4A00E0']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.promoRibbon}
            >
              <Ionicons name="hourglass-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.promoRibbonText}>{countdown.timeLeft}</Text>
            </LinearGradient>
          )}
        </>
      </TouchableOpacity>

      {/* NEW: Flowing Gradient Bar CTA */}
      {isContest && (
        <Pressable onPress={handleRate} style={styles.ctaContainer}>
          <View style={styles.ctaBar}>
            <Animated.View style={{ ...StyleSheet.absoluteFillObject, width: width * 2, transform: [{ translateX: flowTranslateX }] }}>
              <LinearGradient
                colors={['#6D28D9', '#A78BFA', '#4C1D95', '#A78BFA', '#6D28D9']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
            <Text style={styles.ctaText}>Rate Now</Text>
            <Ionicons name="chevron-forward-outline" size={22} color="#fff" />
          </View>
        </Pressable>
      )}

      {/* Footer actions */}
      <View style={styles.footer}>
        <View style={styles.actionsLeft}>
          {!isContest && likesCount >= 0 && (
          <TouchableOpacity style={styles.action} onPress={handleLike}>
            <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={26} color={isLiked ? '#FF3B30' : '#111'} />
          </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.action} onPress={handleCommentsPress}>
            <Ionicons name="chatbubble-outline" size={24} color="#111" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.action} onPress={handleShare}>
            <Ionicons name="arrow-redo-outline" size={24} color="#111" />
          </TouchableOpacity>
        </View>
        <View style={styles.footerRight}>
          <TouchableOpacity style={styles.action} onPress={handleSavePress}>
            <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={24} color={'#111'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Likes, Comments, and Caption Section */}
      <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
        {!isContest && likesCount > 0 && ( /* Only show likes if not a contest and likes > 0 */
          <TouchableOpacity onPress={handleLikesPress} activeOpacity={0.7}>
            <Text style={styles.likesText}>{likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}</Text>
          </TouchableOpacity>
        )}
        {commentsCount > 0 && <Text style={styles.viewCommentsText} onPress={handleCommentsPress}>View all {commentsCount} comments</Text>}
          {!!caption && <Text style={styles.captionText}>{caption}</Text>}
        </View>
      </View>
  );
});

const styles = StyleSheet.create({
  card: { marginVertical: 10, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  headerUserInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  userName: { fontWeight: '700' },
  time: { color: '#888', fontSize: 12 },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contestLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(122, 90, 248, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  contestLinkText: { color: '#7A5AF8', fontWeight: 'bold', fontSize: 12, marginLeft: 4 },

  image: { width: '100%', height: 420, backgroundColor: '#F4F4F4' },
  imagePlaceholder: { backgroundColor: '#EEE' },
  ratingOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ratingText: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#111',
  },
  separator: {
    width: 1,
    height: 10,
    backgroundColor: '#ccc',
    marginHorizontal: 5,
  },
  ratingCountText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
  },

  ctaContainer: {
    // This wrapper can be used for shadow if needed
  },
  ctaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  ctaText: {
    fontWeight: '900',
    color: '#FFFFFF',
    fontSize: 16,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  footer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 16 },
  actionsLeft: { flexDirection: 'row', gap: 14 },
  action: { paddingHorizontal: 6, paddingVertical: 4 },
  footerRight: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 16 },
  promoRibbon: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  promoRibbonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
    fontVariant: ['tabular-nums'],
  },
  avgRating: { fontWeight: '900', color: '#111' },
  footerCountText: { color: '#6B7280', fontWeight: '600', fontSize: 13 },
  likesText: { fontWeight: '800', color: '#111', marginBottom: 4 },
  viewCommentsText: { color: '#6B7280', marginBottom: 6 },
  captionText: { color: '#333' },

  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEE' },
  avatarFallback: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#7A5AF8', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontWeight: '700' },
});

export default OutfitCard;
