// File: src/store/outfitStore.js
// Description: Zustand store for managing feed, uploads, ratings, and my-outfits pagination.

import { create } from 'zustand';
import {
  createOutfitDocument,
  addComment,
  deleteComment,
  fetchFeed as fbFetchFeed,
  fetchOutfitDetails as fbFetchOutfitDetails,
  fetchCommentsForOutfit,
  submitRating as fbSubmitRating,
  toggleLikePost,
  fetchLikersForOutfit,
  fetchUserOutfits,
  uploadImage,
} from '../services/firebase';
import useUserStore from './UserStore';
import useAuthStore from './authStore';

const useOutfitStore = create((set, get) => ({
  // Feed
  feed: [],
  lastDoc: null,
  loading: false,
  refreshing: false,

  // My uploads (profile grid) pagination
  myOutfits: [],
  myOutfitsLast: null,
  myOutfitsLoading: false,
  myOutfitsRefreshing: false,
  myOutfitsHasMore: true,

  // Likers list per outfit
  likers: {},

  // Comments per outfit
  comments: {},

  // Feed list
  fetchFeed: async ({ limit = 12, reset = false } = {}) => {
    const alreadyLoading = get().loading || get().refreshing;
    if (alreadyLoading && !reset) return { success: false, error: 'Busy' };

    try {
      if (reset) set({ refreshing: true }); else set({ loading: true });
      const startAfterDoc = reset ? null : get().lastDoc;
      const res = await fbFetchFeed({ limitCount: limit, startAfterDoc });
      if (res.success) {
        set((state) => ({
          feed: reset ? res.items : [...state.feed, ...res.items],
          lastDoc: res.last || state.lastDoc,
          loading: false,
          refreshing: false,
        }));
      } else {
        set({ loading: false, refreshing: false });
      }
      return res;
    } catch (e) {
      set({ loading: false, refreshing: false });
      console.error('fetchFeed failed:', e); // Log the actual error
      return { success: false, error: e };
    }
  },

  // Upload (normal)
  uploadOutfit: async ({ userId, imageUri, caption = '', tags = [], userMeta = null, type = 'normal', contestId = null }) => {
    if (!userId) return { success: false, error: 'Not authenticated' };
    try {
      const up = await uploadImage(imageUri);
      if (!up.success) return up;

      const create = await createOutfitDocument({
        userId,
        imageUrl: up.url,
        caption,
        tags,
        userMeta,
        type,
        contestId,
      });

      if (create.success) {
        // Optimistically prepend to feed only; profile list will refresh on demand
        set((state) => ({
          feed: [{ id: create.id, ...create.data, imageUrl: up.url }, ...state.feed],
        }));
      }
      return create;
    } catch (error) {
      console.error('uploadOutfit error:', error?.message || error);
      return { success: false, error };
    }
  },

  // NEW: Create an outfit post when the image URL is already known (e.g., from a contest entry)
  addRemoteOutfitToFeed: async ({ userId, imageUrl, caption, tags, userMeta, type, contestId }) => {
    if (!userId || !imageUrl) return { success: false, error: 'Missing userId or imageUrl' };
    try {
      const create = await createOutfitDocument({
        userId,
        imageUrl,
        caption,
        tags,
        userMeta,
        type,
        contestId,
      });

      if (create.success) {
        // Optimistically prepend to the main feed
        set((state) => ({
          feed: [{ id: create.id, ...create.data, imageUrl }, ...state.feed],
        }));
      }
      return create;
    } catch (error) {
      return { success: false, error };
    }
  },

  // Like/unlike a post
  toggleLike: async (outfitId, userId, postOwnerId) => {
    if (!outfitId || !userId) return;

    const { toggleLikedId } = useUserStore.getState();

    // Optimistic update
    const originalFeed = get().feed;
    const isCurrentlyLiked = useUserStore.getState().myLikedIds.has(outfitId);

    const updatedFeed = originalFeed.map(post => {
      if (post.id === outfitId) {
        return {
          ...post,
          likesCount: (post.likesCount || 0) + (isCurrentlyLiked ? -1 : 1),
        };
      }
      return post;
    });
    set({ feed: updatedFeed });
    toggleLikedId(outfitId);

    // Call firebase
    const res = await toggleLikePost({ outfitId, userId, postOwnerId });
    if (!res.success) {
      // Revert on failure
      set({ feed: originalFeed });
      toggleLikedId(outfitId); // toggle back
    }
  },

  // Fetch users who liked a post
  fetchLikers: async ({ outfitId, reset = false, limit = 30 }) => {
    if (!outfitId) return { success: false, error: 'outfitId required' };

    const bag = get().likers[outfitId] || { users: [], last: null, loading: false, hasMore: true };
    if (bag.loading && !reset) return { success: false, error: 'Busy' };

    const nextBag = { ...bag, loading: true };
    set({ likers: { ...get().likers, [outfitId]: nextBag } });

    const startAfterDoc = reset ? null : bag.last;
    const res = await fetchLikersForOutfit({ outfitId, limitCount: limit, startAfterDoc });

    if (res.success) {
      const newUsers = res.users || [];
      const existingIds = new Set(bag.users.map(u => u.id));
      const uniqueNewUsers = newUsers.filter(u => !existingIds.has(u.id));
      const merged = reset ? newUsers : [...bag.users, ...uniqueNewUsers];
      const newBag = { users: merged, last: res.last || null, loading: false, hasMore: !!res.last && newUsers.length > 0 };
      set({ likers: { ...get().likers, [outfitId]: newBag } });
    } else {
      set({ likers: { ...get().likers, [outfitId]: { ...bag, loading: false, hasMore: false } } });
    }
    return res;
  },

  // Fetch comments for a post
  fetchComments: async ({ outfitId, reset = false }) => {
    if (!outfitId) return { success: false, error: 'outfitId required' };

    const bag = get().comments[outfitId] || { items: [], loading: false };
    if (bag.loading && !reset) return { success: false, error: 'Busy' };

    set({ comments: { ...get().comments, [outfitId]: { ...bag, loading: true } } });

    const res = await fetchCommentsForOutfit(outfitId);

    if (res.success) {
      set({ comments: { ...get().comments, [outfitId]: { items: res.items, loading: false } } });
    } else {
      set({ comments: { ...get().comments, [outfitId]: { ...bag, loading: false } } });
    }
    return res;
  },

  // Post a new comment
  postComment: async ({ outfitId, text, userMeta, parentId = null }) => {
    const { user } = useAuthStore.getState();
    if (!user?.uid) return { success: false, error: 'Not authenticated' };

    // Optimistic update
    const tempId = `temp_${Date.now()}`;
    const optimisticComment = { id: tempId, outfitId, userId: user.uid, text, user: userMeta, parentId, createdAt: new Date() };
    const bag = get().comments[outfitId] || { items: [], loading: false };
    set({ comments: { ...get().comments, [outfitId]: { ...bag, items: [...bag.items, optimisticComment] } } });

    const res = await addComment({ outfitId, userId: user.uid, text, userMeta, parentId });

    // Replace temp comment with real one from server
    if (res.success) {
      const finalBag = get().comments[outfitId];
      const finalItems = finalBag.items.map(c => (c.id === tempId ? { ...res.data, id: res.id } : c));
      set({ comments: { ...get().comments, [outfitId]: { ...finalBag, items: finalItems } } });
    } else {
      // Revert on failure
      const finalBag = get().comments[outfitId];
      const finalItems = finalBag.items.filter(c => c.id !== tempId);
      set({ comments: { ...get().comments, [outfitId]: { ...finalBag, items: finalItems } } });
    }
    return res;
  },

  // Delete a comment
  removeComment: async ({ commentId, outfitId, parentId = null }) => {
    // Optimistic update
    const bag = get().comments[outfitId] || { items: [], loading: false };
    const originalItems = bag.items;
    const newItems = originalItems.filter(c => c.id !== commentId);
    set({ comments: { ...get().comments, [outfitId]: { ...bag, items: newItems } } });

    const res = await deleteComment({ commentId, outfitId, parentId });

    if (!res.success) {
      // Revert on failure
      set({ comments: { ...get().comments, [outfitId]: { ...bag, items: originalItems } } });
    }
    return res;
  },

  // My uploads paginated
  fetchMyOutfits: async ({ reset = false, limit = 24 } = {}) => {
    const { user } = useAuthStore.getState();
    const uid = user?.uid || user?.user?.uid || null;
    if (!uid) return { success: false, error: 'Not authenticated' };

    const alreadyLoading = get().myOutfitsLoading || get().myOutfitsRefreshing;
    if (alreadyLoading && !reset) return { success: false, error: 'Busy' };

    if (reset) set({ myOutfitsRefreshing: true, myOutfitsHasMore: true, myOutfitsLast: null });
    else set({ myOutfitsLoading: true });

    // Reuse fetchUserOutfits to support limit and cursor when available; we’ll pass a lastDoc if your service supports it.
    try {
      // Extend your firebase service fetchUserOutfits to accept startAfterDoc if you want true cursoring.
      // For now, fetch full and slice client-side using lastDoc reference stubs.
      const res = await fetchUserOutfits(uid, { limitCount: limit, startAfterDoc: reset ? null : get().myOutfitsLast });
      if (!res.success) {
        set({ myOutfitsLoading: false, myOutfitsRefreshing: false });
        return res;
      }

      const incoming = Array.isArray(res.items) ? res.items : [];
      const nextItems = reset ? incoming : [...get().myOutfits, ...incoming];
      const hasMore = !!res.last && incoming.length > 0;
      set({
        myOutfits: nextItems,
        myOutfitsLast: res.last || null,
        myOutfitsHasMore: hasMore,
        myOutfitsLoading: false,
        myOutfitsRefreshing: false,
      });

      return { success: true, items: nextItems, last: res.last || null };
    } catch (e) {
      set({ myOutfitsLoading: false, myOutfitsRefreshing: false });
      return { success: false, error: e };
    }
  },

  submitRating: async ({ outfitId, stars, comment = '' }) => {
    const { user } = useAuthStore.getState();
    if (!user) return { success: false, error: 'Not authenticated' };
    return await fbSubmitRating({ outfitId, userId: user.uid, stars, comment });
  },

  fetchOutfitDetails: async (outfitId) => {
    return await fbFetchOutfitDetails(outfitId);
  },

}));

export default useOutfitStore;
