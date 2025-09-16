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
import useNotificationsStore from './notificationsStore';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '../services/pushNotifications';

// Define Admin UIDs here, matching firestore.rules
const ADMIN_UIDS = ['S3YNVH6Tn8RCauiQrj2oy6e37FI3'];

const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,
  pushToken: null, // Add a place to store the current device's token
  isAdmin: false, // New state to track admin status
  onboardingJustCompleted: false, // Flag to manage welcome screen navigation
  setOnboardingCompleted: (status) => set({ onboardingJustCompleted: status }),

  // Listen to Firebase Auth state changes and hydrate normalized Firestore profile
  initializeAuth: () => {
    if (get()._subscribed) return;
    set({ _subscribed: true });

    return onAuthChange(async (firebaseUser) => {
      try {
        const { loadMyProfile, subscribeMyProfile, hydrateMyLikes, hydrateMySaves, hydrateMyBlocks, hydrateMyBlockers, clearMyProfile, updateMyPushToken } = useUserStore.getState();
        const { subscribeToUnreadCount, clearNotifications } = useNotificationsStore.getState();
        const previousUser = get().user;

        if (firebaseUser) {
          // Check if the logged-in user is an admin
          const isAdmin = ADMIN_UIDS.includes(firebaseUser.uid);
          // Always update the user object in the store to reflect the latest state from Firebase.
          set({ user: firebaseUser, loading: false, isAdmin });

          // If this is a new login/signup, load their profile and register for push notifications.
          if (firebaseUser.uid !== previousUser?.uid) {
            const uid = firebaseUser.uid;
            await Promise.all([loadMyProfile(uid), hydrateMyLikes(uid), hydrateMySaves(uid), hydrateMyBlocks(uid), hydrateMyBlockers(uid)]);
            subscribeMyProfile(uid);
            subscribeToUnreadCount(uid); // Start subscription

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
          clearNotifications(); // Stop subscription and clear state
          set({ user: null, loading: false, pushToken: null, isAdmin: false }); // Clear user, token, and admin status
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
