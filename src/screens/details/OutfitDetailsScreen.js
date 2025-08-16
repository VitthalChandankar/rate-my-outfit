// File: src/screens/details/OutfitDetailsScreen.js
// Description: Full detail view with rating, comments and ability to add comment & rate.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import RatingStars from '../../components/RatingStars';
import useAuthStore from '../../store/authStore';
import useOutfitStore from '../../store/outfitStore';
import formatDate from '../../utils/formatDate';

export default function OutfitDetailsScreen({ route }) {
  const { outfitId } = route.params;
  const { fetchOutfitDetails, submitRating, addComment } = useOutfitStore();
  const [loading, setLoading] = useState(true);
  const [outfit, setOutfit] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [comments, setComments] = useState([]);
  const [myRating, setMyRating] = useState(0);
  const [commentText, setCommentText] = useState('');
  const { user } = useAuthStore();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const res = await fetchOutfitDetails(outfitId);
    if (res.success) {
      setOutfit(res.outfit);
      setRatings(res.ratings || []);
      setComments(res.comments || []);
      const my = (res.ratings || []).find((r) => r.userId === user?.uid);
      setMyRating(my ? my.rating : 0);
    } else {
      Alert.alert('Error', 'Could not load outfit details.');
    }
    setLoading(false);
  };

  const handleRate = async (stars) => {
    const res = await submitRating({ outfitId, stars, comment: '' });
    if (res.success) {
      Alert.alert('Thanks', 'Your rating was submitted.');
      load();
    } else {
      Alert.alert('Error', 'Could not submit rating.');
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    const res = await addComment({ outfitId, comment: commentText.trim() });
    if (res.success) {
      setCommentText('');
      load();
    } else {
      Alert.alert('Error', 'Could not add comment.');
    }
  };

  if (loading || !outfit) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#FF5A5F" />;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Image source={{ uri: outfit.imageUrl }} style={styles.image} />
      <View style={{ padding: 12 }}>
        <Text style={{ fontWeight: '700', fontSize: 18 }}>{outfit.caption || 'No caption'}</Text>
        <Text style={{ color: '#666', marginTop: 6 }}>{outfit.tags?.join(', ')}</Text>

        <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', marginRight: 8 }}>{(outfit.averageRating || 0).toFixed(1)}</Text>
            <Text style={{ color: '#666' }}>{(outfit.ratingsCount || 0)} ratings</Text>
          </View>
          <RatingStars value={myRating} onChange={handleRate} />
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={{ fontWeight: '700', marginBottom: 8 }}>Comments</Text>
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                <Text style={{ fontWeight: '700' }}>{item.userId}</Text>
                <Text style={{ color: '#333' }}>{item.comment}</Text>
                <Text style={{ color: '#888', fontSize: 12 }}>{formatDate(item.createdAt)}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={{ color: '#666' }}>No comments yet</Text>}
          />
        </View>

        <View style={{ marginTop: 12 }}>
          <TextInput value={commentText} onChangeText={setCommentText} placeholder="Add a comment..." style={styles.commentInput} />
          <TouchableOpacity style={styles.commentBtn} onPress={handleAddComment}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Post Comment</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: 420, resizeMode: 'cover' },
  commentInput: { backgroundColor: '#F4F4F4', borderRadius: 8, padding: 10 },
  commentBtn: { backgroundColor: '#FF5A5F', marginTop: 8, padding: 12, borderRadius: 8, alignItems: 'center' },
});
