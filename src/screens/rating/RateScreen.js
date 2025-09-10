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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import * as Haptics from 'expo-haptics';

import useAuthStore from '../../store/authStore';
import useContestStore from '../../store/contestStore';
import useOutfitStore from '../../store/outfitStore';
import { Ionicons } from '@expo/vector-icons';
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
  const { rateEntry, contestsById } = useContestStore((s) => ({
    rateEntry: s.rateEntry,
    contestsById: s.contestsById,
  }));
  const submitRating = useOutfitStore((s) => s.submitRating);

  const contest = contestsById[contestId];
  const contestIsActive = contest && contest.endAt && (contest.endAt.toDate ? contest.endAt.toDate() : new Date()) > new Date();

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
  const [isFlagged, setIsFlagged] = useState(false); // New state for AI flag

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
    if (user?.uid === userId) return Alert.alert('Not allowed', 'You can’t flag your own post.');

    const nextFlagState = !isFlagged;
    setIsFlagged(nextFlagState); // Optimistically update the button's visual state

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    // Immediately submit the AI flag change, using the current slider value as the rating
    const res =
      mode === 'entry'
        ? await rateEntry({ entryId: id, contestId, rating: value, aiFlag: nextFlagState })
        : { success: false, error: 'Cannot flag a normal post.' };

    if (!res?.success) {
      setIsFlagged(!nextFlagState); // Revert button state on failure
      Alert.alert('Error', res.error?.message || 'Could not submit flag.');
    } else {
      Alert.alert('Thanks!', nextFlagState ? 'Your AI flag has been recorded.' : 'Your AI flag has been removed.');
    }
  };

  const onSubmit = async () => {
    if (!user?.uid) return Alert.alert('Sign in', 'Please sign in to rate.');
    if (!contestIsActive) {
      Alert.alert("Contest Ended", "This contest has ended and can no longer be rated.", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
      return;
    }
    if (user?.uid === userId) return Alert.alert('Not allowed', 'You can’t rate your own post.');
    setSubmitting(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
    const v = value; // integer 1–10
    // Submit the numeric rating, preserving the current AI flag state
    const res =
      mode === 'entry'
        ? await rateEntry({ entryId: id, contestId, rating: v, aiFlag: isFlagged }) // isFlagged is the current state
        : { success: false, error: 'Cannot rate a normal post.' }; // This path should not be taken

    setSubmitting(false);
    if (!res?.success) Alert.alert('Error', res.error?.message || 'Could not submit rating.');
    else navigation.navigate('RatingSuccess', { emoji: sentiment.emoji });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* Main Content */}
      <View style={styles.contentContainer}>
        <View style={styles.mediaWrap}>
          {displayUrl ? (
            <ExpoImage source={{ uri: displayUrl }} style={styles.media} contentFit="cover" transition={160} />
          ) : (
            <View style={[styles.media, { backgroundColor: '#EEE' }]} />
          )}
        </View>

        {/* Average Rating */}
        <Text style={styles.avgLine}>
          Average Rating <Text style={styles.avgStrong}>{averageRating.toFixed(1)}</Text>
        </Text>

        {/* Slider */}
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

      {/* Action Buttons */}
      <View style={styles.footer}>
        <Pressable
          onPress={onFlagAI}
          style={({ pressed }) => [
            styles.aiButton,
            isFlagged && styles.aiButtonFlagged, // Apply flagged style
            pressed && { opacity: 0.8 }
          ]}>
          <Ionicons name={isFlagged ? "sparkles" : "sparkles-outline"} size={20} color={isFlagged ? '#fff' : '#111'} />
          <Text style={[styles.aiButtonText, isFlagged && styles.aiButtonTextFlagged]}>{isFlagged ? 'Flagged' : 'AI Check'}</Text>
        </Pressable>
        <Pressable onPress={onSubmit} style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.9 }]} disabled={submitting}>
          <Text style={styles.submitText}>{submitting ? 'Submitting…' : 'Submit Rating'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
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
  screen: { flex: 1, backgroundColor: '#fff' },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  mediaWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  media: { width: '100%', height: '100%' },
  avgLine: {
    marginTop: 24,
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  avgStrong: { fontWeight: 'bold', color: '#111' },

  sliderBlock: { marginTop: 20, alignItems: 'center' },

  track: {
    height: 12,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#A855F7', // Purple
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  thumb: {
    position: 'absolute',
    top: -12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: '#A855F7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7A5AF8',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  thumbText: { color: '#A855F7', fontWeight: 'bold', fontSize: 14 },

  sentimentText: { marginTop: 12, fontWeight: 'bold', color: '#111', fontSize: 16 },

  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 16,
  },
  aiButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 14,
  },
  aiButtonFlagged: {
    backgroundColor: '#3B82F6', // A blue color to indicate "selected"
  },
  aiButtonText: { color: '#111', fontWeight: 'bold' },
  aiButtonTextFlagged: {
    color: '#fff',
  },
  submitBtn: {
    flex: 2,
    backgroundColor: '#A855F7',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.2 },
});

const fallbackStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  text: { textAlign: 'center', color: '#444', marginBottom: 12 },
  btn: { backgroundColor: '#7A5AF8', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10 },
});
