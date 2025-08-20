// File: src/screens/rating/RateScreen.js
// Change: throttle haptics so they don't fire on every integer step.
// - We only trigger haptics when the value crosses a "milestone": 2,4,6,8,10.
// - For small adjustments within the same band, no haptic.
// - Keeps integer 1–10 slider, no ticks below, same UI.

import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  View,
  Pressable,
  PanResponder,
} from 'react-native';
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
  const usernameHandle = userName ? `@${(userName || '').split(' ')[0].toLowerCase()}` : '@user';

  if (!id) {
    return (
      <View style={fallbackStyles.wrap}>
        <Text style={fallbackStyles.text}>Nothing to rate. Please go back and open a post again.</Text>
        <Pressable onPress={() => navigation.goBack()} style={fallbackStyles.btn}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const { user } = useAuthStore();
  const rateEntry = useContestStore((s) => s.rateEntry);
  const submitRatingLegacy = useOutfitStore((s) => s.submitRating);

  const displayUrl = useMemo(
    () => (imageUrl ? withCloudinaryTransforms(imageUrl, IMG_DETAIL) : null),
    [imageUrl]
  );

  // Slider settings: integer 1–10
  const TRACK_W = 300;
  const MIN = 1;
  const MAX = 10;

  const [value, setValue] = useState(7);
  const [submitting, setSubmitting] = useState(false);

  const trackRef = useRef(null);
  const trackX = useRef(0);

  // Haptics throttling:
  // - Fire only when crossing milestone steps: 2,4,6,8,10.
  // - Keep the latest milestone crossed to avoid spamming.
  const MILESTONES = [2, 4, 6, 8, 10];
  const lastMilestoneRef = useRef(getMilestone(7));

  const clamp = (v) => Math.max(MIN, Math.min(MAX, v));
  const posFromVal = (v) => ((clamp(v) - MIN) / (MAX - MIN)) * TRACK_W;
  const valFromPos = (x) => {
    const raw = (x / TRACK_W) * (MAX - MIN) + MIN;
    return clamp(Math.round(raw));
  };

  const sentiment = getSentiment(value);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.pageX - trackX.current;
        const next = valFromPos(x);
        setValue(next);
        maybeHaptic(next);
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.pageX - trackX.current;
        const next = valFromPos(x);
        if (next !== value) {
          setValue(next);
          maybeHaptic(next);
        }
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  const onLayoutTrack = () => {
    trackRef.current?.measure?.((fx, fy, w, h, px) => {
      trackX.current = px;
    });
  };

  function getMilestone(v) {
    // returns the milestone value we are at or just crossed; 0 if none
    for (let i = 0; i < MILESTONES.length; i++) {
      if (v === MILESTONES[i]) return MILESTONES[i];
    }
    return 0;
  }

  async function maybeHaptic(next) {
    const m = getMilestone(next);
    if (m && m !== lastMilestoneRef.current) {
      lastMilestoneRef.current = m;
      // light haptic only at milestones
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
  }

  const onFlagAI = async () => {
    if (!user?.uid) return Alert.alert('Sign in', 'Please sign in to flag.');
    if (mode === 'entry' && user?.uid === userId) return Alert.alert('Not allowed', 'You can’t flag your own entry.');
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    const res =
      mode === 'entry'
        ? await rateEntry({ entryId: id, contestId, rating: 0, aiFlag: true })
        : await submitRatingLegacy({ outfitId: id, stars: 0, comment: '[AI flag]' });
    if (!res?.success) Alert.alert('Error', 'Could not submit flag.');
    else Alert.alert('Thanks', 'Your flag has been recorded.');
  };

  const onSubmit = async () => {
    if (!user?.uid) return Alert.alert('Sign in', 'Please sign in to rate.');
    if (mode === 'entry' && user?.uid === userId) return Alert.alert('Not allowed', 'You can’t rate your own entry.');
    setSubmitting(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
    const v = value; // integer 1–10
    const res =
      mode === 'entry'
        ? await rateEntry({ entryId: id, contestId, rating: v, aiFlag: false })
        : await submitRatingLegacy({
            outfitId: id,
            stars: Math.max(1, Math.min(5, Math.round(v / 2))),
            comment: '',
          });
    setSubmitting(false);
    if (!res?.success) Alert.alert('Error', 'Could not submit rating.');
    else navigation.goBack();
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        {userPhoto ? (
          <ExpoImage source={{ uri: userPhoto }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.initial}>{(userName || 'U').slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.displayName}>{userName}</Text>
        <Text style={styles.username}>{usernameHandle}</Text>
      </View>

      <View style={styles.divider} />

      {/* Media Card */}
      <View style={styles.card}>
        <View style={styles.mediaWrap}>
          {displayUrl ? (
            <ExpoImage source={{ uri: displayUrl }} style={styles.media} contentFit="cover" transition={160} />
          ) : (
            <View style={[styles.media, { backgroundColor: '#EEE' }]} />
          )}

          {/* Looks AI pill */}
          <Pressable onPress={onFlagAI} style={({ pressed }) => [styles.aiPill, pressed && { opacity: 0.9 }]}>
            <Text style={styles.aiPillText}>Looks AI?</Text>
          </Pressable>
        </View>

        {/* Average Rating */}
        <Text style={styles.avgLine}>
          Average Rating <Text style={styles.avgStrong}>{averageRating.toFixed(1)}</Text>
        </Text>

        {/* Slider (integer only, no ticks below) */}
        <View style={styles.sliderBlock}>
          <View
            ref={trackRef}
            onLayout={onLayoutTrack}
            style={[styles.track, { width: TRACK_W }]}
            {...panResponder.panHandlers}
          >
            <View style={[styles.fill, { width: posFromVal(value) }]} />
            <View style={[styles.thumb, { left: Math.max(0, Math.min(TRACK_W - 28, posFromVal(value) - 14)) }]}>
              <Text style={styles.thumbText}>{value}</Text>
            </View>
          </View>

          {/* Sentiment helper */}
          <Text style={styles.sentimentText}>
            {sentiment.emoji} {sentiment.label}
          </Text>
        </View>
      </View>

      {/* Submit */}
      <Pressable onPress={onSubmit} style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.95 }]} disabled={submitting}>
        <Text style={styles.submitText}>{submitting ? 'Submitting…' : 'Submit'}</Text>
      </Pressable>
    </View>
  );
}

/* Helpers */
function getSentiment(n) {
  if (n <= 2) return { emoji: '😖', label: 'Awful' };
  if (n <= 4) return { emoji: '🙁', label: 'Bad' };
  if (n <= 6) return { emoji: '😐', label: 'Okay' };
  if (n <= 8) return { emoji: '🙂', label: 'Good' };
  return { emoji: '😍', label: 'Awesome' };
}

/* Styles */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },

  header: { alignItems: 'center', paddingTop: 18, paddingBottom: 12 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#EEE' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#7A5AF8', fontWeight: '900', fontSize: 26 },
  displayName: { marginTop: 12, fontSize: 22, fontWeight: '900', color: '#141518' },
  username: { marginTop: 4, color: '#7A7F8A', fontWeight: '600' },

  divider: { height: 1, backgroundColor: '#F0F1F4', marginVertical: 12 },

  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  mediaWrap: { width: '100%', aspectRatio: 4 / 3, borderRadius: 14, overflow: 'hidden', backgroundColor: '#F2F3F5' },
  media: { width: '100%', height: '100%' },

  aiPill: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: '#111',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  aiPillText: { color: '#fff', fontWeight: '800' },

  avgLine: { marginTop: 14, fontSize: 16, color: '#454B53' },
  avgStrong: { fontWeight: '900', color: '#141518' },

  sliderBlock: { marginTop: 14, alignItems: 'center' },

  track: {
    height: 12,
    borderRadius: 10,
    backgroundColor: '#E8E8EE',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#7A5AF8',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  thumb: {
    position: 'absolute',
    top: -10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#7A5AF8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7A5AF8',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  thumbText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  sentimentText: { marginTop: 8, fontWeight: '800', color: '#5A6270' },

  submitBtn: {
    marginTop: 18,
    marginHorizontal: 16,
    backgroundColor: '#7A5AF8',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: '900', letterSpacing: 0.2 },
});

const fallbackStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  text: { textAlign: 'center', color: '#444', marginBottom: 12 },
  btn: { backgroundColor: '#7A5AF8', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10 },
});
