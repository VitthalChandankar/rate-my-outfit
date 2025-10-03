// src/screens/settings/VerificationScreen.js
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { Button, Card, List } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import showAlert from '../../utils/showAlert';
import useUserStore from '../../store/UserStore';

const PlanFeature = ({ text, icon = 'checkmark-circle' }) => (
  <View style={styles.featureRow}>
    <Ionicons name={icon} size={20} color="#34C759" style={styles.featureIcon} />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

export default function VerificationScreen({ navigation }) {
  const { myProfile } = useUserStore();
  const currentLevel = myProfile?.verification?.level || 'none';
  const currentStatus = myProfile?.verification?.status || 'unverified';

  const handleApply = (plan) => {
    showAlert('Coming Soon', `The application process for the ${plan} plan is not yet available.`);
    // Later, this will navigate to an application screen:
    // navigation.navigate('VerificationApply', { plan });
  };

  const renderCurrentStatus = () => {
    if (currentLevel !== 'none') {
      return (
        <Card style={styles.statusCard}>
          <Card.Title
            title={`You are ${currentLevel} Verified`}
            titleStyle={styles.statusTitle}
            left={(props) => <List.Icon {...props} icon="shield-checkmark" color="#7A5AF8" />}
          />
        </Card>
      );
    }
    if (currentStatus === 'pending') {
      return (
        <Card style={styles.statusCard}>
          <Card.Title
            title="Application Pending"
            subtitle="Your verification request is under review."
            titleStyle={styles.statusTitle}
            left={(props) => <List.Icon {...props} icon="progress-clock" />}
          />
        </Card>
      );
    }
    return null;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.headerTitle}>Get Verified</Text>
      <Text style={styles.headerSubtitle}>
        Get a verification badge to let others know you're the real deal. Choose a plan that fits you.
      </Text>

      {renderCurrentStatus()}

      {/* Basic Plan */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.planTitle}>Basic Verification</Text>
          <Text style={styles.planPrice}>Free</Text>
          <PlanFeature text="Blue verification badge" />
          <PlanFeature text="Confirm your authenticity" />
          <PlanFeature text="Basic post analytics" />
        </Card.Content>
        <Card.Actions>
          <Button
            mode="outlined"
            onPress={() => handleApply('Basic')}
            disabled={currentLevel !== 'none' || currentStatus === 'pending'}
          >
            Apply Now
          </Button>
        </Card.Actions>
      </Card>

      {/* Premium Plan */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.planTitle}>Premium</Text>
          <Text style={styles.planPrice}>$4.99 / month</Text>
          <PlanFeature text="Gold verification badge" />
          <PlanFeature text="Increased visibility in search" />
          <PlanFeature text="Priority customer support" />
          <PlanFeature text="Advanced analytics" />
        </Card.Content>
        <Card.Actions>
          <Button
            mode="contained"
            onPress={() => handleApply('Premium')}
            disabled={currentLevel === 'premium' || currentLevel === 'pro' || currentStatus === 'pending'}
          >
            Subscribe
          </Button>
        </Card.Actions>
      </Card>

      {/* Pro Plan */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.planTitle}>Professional</Text>
          <Text style={styles.planPrice}>$9.99 / month</Text>
          <PlanFeature text="Purple verification badge" />
          <PlanFeature text="Highest visibility & reach" />
          <PlanFeature text="Dedicated account manager" />
          <PlanFeature text="Host sponsored contests" />
        </Card.Content>
        <Card.Actions>
          <Button
            mode="contained"
            onPress={() => handleApply('Pro')}
            disabled={currentLevel === 'pro' || currentStatus === 'pending'}
          >
            Subscribe
          </Button>
        </Card.Actions>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7FB',
  },
  contentContainer: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    marginTop: 4,
  },
  statusCard: {
    marginBottom: 20,
    backgroundColor: '#F3E8FF',
  },
  statusTitle: {
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 20,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 18,
    color: '#7A5AF8',
    fontWeight: '600',
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
  },
});