// src/components/AchievementBadge.js
import React, { useRef, useEffect, memo } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import showAlert from '../utils/showAlert';

const AchievementBadge = ({ item, onReveal }) => {
  const isUnlocked = !!item.unlockedAt;
  const isNew = item.isNew || false; // Flag for newly unlocked achievements

  const animValue = useRef(new Animated.Value(isNew ? 0 : 1)).current;

  useEffect(() => {
    if (isNew) {
      // Animate from locked (0) to unlocked (1)
      Animated.spring(animValue, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: false, // style props like backgroundColor need this
      }).start(() => {
        if (onReveal) onReveal(item.id);
      });
    }
  }, [isNew, animValue, onReveal, item.id]);

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

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <Animated.View style={[styles.badge, animatedStyle]}>
        {/* Locked State (Front of the card) */}
        <Animated.View style={[styles.face, styles.lockedFace, { opacity: lockedOpacity }]}>
          <Ionicons name="lock-closed" size={32} color="#9CA3AF" />
        </Animated.View>

        {/* Unlocked State (Back of the card) */}
        <Animated.View style={[styles.face, styles.unlockedFace, { opacity: unlockedOpacity }]}>
          <ExpoImage source={{ uri: item.imageUrl }} style={styles.image} contentFit="contain" />
        </Animated.View>
      </Animated.View>
      <Text style={[styles.title, !isUnlocked && styles.titleLocked]} numberOfLines={2}>
        {item.title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '33.33%',
    padding: 8,
  },
  badge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backfaceVisibility: 'hidden',
    borderRadius: 45,
  },
  lockedFace: {
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  unlockedFace: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
  },
  title: {
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 13,
    color: '#1F2937',
  },
  titleLocked: {
    color: '#9CA3AF',
  },
});

export default memo(AchievementBadge);