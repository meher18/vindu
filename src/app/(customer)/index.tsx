import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, TextInput, Modal, Alert
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

type DietFilter = 'all' | 'veg' | 'non-veg' | 'vegan';
type SlotFilter = 'all' | 'breakfast' | 'lunch' | 'dinner';

export default function CustomerHome() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [dietFilter, setDietFilter] = useState<DietFilter>('all');
  const [slotFilter, setSlotFilter] = useState<SlotFilter>('all');
  const [search, setSearch] = useState('');

  // Profile completion state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [addressInput, setAddressInput] = useState('');

  // Fetch all active kitchens first, then their plans — correct join direction
  const { data: plans, isLoading, isError, refetch } = useQuery({
    queryKey: ['discover-plans', dietFilter, slotFilter],
    queryFn: async () => {
      const { data: kitchens, error: kErr } = await supabase
        .from('kitchens')
        .select('id, name, address')
        .eq('status', 'active');
      if (kErr) throw kErr;
      if (!kitchens || kitchens.length === 0) return [];

      const kitchenIds = kitchens.map(k => k.id);
      const kitchenMap = Object.fromEntries(kitchens.map(k => [k.id, k]));

      let query = supabase
        .from('subscriptions')
        .select('id, diet_type, slot_name, price_per_day, capacity, slot_target_time, kitchen_id')
        .eq('status', 'active')
        .in('kitchen_id', kitchenIds);

      if (dietFilter !== 'all') query = query.eq('diet_type', dietFilter);
      if (slotFilter !== 'all') query = query.eq('slot_name', slotFilter);

      const { data: subs, error: sErr } = await query;
      if (sErr) throw sErr;

      return (subs || []).map(s => ({ ...s, kitchen: kitchenMap[s.kitchen_id] }));
    },
  });

  // Fetch customer profile for greeting
  const { data: profile } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('full_name, phone, delivery_address').eq('id', user!.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profile && (!profile.phone || !profile.delivery_address)) {
      setShowProfileModal(true);
    } else {
      setShowProfileModal(false);
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!phoneInput || !addressInput) throw new Error("Please fill in both fields");
      const { error } = await supabase.from('profiles').update({
        phone: phoneInput,
        delivery_address: addressInput
      }).eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setShowProfileModal(false);
      queryClient.invalidateQueries({ queryKey: ['my-profile', user?.id] });
    },
    onError: (err: any) => Alert.alert('Error', err.message)
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
      {/* Profile Completion Modal */}
      <Modal visible={showProfileModal} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>📍</Text>
            <Text style={styles.modalTitle}>Complete Your Profile</Text>
            <Text style={styles.modalSub}>We need your delivery details before you can start ordering meals.</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phoneInput}
                onChangeText={setPhoneInput}
                placeholder="e.g. +91 9876543210"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Delivery Address</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={addressInput}
                onChangeText={setAddressInput}
                placeholder="Full address (e.g. Flat 101, Galaxy Apts...)"
                multiline
              />
            </View>

            <TouchableOpacity 
              style={styles.primaryBtn} 
              onPress={() => updateProfile.mutate()}
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Save Details</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

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
            <TouchableOpacity key={tab.value} style={[styles.pill, dietFilter === tab.value && styles.pillActive]} onPress={() => setDietFilter(tab.value)}>
              <Text style={styles.pillEmoji}>{tab.emoji}</Text>
              <Text style={[styles.pillText, dietFilter === tab.value && styles.pillTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Slot Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          {slotTabs.map(tab => (
            <TouchableOpacity key={tab.value} style={[styles.pill, slotFilter === tab.value && styles.pillActive]} onPress={() => setSlotFilter(tab.value)}>
              <Text style={styles.pillEmoji}>{tab.emoji}</Text>
              <Text style={[styles.pillText, slotFilter === tab.value && styles.pillTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{filtered.length > 0 ? `${filtered.length} Plans Available` : 'Available Plans'}</Text>
        </View>

        {/* Loading */}
        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.loadingText}>Finding meals near you...</Text>
          </View>
        )}

        {/* Error */}
        {isError && (
          <View style={styles.center}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty */}
        {!isLoading && !isError && filtered.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyTitle}>No meals found</Text>
            <Text style={styles.emptySub}>Try adjusting your filters or check back later.</Text>
          </View>
        )}

        {/* Plan Cards */}
        {filtered.map((plan: any) => <PlanCard key={plan.id} plan={plan} />)}
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
      <View style={styles.planCardHeader}>
        <View style={styles.kitchenIconWrap}><Text style={styles.kitchenIcon}>🍳</Text></View>
        <View style={styles.planCardInfo}>
          <Text style={styles.kitchenName}>{plan.kitchen?.name}</Text>
          <Text style={styles.kitchenAddress} numberOfLines={1}>{plan.kitchen?.address}</Text>
        </View>
        <View style={[styles.dietBadge, { backgroundColor: dietBg }]}>
          <Text style={[styles.dietBadgeText, { color: dietColor }]}>{plan.diet_type.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.planCardFooter}>
        <View style={styles.footerChip}><Text style={styles.footerChipText}>{slotEmoji} {plan.slot_name.toUpperCase()}</Text></View>
        <View style={styles.footerChip}><Text style={styles.footerChipText}>🕐 {plan.slot_target_time?.slice(0, 5)}</Text></View>
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
  modalSafe: { flex: 1, backgroundColor: '#FFF' },
  modalContent: { padding: 32, flex: 1, justifyContent: 'center' },
  modalEmoji: { fontSize: 64, marginBottom: 16, textAlign: 'center' },
  modalTitle: { fontSize: 28, fontWeight: '800', color: '#1A1A2E', textAlign: 'center', marginBottom: 8 },
  modalSub: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  primaryBtn: { backgroundColor: '#FF6B35', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  primaryBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 26, fontWeight: '800', color: '#1A1A2E' },
  headerSub: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  avatarBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#FF6B35', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  searchIcon: { fontSize: 18, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#1A1A2E' },
  filterRow: { marginBottom: 10 },
  filterContent: { paddingRight: 20, gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB', gap: 6 },
  pillActive: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  pillEmoji: { fontSize: 14 },
  pillText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  pillTextActive: { color: '#FFF' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  center: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 16, color: '#6B7280', fontSize: 15 },
  errorEmoji: { fontSize: 40, marginBottom: 12 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginBottom: 16 },
  retryBtn: { backgroundColor: '#FF6B35', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#FFF', fontWeight: '700' },
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#6B7280', textAlign: 'center' },
  planCard: { backgroundColor: '#FFF', borderRadius: 24, marginBottom: 16, padding: 20, shadowColor: '#1A1A2E', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
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
  subscribeBtn: { backgroundColor: '#FFF7F0', borderWidth: 1.5, borderColor: '#FF6B35', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  subscribeBtnText: { color: '#FF6B35', fontSize: 15, fontWeight: '700' },
});
