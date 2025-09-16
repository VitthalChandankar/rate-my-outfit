// src/screens/admin/ReportDetailsScreen.js
import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { List, Badge, Divider, Button, SegmentedButtons } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { updateProblemReportStatus } from '../../services/firebase';
import formatDate from '../../utils/formatDate';

const statusColors = {
  new: '#007AFF',
  in_progress: '#FF9500',
  resolved: '#34C759',
};

const DetailRow = ({ icon, label, value }) => (
  <View style={styles.detailRow}>
    <Ionicons name={icon} size={20} color="#6B7280" style={styles.detailIcon} />
    <View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

export default function ReportDetailsScreen({ route, navigation }) {
  const initialReport = route.params.report;
  const [report, setReport] = useState(initialReport);
  const [isUpdating, setIsUpdating] = useState(false);

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: `Report: ${report.category.toUpperCase()}` });
  }, [navigation, report]);

  const handleStatusChange = async (newStatus) => {
    if (isUpdating) return;
    setIsUpdating(true);
    const res = await updateProblemReportStatus(report.id, newStatus);
    if (res.success) {
      setReport(prev => ({ ...prev, status: newStatus }));
    }
    setIsUpdating(false);
  };

  if (!report) {
    return (
      <View style={styles.center}>
        <Text>Report not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Report Details</Text>
        <Badge style={[styles.badge, { backgroundColor: statusColors[report.status] || '#666' }]}>
          {report.status}
        </Badge>
      </View>

      <List.Section title="Description">
        <Text style={styles.description}>{report.description}</Text>
      </List.Section>

      <Divider />

      <List.Section title="Manage Status">
        <SegmentedButtons
          value={report.status}
          onValueChange={handleStatusChange}
          density="medium"
          style={styles.statusButtons}
          buttons={[
            { value: 'new', label: 'New', icon: 'alert-circle-outline' },
            { value: 'in_progress', label: 'In Progress', icon: 'progress-wrench' },
            { value: 'resolved', label: 'Resolved', icon: 'check-circle-outline' },
          ]}
        />
      </List.Section>

      <Divider />

      <List.Section title="Reporter Information">
        <DetailRow icon="person-outline" label="Name" value={report.reporterName} />
        <DetailRow icon="at-outline" label="Username" value={`@${report.reporterUsername}`} />
        <DetailRow icon="calendar-outline" label="Reported On" value={formatDate(report.createdAt)} />
        <Button
          icon="account-search-outline"
          mode="outlined"
          onPress={() => navigation.navigate('UserProfile', { userId: report.reporterId })}
          style={styles.viewProfileButton}
        >
          View Reporter's Profile
        </Button>
      </List.Section>

      <Divider />

      <List.Section title="Device Information">
        <DetailRow icon="phone-portrait-outline" label="Device" value={report.deviceInfo?.device || 'N/A'} />
        <DetailRow icon="layers-outline" label="Operating System" value={`${report.deviceInfo?.os || 'N/A'} ${report.deviceInfo?.osVersion || ''}`} />
        <DetailRow icon="apps-outline" label="App Version" value={report.appVersion || 'N/A'} />
      </List.Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  badge: {
    color: '#fff',
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: 16,
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  detailIcon: {
    marginRight: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111',
  },
  viewProfileButton: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  statusButtons: {
    marginHorizontal: 16,
  },
});