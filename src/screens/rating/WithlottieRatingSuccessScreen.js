import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';

const { width } = Dimensions.get('window');

export default function RatingSuccessScreen({ route, navigation }) {
  const { emoji } = route.params;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      navigation.replace('Home');
    }, 3000);

    return () => clearTimeout(timer);
  }, [fadeAnim, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerContent}>
        {/* Success Animation */}
        <LottieView
          source={require('../../assets/simple_success_check.json')}
          autoPlay
          loop={false}
          style={styles.lottie}
        />

        {/* Animated Card */}
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          <Text style={styles.title}>Thanks for rating!</Text>
          <Text style={styles.subtitle}>Your feedback helps us improve ✨</Text>
          <Text style={styles.emoji}>{emoji}</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  lottie: {
    width: width * 0.6,
    height: width * 0.6,
  },
  card: {
    marginTop: 24,
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 12,
  },
  emoji: {
    fontSize: 34,
  },
});
