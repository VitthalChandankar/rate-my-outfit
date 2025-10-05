// src/screens/settings/HelpCenterScreen.js
import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const QA = ({ question, answer }) => (
  <View style={styles.qaContainer}>
    <Text style={styles.question}>{question}</Text>
    <Text style={styles.answer}>{answer}</Text>
  </View>
);

export default function HelpCenterScreen() {
  const navigation = useNavigation();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.headerTitle}>Help Center</Text>
      <Text style={styles.headerSubtitle}>Find answers to your questions and learn how to use Vastrayl.</Text>

      <Section title="Frequently Asked Questions">
        <QA
          question="How do I upload an outfit?"
          answer="Tap the '+' icon on the bottom tab bar. You can then select an image from your library or take a new photo. Add a caption and you're ready to post!"
        />
        <QA
          question="How do contests work?"
          answer="Contests are themed events where you can submit your outfits for rating. Users vote on entries, and the highest-rated outfits can win prizes. Check the 'Contests' tab for active events."
        />
        <QA
          question="Can I delete my post?"
          answer="Yes. Navigate to your post, tap the options menu (three dots), and select 'Delete'. This action cannot be undone."
        />
      </Section>

      <Section title="Account & Privacy">
        <QA
          question="How do I change my username or bio?"
          answer="Go to your Profile tab and tap 'Edit Profile'. You can update your name, username, bio, and profile picture there."
        />
        <QA
          question="How do I block a user?"
          answer="Navigate to the user's profile, tap the options menu (three dots) in the top right corner, and select 'Block'. Blocked users will not be able to see your content or interact with you."
        />
      </Section>

      <Section title="Report a Problem">
        <QA
          question="Found an issue?"
          answer="Encountered a bug, inappropriate content, or another problem? Let us know so we can fix it."
        />
        <TouchableOpacity style={styles.reportButton} onPress={() => navigation.navigate('ReportProblem')}>
          <Text style={styles.reportButtonText}>Submit a Report</Text>
        </TouchableOpacity>
      </Section>

      <Section title="Contact Us">
        <Text style={styles.paragraph}>
          If you can't find the answer you're looking for, please don't hesitate to reach out to our support team.
        </Text>
        <Text style={styles.contactEmail}>Email: support@ratemyoutfit.app</Text>
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
    marginBottom: 8,
    color: '#111',
  },
  headerSubtitle: {
    fontSize: 16,
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
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  qaContainer: {
    marginBottom: 16,
  },
  question: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 8,
  },
  answer: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
    marginBottom: 12,
  },
  contactEmail: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7A5AF8',
  },
  reportButton: {
    marginTop: 8,
    backgroundColor: '#7A5AF8',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});