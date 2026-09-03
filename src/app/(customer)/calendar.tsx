import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const generateCalendarDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
};

export default function CalendarScreen() {
  const { session } = useAuthStore();
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
    queryKey: ['customerSubscriptions', session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_subscriptions')
        .select(`
          *,
          subscriptions (*)
        `)
        .eq('customer_id', session?.user?.id)
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const startDateStr = new Date(year, month, 1).toISOString();
  const endDateStr = new Date(year, month + 1, 0).toISOString();

  const subIds = customerSubscriptions?.map((sub: any) => sub.id) || [];

  const { data: deliveries, isLoading: isLoadingDel, refetch: refetchDel, isRefetching: isRefetchingDel } = useQuery({
    queryKey: ['deliveries', year, month, subIds],
    queryFn: async () => {
      if (subIds.length === 0) return [];
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
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
    const dateStr = new Date(Date.UTC(year, month, day)).toISOString().split('T')[0];
    
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
      const todayStr = new Date().toISOString().split('T')[0];
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

    const dateStr = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())).toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];
    
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
              {dateStr === todayStr && delivery.otp_code && (
                <Text style={styles.detailText}>OTP: {delivery.otp_code}</Text>
              )}
            </View>
          ) : dateStr >= todayStr ? (
            <TouchableOpacity 
              style={styles.skipButton}
              onPress={() => handleSkip(cs.id, dateStr, sub?.price_per_day || 0)}
              disabled={skipMutation.isPending}
            >
              <Text style={styles.skipButtonText}>
                {skipMutation.isPending ? 'Skipping...' : 'Skip This Day'}
              </Text>
            </TouchableOpacity>
          ) : (
             <Text style={styles.detailText}>Missed Delivery</Text>
          )}
        </View>
      );
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.arrowButton}>
          <Text style={styles.arrowText}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{monthNames[month]} {year}</Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.arrowButton}>
          <Text style={styles.arrowText}>{">"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
        }
      >
        <View style={styles.calendarCard}>
          <View style={styles.weekRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <Text key={`wk-${i}`} style={styles.weekText}>{day}</Text>
            ))}
          </View>
          
          <View style={styles.daysGrid}>
            {calendarDays.map((day, index) => {
              const status = getDayStatus(day);
              const isSelected = day && selectedDate && 
                               selectedDate.getDate() === day && 
                               selectedDate.getMonth() === month && 
                               selectedDate.getFullYear() === year;

              return (
                <TouchableOpacity 
                  key={`day-${index}`} 
                  style={[styles.dayCell, isSelected && styles.selectedDayCell]}
                  onPress={() => day && setSelectedDate(new Date(year, month, day))}
                  disabled={!day}
                >
                  <Text style={[styles.dayText, !day && styles.emptyDayText]}>{day || ''}</Text>
                  {day && (
                    <View style={[styles.dot, { backgroundColor: getDotColor(status) }]} />
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#FF6B35" style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsHeader}>
              Details for {selectedDate ? selectedDate.toDateString() : 'None'}
            </Text>
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
    backgroundColor: '#FFF7F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  arrowButton: {
    padding: 10,
  },
  arrowText: {
    fontSize: 24,
    color: '#FF6B35',
  },
  scrollContent: {
    padding: 16,
  },
  calendarCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekText: {
    width: 40,
    textAlign: 'center',
    fontWeight: '600',
    color: '#666',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    borderRadius: 10,
  },
  selectedDayCell: {
    backgroundColor: '#FFF0E5',
  },
  dayText: {
    fontSize: 16,
    color: '#333',
  },
  emptyDayText: {
    color: 'transparent',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  detailsContainer: {
    marginTop: 24,
  },
  detailsHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  detailCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  badgeContainer: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  skippedBadge: {
    color: 'red',
    fontSize: 12,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: 12,
    backgroundColor: '#FFF0E5',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#FF6B35',
    fontWeight: '600',
    fontSize: 14,
  },
});
