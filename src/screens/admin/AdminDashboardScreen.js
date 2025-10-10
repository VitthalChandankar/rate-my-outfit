// src/screens/admin/AdminDashboardScreen.js
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, Button } from 'react-native-paper';
import useUserStore from '../../store/UserStore';
import showAlert from '../../utils/showAlert';

export default function AdminDashboardScreen({ navigation }) {
  const resetSeenAchievements = useUserStore(s => s.resetSeenAchievements);

  const handleResetAchievements = () => {
    showAlert(
      'Reset Achievements?',
      'This will make all your unlocked achievements appear as new scratch cards again. This is for testing purposes only.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetSeenAchievements();
            showAlert('Done', 'Seen achievements have been reset. Go to your profile to see the effect.');
          },
        },
      ]
    );
  };

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
          title="Verification Requests"
          description="Review and process user verification applications"
          left={props => <List.Icon {...props} icon="account-check" />}
          onPress={() => navigation.navigate('ManageVerification')}
        />
        <List.Item
          title="Problem Reports"
          description="View user-submitted issues and feedback"
          left={props => <List.Icon {...props} icon="bug" />}
          onPress={() => navigation.navigate('ManageReports')}
        />
        <List.Item
          title="Post Reports"
          description="Review and moderate reported posts"
          left={props => <List.Icon {...props} icon="alert-circle" />}
          onPress={() => navigation.navigate('ManagePostReports')}
        />
      </List.Section>
      <List.Section title="Developer Tools">
        <Button
          icon="refresh-circle"
          mode="outlined"
          onPress={handleResetAchievements}
          style={styles.devButton}
        >
          Reset Seen Achievements
        </Button>
      </List.Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  devButton: {
    marginHorizontal: 16,
    marginTop: 8,
  },
});