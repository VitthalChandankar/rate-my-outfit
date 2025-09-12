// src/components/ProfileGridItem.js

import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { withCloudinaryTransforms, IMG_SQUARE_THUMB } from '../utils/cloudinaryUrl';

const ProfileGridItem = memo(({ item, onPress, onLongPress }) => {
  if (!item?.imageUrl) {
    return <View style={styles.container} />;
  }

  const isContest = item.type === 'contest';
  const isWinner = isContest && item.isWinner; // Assuming a potential 'isWinner' flag
  const transformedUrl = withCloudinaryTransforms(item.imageUrl, IMG_SQUARE_THUMB);

  const content = (
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
      {isWinner && (
        <View style={styles.winnerRibbon}>
          <Text style={styles.winnerText}>WINNER</Text>
        </View>
      )}
    </TouchableOpacity>
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
  winnerRibbon: {
    position: 'absolute',
    top: 8,
    left: -28,
    backgroundColor: '#FFC107',
    paddingHorizontal: 30,
    paddingVertical: 4,
    transform: [{ rotate: '-45deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  winnerText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 10,
    textAlign: 'center',
  },
});

export default ProfileGridItem;
