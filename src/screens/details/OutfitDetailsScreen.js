// File: src/screens/details/OutfitDetailsScreen.js
//currently its getting navigated for normal post from home screen, aim is : it should get navigated from profile screen, userprofile screen
// in short where we see post in small grid view we will use this screen to view in large
// Modern screen for normal posts: shows image, like/comment actions, and caption.


import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity, 
  Pressable,
} from 'react-native';
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import useOutfitStore from '../../store/outfitStore';
import useUserStore from "../../store/UserStore";
import useAuthStore from "../../store/authStore";
import { withCloudinaryTransforms, IMG_DETAIL } from '../../utils/cloudinaryUrl';
import formatDate from '../../utils/formatDate';
import Avatar from "../../components/Avatar";

export default function OutfitDetailsScreen({ route, navigation }) {
  const { outfitId } = route.params;
  const { user: authedUser } = useAuthStore();
  const authedUid = authedUser?.uid || authedUser?.user?.uid || null;

  const { fetchOutfitDetails, toggleLike } = useOutfitStore();
  const myLikedIds = useUserStore((s) => s.myLikedIds);

  const [outfit, setOutfit] = useState(null); // Will hold the full outfit object
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (outfitId) {
      setLoading(true);
      fetchOutfitDetails(outfitId).then((res) => {
        if (res.success) {
          setOutfit(res.outfit); // Set the entire outfit object
        }
        setLoading(false);
      });
    }
  }, [outfitId, fetchOutfitDetails]); // Re-fetch if outfitId changes

  const displayUrl = useMemo(
    () => (outfit?.imageUrl ? withCloudinaryTransforms(outfit.imageUrl, IMG_DETAIL) : null),
    [outfit?.imageUrl]
  );

  const isLiked = myLikedIds.has(outfitId);

  const handleLike = useCallback(() => {
    if (!authedUid || !outfit) return;
    // Optimistically update the local outfit state
    setOutfit((prev) => ({
      ...prev,
      likesCount: (prev.likesCount || 0) + (isLiked ? -1 : 1),
    }));
    toggleLike(outfit.id, authedUid, outfit.userId);
  }, [authedUid, outfit, isLiked, toggleLike]);

  const handleLikesPress = useCallback(() => {
    if (!outfitId) return;
    navigation.navigate('LikedBy', { outfitId });
  }, [navigation, outfitId]);

  const handleCommentsPress = useCallback(() => {
    if (!outfitId) return;
    navigation.navigate('Comments', { outfitId, postOwnerId: outfit?.userId });
  }, [navigation, outfitId, outfit?.userId]);

  const handleUserPress = useCallback(() => {
    if (!outfit?.userId) return;
    if (authedUid && outfit.userId === authedUid) {
      navigation.navigate('Profile');
    } else {
      navigation.navigate('UserProfile', { userId: outfit.userId });
    }
  }, [navigation, authedUid, outfit?.userId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!outfit) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Outfit not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <Pressable onPress={handleUserPress} style={styles.header}>
        <Avatar uri={outfit.user?.profilePicture} size={40} />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.userName}>{outfit.user?.name || 'User'}</Text>
          <Text style={styles.time}>{formatDate(outfit.createdAt)}</Text>
        </View>
      </Pressable>
      {/* Image */}
      <ExpoImage
        source={{ uri: displayUrl }}
        style={styles.image}
        contentFit="cover"
      />
      {/* Actions: Like, Comment, Share */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.action} onPress={handleLike}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={28}
            color={isLiked ? '#FF3B30' : '#111'}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} onPress={handleCommentsPress}>
          <Ionicons name="chatbubble-outline" size={26} color="#111" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.action}>
          <Ionicons name="arrow-redo-outline" size={26} color="#111" />
        </TouchableOpacity>
      </View>
      {/* Likes and Caption */}
      <View style={styles.metaSection}>
        {outfit.likesCount > 0 && (
          <TouchableOpacity onPress={handleLikesPress}>
            <Text style={styles.likesText}>
              {outfit.likesCount.toLocaleString()}{' '}
              {outfit.likesCount === 1 ? 'like' : 'likes'}
            </Text>
          </TouchableOpacity>
        )}
        <Text style={styles.captionText}>
          <Text style={styles.captionUser}>{outfit.user?.name || 'User'}</Text>{' '}
          {outfit.caption}
        </Text>
        <TouchableOpacity onPress={handleCommentsPress}>
          <Text style={styles.viewCommentsText}>
            View all {outfit.commentsCount || 0} comments
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: '#666',
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  userName: {
    fontWeight: "bold",
    fontSize: 16,
  },
  time: {
    color: '#666',
    fontSize: 12,
  },
  image: {
    width: "100%",
    aspectRatio: 1,
  },
  actionsRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  action: {
    marginRight: 16,
  },
  metaSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  likesText: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  captionText: {
    lineHeight: 20,
  },
  captionUser: {
    fontWeight: "bold",
  },
  viewCommentsText: {
    color: '#888',
    marginTop: 8,
  },
});
