// src/screens/details/CommentsScreen.js

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import useOutfitStore from '../../store/outfitStore';
import useAuthStore from '../../store/authStore';
import useUserStore from '../../store/UserStore';
import formatDate from '../../utils/formatDate';

function CommentRow({ item, onReply, onDelete, postOwnerId, authedId }) {
  const canDelete = authedId === item.userId || authedId === postOwnerId;

  return (
    <View style={styles.commentRow}>
      {item.user?.profilePicture ? (
        <ExpoImage source={{ uri: item.user.profilePicture }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}><Text style={styles.avatarInitial}>{(item.user?.name || 'U').charAt(0)}</Text></View>
      )}
      <View style={styles.commentContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.userName}>{item.user?.name || 'User'}</Text>
          <Text style={styles.timestamp}> • {formatDate(item.createdAt)}</Text>
        </View>
        <Text style={styles.commentText}>{item.text}</Text>
        <View style={styles.commentActions}>
          <TouchableOpacity onPress={() => onReply(item)}>
            <Text style={styles.replyButton}>Reply</Text>
          </TouchableOpacity>
          {canDelete && (
            <TouchableOpacity onPress={() => onDelete(item)}>
              <Text style={[styles.replyButton, { color: '#EF4444' }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

export default function CommentsScreen({ route }) {
  const { outfitId, postOwnerId } = route.params;
  const navigation = useNavigation();
  const { user: authedUser } = useAuthStore();
  const { myProfile, loading: profileLoading } = useUserStore();

  const { comments, fetchComments, postComment, removeComment } = useOutfitStore();
  const commentsBag = comments[outfitId] || { items: [], loading: true };

  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // { id, name }
  const inputRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({ title: 'Comments' });
    if (outfitId) {
      fetchComments({ outfitId, reset: true });
    }
  }, [outfitId, fetchComments, navigation]);

  const handlePostComment = async () => {
    if (!commentText.trim() || isSubmitting || profileLoading) {
      if (!myProfile?.uid && !profileLoading) Alert.alert("Can't Post", 'Could not find your profile. Please try again.');
      return;
    }
    setIsSubmitting(true);

    const userMeta = {
      uid: myProfile.uid,
      name: myProfile.name,
      profilePicture: myProfile.profilePicture,
    };

    await postComment({
      outfitId,
      text: commentText,
      userMeta,
      parentId: replyingTo?.id || null,
    });

    setCommentText('');
    setReplyingTo(null);
    setIsSubmitting(false);
    inputRef.current?.blur();
  };

  const handleReply = (comment) => {
    setReplyingTo({ id: comment.id, name: comment.user.name });
    inputRef.current?.focus();
  };

  const handleDelete = (comment) => {
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => removeComment({ commentId: comment.id, outfitId, parentId: comment.parentId }),
      },
    ]);
  };

  // Simple hierarchy for display (one level deep)
  const commentTree = React.useMemo(() => {
    const topLevel = commentsBag.items.filter(c => !c.parentId);
    const repliesMap = commentsBag.items.filter(c => c.parentId).reduce((acc, reply) => {
      (acc[reply.parentId] = acc[reply.parentId] || []).push(reply);
      return acc;
    }, {});
    return topLevel.flatMap(parent => [parent, ...(repliesMap[parent.id] || [])]);
  }, [commentsBag.items]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} // This offset is for the header on iOS
    >
      {commentsBag.loading && commentsBag.items.length === 0 ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={commentTree}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={item.parentId ? styles.replyContainer : {}}>
              <CommentRow
                item={item}
                onReply={handleReply}
                onDelete={handleDelete}
                postOwnerId={postOwnerId}
                authedId={authedUser?.uid}
              />
            </View>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={!commentsBag.loading ? <Text style={styles.emptyText}>No comments yet. Be the first!</Text> : null}
        />
      )}

      <View style={styles.inputContainer}>
        {replyingTo && (
          <View style={styles.replyingToBanner}>
            <Text style={styles.replyingToText}>Replying to {replyingTo.name}</Text>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={profileLoading ? "Loading profile..." : "Add a comment..."}
            editable={!profileLoading && !isSubmitting}
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity onPress={handlePostComment} disabled={isSubmitting || profileLoading} style={styles.sendButton}>
            <Ionicons name="arrow-up-circle" size={36} color={commentText.trim() && !profileLoading ? '#7A5AF8' : '#D1D5DB'} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 16 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#666' },
  commentRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12 },
  replyContainer: { marginLeft: 30, borderLeftWidth: 2, borderLeftColor: '#F3F4F6', paddingLeft: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEE', marginRight: 12 },
  avatarFallback: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#7A5AF8', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarInitial: { color: '#fff', fontWeight: 'bold' },
  commentContent: { flex: 1 },
  userName: { fontWeight: 'bold' },
  timestamp: { color: '#6B7280', fontSize: 12 },
  commentText: { marginTop: 2, color: '#1F2937' },
  commentActions: { flexDirection: 'row', gap: 16, marginTop: 8 },
  replyButton: { color: '#6B7280', fontWeight: '500' },
  inputContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#CFD8DC',
    backgroundColor: '#F9FAFB',
    padding: Platform.OS === 'ios' ? 12 : 8,
    paddingBottom: Platform.OS === 'ios' ? 30 : 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 12, // Keep for iOS multiline consistency
    maxHeight: 120,
    marginRight: 12,
    fontSize: 16,
    lineHeight: 22,
  },
  sendButton: { marginBottom: 4 },
  replyingToBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  replyingToText: { color: '#6B7280', fontSize: 12 },
});
