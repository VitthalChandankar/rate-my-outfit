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
          const justVerified = !previousUser?.emailVerified && firebaseUser.emailVerified;

          // Always update the user object in the store to reflect the latest state from Firebase.
          set({ user: firebaseUser, loading: false });

          // If this is the first time we see this user (new login/signup), load their profile.
          if (!previousUser) {
            const uid = firebaseUser.uid;
            await Promise.all([loadMyProfile(uid), hydrateMyLikes(uid)]);
            subscribeMyProfile(uid);
          }
        } else {
          // Signed out
          clearMyProfile();
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
    return await firebaseLogout(); // This will trigger the onAuthChange listener
  },

  // Auth check
  isAuthenticated: () => {
    return !!get().user;
  },
}));

export default useAuthStore;
