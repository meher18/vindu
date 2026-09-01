import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export default function MySubscriptions() {
  const { user } = useAuthStore();

  const { data: subs, isLoading, refetch } = useQuery({
    queryKey: ['my-subs', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_subscriptions')
        .select(`
          id, start_date, end_date, quantity, status,
          subscription:subscriptions (
            diet_type, slot_name, price_per_day,
            kitchen:kitchens (name, address)
          )
        `)
        .eq('customer_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>My Plans</Text>
        <Text style={styles.subtitle}>All your active subscriptions</Text>
      </View>
      <ScrollView 
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" colors={['#FF6B35']} />}
      >
        {isLoading && <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#FF6B35" />}

        {!isLoading && subs?.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>No Active Plans</Text>
            <Text style={styles.emptySub}>Head over to Discover to subscribe to your first meal plan!</Text>
          </View>
        )}

        {subs?.map((sub: any) => {
          const plan = sub.subscription;
          const isActive = sub.status === 'active';
          const isVeg = plan?.diet_type === 'veg' || plan?.diet_type === 'vegan';
          return (
            <View key={sub.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.kitchenName}>{plan?.kitchen?.name}</Text>
                  <Text style={styles.planName}>{plan?.diet_type?.toUpperCase()} {plan?.slot_name?.toUpperCase()}</Text>
                </View>
                <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
                  <Text style={[styles.badgeText, isActive ? styles.badgeTextActive : styles.badgeTextInactive]}>
                    {sub.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.cardDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>From</Text>
                  <Text style={styles.detailValue}>{new Date(sub.start_date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Until</Text>
                  <Text style={styles.detailValue}>{new Date(sub.end_date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Qty</Text>
                  <Text style={styles.detailValue}>{sub.quantity} portion{sub.quantity > 1 ? 's' : ''}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Price</Text>
                  <Text style={[styles.detailValue, { color: '#FF6B35' }]}>₹{plan?.price_per_day}/day</Text>
                </View>
              </View>
            </View>
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7F0' },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, backgroundColor: '#FFF7F0' },
  title: { fontSize: 28, fontWeight: '800', color: '#1A1A2E' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  scroll: { paddingHorizontal: 20 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#1A1A2E', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  kitchenName: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  planName: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeActive: { backgroundColor: '#F0FDF4' },
  badgeInactive: { backgroundColor: '#F9FAFB' },
  badgeText: { fontSize: 11, fontWeight: '800' },
  badgeTextActive: { color: '#16A34A' },
  badgeTextInactive: { color: '#6B7280' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 16 },
  cardDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  detailItem: {},
  detailLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  detailValue: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
});
