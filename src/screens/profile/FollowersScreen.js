// src/screens/profile/FollowersScreen.js
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import useUserStore from '../../store/UserStore';
import Avatar from '../../components/Avatar';

export default function FollowersScreen({ route, navigation }) {
  const { userId } = route.params || {};
  const { fetchFollowers } = useUserStore();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      const res = await fetchFollowers({ userId, reset: true });
      if (res.success) setRows(res.items);
    })();
  }, [userId, fetchFollowers]);

  return (
    <FlatList
      data={rows}
      keyExtractor={(it) => it.id}
      contentContainerStyle={{ padding: 12 }}
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => navigation.navigate('UserProfile', { userId: item.followerId })}>
          <Avatar uri={null} size={44} />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.name}>User {item.followerId.slice(0, 6)}</Text>
            <Text style={styles.sub}>Followed</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  name: { fontWeight: '700', color: '#111' },
  sub: { color: '#777', marginTop: 2, fontSize: 12 },
});
