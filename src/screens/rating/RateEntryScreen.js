// File: src/screens/rating/RateEntryScreen.js
// Ensures we always pass a well-formed target object to RateScreen.

import React, { useMemo, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Easing, Alert } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withCloudinaryTransforms, IMG_DETAIL } from '../../utils/cloudinaryUrl';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../../components/Avatar';

export default function RateEntryScreen({ route, navigation }) {
  const { item = {}, mode = 'entry' } = route.params || {};
  const displayUrl = useMemo(
    () => (item?.imageUrl ? withCloudinaryTransforms(item.imageUrl, IMG_DETAIL) : null),
    [item?.imageUrl]
  );

  const ratingsCount = item?.ratingsCount || 0;
  const avgRating = item?.averageRating || 0;
  const aiFlags = item?.aiFlagsCount || 0;

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, opacityAnim, slideAnim]);

  const animatedImageStyle = { transform: [{ scale: scaleAnim }], opacity: opacityAnim };

  const onRate = () => {
    const target = {
      id: item?.id ?? '',
      userId: item?.userId ?? '',
      userName: item?.userName || item?.user?.name || 'Creator',
      userPhoto: item?.userPhoto || item?.user?.profilePicture || null,
      imageUrl: item?.imageUrl || null,
      caption: item?.caption || '',
      createdAt: item?.createdAt || null,
      contestId: item?.contestId || null,
      averageRating: Number(item?.averageRating ?? 0) || 0,
      ratingsCount: Number(item?.ratingsCount ?? 0) || 0,
    };
    navigation.navigate('RateScreen', { mode, target });
  };

  const onInfoPress = () => {
    Alert.alert(
      'AI Flag Info',
      'This number shows how many users have flagged this image as potentially AI-generated. Your feedback helps maintain the authenticity of our community.'
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Avatar uri={item?.userPhoto} size={40} />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.userName}>{item?.userName || 'Creator'}</Text>
          <Text style={styles.contestName}>Contest Entry</Text>
        </View>
      </View>

      <Animated.View style={[styles.mediaWrap, animatedImageStyle]}>
        <ExpoImage
          source={{ uri: displayUrl }}
          style={styles.media}
          contentFit="cover"
          transition={250}
        />
      </Animated.View>

      <View style={styles.meta}>
        <Text style={styles.caption} numberOfLines={2}>
          {item?.caption || '—'}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{avgRating > 0 ? avgRating.toFixed(1) : '–'}</Text>
          <Text style={styles.statLabel}>Avg Rating ({ratingsCount} votes)</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{aiFlags}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={styles.statLabel}>AI Flags</Text>
            <TouchableOpacity onPress={onInfoPress} style={{ marginLeft: 4 }}>
              <Ionicons name="information-circle-outline" size={16} color="#999" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
        <TouchableOpacity style={styles.rateBtn} onPress={onRate} activeOpacity={0.9}>
          <Text style={styles.rateText}>Rate Now</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
  },
  contestName: {
    fontSize: 14,
    color: '#555',
  },
  mediaWrap: {
    width: '100%',
    aspectRatio: 3 / 4, // Taller aspect ratio
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
  meta: { marginVertical: 16 },
  caption: { fontSize: 15, color: '#555', textAlign: 'center' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#f7f7f7',
    borderRadius: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#111',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#666',
    fontSize: 11,
    marginTop: 4,
  },
  rateBtn: { backgroundColor: '#A855F7', paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginBottom: 10 },
  rateText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
