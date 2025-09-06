// src/components/ProfileGridItem.js

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { withCloudinaryTransforms, IMG_SQUARE_THUMB } from '../utils/cloudinaryUrl';

const ProfileGridItem = ({ item, onPress }) => {
  if (!item?.imageUrl) {
    return <View style={styles.container} />;
  }

  const isContest = item.type === 'contest';
  const transformedUrl = withCloudinaryTransforms(item.imageUrl, IMG_SQUARE_THUMB);

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(item)} activeOpacity={0.8}>
      <ExpoImage
        source={{ uri: transformedUrl }}
        style={styles.image}
        contentFit="cover"
        transition={200}
        onError={(e) => console.warn(`ProfileGridItem failed to load image: ${transformedUrl}`, e.error)}
      />
      {isContest && (
        <View style={styles.badgeContainer}>
          <Ionicons name="trophy" size={14} color="#FFD700" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    aspectRatio: 1,
    margin: 1,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EAEAEA',
  },
  badgeContainer: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
});

export default React.memo(ProfileGridItem);
