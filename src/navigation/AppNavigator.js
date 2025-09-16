// src/navigation/AppNavigator.js
import React, { useEffect } from 'react';
import { ActivityIndicator, View, TouchableOpacity } from 'react-native';
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
import WelcomeScreen from '../screens/auth/WelcomeScreen';
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
import CreateContestScreen from '../screens/contests/CreateContestScreen';

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

import SettingsScreen from '../screens/settings/SettingsScreen';
import NotificationSettingsScreen from '../screens/settings/NotificationSettingsScreen';
import BlockedUsersScreen from '../screens/settings/BlockedUsersScreen';
import LanguageScreen from '../screens/settings/LanguageScreen';

import InboxScreen from '../screens/sharing/InboxScreen';
import SharePostScreen from '../screens/sharing/SharePostScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import ManageAchievementsScreen from '../screens/admin/ManageAchievementsScreen';
import CreateAchievementScreen from '../screens/admin/CreateAchievementScreen';

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
      <Tab.Screen name="Contests" component={ContestsListScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Upload" component={UploadScreen} options={{ title: 'Upload', headerShown: false }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator({ navigationRef }) {
  const { loading: authLoading, user, onboardingJustCompleted } = useAuthStore();
  const { myProfile, loading: profileLoading } = useUserStore();

  // Show a loading spinner while we determine the user's auth state and profile status.
  const isAppLoading = authLoading || (user && !myProfile && profileLoading);
  if (isAppLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  // Determine the user's state to route them correctly.
  // A user needs email verification ONLY if they signed up with email/password and haven't verified yet.
  // Phone users do not have an email to verify.
  const isEmailUser = user?.providerData.some(p => p.providerId === 'password');
  const authed = !!user;
  const needsEmailVerification = isEmailUser && !user.emailVerified;
  const profileCompleted = !!myProfile?.profileCompleted;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {authed ? (
          needsEmailVerification ? ( // 1. User signed up with email, needs verification
            // 1. User is signed in but email is not verified.
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
          ) : !profileCompleted ? ( // 2. User is verified, but profile is incomplete
            // 2. Email is verified, but profile is not complete.
            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
          ) : onboardingJustCompleted ? ( // 3. User just finished profile, show Welcome screen
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
          ) : (
            // 3. User is fully authenticated and profile is complete.
            <Stack.Screen name="Main" component={MainAppStack} />
          )
        ) : (
          // 4. User is not signed in. Show auth flow.
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="CreatePassword" component={CreatePasswordScreen} />
            <Stack.Screen name="PhoneNumber" component={PhoneNumberScreen} />
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
      <Stack.Screen
        name="CreateContest"
        component={CreateContestScreen}
        options={{
          headerShown: true,
          title: 'Host a New Contest',
        }}
      />

      {/* Rating flow */}
      <Stack.Screen name="RateEntry" component={RateEntryScreen} />
      <Stack.Screen name="RateScreen" component={RateScreen} />
      <Stack.Screen name="RatingSuccess" component={RatingSuccessScreen} />

      {/* Profile additions */}
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen
        name="Followers"
        component={FollowersScreen}
        options={({ navigation, route }) => ({
          headerShown: true,
          title: 'Followers',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#111',
          headerTitleStyle: { fontWeight: 'bold' },
          headerRight: () => (
            <TouchableOpacity onPress={() => navigation.setParams({ searchVisible: !route.params?.searchVisible })} style={{ marginRight: 15 }}>
              <Ionicons name="search" size={24} color="#111" />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="Following"
        component={FollowingScreen}
        options={({ navigation, route }) => ({
          headerShown: true,
          title: 'Following',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#111',
          headerTitleStyle: { fontWeight: 'bold' },
          headerRight: () => (
            <TouchableOpacity onPress={() => navigation.setParams({ searchVisible: !route.params?.searchVisible })} style={{ marginRight: 15 }}>
              <Ionicons name="search" size={24} color="#111" />
            </TouchableOpacity>
          ),
        })}
      />

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

      {/* Sharing Flow */}
      <Stack.Screen
        name="Inbox"
        component={InboxScreen}
        options={{
          headerShown: true,
          title: 'Inbox',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#111',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen
        name="SharePost"
        component={SharePostScreen}
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Share with a friend',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#111',
        }}
      />

      {/* Admin Flow */}
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          headerShown: true,
          title: 'Admin Dashboard',
        }}
      />
      <Stack.Screen
        name="ManageAchievements"
        component={ManageAchievementsScreen}
        options={{ headerShown: true, title: 'Manage Achievements' }}
      />
      <Stack.Screen
        name="CreateAchievement"
        component={CreateAchievementScreen}
        options={{ headerShown: true, title: 'Create/Edit Achievement' }}
      />

      {/* Settings flow */}
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: true,
          title: 'Settings',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#111',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen
        name="BlockedUsers"
        component={BlockedUsersScreen}
        options={{
          headerShown: true,
          title: 'Blocked Accounts',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#111',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{
          headerShown: true,
          title: 'Notifications',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#111',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen
        name="Language"
        component={LanguageScreen}
        options={{
          headerShown: true,
          title: 'Select Language',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#111',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
    </Stack.Navigator>
  );
}
