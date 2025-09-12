import { StatusBar } from 'expo-status-bar';
import {
  Provider as PaperProvider,
  MD3DarkTheme,
  MD3LightTheme,
} from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { useNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import baseTheme from './src/theme/theme';
import AppNavigator from './src/navigation/AppNavigator';
import useAuthStore from './src/store/authStore';
import i18n from './src/config/i18n';
import useNotificationsStore from './src/store/notificationsStore';

// This component will be wrapped by ThemeProvider and can use the useTheme hook
function AppContent() {
  const { initializeAuth, user } = useAuthStore();
  const navigationRef = useNavigationContainerRef();
  const { isDark, colors } = useTheme();

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

  // Create the Paper theme dynamically by merging our custom colors
  const paperTheme = {
    ...(isDark ? MD3DarkTheme : MD3LightTheme),
    ...baseTheme, // Keep fonts, roundness etc.
    colors: {
      ...(isDark ? MD3DarkTheme.colors : MD3LightTheme.colors),
      ...colors, // Override with our theme colors
    },
  };

  return (
    <PaperProvider theme={paperTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator navigationRef={navigationRef} />
    </PaperProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
