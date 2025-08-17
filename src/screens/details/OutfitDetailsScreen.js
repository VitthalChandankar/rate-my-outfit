// File: src/screens/details/OutfitDetailsScreen.js
// Description: Full detail view with rating, comments and ability to add comment & rate.


import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import RatingStars from '../../components/RatingStars';
import useAuthStore from '../../store/authStore';
import useOutfitStore from '../../store/outfitStore';
import formatDate from '../../utils/formatDate';
import { withCloudinaryTransforms, IMG_DETAIL } from '../../utils/cloudinaryUrl';

export default function OutfitDetailsScreen({ route }) {
  const { outfitId } = route.params;
  const { fetchOutfitDetails, submitRating, addComment } = useOutfitStore();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [outfit, setOutfit] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [comments, setComments] = useState([]);
  const [myRating, setMyRating] = useState(0);
  const [commentText, setCommentText] = useState('');

  const imageUrl = outfit?.imageUrl || null;
  const displayUrl = useMemo(() => (imageUrl ? withCloudinaryTransforms(imageUrl, IMG_DETAIL) : null), [imageUrl]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    const res = await fetchOutfitDetails(outfitId);
    if (res.success) {
      setOutfit(res.outfit);
      setRatings(res.ratings || []);
      setComments(res.comments || []);
      const mine = (res.ratings || []).find((r) => r.userId === user?.uid);
      setMyRating(mine ? mine.rating : 0);
    } else {
      Alert.alert('Error', 'Could not load outfit details.');
    }
    setLoading(false);
  };

  const handleRate = async (stars) => {
    if (!user?.uid) return Alert.alert('Sign in', 'Please sign in to rate.');
    const res = await submitRating({ outfitId, stars, comment: '' });
    if (res.success) {
      setMyRating(stars);
      load();
    } else {
      Alert.alert('Error', 'Could not submit rating.');
    }
  };

  const handleAddComment = async () => {
    if (!user?.uid) return Alert.alert('Sign in', 'Please sign in to comment.');
    if (!commentText.trim()) return;
    const res = await addComment({ outfitId, comment: commentText.trim() });
    if (res.success) {
      setCommentText('');
      load();
    } else {
      Alert.alert('Error', 'Could not add comment.');
    }
  };

  if (loading || !outfit) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {displayUrl ? (
        <ExpoImage source={{ uri: displayUrl }} style={styles.image} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.image, { backgroundColor: '#EEE' }]} />
      )}

      <View style={{ padding: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>{outfit.caption || 'No caption'}</Text>
        {!!outfit.tags?.length && <Text style={{ color: '#666', marginTop: 4 }}>{outfit.tags.join(', ')}</Text>}

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
          <RatingStars rating={myRating} onChange={handleRate} />
          <Text style={{ marginLeft: 8 }}>
            {(outfit.averageRating || 0).toFixed(1)} · {outfit.ratingsCount || 0} ratings
          </Text>
        </View>

        <Text style={{ marginTop: 8, color: '#888' }}>
          {outfit.createdAt ? formatDate(outfit.createdAt) : ''}
        </Text>

        <Text style={{ marginTop: 16, fontWeight: '700' }}>Comments</Text>
        <FlatList
          data={comments}
          keyExtractor={(item) => String(item.id || `${item.userId}-${item.createdAt?.seconds || ''}`)}
          renderItem={({ item }) => (
            <View style={{ paddingVertical: 8 }}>
              <Text style={{ fontWeight: '700' }}>{item.userId}</Text>
              <Text style={{ color: '#333' }}>{item.comment}</Text>
              <Text style={{ color: '#999', fontSize: 12 }}>{formatDate(item.createdAt)}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={{ color: '#666', marginTop: 8 }}>No comments yet</Text>}
          style={{ marginTop: 8 }}
        />

        <View style={{ marginTop: 12 }}>
          <TextInput
            placeholder="Add a comment"
            value={commentText}
            onChangeText={setCommentText}
            style={styles.commentInput}
            multiline
          />
          <TouchableOpacity onPress={handleAddComment} style={styles.commentBtn}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Post Comment</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: 420 },
  commentInput: { backgroundColor: '#F4F4F4', borderRadius: 8, padding: 10 },
  commentBtn: { backgroundColor: '#FF5A5F', marginTop: 8, padding: 12, borderRadius: 8, alignItems: 'center' },
});
