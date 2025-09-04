// File: src/store/outfitStore.js
// Description: Zustand store for managing feed, uploads, ratings, and my-outfits pagination.

import { create } from 'zustand';
import {
  createOutfitDocument,
  addComment as fbAddComment,
  fetchFeed as fbFetchFeed,
  fetchOutfitDetails as fbFetchOutfitDetails,
  submitRating as fbSubmitRating,
  fetchUserOutfits,
  uploadImage,
} from '../services/firebase';
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

  addComment: async ({ outfitId, comment }) => {
    const { user } = useAuthStore.getState();
    if (!user) return { success: false, error: 'Not authenticated' };
    return await fbAddComment({ outfitId, userId: user.uid, comment });
  },
}));

export default useOutfitStore;
