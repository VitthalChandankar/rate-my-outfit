// src/store/UserStore.js
// Zustand user store: profiles, avatar, follow graph, counters (client-side Option B)
// Preserves existing services/firebase integration and adds counters maintenance.

import { create } from 'zustand';
import {
  doc,
  onSnapshot,
  getFirestore,
  runTransaction,
  serverTimestamp,
  getDoc,
  setDoc, // Keep setDoc
  deleteDoc, // Import deleteDoc
} from 'firebase/firestore';
import { firestore } from '../services/firebase';
import {
  getUserProfile,
  updateUserProfile,
  setUserAvatar,
  isFollowing as svcIsFollowing,
  listFollowers,
  fetchMyLikedOutfitIds,
  updateUserPushToken,
  listFollowing,
} from '../services/firebase';

// Helper: follow doc id
const relIdOf = (followerId, followingId) => `${followerId}_${followingId}`;

const useUserStore = create((set, get) => ({
  myProfile: null,
  profilesById: {},
  loading: false,
  updating: false,

  // live subscription handle
  _unsubProfile: null,

  // social lists
  followers: [],
  following: [],
  followersLast: null,
  followingLast: null,
  followersHasMore: true,
  followingHasMore: true,

  // relationship cache (followerId_followingId -> boolean)
  relCache: {},

  // Set of outfit IDs the user has liked
  myLikedIds: new Set(),

  // Subscribe to the current user's profile doc for real-time updates
  subscribeMyProfile: (uid) => {
    // Unsubscribe any previous listener
    const prev = get()._unsubProfile;
    if (typeof prev === 'function') {
      try { prev(); } catch {}
    }
    if (!uid) return;

    const unsub = onSnapshot(
      doc(firestore, 'users', uid),
      (snap) => {
        if (snap.exists()) {
          const user = { uid, ...snap.data() };
          const { profilesById } = get();
          set({ myProfile: user, profilesById: { ...profilesById, [uid]: user } });
        }
      },
      (err) => {
        console.warn('subscribeMyProfile snapshot error:', err?.message || err);
      }
    );
    set({ _unsubProfile: unsub });
    return unsub;
  },

  // One-time load of the current user's profile
  loadMyProfile: async (uid) => {
    if (!uid) return;
    set({ loading: true });
    const res = await getUserProfile(uid);
    if (res.success) {
      set({ myProfile: res.user, profilesById: { ...get().profilesById, [uid]: res.user } });
    }
    set({ loading: false });
    return res;
  },

  // Load any other user's profile into profilesById (does NOT touch myProfile)
  loadUserProfile: async (uid) => {
    const res = await getUserProfile(uid);
    if (res.success) {
      set({ profilesById: { ...get().profilesById, [uid]: res.user } });
    }
    return res;
  },

  // Update current user's profile
  updateProfile: async (uid, data) => {
    if (!uid) return { success: false, error: 'No uid' };
    set({ updating: true });
    const res = await updateUserProfile({ uid, data });
    if (res.success) {
      const cur = get().myProfile;
      const profiles = { ...get().profilesById, [uid]: res.user };
      set({ myProfile: uid === cur?.uid ? res.user : cur, profilesById: profiles });
    }
    set({ updating: false });
    return res;
  },

  // Update avatar
  setAvatar: async (uid, imageUrl) => {
    if (!uid) return { success: false, error: 'No uid' };
    set({ updating: true });
    const res = await setUserAvatar({ uid, imageUrl });
    if (res.success) {
      const cur = get().myProfile;
      const profiles = { ...get().profilesById, [uid]: res.user };
      set({ myProfile: uid === cur?.uid ? res.user : cur, profilesById: profiles });
    }
    set({ updating: false });
    return res;
  },

  // Hydrate the set of liked outfit IDs for the logged-in user
  hydrateMyLikes: async (uid) => {
    if (!uid) return;
    const res = await fetchMyLikedOutfitIds(uid);
    if (res.success) {
      set({ myLikedIds: new Set(res.ids) });
    }
  },

  // Client-side toggle for immediate UI feedback
  toggleLikedId: (outfitId) => {
    const current = get().myLikedIds;
    if (current.has(outfitId)) current.delete(outfitId);
    else current.add(outfitId);
    set({ myLikedIds: new Set(current) });
  },
  // Relationship check with cache
  isFollowing: async (followerId, followingId) => {
    const key = relIdOf(followerId, followingId);
    const cached = get().relCache[key];
    if (typeof cached === 'boolean') return { success: true, following: cached };
    const res = await svcIsFollowing({ followerId, followingId });
    if (res.success) set({ relCache: { ...get().relCache, [key]: res.following } });
    return res;
  },

  // FOLLOW: with corrected transaction and optimistic local state update
  follow: async (followerId, followingId) => {
    if (!followerId || !followingId || followerId === followingId) {
      return { success: false, error: 'Invalid follow operation' };
    }

    // Optimistic UI update for the button state only.
    // The numeric counters will update via the real-time listener, preventing flickering.
    set((state) => ({ relCache: { ...state.relCache, [relIdOf(followerId, followingId)]: true } }));

    try {
      const db = getFirestore();
      const relRef = doc(db, 'follows', relIdOf(followerId, followingId));
      const mp = get().myProfile;

      // Simple set operation. The Cloud Function will handle counters.
      await setDoc(relRef, {
        followerId,
        followingId,
        createdAt: serverTimestamp(),
        followerName: mp?.name || mp?.displayName || '',
        followerPicture: mp?.profilePicture || null,
      });

      return { success: true };
    } catch (e) {
      console.error('Follow error:', e);
      // Revert optimistic UI update on failure
      set((state) => ({ relCache: { ...state.relCache, [relIdOf(followerId, followingId)]: false } }));
      return { success: false, error: e?.message || 'Follow failed' };
    }
  },

  unfollow: async (followerId, followingId) => {
    if (!followerId || !followingId || followerId === followingId) {
      return { success: false, error: 'Invalid unfollow operation' };
    }

    // Optimistic UI update for the button state only.
    set((state) => ({ relCache: { ...state.relCache, [relIdOf(followerId, followingId)]: false } }));

    try {
      const db = getFirestore();
      const relRef = doc(db, 'follows', relIdOf(followerId, followingId));

      // Simple delete operation. The Cloud Function will handle counters.
      await deleteDoc(relRef);

      return { success: true };
    } catch (e) {
      console.error('Unfollow error:', e);
      // Revert optimistic UI update
      set((state) => ({ relCache: { ...state.relCache, [relIdOf(followerId, followingId)]: true } }));
      return { success: false, error: e?.message || 'Unfollow failed' };
    }
  },

  // Followers list (pagination via services)
  fetchFollowers: async ({ userId, reset = false, limit = 30 }) => {
    const last = reset ? null : get().followersLast;
    const res = await listFollowers({ userId, limitCount: limit, startAfterDoc: last });
    if (!res.success) return res;
    const next = reset ? res.items : [...get().followers, ...res.items];
    set({
      followers: next,
      followersLast: res.last,
      followersHasMore: !!res.last,
    });
    return res;
  },

  // Following list (pagination via services)
  fetchFollowing: async ({ userId, reset = false, limit = 30 }) => {
    const last = reset ? null : get().followingLast;
    const res = await listFollowing({ userId, limitCount: limit, startAfterDoc: last });
    if (!res.success) return res;
    const next = reset ? res.items : [...get().following, ...res.items];
    set({
      following: next,
      followingLast: res.last,
      followingHasMore: !!res.last,
    });
    return res;
  },

  // NEW action to save push token
  updateMyPushToken: async (token, remove = false) => {
    const uid = get().myProfile?.uid;
    if (!uid || !token) return { success: false, error: 'Not logged in or no token' };
    return await updateUserPushToken({ uid, token, remove });
  },

  // Optional: clear state on logout
  clearMyProfile: () => {
    const prev = get()._unsubProfile;
    if (typeof prev === 'function') {
      try { prev(); } catch {}
    }
    set({
      myProfile: null,
      profilesById: {},
      followers: [],
      following: [],
      followersLast: null,
      followingLast: null,
      followersHasMore: true,
      followingHasMore: true,
      myLikedIds: new Set(),
      relCache: {},
      _unsubProfile: null,
    });
  },
}));

export default useUserStore;
