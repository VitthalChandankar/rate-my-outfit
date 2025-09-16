// src/screens/admin/AdminDashboardScreen.js
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List } from 'react-native-paper';

export default function AdminDashboardScreen({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <List.Section title="Admin Tools">
        <List.Item
          title="Manage Contests"
          description="Create new contests and view existing ones"
          left={props => <List.Icon {...props} icon="trophy" />}
          onPress={() => navigation.navigate('Contests')}
        />
        <List.Item
          title="Manage Achievements"
          description="Create and edit achievement badges"
          left={props => <List.Icon {...props} icon="shield-star" />}
          onPress={() => navigation.navigate('ManageAchievements')}
        />
        <List.Item
          title="Problem Reports"
          description="View user-submitted issues and feedback"
          left={props => <List.Icon {...props} icon="bug" />}
          onPress={() => navigation.navigate('ManageReports')}
        />
      </List.Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});