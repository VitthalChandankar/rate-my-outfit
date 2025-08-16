import { create } from 'zustand';
import {
  logout as firebaseLogout,
  loginWithEmail,
  onAuthChange,
  signupWithEmail,
} from '../services/firebase';

const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,

  // Listen to Firebase Auth state changes
  initializeAuth: () => {
    onAuthChange((firebaseUser) => {
      if (firebaseUser) {
        set({ user: firebaseUser, loading: false });
      } else {
        set({ user: null, loading: false });
      }
    });
  },

  // Email/password login
  login: async (email, password) => {
    try {
      const userCred = await loginWithEmail(email, password);
      set({ user: userCred.user });
      return userCred;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  // Email/password signup
  signup: async (email, password) => {
    try {
      const userCred = await signupWithEmail(email, password);
      set({ user: userCred.user });
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
