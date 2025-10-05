// src/screens/settings/TermsOfServiceScreen.js
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const P = ({ children }) => <Text style={styles.paragraph}>{children}</Text>;

export default function TermsOfServiceScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.headerTitle}>Terms of Service</Text>
      <Text style={styles.headerSubtitle}>Effective Date: July 26, 2024</Text>

      <Section title="1. Acceptance of Terms">
        <P>
          By accessing or using the Vastrayl mobile application (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the terms, then you may not access the Service.
        </P>
      </Section>

      <Section title="2. User Content">
        <P>
          Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material ("Content"). You are responsible for the Content that you post to the Service, including its legality, reliability, and appropriateness.
        </P>
        <P>
          By posting Content to the Service, you grant us the right and license to use, modify, publicly perform, publicly display, reproduce, and distribute such Content on and through the Service.
        </P>
      </Section>

      <Section title="3. Prohibited Conduct">
        <P>
          You agree not to engage in any of the following prohibited activities: (i) copying, distributing, or disclosing any part of the Service in any medium; (ii) using any automated system, including "robots," "spiders," "offline readers," etc., to access the Service; (iii) transmitting spam, chain letters, or other unsolicited email; (iv) attempting to interfere with, compromise the system integrity or security or decipher any transmissions to or from the servers running the Service.
        </P>
      </Section>

      <Section title="4. Termination">
        <P>
          We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
        </P>
      </Section>

      <Section title="5. Contact Us">
        <P>
          If you have any questions about these Terms, please contact us at: legal@ratemyoutfit.app
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