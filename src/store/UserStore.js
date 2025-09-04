// src/store/UserStore.js
import { create } from 'zustand';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '../services/firebase';
import {
  getUserProfile, updateUserProfile, setUserAvatar,
  followUser, unfollowUser, isFollowing,
  listFollowers, listFollowing
} from '../services/firebase';

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

  // relationship cache
  relCache: {},

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

  // Update current user's profile (partial updates supported; username optional)
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

  // Update current user's avatar; service should append cache-busting query param
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

  // Follow/unfollow helpers; keep local relation cache
  follow: async (followerId, followingId) => {
    const res = await followUser({ followerId, followingId });
    if (res.success) set({ relCache: { ...get().relCache, [`${followerId}_${followingId}`]: true } });
    return res;
  },

  unfollow: async (followerId, followingId) => {
    const res = await unfollowUser({ followerId, followingId });
    if (res.success) set({ relCache: { ...get().relCache, [`${followerId}_${followingId}`]: false } });
    return res;
  },

  isFollowing: async (followerId, followingId) => {
    const key = `${followerId}_${followingId}`;
    const cached = get().relCache[key];
    if (typeof cached === 'boolean') return { success: true, following: cached };
    const res = await isFollowing({ followerId, followingId });
    if (res.success) set({ relCache: { ...get().relCache, [key]: res.following } });
    return res;
  },

  // Followers/following pagination
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

  // Optional: clear state on logout (can be called from auth store on logout)
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
      relCache: {},
      _unsubProfile: null,
    });
  },
}));

export default useUserStore;
