import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Calendar } from 'react-native-calendars';
import { getISTDateString } from '@/utils/dateUtils';

const generateCalendarDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
};

export default function CalendarScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const { data: customerSubscriptions, isLoading: isLoadingSubs, refetch: refetchSubs, isRefetching: isRefetchingSubs } = useQuery({
    queryKey: ['customerSubscriptions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_subscriptions')
        .select(`
          id, start_date, end_date, status, quantity, premium_unlocked,
          subscriptions (*)
        `)
        .eq('customer_id', user?.id)
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const hasPremium = customerSubscriptions?.some((cs: any) => cs.premium_unlocked === true) ?? false;

  const startDateStr = getISTDateString(new Date(year, month, 1));
  const endDateStr = getISTDateString(new Date(year, month + 1, 0));

  const subIds = customerSubscriptions?.map((sub: any) => sub.id) || [];

  const { data: deliveries, isLoading: isLoadingDel, refetch: refetchDel, isRefetching: isRefetchingDel } = useQuery({
    queryKey: ['deliveries', year, month, subIds],
    queryFn: async () => {
      if (subIds.length === 0) return [];
      const { data, error } = await supabase
        .from('deliveries')
        .select('*, delivery_secrets(otp_code)')
        .in('customer_subscription_id', subIds)
        .gte('date', startDateStr)
        .lte('date', endDateStr);
      
      if (error) throw error;
      return data;
    },
    enabled: subIds.length > 0,
  });

  const { data: skips, isLoading: isLoadingSkips, refetch: refetchSkips, isRefetching: isRefetchingSkips } = useQuery({
    queryKey: ['skips', year, month, subIds],
    queryFn: async () => {
      if (subIds.length === 0) return [];
      const { data, error } = await supabase
        .from('skips')
        .select('*')
        .in('customer_subscription_id', subIds)
        .gte('date', startDateStr)
        .lte('date', endDateStr);
      
      if (error) throw error;
      return data;
    },
    enabled: subIds.length > 0,
  });

  const isLoading = isLoadingSubs || isLoadingDel || isLoadingSkips;
  const isRefetching = isRefetchingSubs || isRefetchingDel || isRefetchingSkips;

  const onRefresh = useCallback(() => {
    refetchSubs();
    refetchDel();
    refetchSkips();
  }, [refetchSubs, refetchDel, refetchSkips]);

  const skipMutation = useMutation({
    mutationFn: async ({ customer_subscription_id, date, price_per_day }: { customer_subscription_id: string, date: string, price_per_day: number }) => {
      const { data, error } = await supabase
        .from('skips')
        .insert({
          customer_subscription_id,
          date,
          credited_amount: price_per_day,
        });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skips'] });
      Alert.alert('Success', 'Day skipped successfully.');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    }
  });

  const handleSkip = (customer_subscription_id: string, date: string, price_per_day: number) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date === getISTDateString(tomorrow) && today.getHours() >= 20) {
      Alert.alert('Skip deadline missed', 'Skip deadline missed (8 PM)');
      return;
    }

    Alert.alert(
      'Skip Delivery',
      'Are you sure you want to skip delivery for this day?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Skip', 
          style: 'destructive',
          onPress: () => skipMutation.mutate({ customer_subscription_id, date, price_per_day })
        }
      ]
    );
  };

  const calendarDays = useMemo(() => generateCalendarDays(year, month), [year, month]);
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const getDayStatus = (day: number) => {
    if (!day) return null;
    const dateStr = getISTDateString(new Date(year, month, day));
    
    // Check skips
    const skip = skips?.find((s: any) => s.date.startsWith(dateStr));
    if (skip) return 'skipped';

    // Check deliveries
    const delivery = deliveries?.find((d: any) => d.date.startsWith(dateStr));
    if (delivery) {
      if (delivery.status === 'delivered') return 'delivered';
      return 'scheduled';
    }

    // Check if it's an operating day for any sub
    const dayOfWeek = new Date(year, month, day).getDay();
    const isOperatingDay = customerSubscriptions?.some((cs: any) => {
      const sub = cs.subscriptions;
      const daysMap = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return sub?.operating_days?.includes(daysMap[dayOfWeek]);
    });

    if (isOperatingDay) {
      const todayStr = getISTDateString();
      if (dateStr < todayStr) return 'missed';
      return 'scheduled';
    }

    return 'none';
  };

  const getDotColor = (status: string | null) => {
    switch (status) {
      case 'delivered': return 'green';
      case 'scheduled': return 'orange';
      case 'skipped': return 'red';
      default: return 'transparent';
    }
  };

  const renderSelectedDateDetails = () => {
    if (!selectedDate) return null;

    if (customerSubscriptions?.length === 0) {
      return (
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>No Active Subscriptions</Text>
          <Text style={styles.detailText}>You don't have any active subscriptions.</Text>
        </View>
      );
    }

    const dateStr = getISTDateString(selectedDate);
    const todayStr = getISTDateString();
    
    return customerSubscriptions?.map((cs: any) => {
      const sub = cs.subscriptions;
      const skip = skips?.find((s: any) => s.customer_subscription_id === cs.id && s.date.startsWith(dateStr));
      const delivery = deliveries?.find((d: any) => d.customer_subscription_id === cs.id && d.date.startsWith(dateStr));
      
      const dayOfWeek = selectedDate.getDay();
      const daysMap = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const isOperatingDay = sub?.operating_days?.includes(daysMap[dayOfWeek]);

      if (!isOperatingDay) return null;

      return (
        <View key={cs.id} style={styles.detailCard}>
          <Text style={styles.detailTitle}>{sub?.kitchen_name || 'Kitchen'} - {sub?.slot_name}</Text>
          <Text style={styles.detailText}>Diet: {sub?.diet_type}</Text>

          {skip ? (
             <View style={styles.badgeContainer}>
               <Text style={styles.skippedBadge}>Skipped</Text>
             </View>
          ) : delivery ? (
            <View>
              <Text style={styles.detailText}>Status: {delivery.status}</Text>
              {dateStr === todayStr && delivery.delivery_secrets?.[0]?.otp_code && (
                <Text style={styles.detailText}>OTP: {delivery.delivery_secrets[0].otp_code}</Text>
              )}
            </View>
          ) : dateStr >= todayStr ? (
            hasPremium ? (
              <TouchableOpacity 
                style={{ backgroundColor: '#FEF2F2', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FEE2E2' }}
                onPress={() => handleSkip(cs.id, dateStr, sub?.price_per_day || 0)}
                disabled={skipMutation.isPending}
              >
                <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 14 }}>⏭ Skip This Day</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={{ backgroundColor: '#FFF7ED', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FED7AA' }}
                onPress={() => Alert.alert('Premium Feature 🔒', 'Skip deliveries with Flexi Skip — a one-time Premium unlock. Coming soon with Razorpay integration.')}
              >
                <Text style={{ color: '#C2410C', fontWeight: '700', fontSize: 14 }}>🔒 Skip This Day (Premium)</Text>
              </TouchableOpacity>
            )
          ) : (
             <Text style={styles.detailText}>Missed Delivery</Text>
          )}
        </View>
      );
    });
  };

  // Generate marked dates for react-native-calendars
  const markedDates: any = {};
  if (selectedDate) {
    const dStr = selectedDate.toISOString().split('T')[0];
    markedDates[dStr] = { selected: true, selectedColor: '#FF6B35' };
  }

  // Iterate through all days of the current month to add dots
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    const dStr = new Date(Date.UTC(year, month, i)).toISOString().split('T')[0];
    const status = getDayStatus(i);
    const dotColor = getDotColor(status);
    
    if (dotColor !== 'transparent') {
      if (!markedDates[dStr]) markedDates[dStr] = {};
      markedDates[dStr].marked = true;
      markedDates[dStr].dotColor = dotColor;
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#FF6B35" />
        }
      >
        <View style={styles.calendarCard}>
          <Calendar
            current={new Date(year, month, 1).toISOString().split('T')[0]}
            onDayPress={(day: any) => setSelectedDate(new Date(day.timestamp))}
            onMonthChange={(monthData: any) => {
              setMonth(monthData.month - 1);
              setYear(monthData.year);
            }}
            markedDates={markedDates}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#b6c1cd',
              selectedDayBackgroundColor: '#FF6B35',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#FF6B35',
              dayTextColor: '#2d4150',
              textDisabledColor: '#d9e1e8',
              dotColor: '#FF6B35',
              selectedDotColor: '#ffffff',
              arrowColor: '#FF6B35',
              monthTextColor: '#1A1A2E',
              indicatorColor: '#FF6B35',
              textDayFontWeight: '500',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14
            }}
          />
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#FF6B35" style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.detailsContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.detailsHeader}>
                {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'Select a date'}
              </Text>
            </View>
            {renderSelectedDateDetails()}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 16,
  },
  calendarCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 24,
  },
  detailsContainer: {
    paddingBottom: 40,
  },
  detailsHeader: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  detailCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6'
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '500'
  },
  badgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  skippedBadge: {
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#FF6B35',
    fontWeight: '600',
    fontSize: 14,
  },
});
