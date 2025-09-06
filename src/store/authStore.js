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

        if (firebaseUser) {
          const uid = firebaseUser.uid;
          set({ user: firebaseUser, loading: false });

          // Trigger all user-specific data loading from one central place.
          await Promise.all([
            loadMyProfile(uid),
            hydrateMyLikes(uid),
          ]);

          // Set up the real-time listener for the profile.
          subscribeMyProfile(uid);
        } else {
          // Signed out
          set({ user: null, loading: false });
          clearMyProfile();
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
  signup: async (email, password, name) => {
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
