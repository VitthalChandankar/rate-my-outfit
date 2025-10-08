// src/store/shareStore.js
import { create } from 'zustand';
import {
  listFollowers,
  listFollowing,
  getUserProfile,
  fbSharePost,
  fbFetchShares,
  fbReactToShare,
  fbDeleteShare, // Import the new delete function
  subscribeToUnreadShareCount,
  markAllSharesAsRead as fbMarkAllAsRead,
} from '../services/firebase';
import useAuthStore from './authStore';

const useShareStore = create((set, get) => ({
  mutuals: [],
  loadingMutuals: false,

  unreadShareCount: 0,
  _unsubShares: null,

  shares: [],
  loadingShares: false,
  hasMoreShares: true,
  lastShareDoc: null,


  // Fetch users that the current user mutually follows
  fetchMutuals: async () => {
    const { user } = useAuthStore.getState();
    if (!user?.uid) return;

    set({ loadingMutuals: true });

    try {
      // Fetch all followers and following lists without pagination
      const [followersRes, followingRes] = await Promise.all([
        listFollowers({ userId: user.uid, fetchAll: true }),
        listFollowing({ userId: user.uid, fetchAll: true }),
      ]);

      if (!followersRes.success || !followingRes.success) {
        throw new Error('Failed to fetch follow lists.');
      }

      const followingIds = new Set(followingRes.items.map(item => item.followingId));
      const mutualIds = followersRes.items
        .map(item => item.followerId)
        .filter(id => followingIds.has(id));

      if (mutualIds.length === 0) {
        set({ mutuals: [], loadingMutuals: false });
        return;
      }

      // Fetch profiles for mutuals
      const profiles = await Promise.all(mutualIds.map(uid => getUserProfile(uid)));
      const validProfiles = profiles.filter(p => p.success).map(p => p.user);

      set({ mutuals: validProfiles, loadingMutuals: false });
    } catch (error) {
      console.error('Error fetching mutuals:', error);
      set({ loadingMutuals: false });
    }
  },

  // Send a post to another user
  sendShare: async ({ recipientId, outfitData }) => {
    const { user } = useAuthStore.getState();
    if (!user?.uid || !recipientId || !outfitData) return { success: false, error: 'Missing data' };

    return await fbSharePost({
      senderId: user.uid,
      recipientId,
      outfitData,
    });
  },

  // Fetch shares received by the current user
  fetchShares: async ({ reset = false } = {}) => {
    const { user } = useAuthStore.getState();
    if (!user?.uid || (get().loadingShares && !reset)) return;

    set({ loadingShares: true });

    const startAfterDoc = reset ? null : get().lastShareDoc;
    const res = await fbFetchShares({ recipientId: user.uid, startAfterDoc });

    if (res.success) {
      const newShares = res.items || [];
      set(state => ({
        shares: reset ? newShares : [...state.shares, ...newShares],
        lastShareDoc: res.last,
        hasMoreShares: !!res.last,
      }));
    }
    set({ loadingShares: false });
  },

  // React to a received share
  reactToShare: async ({ shareId, reaction }) => {
    const currentShare = get().shares.find(s => s.id === shareId);
    if (!currentShare) return;

    const originalReaction = currentShare.reaction;
    const newReaction = originalReaction === reaction ? null : reaction;

    // Optimistically update the UI
    set(state => ({
      shares: state.shares.map(share =>
        share.id === shareId ? { ...share, reaction: newReaction } : share
      ),
    }));

    const res = await fbReactToShare({ shareId, reaction: newReaction });

    if (!res.success) {
      console.error('Failed to save reaction');
      // Revert on failure
      set(state => ({
        shares: state.shares.map(share => share.id === shareId ? { ...share, reaction: originalReaction } : share)
      }));
    }
  },

  // Mark a share as read
  markShareAsRead: async (shareId) => {
    set(state => ({
      shares: state.shares.map(share =>
        share.id === shareId ? { ...share, read: true } : share
      ),
    }));
    // This is a fire-and-forget call to the backend
    await fbReactToShare({ shareId, read: true });
  },

  // Delete a received share
  deleteShare: async (shareId) => {
    const originalShares = get().shares;

    // Optimistically remove from the UI
    set(state => ({
      shares: state.shares.filter(share => share.id !== shareId)
    }));

    const res = await fbDeleteShare(shareId);

    if (!res.success) {
      console.error('Failed to delete share from backend.');
      // Revert on failure
      set({ shares: originalShares });
      // Optionally, show an alert to the user
      // Alert.alert('Error', 'Could not delete the message. Please try again.');
    }
  },

  // Mark all shares as read
  markAllSharesAsRead: async (userId) => {
    if (!userId) return;

    const hasUnread = get().unreadShareCount > 0;
    if (hasUnread) {
      // Optimistically update UI
      set(state => ({
        shares: state.shares.map(s => ({ ...s, read: true })),
        unreadShareCount: 0,
      }));
      // Call backend
      await fbMarkAllAsRead(userId);
    }
  },

  // Subscribe to real-time unread count for the badge
  subscribeToUnreadCount: (userId) => {
    if (!userId || get()._unsubShares) return; // Already subscribed
    const unsub = subscribeToUnreadShareCount(userId, (count) => {
      set({ unreadShareCount: count });
    });
    set({ _unsubShares: unsub });
  },

  // Clear store on logout
  clearShareStore: () => {
    const unsub = get()._unsubShares;
    if (typeof unsub === 'function') {
      try { unsub(); } catch {}
    }
    set({
      shares: [],
      unreadShareCount: 0,
      _unsubShares: null,
    });
  },
}));

export default useShareStore;