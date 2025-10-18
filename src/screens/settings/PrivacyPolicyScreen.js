// src/screens/settings/PrivacyPolicyScreen.js
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const P = ({ children }) => <Text style={styles.paragraph}>{children}</Text>;

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.headerTitle}>Privacy Policy</Text>
      <Text style={styles.headerSubtitle}>Last Updated: July 26, 2024</Text>

      <Section title="1. Introduction">
        <P>
          Welcome to Vastrayl ("we," "our," "us"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application (the "App"). Please read this policy carefully.
        </P>
      </Section>

      <Section title="2. Information We Collect">
        <P>
          We may collect information about you in a variety of ways. The information we may collect via the App includes:
        </P>
        <P>
          - Personal Data: Personally identifiable information, such as your name, email address, and demographic information, that you voluntarily give to us when you register with the App.
        </P>
        <P>
          - User Content: Photos, captions, comments, and other content you post to the App.
        </P>
        <P>
          - Derivative Data: Information our servers automatically collect when you access the App, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the App.
        </P>
      </Section>

      <Section title="3. How We Use Your Information">
        <P>
          Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the App to:
        </P>
        <P>
          - Create and manage your account.
        </P>
        <P>
          - Operate and maintain the App, including contests and social features.
        </P>
        <P>
          - Prevent fraudulent transactions, monitor against theft, and protect against criminal activity.
        </P>
        <P>
          - Respond to user inquiries and offer support.
        </P>
      </Section>

      <Section title="4. Contact Us">
        <P>
          If you have questions or comments about this Privacy Policy, please contact us at: contact.vastrayl@gmail.com
        </P>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#111',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    color: '#555',
    marginBottom: 12,
  },
});