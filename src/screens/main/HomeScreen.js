// File: src/screens/main/HomeScreen.js
// Description: Feed screen showing outfits in a FlatList.

import { useIsFocused } from '@react-navigation/native';
import { useEffect } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import OutfitCard from '../../components/OutfitCard';
import useOutfitStore from '../../store/outfitStore';

export default function HomeScreen({ navigation }) {
  const { feed, fetchFeed, loading, refreshing } = useOutfitStore();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) fetchFeed({ limit: 12, reset: true });
  }, [isFocused]);

  const onRefresh = () => fetchFeed({ limit: 12, reset: true });

  const loadMore = () => {
    if (!loading) fetchFeed({ limit: 12, reset: false });
  };

  const renderItem = ({ item }) => (
    <OutfitCard
      outfit={item}
      onPress={() => navigation.navigate('OutfitDetails', { outfitId: item.id })}
    />
  );

  return (
    <View style={styles.container}>
      {loading && feed.length === 0 ? (
        <ActivityIndicator size="large" color="#FF5A5F" style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={feed}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF5A5F" />}
          ListEmptyComponent={<Text style={styles.empty}>No outfits yet — be the first to upload!</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  empty: { textAlign: 'center', marginTop: 40, color: '#666' },
});
