// src/store/notificationsStore.js
import { create } from 'zustand';
import {
  fetchNotifications as fbFetchNotifications,
  markNotificationsAsRead as fbMarkAsRead,
} from '../services/firebase';
import useAuthStore from './authStore';

const useNotificationsStore = create((set, get) => ({
  notifications: [],
  lastDoc: null,
  loading: false,
  refreshing: false,
  hasMore: true,
  unreadCount: 0, // To show a badge on the icon

  // Fetch notifications with pagination
  fetchNotifications: async ({ reset = false } = {}) => {
    const { user } = useAuthStore.getState();
    if (!user?.uid) return { success: false, error: 'Not authenticated' };

    const alreadyLoading = get().loading || get().refreshing;
    if (alreadyLoading && !reset) return { success: false, error: 'Busy' };

    if (reset) set({ refreshing: true }); else set({ loading: true });

    const startAfterDoc = reset ? null : get().lastDoc;
    const res = await fbFetchNotifications({ userId: user.uid, startAfterDoc });

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
  markAllAsRead: async () => {
    const { user } = useAuthStore.getState();
    if (!user?.uid) return;

    // Optimistically update UI
    const currentNotifications = get().notifications;
    const updatedNotifications = currentNotifications.map(n => ({ ...n, read: true }));
    set({ notifications: updatedNotifications, unreadCount: 0 });

    // Call backend
    await fbMarkAsRead(user.uid);
  },

  // TODO: Add a subscription to get unread count in real-time
}));

export default useNotificationsStore;