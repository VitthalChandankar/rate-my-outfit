// src/store/notificationsStore.js
import { create } from 'zustand';
import {
  fetchNotifications as fbFetchNotifications,
  markNotificationsAsRead as fbMarkAsRead,
  subscribeToUnreadNotifications as fbSubscribeToUnread,
} from '../services/firebase';


const useNotificationsStore = create((set, get) => ({
  notifications: [],
  lastDoc: null,
  loading: false,
  refreshing: false,
  hasMore: true,
  unreadCount: 0, // To show a badge on the icon
  _unsubNotifications: null,

  // Fetch notifications with pagination
  fetchNotifications: async ({ userId, reset = false } = {}) => {
    if (!userId) return { success: false, error: 'Not authenticated' };


    const alreadyLoading = get().loading || get().refreshing;
    if (alreadyLoading && !reset) return { success: false, error: 'Busy' };

    if (reset) set({ refreshing: true }); else set({ loading: true });

    const startAfterDoc = reset ? null : get().lastDoc;
    const res = await fbFetchNotifications({ userId, startAfterDoc });

    if (res.success) {
      const newItems = res.items || [];
      set((state) => ({
        notifications: reset ? newItems : [...state.notifications, ...newItems],
        lastDoc: res.last || state.lastDoc,
        hasMore: !!res.last && newItems.length > 0,
      }));
    }
    set({ loading: false, refreshing: false });
    return res;
  },

  // Mark all as read
  markAllAsRead: async (userId) => {
    if (!userId) return;

    // Optimistically update UI
    const currentNotifications = get().notifications;
    const updatedNotifications = currentNotifications.map(n => ({ ...n, read: true }));
    set({ notifications: updatedNotifications, unreadCount: 0 });

    // Call backend
    await fbMarkAsRead(userId);
  },

  // Subscribe to real-time unread count
  subscribeToUnreadCount: (userId) => {
    if (!userId) return () => {};
    const unsub = fbSubscribeToUnread(userId, (count) => {
      set({ unreadCount: count });
    });
    set({ _unsubNotifications: unsub });
    return unsub;
  },

  // Clear store on logout
  clearNotifications: () => {
    const unsub = get()._unsubNotifications;
    if (typeof unsub === 'function') {
      try { unsub(); } catch {}
    }
    set({
      notifications: [],
      lastDoc: null,
      loading: false,
      refreshing: false,
      hasMore: true,
      unreadCount: 0,
      _unsubNotifications: null,
    });
  },
}));

export default useNotificationsStore;