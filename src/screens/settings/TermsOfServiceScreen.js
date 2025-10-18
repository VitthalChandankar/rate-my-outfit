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

      <Section title="1. Agreement to Terms">
        <P>
          By creating an account or using the Vastrayl mobile application (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.
        </P>
      </Section>

      <Section title="2. User Accounts">
        <P>
          You are responsible for safeguarding your account and for any activities or actions under your account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate.
        </P>
      </Section>

      <Section title="3. User Content">
        <P>
          Our Service allows you to post content, including photos, captions, and comments ("User Content"). You retain all rights to your User Content, but you grant Vastrayl a worldwide, royalty-free, non-exclusive license to host, display, reproduce, and distribute your User Content on and through the Service.
        </P>
        <P>
          You are solely responsible for your User Content and agree not to post any content that is illegal, obscene, threatening, defamatory, or otherwise objectionable.
        </P>
      </Section>

      <Section title="4. Contests">
        <P>
          Contests, sweepstakes, or other promotions made available through the Service may be governed by rules that are separate from these Terms. If you participate in any Contests, please review the applicable rules as well as our Privacy Policy.
        </P>
      </Section>

      <Section title="5. Intellectual Property">
        <P>
          The Service and its original content (excluding User Content), features, and functionality are and will remain the exclusive property of Vastrayl and its licensors.
        </P>
      </Section>

      <Section title="6. Termination">
        <P>
          We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including without limitation if you breach these Terms. You may terminate your account at any time through the "Settings" screen in the app.
        </P>
      </Section>

      <Section title="7. Disclaimers and Limitation of Liability">
        <P>
          The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We do not warrant that the service will be uninterrupted, secure, or error-free. In no event shall Vastrayl, nor its directors, employees, or partners, be liable for any indirect, incidental, special, consequential or punitive damages arising out of your use of the Service.
        </P>
      </Section>

      <Section title="8. Governing Law">
        <P>
          These Terms shall be governed in accordance with the laws of [Your Country/State], without regard to its conflict of law provisions.
        </P>
      </Section>

      <Section title="9. Changes to Terms">
        <P>
          We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms of Service on this screen.
        </P>
      </Section>

      <Section title="10. Contact Us">
        <P>
          If you have any questions about these Terms, please contact us at: contact.vastrayl@gmail.com
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