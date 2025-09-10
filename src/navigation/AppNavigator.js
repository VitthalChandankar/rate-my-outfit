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
import CompleteProfileScreen from '../screens/auth/CompleteProfileScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import CreatePasswordScreen from '../screens/auth/CreatePasswordScreen';
import EmailVerificationScreen from '../screens/auth/EmailVerificationScreen';
import PhoneNumberScreen from '../screens/auth/PhoneNumberScreen';

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
import RatingSuccessScreen from '../screens/rating/RatingSuccessScreen';

// Profile additions
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import UserProfileScreen from '../screens/profile/UserProfileScreen';
import FollowersScreen from '../screens/profile/FollowersScreen';
import FollowingScreen from '../screens/profile/FollowingScreen';
import LikedByScreen from '../screens/details/LikedByScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import CommentsScreen from '../screens/details/CommentsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
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
      <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Contests" component={ContestsListScreen} options={{ title: 'Contests', headerShown: true }} />
      <Tab.Screen name="Upload" component={UploadScreen} options={{ title: 'Upload', headerShown: true }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator({ navigationRef }) {
  const { loading: authLoading, user } = useAuthStore();
  const { myProfile, loading: profileLoading } = useUserStore();

  // Wait for both authentication and the initial profile load to complete
  // to prevent a screen flicker on login.
  if (authLoading || (user && !myProfile && profileLoading)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const authed = !!user;
  const emailVerified = !!user?.emailVerified;
  // Show CompleteProfile screen if user is new (hasn't set a username yet)
  const isNewUser = authed && myProfile && !myProfile.username;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {authed ? (
          !emailVerified ? (
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
          ) : isNewUser ? (
            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
          ) : (
            <Stack.Screen name="Main" component={MainAppStack} />
          )
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="CreatePassword" component={CreatePasswordScreen} />
            <Stack.Screen name="PhoneNumber" component={PhoneNumberScreen} />
            {/* Add EmailVerification here so it can be navigated to from Signup */}
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function MainAppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Root tabs */}
      <Stack.Screen name="MainTabs" component={MainTabs} />

      {/* Details accessible from any tab */}
      <Stack.Screen
        name="OutfitDetails"
        component={OutfitDetailsScreen}
        options={{
          headerShown: true,
          title: 'Post',
          headerBackTitleVisible: false,
        }} />
      <Stack.Screen name="ContestDetails" component={ContestDetailsScreen} />

      {/* Rating flow */}
      <Stack.Screen name="RateEntry" component={RateEntryScreen} />
      <Stack.Screen name="RateScreen" component={RateScreen} />
      <Stack.Screen name="RatingSuccess" component={RatingSuccessScreen} />

      {/* Profile additions */}
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="Followers" component={FollowersScreen} />
      <Stack.Screen name="Following" component={FollowingScreen} />

      {/* Notifications Screen */}
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#111',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />

      {/* New screen for likes */}
      <Stack.Screen
        name="LikedBy"
        component={LikedByScreen}
        options={{
          headerShown: true,
          title: 'Likes',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#111',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />

      {/* New screen for comments */}
      <Stack.Screen
        name="Comments"
        component={CommentsScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#111',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
    </Stack.Navigator>
  );
}
