// src/navigation/AppNavigator.js
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import useAuthStore from '../store/authStore';
import useUserStore from '../store/UserStore';

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

// Rating flow
import RateEntryScreen from '../screens/rating/RateEntryScreen';
import RateScreen from '../screens/rating/RateScreen';

// Profile additions
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import UserProfileScreen from '../screens/profile/UserProfileScreen';
import FollowersScreen from '../screens/profile/FollowersScreen';
import FollowingScreen from '../screens/profile/FollowingScreen';

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
        tabBarActiveTintColor: '#7A5AF8',
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
  const { loading, initializeAuth, isAuthenticated, user } = useAuthStore();
  const { loadMyProfile } = useUserStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Normalize profile data after auth ready (important: use myProfile for UI)
  useEffect(() => {
    const uid = user?.uid || user?.user?.uid;
    if (uid) loadMyProfile(uid);
  }, [user, loadMyProfile]);

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

            {/* Details accessible from any tab */}
            <Stack.Screen name="OutfitDetails" component={OutfitDetailsScreen} />
            <Stack.Screen name="ContestDetails" component={ContestDetailsScreen} />

            {/* Rating flow */}
            <Stack.Screen name="RateEntry" component={RateEntryScreen} />
            <Stack.Screen name="RateScreen" component={RateScreen} />

            {/* Profile additions */}
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} />
            <Stack.Screen name="Followers" component={FollowersScreen} />
            <Stack.Screen name="Following" component={FollowingScreen} />
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
