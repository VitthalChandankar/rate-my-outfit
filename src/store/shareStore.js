// src/store/shareStore.js
import { create } from 'zustand';
import {
  listFollowers,
  listFollowing,
  getUserProfile,
  fbSharePost,
  fbReactToShare,
  fbDeleteShare, // Import the new delete function
  fbFetchAllUserShares,
  subscribeToUnreadShareCount,
  markAllSharesAsRead as fbMarkAllAsRead,
} from '../services/firebase';
import useAuthStore from './authStore';

const useShareStore = create((set, get) => ({
  mutuals: [],
  loadingMutuals: false,

  unreadShareCount: 0,
  _unsubShares: null,

  conversations: [],
  sharesByConversation: {},
  conversationsLoading: false,

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

  // Fetch all conversations for the current user
  fetchConversations: async () => {
    const { user } = useAuthStore.getState();
    if (!user?.uid || get().conversationsLoading) return;

    set({ conversationsLoading: true });

    const res = await fbFetchAllUserShares(user.uid);

    if (res.success) {
      const shares = res.items || [];
      const sharesByOtherUser = {};

      // Group shares by the other person in the conversation
      shares.forEach(share => {
        const otherUserId = share.senderId === user.uid ? share.recipientId : share.senderId;
        if (!sharesByOtherUser[otherUserId]) {
          sharesByOtherUser[otherUserId] = [];
        }
        sharesByOtherUser[otherUserId].push(share);
      });

      // Create conversation summaries
      const userIdsToFetch = Object.keys(sharesByOtherUser);
      const profiles = await Promise.all(userIdsToFetch.map(uid => getUserProfile(uid)));
      const userProfilesMap = new Map(profiles.filter(p => p.success).map(p => [p.user.uid, p.user]));

      const conversationList = Object.entries(sharesByOtherUser).map(([otherUserId, userShares]) => {
        const lastShare = userShares[0]; // Already sorted by date from fetch
        const userProfile = userProfilesMap.get(otherUserId);

        return {
          otherUser: userProfile,
          lastShare: lastShare,
          unreadCount: userShares.filter(s => s.recipientId === user.uid && !s.read).length,
        };
      }).filter(c => c.otherUser); // Filter out conversations where user profile failed to load

      // Sort conversations by the timestamp of the last message
      conversationList.sort((a, b) => (b.lastShare.createdAt?.toMillis() || 0) - (a.lastShare.createdAt?.toMillis() || 0));

      set({
        conversations: conversationList,
        sharesByConversation: sharesByOtherUser,
        conversationsLoading: false,
      });
    } else {
      set({ conversationsLoading: false });
    }
  },

  // React to a received share
  reactToShare: async ({ shareId, reaction }) => {
    const { sharesByConversation } = get();
    let otherUserId = null;
    let shareToUpdate = null;

    for (const userId in sharesByConversation) {
      shareToUpdate = sharesByConversation[userId].find(s => s.id === shareId);
      if (shareToUpdate) {
        otherUserId = userId;
        break;
      }
    }

    if (!shareToUpdate || !otherUserId) return;

    const originalReaction = shareToUpdate.reaction;
    const newReaction = originalReaction === reaction ? null : reaction;

    // Optimistically update the UI
    set(state => ({
      sharesByConversation: {
        ...state.sharesByConversation,
        [otherUserId]: state.sharesByConversation[otherUserId].map(share =>
          share.id === shareId ? { ...share, reaction: newReaction } : share
        ),
      },
    }));

    const res = await fbReactToShare({ shareId, reaction: newReaction });

    if (!res.success) {
      console.error('Failed to save reaction');
      set(state => ({
        sharesByConversation: {
          ...state.sharesByConversation,
          [otherUserId]: state.sharesByConversation[otherUserId].map(share =>
            share.id === shareId ? { ...share, reaction: originalReaction } : share
          ),
        },
      }));
    }
  },

  // Mark a share as read
  markShareAsRead: async (shareId) => {
    set(state => ({
      sharesByConversation: Object.keys(state.sharesByConversation).reduce((acc, userId) => {
        acc[userId] = state.sharesByConversation[userId].map(share =>
          share.id === shareId ? { ...share, read: true } : share
        );
        return acc;
      }, {}),
    }));
    // This is a fire-and-forget call to the backend
    await fbReactToShare({ shareId, read: true });
  },

  // Delete a received share
  deleteShare: async (shareId) => {
    const { sharesByConversation } = get();
    let otherUserId = null;
    let originalSharesForUser = null;

    for (const userId in sharesByConversation) {
      if (sharesByConversation[userId].some(s => s.id === shareId)) {
        otherUserId = userId;
        originalSharesForUser = [...sharesByConversation[userId]];
        break;
      }
    }

    if (!otherUserId) return;

    // Optimistically remove from the UI
    const newSharesForUser = sharesByConversation[otherUserId].filter(share => share.id !== shareId);
    set(state => ({
      sharesByConversation: {
        ...state.sharesByConversation,
        [otherUserId]: newSharesForUser,
      },
    }));

    const res = await fbDeleteShare(shareId);

    if (!res.success) {
      console.error('Failed to delete share from backend.');
      set(state => ({
        sharesByConversation: {
          ...state.sharesByConversation,
          [otherUserId]: originalSharesForUser,
        },
      }));
    }
  },

  // Mark all shares as read
  markAllSharesAsRead: async (userId) => {
    if (!userId) return;

    const hasUnread = get().unreadShareCount > 0;
    if (hasUnread) {
      // Optimistically update UI
      set(state => ({
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
      conversations: [],
      sharesByConversation: {},
      unreadShareCount: 0,
      _unsubShares: null,
    });
  },
}));

export default useShareStore;