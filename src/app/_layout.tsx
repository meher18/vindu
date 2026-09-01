import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const queryClient = new QueryClient();

export default function RootLayout() {
  const { setUser, setRole, setLoading, user, isLoading, role } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

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

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string, retries = 3) => {
    try {
      const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).single();
      if (error) throw error;
      if (data) setRole(data.role as any);
    } catch (err: any) {
      if (retries > 0) {
        setTimeout(() => fetchUserRole(userId, retries - 1), 500);
        return;
      }
      console.warn("Failed to fetch role after retries:", err.message);
    }
    setLoading(false);
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
