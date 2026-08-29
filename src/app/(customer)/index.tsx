import { View, Text, StyleSheet, Button, FlatList, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { fetchKitchens } from '@/lib/api';

export default function CustomerHome() {
  const { user } = useAuthStore();

  const { data: kitchens, isLoading, error } = useQuery({
    queryKey: ['kitchens'],
    queryFn: fetchKitchens,
  });

  const handleSignOut = () => {
    supabase.auth.signOut();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Available Kitchens</Text>
        <Button title="Sign Out" onPress={handleSignOut} />
      </View>
      <Text style={styles.subtitle}>Welcome back, {user?.email}</Text>
      
      {isLoading ? (
        <ActivityIndicator size="large" color="tomato" />
      ) : error ? (
        <Text style={styles.errorText}>Failed to load kitchens</Text>
      ) : (
        <FlatList
          data={kitchens}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.emptyText}>No kitchens available right now.</Text>}
          renderItem={({ item }) => (
            <View style={styles.kitchenCard}>
              <Text style={styles.kitchenName}>{item.name}</Text>
              <Text style={styles.kitchenAddress}>{item.address}</Text>
              <Button title="View Menu & Subscribe" onPress={() => {}} />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f9f9f9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  errorText: { color: 'red', textAlign: 'center' },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#888' },
  kitchenCard: { 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  kitchenName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  kitchenAddress: { fontSize: 14, color: '#555', marginBottom: 12 }
});

