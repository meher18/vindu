import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const { data: plan, isLoading } = useQuery({
    queryKey: ['plan-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, kitchens(name, address)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </SafeAreaView>
    );
  }

  if (!plan) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>Plan not found</Text>
      </SafeAreaView>
    );
  }

  const isVeg = plan.diet_type === 'veg' || plan.diet_type === 'vegan';
  const dietColor = isVeg ? '#16A34A' : '#DC2626';
  const dietBg = isVeg ? '#F0FDF4' : '#FEF2F2';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.kitchenName}>{plan.kitchens?.name}</Text>
          <Text style={styles.kitchenAddress}>{plan.kitchens?.address}</Text>
          
          <View style={styles.tagsRow}>
            <View style={[styles.badge, { backgroundColor: dietBg }]}>
              <Text style={[styles.badgeText, { color: dietColor }]}>{plan.diet_type.toUpperCase()}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#F3F4F6' }]}>
              <Text style={[styles.badgeText, { color: '#374151' }]}>{plan.slot_name.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.storyCard}>
          <Text style={styles.storyTitle}>What to expect</Text>
          <Text style={styles.storyText}>
            This is a premium {plan.diet_type} {plan.slot_name} plan curated by {plan.kitchens?.name}. 
            Every day, you'll receive a freshly prepared, homestyle meal crafted with local ingredients. 
            The menu rotates daily to ensure you never get bored, featuring a balanced mix of proteins, carbs, and fresh vegetables.
          </Text>
          
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>✨ Daily rotating {plan.diet_type} menu</Text>
            <Text style={styles.bullet}>🚚 {plan.delivery_type === 'takeaway' ? 'Pick it up hot from the kitchen' : 'Delivered right to your door'}</Text>
            <Text style={styles.bullet}>⏰ Ready by {plan.slot_target_time?.slice(0, 5)}</Text>
            <Text style={styles.bullet}>⏸️ {plan.allow_skips ? 'Flexible skipping allowed' : 'Fixed schedule (No skips)'}</Text>
          </View>
        </View>

        <View style={styles.priceFooter}>
          <View>
            <Text style={styles.price}>₹{plan.price_per_day}<Text style={styles.perDay}> / day</Text></Text>
            <Text style={styles.etaText}>
              {plan.delivery_type === 'takeaway' 
                ? `Pick up ~${plan.slot_target_time?.slice(0, 5)}`
                : `Est. delivery ~${plan.slot_target_time?.slice(0, 5)} (±15 min)`}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.subscribeBtn}
            onPress={() => {
              // Navigate back to index and trigger purchase modal with this ID
              router.navigate({ pathname: '/(customer)', params: { purchasePlanId: plan.id } });
            }}
          >
            <Text style={styles.subscribeBtnText}>Select Plan</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7F0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20 },
  backBtn: { marginBottom: 20 },
  backText: { fontSize: 16, color: '#FF6B35', fontWeight: '600' },
  header: { marginBottom: 24 },
  kitchenName: { fontSize: 28, fontWeight: '800', color: '#1A1A2E' },
  kitchenAddress: { fontSize: 15, color: '#6B7280', marginTop: 4 },
  tagsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  storyCard: { backgroundColor: '#FFF', padding: 24, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3, marginBottom: 24 },
  storyTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A2E', marginBottom: 12 },
  storyText: { fontSize: 15, color: '#4B5563', lineHeight: 24, marginBottom: 16 },
  bulletList: { gap: 10 },
  bullet: { fontSize: 15, color: '#374151', fontWeight: '500' },
  priceFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  price: { fontSize: 26, fontWeight: '900', color: '#FF6B35' },
  perDay: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  etaText: { fontSize: 12, color: '#6B7280', marginTop: 4, fontWeight: '500' },
  subscribeBtn: { backgroundColor: '#FF6B35', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  subscribeBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
