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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firestore } from '../services/firebase';
import {
  getUserProfile,
  updateUserProfile,
  setUserAvatar,
  isFollowing as svcIsFollowing,
  listFollowers,
  fetchMyLikedOutfitIds,
  fetchMySavedOutfitIds,
  updateUserPushToken,
  blockUser as fbBlockUser,
  unblockUser as fbUnblockUser,
  fetchMyBlockedIds,
  fetchMyBlockerIds,
  listBlockedUsers,
  fetchUserAchievements,
  uploadImage,
  listFollowing,
} from '../services/firebase';

// Helper: follow doc id
const relIdOf = (followerId, followingId) => `${followerId}_${followingId}`;

const SEEN_ACHIEVEMENTS_KEY = '@seen_achievements';

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
  mySavedIds: new Set(),
  myBlockedIds: new Set(), // NEW: for users the current user has blocked
  myBlockerIds: new Set(), // NEW: for users who have blocked the current user
  myReportedIds: new Set(), // For posts the current user has reported

  // For the blocked users list screen
  blockedUsers: [],
  blockedUsersLoading: false,

  // Achievements
  myAchievements: [],
  myAchievementsLoading: false,
  seenAchievements: new Set(), // To track which have been animated

  // Subscribe to the current user's profile doc for real-time updates
  subscribeMyProfile: (uid) => {
    // Unsubscribe any previous listener
    const prev = get()._unsubProfile;
    if (typeof prev === 'function') {
      try { prev(); } catch {}
    }
    if (!uid) return () => {};

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
  setAvatar: async (uid, imageIdentifier) => {
    if (!uid) return { success: false, error: 'No uid' };
    set({ updating: true });
    const res = await setUserAvatar({ uid, imageIdentifier });
    if (res.success) {
      const cur = get().myProfile;
      const profiles = { ...get().profilesById, [uid]: res.user };
      set({ myProfile: uid === cur?.uid ? res.user : cur, profilesById: profiles });
    }
    set({ updating: false });
    return res;
  },

  setCoverPhoto: async (uid, imageUri) => {
    if (!uid || !imageUri) return { success: false, error: 'Missing uid or imageUri' };
    set({ updating: true });

    // Optimistic update for instant UI feedback
    const originalProfile = get().myProfile;
    if (originalProfile) {
      set({ myProfile: { ...originalProfile, coverPhoto: imageUri } });
    }

    const uploadRes = await uploadImage(imageUri);
    if (!uploadRes.success) {
      set({ updating: false, myProfile: originalProfile }); // Revert on upload failure
      return { success: false, error: 'Image upload failed.' };
    }

    const res = await updateUserProfile({ uid, data: { coverPhoto: uploadRes.identifier } });
    
    // The real-time listener will also update this, but setting it here ensures
    // the UI has the permanent URL as soon as the backend call is complete.
    if (!res.success) {
      set({ myProfile: originalProfile }); // Revert on DB update failure
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

  hydrateMySaves: async (uid) => {
    if (!uid) return;
    const res = await fetchMySavedOutfitIds(uid);
    if (res.success) {
      set({ mySavedIds: new Set(res.ids) });
    }
  },

  hydrateMyBlocks: async (uid) => {
    if (!uid) return;
    const res = await fetchMyBlockedIds(uid);
    if (res.success) {
      set({ myBlockedIds: new Set(res.ids) });
    }
  },

  hydrateMyBlockers: async (uid) => {
    if (!uid) return;
    const res = await fetchMyBlockerIds(uid);
    if (res.success) {
      set({ myBlockerIds: new Set(res.ids) });
    }
  },

  // Client-side toggle for immediate UI feedback
  toggleLikedId: (outfitId) => {
    const current = get().myLikedIds;
    if (current.has(outfitId)) current.delete(outfitId);
    else current.add(outfitId);
    set({ myLikedIds: new Set(current) });
  },

  toggleSavedId: (outfitId) => {
    const current = get().mySavedIds;
    if (current.has(outfitId)) current.delete(outfitId);
    else current.add(outfitId);
    set({ mySavedIds: new Set(current) });
  },

  addReportedId: (outfitId) => {
    const current = get().myReportedIds;
    set({ myReportedIds: new Set(current).add(outfitId) });
  },

  fetchMyAchievements: async (uid) => {
    if (!uid) return;
    set({ myAchievementsLoading: true });
    const res = await fetchUserAchievements(uid);
    if (res.success) {
      const seen = get().seenAchievements;
      const itemsWithNewFlag = res.items.map(item => ({
        ...item,
        isNew: !!item.unlockedAt && !seen.has(item.id),
      }));
      set({ myAchievements: itemsWithNewFlag });
    }
    set({ myAchievementsLoading: false });
  },

  hydrateSeenAchievements: async () => {
    try {
      const seenJson = await AsyncStorage.getItem(SEEN_ACHIEVEMENTS_KEY);
      if (seenJson) {
        const seenArray = JSON.parse(seenJson);
        set({ seenAchievements: new Set(seenArray) });
      }
    } catch (e) {
      console.error("Failed to load seen achievements from storage.", e);
    }
  },

  markAchievementAsSeen: async (achievementId) => {
    const newSeenSet = new Set(get().seenAchievements).add(achievementId);
    set((state) => ({
      seenAchievements: newSeenSet,
      // Also update the in-memory list to remove the 'isNew' flag immediately
      myAchievements: state.myAchievements.map((a) =>
        a.id === achievementId ? { ...a, isNew: false } : a
      ),
    }));

    // Persist to AsyncStorage
    try {
      await AsyncStorage.setItem(SEEN_ACHIEVEMENTS_KEY, JSON.stringify(Array.from(newSeenSet)));
    } catch (e) {
      console.error("Failed to save seen achievements to storage.", e);
    }
  },
  
  resetSeenAchievements: async () => {
    try {
      await AsyncStorage.removeItem(SEEN_ACHIEVEMENTS_KEY);

      // Also, immediately update the in-memory achievements to mark them as new again.
      // This ensures the UI updates instantly without needing a re-fetch.
      const currentAchievements = get().myAchievements;
      const resetAchievements = currentAchievements.map(a => ({
        ...a,
        isNew: !!a.unlockedAt, // If it's unlocked, it's now "new" again for testing.
      }));

      set({
        seenAchievements: new Set(),
        myAchievements: resetAchievements,
      });

      console.log('Seen achievements have been reset for testing.');
      return { success: true };
    } catch (e) {
      console.error("Failed to reset seen achievements.", e);
      return { success: false, error: e };
    }
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

  // Block/Unblock
  blockUser: async (blockedId) => {
    const blockerId = get().myProfile?.uid;
    if (!blockerId || !blockedId) return { success: false, error: 'Invalid block operation' };

    // Optimistic update
    const currentBlocked = get().myBlockedIds;
    set({ myBlockedIds: new Set(currentBlocked).add(blockedId) });

    // NEW: Optimistically add to the blockedUsers list for instant UI update on that screen.
    const profileToBlock = get().profilesById[blockedId];
    if (profileToBlock) {
      set(state => ({
        blockedUsers: [...state.blockedUsers, profileToBlock],
      }));
    }

    const res = await fbBlockUser({ blockerId, blockedId });
    if (!res.success) {
      // Revert on failure
      const revertedBlocked = get().myBlockedIds;
      revertedBlocked.delete(blockedId);
      set({ myBlockedIds: new Set(revertedBlocked) });
      // NEW: Revert the blockedUsers list as well.
      if (profileToBlock) {
        set(state => ({
          blockedUsers: state.blockedUsers.filter(u => u.id !== blockedId),
        }));
      }
    }
    return res;
  },

  unblockUser: async (blockedId) => {
    const blockerId = get().myProfile?.uid;
    if (!blockerId || !blockedId) return { success: false, error: 'Invalid unblock operation' };
   
    // Optimistic update
    const currentBlocked = get().myBlockedIds;
    currentBlocked.delete(blockedId);
    set({ myBlockedIds: new Set(currentBlocked) });

    const res = await fbUnblockUser({ blockerId, blockedId });
    if (!res.success) {
      // Revert on failure
      set({ myBlockedIds: new Set(get().myBlockedIds).add(blockedId) });
    }
    // Also update the list of blocked user profiles
    set(state => ({ blockedUsers: state.blockedUsers.filter(u => u.id !== blockedId) }));
    return res;
  },

  fetchBlockedUsers: async () => {
    const uid = get().myProfile?.uid;
    if (!uid) return;
    set({ blockedUsersLoading: true });
    const res = await listBlockedUsers(uid);
    if (res.success) set({ blockedUsers: res.users });
    set({ blockedUsersLoading: false });
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
  clearMyProfile: async () => {
    const prev = get()._unsubProfile;
    if (typeof prev === 'function') {
      try { prev(); } catch {}
    }
    try {
      await AsyncStorage.removeItem(SEEN_ACHIEVEMENTS_KEY);
    } catch (e) {
      console.error("Failed to clear seen achievements from storage.", e);
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
      mySavedIds: new Set(),
      myBlockerIds: new Set(),
      myBlockedIds: new Set(),
      myReportedIds: new Set(),
      myAchievements: [],
      myAchievementsLoading: false,
      seenAchievements: new Set(),
      relCache: {},
      _unsubProfile: null,
    });
  },
}));

export default useUserStore;
