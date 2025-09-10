// src/screens/rating/RatingSuccessScreen.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const EmojiParticle = ({ emoji, progress }) => {
  // Animate from center outwards
  const scale = progress.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0.5, 1.2, 1.2, 0],
  });

  // Move in a random direction away from the center
  const randomAngle = useRef(Math.random() * 2 * Math.PI).current;
  const distance = width / 2;
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.cos(randomAngle) * distance],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.sin(randomAngle) * distance],
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.1, 0.7, 1],
    outputRange: [1, 1, 1, 0],
  });

  return (
    <Animated.Text
      style={[
        styles.emoji,
        {
          transform: [
            { translateX },
            { translateY },
            { scale },
          ],
          opacity,
        },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
};

export default function RatingSuccessScreen({ route, navigation }) {
  const { emoji } = route.params;
  const particles = Array.from({ length: 50 }); // More particles for a bigger burst
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 2000,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      navigation.navigate('Home');
    }, 2500); // Navigate home after 2.5 seconds

    return () => clearTimeout(timer);
  }, [animation, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        {particles.map((_, index) => (
          <EmojiParticle key={index} emoji={emoji} progress={animation} />
        ))}
        <Text style={styles.title}>Thanks for rating!</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    position: 'absolute',
  },
  emoji: {
    position: 'absolute',
    fontSize: 40,
    textAlign: 'center',
  },
});