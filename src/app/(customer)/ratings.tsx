import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

// Star rating component
function StarRating({ stars, onSet }: { stars: number; onSet: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity key={n} onPress={() => onSet(n)}>
          <Text style={{ fontSize: 32 }}>{n <= stars ? '⭐' : '☆'}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function RatingsScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [foodStars, setFoodStars] = useState(0);
  const [driverStars, setDriverStars] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [activeDelivery, setActiveDelivery] = useState<any>(null);

  // Fetch deliveries that were completed in the last 24h and have NOT been rated yet
  const { data: pendingRatings, isLoading } = useQuery({
    queryKey: ['pending-ratings', user?.id],
    queryFn: async () => {
      const since = new Date();
      since.setHours(since.getHours() - 24);

      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          id, date, delivered_at, otp_code,
          customer_subscriptions!inner (
            customer_id,
            subscription_id,
            subscriptions!inner (
              diet_type, slot_name,
              kitchens!inner (id, name)
            )
          )
        `)
        .eq('status', 'delivered')
        .eq('customer_subscriptions.customer_id', user!.id)
        .gte('delivered_at', since.toISOString())
        .order('delivered_at', { ascending: false });

      if (error) throw error;

      // Filter out already-rated deliveries
      const deliveryIds = (data || []).map(d => d.id);
      if (deliveryIds.length === 0) return [];

      const { data: existingRatings } = await supabase
        .from('ratings')
        .select('delivery_id')
        .in('delivery_id', deliveryIds)
        .eq('customer_id', user!.id);

      const ratedIds = new Set((existingRatings || []).map(r => r.delivery_id));
      return (data || []).filter(d => !ratedIds.has(d.id));
    },
    enabled: !!user?.id,
  });

  const submitRating = useMutation({
    mutationFn: async () => {
      if (!activeDelivery) throw new Error('No delivery selected');
      if (foodStars === 0) throw new Error('Please rate the food before submitting');

      const kitchen = activeDelivery.customer_subscriptions?.subscriptions?.kitchens;

      const { error } = await supabase.from('ratings').insert({
        delivery_id: activeDelivery.id,
        customer_id: user!.id,
        kitchen_id: kitchen?.id,
        food_stars: foodStars,
        driver_stars: driverStars > 0 ? driverStars : null,
        review_text: reviewText.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-ratings'] });
      setActiveDelivery(null);
      setFoodStars(0);
      setDriverStars(0);
      setReviewText('');
      Alert.alert('Thank you! 🙏', 'Your rating has been submitted. It helps our kitchen partners improve!');
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color="#FF6B35" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Rate Your Meals</Text>
        <Text style={styles.subtitle}>Help improve your kitchen partners</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {!pendingRatings || pendingRatings.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>⭐</Text>
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptySub}>No deliveries waiting to be rated. Ratings appear within 24 hours after delivery.</Text>
          </View>
        ) : (
          pendingRatings.map((delivery: any) => {
            const kitchen = delivery.customer_subscriptions?.subscriptions?.kitchens;
            const sub = delivery.customer_subscriptions?.subscriptions;
            const isActive = activeDelivery?.id === delivery.id;
            const deliveredAt = delivery.delivered_at ? new Date(delivery.delivered_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

            return (
              <View key={delivery.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.kitchenName}>{kitchen?.name}</Text>
                    <Text style={styles.planName}>{sub?.diet_type?.toUpperCase()} · {sub?.slot_name?.toUpperCase()}</Text>
                    <Text style={styles.deliveredAt}>Delivered at {deliveredAt}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.rateBtn, isActive && { backgroundColor: '#F3F4F6' }]}
                    onPress={() => setActiveDelivery(isActive ? null : delivery)}
                  >
                    <Text style={styles.rateBtnText}>{isActive ? 'Cancel' : '⭐ Rate'}</Text>
                  </TouchableOpacity>
                </View>

                {isActive && (
                  <View style={styles.ratingForm}>
                    <View style={styles.divider} />

                    <Text style={styles.ratingLabel}>Food Rating *</Text>
                    <StarRating stars={foodStars} onSet={setFoodStars} />

                    <Text style={[styles.ratingLabel, { marginTop: 20 }]}>Driver Rating (optional)</Text>
                    <StarRating stars={driverStars} onSet={setDriverStars} />

                    <Text style={[styles.ratingLabel, { marginTop: 20 }]}>Write a Review (optional)</Text>
                    <TextInput
                      style={styles.reviewInput}
                      multiline
                      numberOfLines={3}
                      placeholder="How was the food today? Any feedback for the kitchen?"
                      placeholderTextColor="#9CA3AF"
                      value={reviewText}
                      onChangeText={setReviewText}
                    />

                    <TouchableOpacity
                      style={[styles.submitBtn, submitRating.isPending && { opacity: 0.7 }]}
                      onPress={() => submitRating.mutate()}
                      disabled={submitRating.isPending}
                    >
                      {submitRating.isPending
                        ? <ActivityIndicator color="#FFF" />
                        : <Text style={styles.submitBtnText}>Submit Rating</Text>
                      }
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7F0' },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#1A1A2E' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#1A1A2E', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  kitchenName: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  planName: { fontSize: 13, color: '#6B7280', marginTop: 3 },
  deliveredAt: { fontSize: 12, color: '#9CA3AF', marginTop: 3 },
  rateBtn: { backgroundColor: '#FFF7ED', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#FDBA74' },
  rateBtnText: { color: '#C2410C', fontWeight: '700', fontSize: 13 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 16 },
  ratingForm: {},
  ratingLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  reviewInput: { backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 15, color: '#1A1A2E', marginTop: 4, textAlignVertical: 'top', minHeight: 80 },
  submitBtn: { marginTop: 20, backgroundColor: '#FF6B35', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

