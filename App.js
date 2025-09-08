import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { useNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';

import theme from './src/theme/theme';
import AppNavigator from './src/navigation/AppNavigator';
import useAuthStore from './src/store/authStore';

export default function App() {
  const { initializeAuth, user } = useAuthStore();
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    initializeAuth(); // listen to firebase auth changes on app start
  }, [initializeAuth]);

   // Effect for handling notification taps
   useEffect(() => {
    // This listener is fired whenever a user taps on or interacts with a notification
    // (works when app is foregrounded, backgrounded, or killed)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped with data:', data);
      if (data?.outfitId && navigationRef.isReady()) {
        navigationRef.navigate('OutfitDetails', { outfitId: data.outfitId });
      }
    });

    return () => {
      responseSubscription.remove();
    };
  }, [navigationRef]);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar style="light" />
        <AppNavigator navigationRef={navigationRef} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
