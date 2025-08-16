// File: src/screens/main/ProfileScreen.js
// Description: User profile + grid of user's outfits.

import { useEffect } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import OutfitCard from '../../components/OutfitCard';
import useAuthStore from '../../store/authStore';
import useOutfitStore from '../../store/outfitStore';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuthStore();
  const { myOutfits, fetchMyOutfits } = useOutfitStore();

  useEffect(() => {
    fetchMyOutfits();
  }, []);

  const renderItem = ({ item }) => (
    <OutfitCard outfit={item} onPress={() => navigation.navigate('OutfitDetails', { outfitId: item.id })} />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {user?.profilePicture ? (
          <Image source={{ uri: user.profilePicture }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}><Text style={{ color: '#fff', fontWeight: '700' }}>{(user?.name || 'U').charAt(0)}</Text></View>
        )}
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.name}>{user?.name || 'Your Name'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => logout()}>
          <Text style={{ color: '#FF5A5F', fontWeight: '600' }}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>My Outfits</Text>
      <FlatList data={myOutfits} keyExtractor={(i) => i.id} renderItem={renderItem} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarPlaceholder: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FF5A5F', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: '700' },
  email: { color: '#666' },
  logoutBtn: { marginLeft: 'auto' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 8 },
});
