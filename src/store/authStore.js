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
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '../services/pushNotifications';

const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,
  pushToken: null, // Add a place to store the current device's token

  // Listen to Firebase Auth state changes and hydrate normalized Firestore profile
  initializeAuth: () => {
    if (get()._subscribed) return;
    set({ _subscribed: true });

    return onAuthChange(async (firebaseUser) => {
      try {
        const { loadMyProfile, subscribeMyProfile, hydrateMyLikes, clearMyProfile, updateMyPushToken } = useUserStore.getState();
        const previousUser = get().user;

        if (firebaseUser) {
          // Always update the user object in the store to reflect the latest state from Firebase.
          set({ user: firebaseUser, loading: false });

          // If this is a new login/signup, load their profile and register for push notifications.
          if (firebaseUser.uid !== previousUser?.uid) {
            const uid = firebaseUser.uid;
            await Promise.all([loadMyProfile(uid), hydrateMyLikes(uid)]);
            subscribeMyProfile(uid);

            // After loading profile, register for push notifications
            registerForPushNotificationsAsync().then(token => {
              if (token) {
                console.log('Saving push token to profile...');
                set({ pushToken: token }); // Store the token in the auth store
                updateMyPushToken(token);
              }
            });
          }
        } else {
          // Signed out
          const { myProfile, updateMyPushToken } = useUserStore.getState();
          const tokenToRemove = get().pushToken; // Use the stored token
          if (myProfile?.uid && tokenToRemove) {
            updateMyPushToken(tokenToRemove, true); // on logout, remove token
          }
          clearMyProfile();
          set({ user: null, loading: false, pushToken: null }); // Clear user and token
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
