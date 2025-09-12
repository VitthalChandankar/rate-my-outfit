// src/screens/admin/ManageAchievementsScreen.js
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text } from 'react-native';
import { Button, List } from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { listAchievements } from '../../services/firebase';

export default function ManageAchievementsScreen({ navigation }) {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      setLoading(true);
      listAchievements().then(res => {
        if (res.success) {
          setAchievements(res.items);
        }
        setLoading(false);
      });
    }
  }, [isFocused]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator /></View>;
  }

  return (
    <View style={styles.container}>
      <Button
        icon="plus"
        mode="contained"
        onPress={() => navigation.navigate('CreateAchievement')}
        style={styles.createButton}
      >
        Create New Achievement
      </Button>
      <FlatList
        data={achievements}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <List.Item
            title={item.title}
            description={item.description}
            left={props => <List.Icon {...props} icon="shield-star-outline" />}
            onPress={() => navigation.navigate('CreateAchievement', { achievement: item })}
          />
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No achievements found. Create one!</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  createButton: { margin: 16 },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#666' },
});