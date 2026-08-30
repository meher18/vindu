import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, TextInput, FlatList
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

type DietFilter = 'all' | 'veg' | 'non-veg' | 'vegan';
type SlotFilter = 'all' | 'breakfast' | 'lunch' | 'dinner';

export default function CustomerHome() {
  const { user } = useAuthStore();
  const [dietFilter, setDietFilter] = useState<DietFilter>('all');
  const [slotFilter, setSlotFilter] = useState<SlotFilter>('all');
  const [search, setSearch] = useState('');

  // Fetch all active kitchens with their active subscriptions
  const { data: plans, isLoading } = useQuery({
    queryKey: ['discover-plans', dietFilter, slotFilter],
    queryFn: async () => {
      let query = supabase
        .from('subscriptions')
        .select(`
          id, diet_type, slot_name, price_per_day, capacity, slot_target_time,
          kitchen:kitchens (id, name, address, status)
        `)
        .eq('status', 'active')
        .eq('kitchens.status', 'active');

      if (dietFilter !== 'all') query = query.eq('diet_type', dietFilter);
      if (slotFilter !== 'all') query = query.eq('slot_name', slotFilter);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).filter((p: any) => p.kitchen !== null);
    },
  });

  // Fetch customer profile for greeting
  const { data: profile } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('full_name').eq('id', user!.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const filtered = plans?.filter((p: any) =>
    search === '' || p.kitchen?.name?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const dietTabs: { label: string; value: DietFilter; emoji: string }[] = [
    { label: 'All', value: 'all', emoji: '🍽️' },
    { label: 'Veg', value: 'veg', emoji: '🥦' },
    { label: 'Non-Veg', value: 'non-veg', emoji: '🍗' },
    { label: 'Vegan', value: 'vegan', emoji: '🌱' },
  ];

  const slotTabs: { label: string; value: SlotFilter; emoji: string }[] = [
    { label: 'All Slots', value: 'all', emoji: '⏰' },
    { label: 'Breakfast', value: 'breakfast', emoji: '☀️' },
    { label: 'Lunch', value: 'lunch', emoji: '🌤️' },
    { label: 'Dinner', value: 'dinner', emoji: '🌙' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}, {firstName}! 👋</Text>
            <Text style={styles.headerSub}>What would you like to eat today?</Text>
          </View>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => supabase.auth.signOut()}>
            <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search kitchens..."
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Diet Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          {dietTabs.map(tab => (
            <TouchableOpacity
              key={tab.value}
              style={[styles.pill, dietFilter === tab.value && styles.pillActive]}
              onPress={() => setDietFilter(tab.value)}
            >
              <Text style={styles.pillEmoji}>{tab.emoji}</Text>
              <Text style={[styles.pillText, dietFilter === tab.value && styles.pillTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Slot Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          {slotTabs.map(tab => (
            <TouchableOpacity
              key={tab.value}
              style={[styles.pill, slotFilter === tab.value && styles.pillActive]}
              onPress={() => setSlotFilter(tab.value)}
            >
              <Text style={styles.pillEmoji}>{tab.emoji}</Text>
              <Text style={[styles.pillText, slotFilter === tab.value && styles.pillTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {filtered.length > 0 ? `${filtered.length} Plans Available` : 'Available Plans'}
          </Text>
        </View>

        {/* Loading */}
        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.loadingText}>Finding meals near you...</Text>
          </View>
        )}

        {/* Empty */}
        {!isLoading && filtered.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyTitle}>No meals found</Text>
            <Text style={styles.emptySub}>Try adjusting your filters or check back later.</Text>
          </View>
        )}

        {/* Plan Cards */}
        {filtered.map((plan: any) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({ plan }: { plan: any }) {
  const isVeg = plan.diet_type === 'veg' || plan.diet_type === 'vegan';
  const dietColor = isVeg ? '#16A34A' : '#DC2626';
  const dietBg = isVeg ? '#F0FDF4' : '#FEF2F2';
  const slotEmoji = plan.slot_name === 'lunch' ? '☀️' : plan.slot_name === 'dinner' ? '🌙' : '🌅';

  return (
    <TouchableOpacity style={styles.planCard} activeOpacity={0.92}>
      {/* Card Header */}
      <View style={styles.planCardHeader}>
        <View style={styles.kitchenIconWrap}>
          <Text style={styles.kitchenIcon}>🍳</Text>
        </View>
        <View style={styles.planCardInfo}>
          <Text style={styles.kitchenName}>{plan.kitchen?.name}</Text>
          <Text style={styles.kitchenAddress} numberOfLines={1}>{plan.kitchen?.address}</Text>
        </View>
        <View style={[styles.dietBadge, { backgroundColor: dietBg }]}>
          <Text style={[styles.dietBadgeText, { color: dietColor }]}>
            {plan.diet_type.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Card Footer */}
      <View style={styles.planCardFooter}>
        <View style={styles.footerChip}>
          <Text style={styles.footerChipText}>{slotEmoji} {plan.slot_name.toUpperCase()}</Text>
        </View>
        <View style={styles.footerChip}>
          <Text style={styles.footerChipText}>🕐 {plan.slot_target_time?.slice(0, 5)}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Text style={styles.planPrice}>₹{plan.price_per_day}<Text style={styles.perDay}>/day</Text></Text>
      </View>

      <TouchableOpacity style={styles.subscribeBtn}>
        <Text style={styles.subscribeBtnText}>Subscribe →</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7F0' },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 26, fontWeight: '800', color: '#1A1A2E' },
  headerSub: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  avatarBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#FF6B35', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#FFF' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
    marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2
  },
  searchIcon: { fontSize: 18, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#1A1A2E' },

  filterRow: { marginBottom: 10 },
  filterContent: { paddingRight: 20, gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB', gap: 6
  },
  pillActive: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  pillEmoji: { fontSize: 14 },
  pillText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  pillTextActive: { color: '#FFF' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },

  center: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 16, color: '#6B7280', fontSize: 15 },

  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#6B7280', textAlign: 'center' },

  planCard: {
    backgroundColor: '#FFF', borderRadius: 24, marginBottom: 16, padding: 20,
    shadowColor: '#1A1A2E', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4
  },
  planCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kitchenIconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#FFF7F0', alignItems: 'center', justifyContent: 'center' },
  kitchenIcon: { fontSize: 28 },
  planCardInfo: { flex: 1 },
  kitchenName: { fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
  kitchenAddress: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  dietBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  dietBadgeText: { fontSize: 11, fontWeight: '800' },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 16 },

  planCardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  footerChip: { backgroundColor: '#F9FAFB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  footerChipText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  planPrice: { fontSize: 22, fontWeight: '900', color: '#FF6B35' },
  perDay: { fontSize: 13, fontWeight: '500', color: '#9CA3AF' },

  subscribeBtn: {
    backgroundColor: '#FFF7F0', borderWidth: 1.5, borderColor: '#FF6B35',
    borderRadius: 14, paddingVertical: 12, alignItems: 'center'
  },
  subscribeBtnText: { color: '#FF6B35', fontSize: 15, fontWeight: '700' },
});
