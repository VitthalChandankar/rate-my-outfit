// src/components/ProfileGridItem.js

import React, { memo, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Animated, Easing } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { withCloudinaryTransforms, IMG_SQUARE_THUMB } from '../utils/cloudinaryUrl';

function formatCount(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
}

const ProfileGridItem = memo(({ item, onPress, onLongPress }) => {
  if (!item?.imageUrl) {
    return <View style={styles.container} />;
  }

  const isContest = item.type === 'contest';
  const averageRating = Number(item.averageRating ?? 0) || 0;
  const ratingsCount = Number(item.ratingsCount ?? 0) || 0;
  const isWinner = isContest && item.isWinner; // Assuming a potential 'isWinner' flag
  const transformedUrl = withCloudinaryTransforms(item.imageUrl, IMG_SQUARE_THUMB);

  const winnerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isWinner) {
      // Use a delay to make it pop after the grid item appears
      Animated.timing(winnerAnim, {
        toValue: 1,
        duration: 400,
        delay: 300,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }).start();
    }
  }, [isWinner, winnerAnim]);

  const ribbonStyle = {
    opacity: winnerAnim,
    transform: [
      { rotate: '-45deg' },
      {
        scale: winnerAnim,
      },
    ],
  };

  const content = (
    <>
      <TouchableOpacity
        style={styles.touchable}
        onPress={() => onPress(item)}
        onLongPress={() => onLongPress && onLongPress(item)}
        activeOpacity={0.8}
      >
        <ExpoImage
          source={{ uri: transformedUrl }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          onError={(e) => console.warn(`ProfileGridItem failed to load image: ${transformedUrl}`, e.error)}
        />
        {isContest && ratingsCount > 0 && (
          <View style={styles.ratingOverlay}>
            <Text style={styles.ratingText}>{averageRating.toFixed(1)}</Text>
            <Ionicons name="star" size={11} color="#111" style={{ marginHorizontal: 2 }} />
            <View style={styles.separator} />
            <Text style={styles.ratingCountText}>{formatCount(ratingsCount)}</Text>
          </View>
        )}
      </TouchableOpacity>
      {isWinner && (
        <Animated.View style={[styles.winnerRibbon, ribbonStyle]}>
          <Ionicons name="trophy" size={10} color="#A16207" />
          <Text style={styles.winnerText}>WINNER</Text>
        </Animated.View>
      )}
    </>
  );

  if (isContest) {
    return (
      <LinearGradient colors={['#A43B76', '#F97316', '#FFC107']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={styles.gradientContainer}>
        {content}
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>{content}</View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    aspectRatio: 1,
    margin: 1,
    borderRadius: 8,
    backgroundColor: '#EAEAEA',
  },
  gradientContainer: {
    flex: 1,
    aspectRatio: 1,
    margin: 1,
    borderRadius: 8,
    padding: 2, // This creates the border effect
  },
  touchable: {
    flex: 1,
    borderRadius: 6, // Slightly smaller to show the gradient border
    overflow: 'hidden',
    backgroundColor: '#EAEAEA',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EAEAEA',
  },
  ratingOverlay: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ratingText: {
    color: '#111',
    fontWeight: 'bold',
    fontSize: 11,
  },
  separator: {
    width: 1,
    height: 9,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  ratingCountText: {
    color: '#555',
    fontSize: 10,
    fontWeight: '600'
  },
  winnerRibbon: {
    position: 'absolute',
    top: 8,
    left: -28,
    backgroundColor: '#FFC107',
    paddingHorizontal: 30,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  winnerText: {
    color: '#854D0E',
    fontWeight: '900',
    fontSize: 10,
    textAlign: 'center',
  },
});

export default ProfileGridItem;
