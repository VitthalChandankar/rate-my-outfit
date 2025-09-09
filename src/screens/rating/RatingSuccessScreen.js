// src/screens/rating/RatingSuccessScreen.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const EmojiParticle = ({ emoji, progress }) => {
  const scale = progress.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 1, 1, 0],
  });

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height / 2],
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.1, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  const randomX = useRef(Math.random() * width - width / 2).current;
  const randomRotation = useRef(Math.random() * 360 - 180).current;

  return (
    <Animated.Text
      style={[
        styles.emoji,
        {
          transform: [
            { translateX: randomX },
            { translateY },
            { scale },
            { rotate: `${randomRotation}deg` },
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
  const particles = Array.from({ length: 30 }); // Create 30 particles
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