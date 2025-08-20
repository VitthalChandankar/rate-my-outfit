// File: src/screens/rating/RateScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as Haptics from 'expo-haptics';
import useAuthStore from '../../store/authStore';
import useContestStore from '../../store/contestStore';
import useOutfitStore from '../../store/outfitStore';
import { withCloudinaryTransforms, IMG_DETAIL } from '../../utils/cloudinaryUrl';

export default function RateScreen({ route, navigation }) {
  // mode: 'entry' (contest) or 'outfit' (legacy)
  const { mode = 'entry', target } = route.params || {};
  const {
    id,
    contestId,
    userId,
    userName,
    userPhoto,
    imageUrl,
    averageRating = 0,
    ratingsCount = 0,
  } = target || {};

  const { user } = useAuthStore();
  const rateEntry = useContestStore((s) => s.rateEntry);
  const submitRatingLegacy = useOutfitStore((s) => s.submitRating);

  // Animated slider state
  const [value, setValue] = useState(7); // default 7
  const thumbScale = useRef(new Animated.Value(1)).current;
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

  const onFlagAI = async () => {
    if (!user?.uid) return Alert.alert('Sign in', 'Please sign in to flag.');
    if (mode === 'entry' && user?.uid === userId)
      return Alert.alert('Not allowed', 'You can’t flag your own entry.');
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
    if (mode === 'entry' && user?.uid === userId)
      return Alert.alert('Not allowed', 'You can’t rate your own entry.');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const v = Math.round(value);
    const res =
      mode === 'entry'
        ? await rateEntry({ entryId: id, contestId, rating: v, aiFlag: false })
        : await submitRatingLegacy({
            outfitId: id,
            // map 0–10 to 1–5 for legacy
            stars: Math.max(1, Math.min(5, Math.round(v / 2))),
            comment: '',
          });
    if (!res?.success) Alert.alert('Error', 'Could not submit rating.');
    else navigation.goBack();
  };

  // Slider gestures
  const TRACK_W = 300;

  const onStart = () => {
    Animated.spring(thumbScale, {
      toValue: 1.25,
      useNativeDriver: true,
      friction: 6,
    }).start();
  };

  const onMove = (x) => {
    const v = Math.round(Math.max(0, Math.min(10, (x / TRACK_W) * 10)));
    setValue(v);
  };

  const onEnd = () => {
    Animated.spring(thumbScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
    }).start();
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerSpace} />

      <View style={styles.profile}>
        {userPhoto ? (
          <ExpoImage source={{ uri: userPhoto }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.initial}>
              {(userName || 'U').slice(0, 1).toUpperCase()}
            </Text>
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
            Average Rating{' '}
            <Text style={styles.avgValue}>
              {Number(averageRating).toFixed(1)}
            </Text>
          </Animated.Text>
        </View>
      </View>

      <View style={styles.mediaWrap}>
        {displayUrl ? (
          <ExpoImage
            source={{ uri: displayUrl }}
            style={styles.media}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={[styles.media, { backgroundColor: '#EEE' }]} />
        )}

        <TouchableOpacity
          style={styles.aiChip}
          onPress={onFlagAI}
          activeOpacity={0.85}
        >
          <Text style={styles.aiChipText}>Looks AI?</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sliderCard}>
        <Text style={styles.sliderTitle}>Rate</Text>

        <View style={[styles.track, { width: TRACK_W }]}>
          <View
            style={[
              styles.trackFill,
              { width: `${(value / 10) * 100}%` },
            ]}
          />
          <Animated.View
            style={[
              styles.thumb,
              {
                transform: [{ scale: thumbScale }],
                left: Math.max(
                  0,
                  Math.min(TRACK_W - 28, (value / 10) * TRACK_W - 14)
                ),
              },
            ]}
          >
            <Text style={styles.thumbText}>{value}</Text>
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

        <View style={styles.marks}>
          {[0, 5, 10].map((m) => (
            <Text key={m} style={styles.mark}>
              {m}
            </Text>
          ))}
        </View>

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={onSubmit}
          activeOpacity={0.92}
        >
          <Text style={styles.submitText}>Submit</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 18 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerSpace: { height: 6 },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 8,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: {
    backgroundColor: '#FFE3EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { color: '#7A5AF8', fontWeight: '900' },
  displayName: { fontSize: 18, fontWeight: '800' },
  avgLine: { marginTop: 2, color: '#666' },
  avgValue: { fontWeight: '900', color: '#111' },

  mediaWrap: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#EEE',
    marginTop: 8,
  },
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

  sliderCard: { marginTop: 14, paddingHorizontal: 16 },
  sliderTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  track: {
    height: 14,
    borderRadius: 8,
    backgroundColor: '#F0F0F5',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  trackFill: { height: '100%', backgroundColor: '#7A5AF8' },
  thumb: {
    position: 'absolute',
    top: -12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#7A5AF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  gesture: { alignSelf: 'center', height: 36, marginTop: -36 },
  marks: {
    width: 300,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  mark: { color: '#888', fontWeight: '700' },
  submitBtn: {
    backgroundColor: '#7A5AF8',
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: '800' },
});
