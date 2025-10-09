// src/components/AchievementBadge.js Square Grid Style Scratch Card
import React, { useRef, useEffect, memo } from 'react';
import { Text, StyleSheet, Pressable, Animated, PanResponder } from 'react-native';
// We avoid calling any audio hook at render time.
// The audio player is created imperatively inside useEffect.
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import showAlert from '../utils/showAlert';

const AchievementBadge = memo(({ item, onReveal }) => {
  const isUnlocked = !!item.unlockedAt;
  const isNew = item.isNew || false; // Flag for newly unlocked achievements
  const badgeSize = 110; // Consistent size for the badge

  const animValue = useRef(new Animated.Value(isNew ? 0 : 1)).current;

  useEffect(() => {
    if (isNew) {
      Animated.spring(animValue, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [isNew, animValue]);

  // Shimmer animation for scratch card
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isNew) {
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [isNew, shimmerAnim]);

  // --- Imperative audio initialization (avoids scheduling updates in insertion phase) ---
  const playerRef = useRef(null);
  const playerApiType = useRef(null); // 'expo-audio' | 'expo-av' | null
  const audioSource = require('../../assets/sounds/scratch.mp3');

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Try dynamic import of expo-audio (if installed)
        const expoAudio = await import('expo-audio');
        if (expoAudio && typeof expoAudio.createAudioPlayer === 'function') {
          const player = expoAudio.createAudioPlayer(audioSource);
          if (!mounted) {
            if (player && typeof player.unload === 'function') player.unload();
            return;
          }
          playerRef.current = player;
          playerApiType.current = 'expo-audio';
          return;
        }
      } catch (e) {
        // ignore - fallback to expo-av
      }

      try {
        const expoAv = await import('expo-av');
        if (expoAv && expoAv.Audio && typeof expoAv.Audio.Sound.createAsync === 'function') {
          const { sound } = await expoAv.Audio.Sound.createAsync(audioSource);
          if (!mounted) {
            if (sound && typeof sound.unloadAsync === 'function') await sound.unloadAsync();
            return;
          }
          playerRef.current = sound;
          playerApiType.current = 'expo-av';
          return;
        }
      } catch (e) {
        // failed to init audio - OK to continue without sound
      }
    })();

    return () => {
      mounted = false;
      try {
        const p = playerRef.current;
        if (!p) return;
        if (playerApiType.current === 'expo-audio') {
          if (typeof p.unload === 'function') p.unload();
          else if (typeof p.release === 'function') p.release();
        } else if (playerApiType.current === 'expo-av') {
          if (typeof p.unloadAsync === 'function') p.unloadAsync();
        }
      } catch (_) {
        // ignore cleanup errors
      }
    };
  }, []);

  // Play/reset helper
  const resetAndPlaySound = async () => {
    try {
      const p = playerRef.current;
      if (!p || !playerApiType.current) return;

      if (playerApiType.current === 'expo-audio') {
        if (typeof p.seekTo === 'function') await p.seekTo(0);
        else if (typeof p.setPosition === 'function') await p.setPosition(0);
        if (typeof p.play === 'function') await p.play();
      } else if (playerApiType.current === 'expo-av') {
        if (typeof p.setPositionAsync === 'function') await p.setPositionAsync(0);
        if (typeof p.playAsync === 'function') await p.playAsync();
      }
    } catch (e) {
      // ignore playback errors
      // console.warn('Playback failed', e);
    }
  };

  const handlePress = () => {
    if (isUnlocked) {
      showAlert(item.title, item.description);
    } else {
      showAlert('Locked Achievement', item.description);
    }
  };

  const animatedStyle = {
    transform: [
      {
        rotateY: animValue.interpolate({
          inputRange: [0, 1],
          outputRange: ['180deg', '360deg'],
        }),
      },
    ],
  };

  const lockedOpacity = animValue.interpolate({
    inputRange: [0, 0.5, 0.501, 1],
    outputRange: [1, 1, 0, 0],
  });

  const unlockedOpacity = animValue.interpolate({
    inputRange: [0, 0.5, 0.501, 1],
    outputRange: [0, 0, 1, 1],
  });

  // --- Scratch Card Logic ---
  const scratchOpacity = useRef(new Animated.Value(1)).current; // Controls the visibility of the scratch overlay

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isNew, // Only respond if it's a new, un-revealed achievement
      onMoveShouldSetPanResponder: () => isNew,
      onPanResponderMove: (evt, gestureState) => {
        if (Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10) {
          Animated.timing(scratchOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }).start(async () => {
            await resetAndPlaySound();
            if (onReveal) {
              try {
                onReveal(item.id);
              } catch (e) {
                // swallow errors
              }
            }
          });
        }
      },
    })
  ).current;

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100], // Move shimmer across the badge
  });

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <Animated.View style={[styles.badge, animatedStyle, { width: badgeSize, height: badgeSize }]}>
        {/* Locked State (Front of the card) */}
        <Animated.View style={[styles.face, styles.lockedFace, { opacity: lockedOpacity }]}>
          <Ionicons name="lock-closed" size={32} color="#9CA3AF" />
        </Animated.View>

        {/* Unlocked State (Back of the card) */}
        <Animated.View style={[styles.face, styles.unlockedFace, { opacity: unlockedOpacity }]}>
          <ExpoImage source={{ uri: item.imageUrl }} style={styles.image} contentFit="contain" />
        </Animated.View>

        {/* Scratch Card Overlay */}
        {isNew && (
          <Animated.View {...panResponder.panHandlers} style={[styles.scratchCard, { opacity: scratchOpacity }]}>
            <LinearGradient
              colors={['#8E2DE2', '#4A00E0']} // A nice purple gradient
              style={StyleSheet.absoluteFill}
            />
            {/* Shimmer Effect */}
            <Animated.View style={[styles.shimmer, { transform: [{ translateX: shimmerTranslateX }] }]}>
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
            <Text style={styles.brandText}>Vastrayl</Text>
            <Text style={styles.scratchHint}>Scratch to Reveal!</Text>
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '33.33%',
    padding: 1,
    aspectRatio: 1,
  },
  badge: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    alignItems: 'center',
  },
  lockedFace: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  unlockedFace: {
    backgroundColor: '#fff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  image: { width: '100%', height: '100%', borderRadius: 0 },
  scratchCard: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ccc',
    width: '100%',
    height: '100%',
    position: 'absolute',
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  brandText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  scratchHint: { fontSize: 14, color: '#eee' },
  shimmer: { position: 'absolute', width: '100%', height: '100%', opacity: 0.8 },
});

export default memo(AchievementBadge);
