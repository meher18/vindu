import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const queryClient = new QueryClient();

function usePushNotifications(userId: string | null | undefined) {
  useEffect(() => {
    if (!userId) return;
    async function registerForPushNotificationsAsync() {
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;
        try {
          const projectId = Constants.expoConfig?.extra?.eas?.projectId || 'your-project-id';
          const token = await Notifications.getExpoPushTokenAsync({ projectId });
          await supabase.from('profiles').update({ expo_push_token: token.data }).eq('id', userId);
        } catch (error) {
          console.error('Push notification error:', error);
        }
      }
    }
    registerForPushNotificationsAsync();
  }, [userId]);
}

export default function RootLayout() {
  const retryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setUser, setRole, setLoading, user, isLoading, role } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  usePushNotifications(user?.id);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserRole(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserRole(session.user.id);
      else { setRole(null); setLoading(false); }
    });

    return () => {
      subscription.unsubscribe();
      if (retryTimeout.current) clearTimeout(retryTimeout.current);
    };
  }, []);

  const fetchUserRole = async (userId: string, retries = 5) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
      if (error) throw error;
      if (data && data.role) {
        setRole(data.role as any);
        setLoading(false);
        return;
      } else {
        throw new Error('Profile not ready');
      }
    } catch (err: any) {
      if (retries > 0) {
        retryTimeout.current = setTimeout(() => fetchUserRole(userId, retries - 1), 1000);
        return;
      }
      console.warn("Failed to fetch role after retries:", err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === '(auth)';
    
    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user) {
      // Role-Based Access Control (RBAC) Hardening
      if (role === 'vendor' || role === 'driver') {
        // Vendors and drivers must use the Vindu Partners app
        supabase.auth.signOut();
      } else if (role === 'customer' && segments[0] !== '(customer)') {
        router.replace('/(customer)');
      }
    }
  }, [user, isLoading, segments, role]);

  // Full-screen loading spinner while auth resolves
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF7F0' }
});
