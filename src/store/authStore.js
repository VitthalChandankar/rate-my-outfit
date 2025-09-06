// src/store/authStore.js
import { create } from 'zustand';
import {
  logout as firebaseLogout,
  loginWithEmail,
  onAuthChange,
  signupWithEmail,
} from '../services/firebase';

// IMPORTANT: import the user store to hydrate normalized profile
import useUserStore from './UserStore';

const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,

  // Listen to Firebase Auth state changes and hydrate normalized Firestore profile
  initializeAuth: () => {
    if (get()._subscribed) return;
    set({ _subscribed: true });

    return onAuthChange(async (firebaseUser) => {
      try {
        const { loadMyProfile, subscribeMyProfile, hydrateMyLikes, clearMyProfile } = useUserStore.getState();
        const previousUser = get().user;

        if (firebaseUser) {
          // User is signed in or their state has changed (e.g., email verification).
          // We always update the user object to ensure the latest state is reflected.
          set({ user: firebaseUser, loading: false });

          // If this is a new login (no previous user), load all their data.
          if (!previousUser) {
            const uid = firebaseUser.uid;
            await Promise.all([loadMyProfile(uid), hydrateMyLikes(uid)]);
            subscribeMyProfile(uid);
          }
        } else {
          // Signed out
          if (previousUser) { // Only clear if there was a user before
            clearMyProfile();
          }
          set({ user: null, loading: false });
        }
      } catch (e) {
        console.error('Auth state change error:', e);
        set({ user: null, loading: false });
      }
    });
  },

  // Email/password login
  login: async (email, password) => {
    return await loginWithEmail(email, password);
  },

  // Email/password signup
  signup: async (name, email, password) => {
    return await signupWithEmail(name, email, password);
  },

  // Logout
  logout: async () => {
    try {
      await firebaseLogout();
      // onAuthChange will handle clearing state
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  },

  // Auth check
  isAuthenticated: () => {
    return !!get().user;
  },
}));

export default useAuthStore;
