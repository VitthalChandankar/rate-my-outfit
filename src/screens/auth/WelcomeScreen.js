// src/screens/auth/WelcomeScreen.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import useAuthStore from '../../store/authStore';
import useUserStore from '../../store/UserStore';
import { useFonts, PlayfairDisplay_400Regular } from '@expo-google-fonts/playfair-display';
import WelcomeAnimation from '../../../assets/lottie/Welcome.json';

export default function WelcomeScreen({ navigation }) {
  const { myProfile } = useUserStore();
  const { setOnboardingCompleted } = useAuthStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [fontsLoaded] = useFonts({ PlayfairDisplay_400Regular });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 5 }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleContinue = () => {
    setOnboardingCompleted(false); // Reset the flag. AppNavigator will handle the redirection automatically.
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <LottieView
          source={WelcomeAnimation}
          autoPlay
          loop={true}
          style={styles.lottieAnimation}
        />
        <Text style={styles.title}>Hey, {myProfile?.name || 'Trendsetter'}</Text>
<Text style={[styles.subtitle, { fontFamily: fontsLoaded ? 'PlayfairDisplay_400Regular' : undefined }]}>Rate the fits, drop your vibe, and explore the hottest styles around.</Text>
  <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Let’s slay</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  lottieAnimation: {
    width: 300,
    height: 300,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 0,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 28,
  },
  button: {
    backgroundColor: '#7A5AF8',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
