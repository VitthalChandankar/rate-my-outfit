// File: src/store/outfitStore.js
// Description: Zustand store for managing feed, uploads and ratings.

import { create } from 'zustand';
import {
  createOutfitDocument,
  addComment as fbAddComment,
  fetchFeed as fbFetchFeed,
  fetchOutfitDetails as fbFetchOutfitDetails,
  submitRating as fbSubmitRating,
  fetchUserOutfits,
  uploadImage, // now Cloudinary upload
} from '../services/firebase';
import useAuthStore from './authStore';

const useOutfitStore = create((set, get) => ({
  feed: [],
  lastDoc: null,
  loading: false,
  refreshing: false,
  myOutfits: [],

  fetchFeed: async ({ limit = 12, reset = false } = {}) => {
    try {
      if (reset) set({ refreshing: true });
      else set({ loading: true });

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
    } catch {
      set({ loading: false, refreshing: false });
    }
  },

  uploadOutfit: async ({ userId, imageUri, caption = '', tags = [] }) => {
    if (!userId) return { success: false, error: 'Not authenticated' };
    try {
      const up = await uploadImage(imageUri);
      if (!up.success) return up;
  
      const create = await createOutfitDocument({
        userId,
        imageUrl: up.url,
        caption,
        tags,
      });
  
      if (create.success) {
        set((state) => ({
          feed: [
            { id: create.id, ...create.data, imageUrl: up.url, caption, tags, userId },
            ...state.feed,
          ],
        }));
      }
      return create;
    } catch (error) {
      console.error('uploadOutfit error:', error?.message || error);
      return { success: false, error };
    }
  },
  

  fetchMyOutfits: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return { success: false, error: 'Not authenticated' };

    const res = await fetchUserOutfits(user.uid);
    if (res.success) {
      set({ myOutfits: res.items });
      return { success: true, items: res.items };
    }
    return res;
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
