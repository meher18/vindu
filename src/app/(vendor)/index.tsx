import { View, Text, StyleSheet, Button } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

export default function VendorHome() {
  const { user } = useAuthStore();

  const handleSignOut = () => {
    supabase.auth.signOut();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Fulfillment Dashboard</Text>
      <Text style={styles.subtitle}>Welcome back, Kitchen Manager ({user?.email})</Text>
      
      <View style={styles.metricsContainer}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Meals to Prepare Today</Text>
          <Text style={styles.metricValue}>124</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Paused / Skipped</Text>
          <Text style={styles.metricValue}>12</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text>Breakdown of meal types (Breakfast, Lunch, Dinner) will appear here.</Text>
      </View>

      <Button title="Sign Out" onPress={handleSignOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  metricsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  metricCard: { flex: 1, backgroundColor: '#f0f0f0', padding: 15, borderRadius: 8, marginHorizontal: 5, alignItems: 'center' },
  metricLabel: { fontSize: 12, color: '#555', textAlign: 'center' },
  metricValue: { fontSize: 28, fontWeight: 'bold', color: '#ff9800', marginTop: 5 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

