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
  setDoc,
} from 'firebase/firestore';
import { firestore } from '../services/firebase';
import {
  getUserProfile,
  updateUserProfile,
  setUserAvatar,
  followUser,          // kept for fallback
  unfollowUser,        // kept for fallback
  isFollowing as svcIsFollowing,
  listFollowers,
  fetchMyLikedOutfitIds,
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

  // FOLLOW: client-side counters with your exact transaction block
  follow: async (followerId, followingId) => {
    try {
      if (!followerId || !followingId || followerId === followingId) {
        return { success: false, error: 'invalid ids' };
      }
      const db = getFirestore();
      const relRef = doc(db, 'follows', relIdOf(followerId, followingId));
      const followerCtrRef = doc(db, 'counters', followerId);
      const followingCtrRef = doc(db, 'counters', followingId);

      await runTransaction(db, async (tx) => {
        const [relSnap, fSnap, gSnap] = await Promise.all([
          tx.get(relRef),
          tx.get(followerCtrRef),
          tx.get(followingCtrRef),
        ]);
        if (relSnap.exists()) return;

        if (!fSnap.exists()) tx.set(followerCtrRef, { followersCount: 0, followingCount: 0, postsCount: 0 }, { merge: true });
        if (!gSnap.exists()) tx.set(followingCtrRef, { followersCount: 0, followingCount: 0, postsCount: 0 }, { merge: true });

        const mp = get().myProfile;
        tx.set(relRef, {
          id: relIdOf(followerId, followingId),
          followerId,
          followingId,
          createdAt: serverTimestamp(),
          followerName: mp?.name || mp?.displayName || '',
          followerPicture: mp?.profilePicture || null,
        });

        const fFollowing = (fSnap.exists() ? (fSnap.data().followingCount || 0) : 0) + 1;
        const gFollowers = (gSnap.exists() ? (gSnap.data().followersCount || 0) : 0) + 1;
        tx.set(followerCtrRef, { followingCount: fFollowing }, { merge: true });
        tx.set(followingCtrRef, { followersCount: gFollowers }, { merge: true });
      });

      set({ relCache: { ...get().relCache, [relIdOf(followerId, followingId)]: true } });
      await Promise.allSettled([
        get().loadUserProfile(followerId),
        get().loadUserProfile(followingId),
      ]);
      return { success: true };
    } catch (e) {
      console.error('follow (client counters) error:', e);
      // fallback to service helper if needed
      try {
        const res = await followUser({ followerId, followingId });
        if (res.success) set({ relCache: { ...get().relCache, [relIdOf(followerId, followingId)]: true } });
        return res;
      } catch (e2) {
        return { success: false, error: e2?.message || 'follow failed' };
      }
    }
  },

  // UNFOLLOW: symmetric decrement transaction
  unfollow: async (followerId, followingId) => {
    try {
      const db = getFirestore();
      const relRef = doc(db, 'follows', relIdOf(followerId, followingId));
      const followerCtrRef = doc(db, 'counters', followerId);
      const followingCtrRef = doc(db, 'counters', followingId);

      await runTransaction(db, async (tx) => {
        const [relSnap, fSnap, gSnap] = await Promise.all([
          tx.get(relRef),
          tx.get(followerCtrRef),
          tx.get(followingCtrRef),
        ]);
        if (!relSnap.exists()) return;

        tx.delete(relRef);

        const fFollowing = Math.max(0, (fSnap.exists() ? fSnap.data().followingCount || 0 : 0) - 1);
        const gFollowers = Math.max(0, (gSnap.exists() ? gSnap.data().followersCount || 0 : 0) - 1);

        tx.set(followerCtrRef, { followingCount: fFollowing }, { merge: true });
        tx.set(followingCtrRef, { followersCount: gFollowers }, { merge: true });
      });

      set({ relCache: { ...get().relCache, [relIdOf(followerId, followingId)]: false } });
      await Promise.allSettled([
        get().loadUserProfile(followerId),
        get().loadUserProfile(followingId),
      ]);
      return { success: true };
    } catch (e) {
      console.error('unfollow (client counters) error:', e);
      try {
        const res = await unfollowUser({ followerId, followingId });
        if (res.success) set({ relCache: { ...get().relCache, [relIdOf(followerId, followingId)]: false } });
        return res;
      } catch (e2) {
        return { success: false, error: e2?.message || 'unfollow failed' };
      }
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
