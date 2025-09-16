import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { useNavigationContainerRef } from '@react-navigation/native';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import theme from './src/theme/theme';
import AppNavigator from './src/navigation/AppNavigator';
import useAuthStore from './src/store/authStore';
import i18n from './src/config/i18n';
import GlobalAlert from './src/components/GlobalAlert';
import useNotificationsStore from './src/store/notificationsStore';

export default function App() {
  const { initializeAuth, user } = useAuthStore();
  const navigationRef = useNavigationContainerRef();

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
  }, [initializeAuth]);

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
      console.log('Notification tapped with data:', data);
      if (data?.outfitId && navigationRef.isReady()) {
        navigationRef.navigate('OutfitDetails', { outfitId: data.outfitId });
      } else if (data?.senderId && navigationRef.isReady()) {
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
      <PaperProvider theme={theme}>
        <ActionSheetProvider>
          <>
            <StatusBar style="light" />
            <AppNavigator navigationRef={navigationRef} />
            <GlobalAlert />
          </>
        </ActionSheetProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
