// File: src/screens/rating/RateScreen.js
// Defensive guards for route/target + robust slider.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as Haptics from 'expo-haptics';
import useAuthStore from '../../store/authStore';
import useContestStore from '../../store/contestStore';
import useOutfitStore from '../../store/outfitStore';
import { withCloudinaryTransforms, IMG_DETAIL } from '../../utils/cloudinaryUrl';

export default function RateScreen({ route, navigation }) {
  const params = route?.params || {};
  const mode = params?.mode || 'entry';
  const target = params?.target || {};

  const id = target?.id ?? '';
  const contestId = target?.contestId ?? null;
  const userId = target?.userId ?? '';
  const userName = target?.userName || 'Creator';
  const userPhoto = target?.userPhoto || null;
  const imageUrl = target?.imageUrl || null;
  const averageRating = Number(target?.averageRating ?? 0) || 0;

  // If critical data is missing, bail gracefully
  if (!id) {
    return (
      <View style={fallbackStyles.wrap}>
        <Text style={fallbackStyles.text}>Nothing to rate. Please go back and open a post again.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={fallbackStyles.btn}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { user } = useAuthStore();
  const rateEntry = useContestStore((s) => s.rateEntry);
  const submitRatingLegacy = useOutfitStore((s) => s.submitRating);

  // Slider constants
  const TRACK_W = 320;
  const MIN = 0;
  const MAX = 10;

  // State
  const [value, setValue] = useState(7);

  // Animations
  const thumbScale = useRef(new Animated.Value(1)).current;
  const bubbleY = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const avgAnim = useRef(new Animated.Value(0)).current;

  const displayUrl = useMemo(
    () => (imageUrl ? withCloudinaryTransforms(imageUrl, IMG_DETAIL) : null),
    [imageUrl]
  );

  useEffect(() => {
    Animated.timing(avgAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [avgAnim]);

  // Threshold haptics
  function getSentimentIndex(v) {
    if (v <= 2) return 0;
    if (v <= 4) return 1;
    if (v <= 6) return 2;
    if (v <= 8) return 3;
    return 4;
  }
  const sentiments = [
    { max: 2, emoji: '😖', label: 'Awful' },
    { max: 4, emoji: '🙁', label: 'Bad' },
    { max: 6, emoji: '😐', label: 'Okay' },
    { max: 8, emoji: '🙂', label: 'Good' },
    { max: 10, emoji: '😍', label: 'Awesome' },
  ];
  const lastSentiment = useRef(getSentimentIndex(7));
  useEffect(() => {
    const idx = getSentimentIndex(value);
    if (idx !== lastSentiment.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      lastSentiment.current = idx;
    }
  }, [value]);

  const onFlagAI = async () => {
    if (!user?.uid) return Alert.alert('Sign in', 'Please sign in to flag.');
    if (mode === 'entry' && user?.uid === userId) return Alert.alert('Not allowed', 'You can’t flag your own entry.');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const res =
      mode === 'entry'
        ? await rateEntry({ entryId: id, contestId, rating: 0, aiFlag: true })
        : await submitRatingLegacy({ outfitId: id, stars: 0, comment: '[AI flag]' });
    if (!res?.success) Alert.alert('Error', 'Could not submit flag.');
    else Alert.alert('Thank you', 'Your flag has been recorded.');
  };

  const onSubmit = async () => {
    if (!user?.uid) return Alert.alert('Sign in', 'Please sign in to rate.');
    if (mode === 'entry' && user?.uid === userId) return Alert.alert('Not allowed', 'You can’t rate your own entry.');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const v = Math.round(value);
    const res =
      mode === 'entry'
        ? await rateEntry({ entryId: id, contestId, rating: v, aiFlag: false })
        : await submitRatingLegacy({
            outfitId: id,
            stars: Math.max(1, Math.min(5, Math.round(v / 2))),
            comment: '',
          });
    if (!res?.success) Alert.alert('Error', 'Could not submit rating.');
    else navigation.goBack();
  };

  // Slider helpers
  const clamp = (v) => Math.max(MIN, Math.min(MAX, v));
  const posFromVal = (v) => (clamp(v) / (MAX - MIN)) * TRACK_W;
  const valFromPos = (x) => clamp(Math.round((x / TRACK_W) * (MAX - MIN)));

  const onStart = () => {
    Animated.parallel([
      Animated.spring(thumbScale, { toValue: 1.25, useNativeDriver: true, friction: 5 }),
      Animated.spring(bubbleY, { toValue: -10, useNativeDriver: true, friction: 5 }),
      Animated.timing(glow, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };
  const onMove = (x) => setValue(valFromPos(x));
  const onEnd = () => {
    Animated.parallel([
      Animated.spring(thumbScale, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.spring(bubbleY, { toValue: 0, useNativeDriver: true, friction: 6 }),
      Animated.timing(glow, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const sIdx = getSentimentIndex(value);
  const sentiment = sentiments[sIdx];
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.15] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  return (
    <View style={styles.container}>
      {/* Profile header */}
      <View style={styles.profile}>
        {userPhoto ? (
          <ExpoImage source={{ uri: userPhoto }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.initial}>{(userName || 'U').slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.displayName}>{userName || 'Creator'}</Text>
          <Animated.Text
            style={[
              styles.avgLine,
              {
                transform: [
                  {
                    translateY: avgAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [6, 0],
                    }),
                  },
                ],
                opacity: avgAnim,
              },
            ]}
          >
            Average Rating <Text style={styles.avgValue}>{averageRating.toFixed(1)}</Text>
          </Animated.Text>
        </View>
      </View>

      {/* Media with AI chip */}
      <View style={styles.mediaWrap}>
        {displayUrl ? (
          <ExpoImage source={{ uri: displayUrl }} style={styles.media} contentFit="cover" transition={160} />
        ) : (
          <View style={[styles.media, { backgroundColor: '#EEE' }]} />
        )}
        <TouchableOpacity style={styles.aiChip} onPress={onFlagAI} activeOpacity={0.9}>
          <Text style={styles.aiChipText}>Looks AI?</Text>
        </TouchableOpacity>
      </View>

      {/* Emoji headline */}
      <View style={styles.emojiRow}>
        <Text style={styles.emoji}>{sentiment.emoji}</Text>
        <Text style={styles.emojiLabel}>{sentiment.label}</Text>
      </View>

      {/* Slider */}
      <View style={styles.sliderCard}>
        <View style={[styles.track, { width: TRACK_W }]}>
          <View style={styles.trackGradient} />
          <View style={[styles.fill, { width: `${(value / MAX) * 100}%` }]} />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glow,
              {
                left: Math.max(0, Math.min(TRACK_W - 40, posFromVal(value) - 20)),
                transform: [{ scale: glowScale }],
                opacity: glowOpacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.thumb,
              {
                transform: [{ scale: thumbScale }],
                left: Math.max(0, Math.min(TRACK_W - 30, posFromVal(value) - 15)),
              },
            ]}
          >
            <Text style={styles.thumbEmoji}>{sentiment.emoji}</Text>
          </Animated.View>
          <Animated.View
            style={[
              styles.bubble,
              {
                left: Math.max(0, Math.min(TRACK_W - 42, posFromVal(value) - 21)),
                transform: [{ translateY: bubbleY }],
              },
            ]}
          >
            <Text style={styles.bubbleText}>{value}</Text>
          </Animated.View>
        </View>

        <View
          style={[styles.gesture, { width: TRACK_W }]}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => {
            onStart();
            onMove(e.nativeEvent.locationX);
          }}
          onResponderMove={(e) => onMove(e.nativeEvent.locationX)}
          onResponderRelease={() => onEnd()}
        />

        <View style={styles.ticksRow}>
          {[0, 2, 4, 6, 8, 10].map((n) => (
            <Text key={n} style={styles.tick}>
              {n}
            </Text>
          ))}
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={onSubmit} activeOpacity={0.92}>
          <Text style={styles.submitText}>Submit</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 18 }} />
    </View>
  );
}

const fallbackStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  text: { textAlign: 'center', color: '#444', marginBottom: 12 },
  btn: { backgroundColor: '#7A5AF8', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  profile: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { backgroundColor: '#FFE3EC', alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#7A5AF8', fontWeight: '900' },
  displayName: { fontSize: 18, fontWeight: '800' },
  avgLine: { marginTop: 2, color: '#666' },
  avgValue: { fontWeight: '900', color: '#111' },

  mediaWrap: { width: '100%', aspectRatio: 4 / 3, borderRadius: 16, overflow: 'hidden', backgroundColor: '#EEE', marginTop: 8 },
  media: { width: '100%', height: '100%' },
  aiChip: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  aiChipText: { color: '#fff', fontWeight: '800' },

  emojiRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14, gap: 8 },
  emoji: { fontSize: 26 },
  emojiLabel: { fontSize: 18, fontWeight: '900', color: '#1F2937' },

  sliderCard: { marginTop: 12, paddingHorizontal: 16, alignItems: 'center' },
  track: { height: 16, borderRadius: 10, backgroundColor: '#F0F0F5', alignSelf: 'center', overflow: 'hidden', position: 'relative' },
  trackGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#7A5AF8', borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  glow: { position: 'absolute', top: -6, width: 40, height: 28, borderRadius: 14, backgroundColor: '#7A5AF8', opacity: 0.2 },
  thumb: {
    position: 'absolute',
    top: -18,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#7A5AF8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7A5AF8',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  thumbEmoji: { fontSize: 16, color: '#fff' },
  bubble: { position: 'absolute', top: -48, width: 42, height: 32, borderRadius: 16, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  bubbleText: { color: '#fff', fontWeight: '900' },
  gesture: { height: 44, marginTop: -44, alignSelf: 'center' },
  ticksRow: { width: 320, flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 2 },
  tick: { color: '#9CA3AF', fontWeight: '700' },
  submitBtn: { backgroundColor: '#7A5AF8', marginTop: 16, paddingVertical: 14, borderRadius: 12, alignItems: 'center', width: 320 },
  submitText: { color: '#fff', fontWeight: '900' },
});
