// File: src/screens/rating/RateEntryScreen.js
import React, { useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import formatDate from '../../utils/formatDate';
import { withCloudinaryTransforms, IMG_DETAIL } from '../../utils/cloudinaryUrl';

export default function RateEntryScreen({ route, navigation }) {
const { item, mode = 'entry' } = route.params || {}; // item can be entry (contest) or outfit (legacy)
const displayUrl = useMemo(() => (item?.imageUrl ? withCloudinaryTransforms(item.imageUrl, IMG_DETAIL) : null), [item?.imageUrl]);

const onRate = () => {
navigation.navigate('RateScreen', {
mode,
// minimal fields used in RateScreen
target: {
id: item?.id,
userId: item?.userId,
userName: item?.userName || item?.user?.name || 'Creator',
userPhoto: item?.userPhoto || item?.user?.profilePicture || null,
imageUrl: item?.imageUrl,
caption: item?.caption,
createdAt: item?.createdAt,
contestId: item?.contestId || null,
averageRating: item?.averageRating || 0,
ratingsCount: item?.ratingsCount || 0,
},
});
};

return (
<View style={styles.container}>
<Text style={styles.header}>Rate My Outfit</Text>

text
  <View style={styles.mediaWrap}>
    {displayUrl ? (
      <ExpoImage source={{ uri: displayUrl }} style={styles.media} contentFit="cover" transition={150} />
    ) : (
      <View style={[styles.media, { backgroundColor: '#EEE' }]} />
    )}
  </View>

  <View style={styles.meta}>
    <Text style={styles.name} numberOfLines={1}>
      {item?.userName || item?.user?.name || 'Creator'}
    </Text>
    <Text style={styles.caption} numberOfLines={2}>
      {item?.caption || '—'}
    </Text>
  </View>

  <TouchableOpacity style={styles.rateBtn} onPress={onRate} activeOpacity={0.9}>
    <Text style={styles.rateText}>Rate</Text>
  </TouchableOpacity>

  <View style={styles.footerRow}>
    <View style={styles.stat}>
      <Text style={styles.statIcon}>❤️</Text>
      <Text style={styles.statText}>{Math.max(0, Math.round((item?.ratingsCount || 0) * 12.5))}</Text>
    </View>
    <View style={styles.stat}>
      <Text style={styles.statIcon}>💬</Text>
      <Text style={styles.statText}>{Math.max(0, Math.round((item?.ratingsCount || 0) * 1.7))}</Text>
    </View>
  </View>
</View>
);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 8 },
header: { fontSize: 22, fontWeight: '900', marginVertical: 8 },
mediaWrap: { width: '100%', aspectRatio: 4 / 3, borderRadius: 16, overflow: 'hidden' },
media: { width: '100%', height: '100%' },
meta: { marginTop: 12 },
name: { fontSize: 18, fontWeight: '800' },
caption: { marginTop: 4, color: '#666' },
rateBtn: {
marginTop: 16,
backgroundColor: '#7A5AF8',
paddingVertical: 16,
borderRadius: 14,
alignItems: 'center',
},
rateText: { color: '#fff', fontWeight: '800', fontSize: 16 },
footerRow: { flexDirection: 'row', gap: 16, marginTop: 14 },
stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
statIcon: { fontSize: 14 },
statText: { fontWeight: '700', color: '#444' },
});