// File: src/components/OutfitCard.js
// Description: Card UI used in feed/profile lists.

import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import formatDate from '../utils/formatDate';
import Avatar from './Avatar';

export default function OutfitCard({ outfit, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress && onPress(outfit)}>
      <View style={styles.header}>
        <Avatar uri={outfit.userPhoto} name={outfit.userName} size={40} />
        <View style={{ marginLeft: 8, flex: 1 }}>
          <Text style={styles.userName}>{outfit.userName || 'User'}</Text>
          <Text style={styles.time}>{formatDate(outfit.createdAt)}</Text>
        </View>
        <View style={styles.ratingBadge}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{(outfit.averageRating || 0).toFixed(1)}</Text>
        </View>
      </View>

      <Image source={{ uri: outfit.imageUrl }} style={styles.image} />
      {outfit.caption ? <Text style={styles.caption}>{outfit.caption}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { margin: 12, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', elevation: 2 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  userName: { fontWeight: '700' },
  time: { color: '#888', fontSize: 12 },
  ratingBadge: { backgroundColor: '#FF5A5F', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  image: { width: '100%', height: 360 },
  caption: { padding: 12, color: '#333' },
});
