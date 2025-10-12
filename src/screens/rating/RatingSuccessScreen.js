// src/screens/rating/RatingSuccessScreen.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import RatingSuccessAnimation from '../../../assets/lottie/Rating_success.json';


export default function RatingSuccessScreen({ route, navigation }) {
  const animationRef = useRef(null);

  useEffect(() => {
    animationRef.current?.play();

    const timer = setTimeout(() => {
      navigation.navigate('Home');
    }, 4300); // Navigate home after the animation finishes (approx 4.2s)

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <LottieView
          ref={animationRef}
          source={RatingSuccessAnimation}
          autoPlay={true}
          loop={false}
          style={styles.lottieAnimation}
        />
        <Text style={styles.title}>Thanks for rating!</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottieAnimation: {
    width: 300,
    height: 300,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
});