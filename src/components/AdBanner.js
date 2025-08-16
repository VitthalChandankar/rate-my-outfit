// File: src/components/AdBanner.js
// Description: AdMob banner wrapper (safe fallback if AdMob keys are missing)

import { StyleSheet, Text, View } from 'react-native';
// import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads'; // demo integration

export default function AdBanner() {
  // For MVP, return a placeholder. Replace with real AdMob integration when ready.
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Ad placeholder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  text: { color: '#aaa' },
});
