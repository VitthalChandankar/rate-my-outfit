// src/screens/auth/WelcomeScreen.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import useAuthStore from '../../store/authStore';
import useUserStore from '../../store/UserStore';

export default function WelcomeScreen({ navigation }) {
    const { myProfile, setOnboardingCompleted } = useUserStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 5 }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleContinue = () => {
    setOnboardingCompleted(false); // Reset the flag
    // Replace the auth flow stack with the main app stack
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Ionicons name="sparkles" size={80} color={colors.warning} />
        <Text style={[styles.title, { color: colors.text }]}>Welcome, {myProfile?.name || 'User'}!</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>You're all set. Let's start rating and discovering amazing outfits.</Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleContinue}>
          <Text style={[styles.buttonText, { color: colors.textOnPrimary }]}>Let's Go!</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
