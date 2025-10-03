// src/screens/admin/VerificationDetailsScreen.js
import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { Button, Card, List, Divider } from 'react-native-paper';
import { getVerificationApplication, processVerificationApplication } from '../../services/firebase';
import showAlert from '../../utils/showAlert';
import formatDate from '../../utils/formatDate';

const DetailRow = ({ label, value, isLink = false }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    {isLink ? (
      <Text style={styles.linkValue} onPress={() => Linking.openURL(value)}>{value}</Text>
    ) : (
      <Text style={styles.detailValue}>{value}</Text>
    )}
  </View>
);

export default function VerificationDetailsScreen({ route, navigation }) {
  const { applicationId } = route.params;
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      const res = await getVerificationApplication(applicationId);
      if (res.success) {
        setApplication(res.application);
      } else {
        showAlert('Error', 'Could not load application details.');
      }
      setLoading(false);
    };
    fetchDetails();
  }, [applicationId]);

  const handleProcess = (decision) => {
    showAlert(
      `${decision === 'approved' ? 'Approve' : 'Reject'} Verification?`,
      `This will update the user's status and cannot be easily undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: decision === 'approved' ? 'Approve' : 'Reject',
          style: decision === 'approved' ? 'default' : 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            const res = await processVerificationApplication({
              applicationId: application.id,
              userId: application.userId,
              decision,
              plan: application.plan,
            });
            setIsProcessing(false);
            if (res.success) {
              showAlert('Success', `Application has been ${decision}.`, [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } else {
              showAlert('Error', res.error?.message || 'An error occurred.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator /></View>;
  }

  if (!application) {
    return <View style={styles.center}><Text>Application not found.</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title
          title={`${application.fullName} (@${application.username})`}
          subtitle={`Plan: ${application.plan}`}
        />
        <Card.Content>
          <DetailRow label="User ID" value={application.userId} />
          <DetailRow label="Applied On" value={formatDate(application.createdAt)} />
          <Divider style={styles.divider} />
          <Text style={styles.sectionTitle}>Submitted Information</Text>
          {/* This is where you would display submitted info like category, links, or ID images */}
          {/* For now, we'll assume these fields exist on the application document */}
          {application.category && <DetailRow label="Category" value={application.category} />}
          {application.knownAs && <DetailRow label="Known As" value={application.knownAs} />}
          {application.socialLink && (
            <DetailRow label="Social Link" value={application.socialLink} isLink />
          )}
        </Card.Content>
      </Card>

      {application.status === 'pending' && (
        <View style={styles.actionsContainer}>
          <Button
            mode="outlined"
            onPress={() => handleProcess('rejected')}
            style={styles.actionButton}
            color="#D92D20"
            loading={isProcessing}
            disabled={isProcessing}
          >
            Reject
          </Button>
          <Button
            mode="contained"
            onPress={() => handleProcess('approved')}
            style={styles.actionButton}
            loading={isProcessing}
            disabled={isProcessing}
          >
            Approve
          </Button>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7FB', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { marginBottom: 20 },
  divider: { marginVertical: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  detailRow: { marginBottom: 10 },
  detailLabel: { fontSize: 12, color: '#666' },
  detailValue: { fontSize: 16, color: '#111' },
  linkValue: { fontSize: 16, color: '#007AFF', textDecorationLine: 'underline' },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});