import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { useNavigationContainerRef } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import theme from './src/theme/theme';
import AppNavigator from './src/navigation/AppNavigator';
import useAuthStore from './src/store/authStore';
import useUserStore from './src/store/UserStore';
import i18n from './src/config/i18n';
import GlobalAlert from './src/components/GlobalAlert';
import useNotificationsStore from './src/store/notificationsStore';
import useShareStore from './src/store/shareStore';

export default function App() {
  const { initializeAuth, user } = useAuthStore();
  const navigationRef = useNavigationContainerRef();
  const { hydrateSeenAchievements } = useUserStore();

  // Effect for loading saved language preference
  useEffect(() => {
    const loadLanguage = async () => {
      const savedLanguage = await AsyncStorage.getItem('@user_language');
      if (savedLanguage) {
        i18n.locale = savedLanguage;
      }
    };
    loadLanguage();
  }, []);

  useEffect(() => {
    initializeAuth(); // listen to firebase auth changes on app start
    hydrateSeenAchievements(); // Load seen achievements from storage on app start
  }, [initializeAuth, hydrateSeenAchievements]);

  // Effect for handling user-dependent subscriptions for notification/share badges
  useEffect(() => {
    if (user?.uid) {
      const unsubNotifications = useNotificationsStore.getState().subscribeToUnreadCount(user.uid);
      const unsubShares = useShareStore.getState().subscribeToUnreadCount(user.uid);

      // Return a cleanup function that will be called when the user logs out
      return () => {
        if (unsubNotifications) unsubNotifications();
        if (unsubShares) unsubShares();
      };
    } else {
      // User logged out, clear the stores
      useNotificationsStore.getState().clearNotifications();
      useShareStore.getState().clearShareStore();
    }
  }, [user]);


   // Effect for handling notification taps
   useEffect(() => {
    // This listener is fired whenever a notification is received while the app is foregrounded
    const notificationReceivedSubscription = Notifications.addNotificationReceivedListener(notification => {
      // When a notification comes in, re-subscribe to get the latest count.
      // This ensures the badge updates even if there's a slight delay in the primary real-time listener.
      const { user } = useAuthStore.getState();
      if (user?.uid) {
        useNotificationsStore.getState().subscribeToUnreadCount(user.uid);
      }
    });

    // This listener is fired whenever a user taps on or interacts with a notification
    // (works when app is foregrounded, backgrounded, or killed)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped with data:', data); // Keep for debugging

      if (!navigationRef.isReady()) {
        return;
      }

      // Handle 'share' notification type
      if (data?.type === 'share' && data.outfitData) {
        try {
          const outfitData = JSON.parse(data.outfitData);
          const isContestPost = outfitData.type === 'contest' && outfitData.contestId;

          if (isContestPost) {
            // Navigate to RateEntryScreen for contest posts
            const item = {
              id: outfitData.entryId || outfitData.id,
              userId: outfitData.userId,
              userName: outfitData.user?.name,
              userPhoto: outfitData.user?.profilePicture,
              imageUrl: outfitData.imageUrl,
              caption: outfitData.caption,
              contestId: outfitData.contestId,
            };
            navigationRef.navigate('RateEntry', { item, mode: 'entry' });
          } else {
            // Default to OutfitDetails for normal posts
            navigationRef.navigate('OutfitDetails', { outfitId: outfitData.id });
          }
        } catch (e) {
          console.error("Failed to parse outfitData from notification", e);
          // Fallback for safety if parsing fails
          if (data.outfitId) navigationRef.navigate('OutfitDetails', { outfitId: data.outfitId });
        }
      } else if (data?.outfitId) { // Handle legacy or other notification types
        navigationRef.navigate('OutfitDetails', { outfitId: data.outfitId });
      } else if (data?.senderId) { // Handle 'follow' notifications
        navigationRef.navigate('UserProfile', { userId: data.senderId });
      }
    });

    return () => {
      notificationReceivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [navigationRef]);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PaperProvider theme={theme}>
          <ActionSheetProvider>
            <>
              <StatusBar style="light" />
              <AppNavigator navigationRef={navigationRef} />
              <GlobalAlert />
            </>
          </ActionSheetProvider>
        </PaperProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
