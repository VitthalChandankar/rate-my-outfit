// src/components/AchievementBadge.js Square Grid Style Scratch Card
import React, { useRef, useEffect, memo } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, PanResponder } from 'react-native';
import { Audio } from 'expo-av';
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
      // Animate from locked (0) to unlocked (1)
      Animated.spring(animValue, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }).start(); // onReveal is now handled by the scratch action
    }
  }, [isNew, animValue]);

  // Shimmer animation for the scratch card
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

   // Load sound effect
  const [sound, setSound] = React.useState(null);

  useEffect(() => {
    async function loadSound() {
      const { sound } = await Audio.Sound.createAsync(
         require('../../assets/sounds/scratch.mp3')
      );
      setSound(sound);
    }

    loadSound();

    return () => { if(sound) sound.unloadAsync(); }
  }, []);
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
        // A simple implementation: if moved enough, start fading out.
        // A more complex implementation would involve masking.
        if (Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10) {
          Animated.timing(scratchOpacity, {
            toValue: 0,
            duration: 400,
           
            /*Add Sound Effect here*/
            onComplete: async () => {
              if (sound) {
                await sound.replayAsync();
              }
            },

            useNativeDriver: true,
          }).start(() => {
            // Once the animation is complete, call onReveal to update the global state
            if (onReveal) {
              onReveal(item.id);
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
            <Text style={styles.brandText}>Rate My Outfit</Text>
            <Text style={styles.scratchHint}>Scratch to Reveal!</Text>
          </Animated.View>
        )}
      </Animated.View>
      <Text style={[styles.title, !isUnlocked && styles.titleLocked]} numberOfLines={2}>
        {item.title}
      </Text>
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
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  scratchCard: {
    ...StyleSheet.absoluteFillObject,
 backgroundColor: '#ccc',
    width: '100%',
    height: '100%',
 position: 'absolute',
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // Clip the shimmer
  },
  brandText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  scratchHint: {
    fontSize: 14,
    color: '#eee',
  },
  shimmer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  title: {
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 13,
    color: '#1F2937',
  },
 titleLocked: {
    color: '#9CA3AF'
  }
});



export default memo(AchievementBadge);