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
    // Avoid multiple subscriptions in case initializeAuth is called twice
    if (get()._subscribed) return;
    set({ _subscribed: true });

    return onAuthChange(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Set minimal auth user for immediate availability
          set({ user: firebaseUser, loading: false });

          // Hydrate normalized profile into userStore (users/{uid} doc)
          const uid = firebaseUser.uid;
          try {
            const { loadMyProfile } = useUserStore.getState();
            await loadMyProfile(uid);
          } catch (e) {
            // Non-fatal: UI can still use raw auth fallback until profile loads later
            console.warn('loadMyProfile failed during initializeAuth:', e?.message || e);
          }
        } else {
          // Signed out
          set({ user: null, loading: false });
          // Optionally clear userStore.myProfile if desired:
          // const { myProfile } = useUserStore.getState();
          // if (myProfile) useUserStore.setState({ myProfile: null, profilesById: {} });
        }
      } catch (e) {
        console.error('Auth state change error:', e);
        set({ loading: false });
      }
    });
  },

  // Email/password login
  login: async (email, password) => {
    try {
      const userCred = await loginWithEmail(email, password);
      set({ user: userCred.user });
      // Ensure hydration after login in case initializeAuth hasn’t fired yet
      if (userCred?.user?.uid) {
        const { loadMyProfile } = useUserStore.getState();
        loadMyProfile(userCred.user.uid).catch(() => {});
      }
      return userCred;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  // Email/password signup
  signup: async (email, password, name) => {
    try {
      // note: original signature was signupWithEmail(name, email, password)
      const userCred = await signupWithEmail(name, email, password);
      set({ user: userCred.user });
      if (userCred?.user?.uid) {
        const { loadMyProfile } = useUserStore.getState();
        loadMyProfile(userCred.user.uid).catch(() => {});
      }
      return userCred;
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    }
  },

  // Logout
  logout: async () => {
    try {
      await firebaseLogout();
      set({ user: null });
      // Optional: clear userStore state on logout
      // useUserStore.setState({ myProfile: null, profilesById: {}, followers: [], following: [] });
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
