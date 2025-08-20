// File: src/navigation/AppNavigator.js
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import useAuthStore from '../store/authStore';

// Auth
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';

// Main
import HomeScreen from '../screens/main/HomeScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import UploadScreen from '../screens/main/UploadScreen';

// Legacy Details
import OutfitDetailsScreen from '../screens/details/OutfitDetailsScreen';

// Contests
import ContestsListScreen from '../screens/contests/ContestsListScreen';
import ContestDetailsScreen from '../screens/contests/ContestDetailsScreen';

// Rating flow (new)
import RateEntryScreen from '../screens/rating/RateEntryScreen';
import RateScreen from '../screens/rating/RateScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarIcon: ({ color, size }) => {
          let iconName = 'ellipse';
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Contests') iconName = 'trophy';
          else if (route.name === 'Upload') iconName = 'cloud-upload';
          else if (route.name === 'Profile') iconName = 'person';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF5A5F',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Contests" component={ContestsListScreen} />
      <Tab.Screen name="Upload" component={UploadScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { loading, initializeAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const authed = isAuthenticated();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {authed ? (
          <>
            {/* Root tabs */}
            <Stack.Screen name="MainTabs" component={MainTabs} />

            {/* Details accessible from ANY tab (so navigate('ContestDetails') always works) */}
            <Stack.Screen
              name="OutfitDetails"
              component={OutfitDetailsScreen}
              options={{ headerShown: true, title: 'Outfit' }}
            />
            <Stack.Screen
              name="ContestDetails"
              component={ContestDetailsScreen}
              options={{ headerShown: true, title: 'Contest' }}
            />

            {/* Rating flow */}
            <Stack.Screen
              name="RateEntry"
              component={RateEntryScreen}
              options={{ headerShown: true, title: 'Rate My Outfit' }}
            />
            <Stack.Screen
              name="RateScreen"
              component={RateScreen}
              options={{ headerShown: true, title: 'Rate' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
