import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export default function WalletScreen() {
  const { user } = useAuthStore();

  const { data: wallet, isLoading } = useQuery({
    queryKey: ['my-wallet', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('wallets').select('*').eq('customer_id', user!.id).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || { balance: 0 };
    },
    enabled: !!user?.id,
  });

  const { data: transactions } = useQuery({
    queryKey: ['my-transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user?.id,
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Wallet</Text>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          {isLoading
            ? <ActivityIndicator color="#FFF" style={{ marginVertical: 12 }} />
            : <Text style={styles.balanceAmount}>₹{parseFloat(wallet?.balance || 0).toFixed(2)}</Text>
          }
          <Text style={styles.balanceSub}>Credits are auto-applied on your next order</Text>
        </View>

        {/* Info Cards */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoEmoji}>♾️</Text>
            <Text style={styles.infoLabel}>No Expiry</Text>
            <Text style={styles.infoSub}>Credits never expire</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoEmoji}>🏪</Text>
            <Text style={styles.infoLabel}>Cross-Vendor</Text>
            <Text style={styles.infoSub}>Use at any kitchen</Text>
          </View>
        </View>

        {/* Transaction History */}
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {transactions?.length === 0 && (
          <View style={styles.emptyTx}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        )}
        {transactions?.map((tx: any) => (
          <View key={tx.id} style={styles.txRow}>
            <View>
              <Text style={styles.txDesc}>{tx.description || tx.type}</Text>
              <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleDateString('en-IN')}</Text>
            </View>
            <Text style={[styles.txAmount, tx.amount > 0 ? styles.credit : styles.debit]}>
              {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toFixed(0)}
            </Text>
          </View>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7F0' },
  scroll: { padding: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#1A1A2E', marginBottom: 20 },
  balanceCard: {
    backgroundColor: '#FF6B35', borderRadius: 28, padding: 28, alignItems: 'center', marginBottom: 20,
    shadowColor: '#FF6B35', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6
  },
  balanceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 8 },
  balanceAmount: { fontSize: 48, fontWeight: '900', color: '#FFF', letterSpacing: -1 },
  balanceSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 8, textAlign: 'center' },
  infoGrid: { flexDirection: 'row', gap: 16, marginBottom: 28 },
  infoCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 20, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  infoEmoji: { fontSize: 28, marginBottom: 8 },
  infoLabel: { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  infoSub: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A2E', marginBottom: 16 },
  emptyTx: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#6B7280', fontSize: 15 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  txDesc: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  txDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  txAmount: { fontSize: 17, fontWeight: '800' },
  credit: { color: '#16A34A' },
  debit: { color: '#DC2626' },
});
