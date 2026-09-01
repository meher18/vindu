import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export default function WalletScreen() {
  const { user } = useAuthStore();

  // Step 1: get the wallet row (which has its own UUID id)
  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useQuery({
    queryKey: ['my-wallet', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('customer_id', user!.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || { id: null, balance: 0 };
    },
    enabled: !!user?.id,
  });

  // Step 2: use wallet.id (not user.id) to get transactions
  const { data: transactions, isLoading: txLoading, refetch: refetchTx } = useQuery({
    queryKey: ['my-transactions', wallet?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', wallet!.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!wallet?.id,
  });

  const isLoading = walletLoading || txLoading;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchWallet(), refetchTx()]);
    setRefreshing(false);
  }, [refetchWallet, refetchTx]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView 
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" colors={['#FF6B35']} />}
      >
        <Text style={styles.title}>Wallet</Text>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          {walletLoading
            ? <ActivityIndicator color="#FFF" style={{ marginVertical: 16 }} />
            : <Text style={styles.balanceAmount}>₹{parseFloat(wallet?.balance || 0).toFixed(2)}</Text>
          }
          <Text style={styles.balanceSub}>Auto-applied on your next subscription payment</Text>
        </View>

        {/* Info Grid */}
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
          <View style={styles.infoCard}>
            <Text style={styles.infoEmoji}>⚡</Text>
            <Text style={styles.infoLabel}>Auto-Apply</Text>
            <Text style={styles.infoSub}>Applied automatically</Text>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
        </View>

        {txLoading && <ActivityIndicator color="#FF6B35" style={{ marginTop: 20 }} />}

        {!txLoading && transactions?.length === 0 && (
          <View style={styles.emptyTx}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No Transactions Yet</Text>
            <Text style={styles.emptyText}>Credits and debits from your deliveries will appear here.</Text>
          </View>
        )}

        {transactions?.map((tx: any) => (
          <View key={tx.id} style={styles.txRow}>
            <View style={[styles.txIcon, tx.amount > 0 ? styles.txIconCredit : styles.txIconDebit]}>
              <Text style={styles.txIconText}>{tx.amount > 0 ? '↑' : '↓'}</Text>
            </View>
            <View style={styles.txInfo}>
              <Text style={styles.txDesc}>{tx.description || tx.type?.replace('_', ' ')}</Text>
              <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
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
  balanceCard: { backgroundColor: '#FF6B35', borderRadius: 28, padding: 28, alignItems: 'center', marginBottom: 20, shadowColor: '#FF6B35', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  balanceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 8 },
  balanceAmount: { fontSize: 52, fontWeight: '900', color: '#FFF', letterSpacing: -2 },
  balanceSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 8, textAlign: 'center' },
  infoGrid: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  infoCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  infoEmoji: { fontSize: 24, marginBottom: 6 },
  infoLabel: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', marginBottom: 2 },
  infoSub: { fontSize: 11, color: '#6B7280', textAlign: 'center' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  emptyTx: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#FFF', borderRadius: 20, padding: 24 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', marginBottom: 6 },
  emptyText: { color: '#6B7280', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  txIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  txIconCredit: { backgroundColor: '#F0FDF4' },
  txIconDebit: { backgroundColor: '#FEF2F2' },
  txIconText: { fontSize: 18, fontWeight: '900' },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 15, fontWeight: '600', color: '#1A1A2E', textTransform: 'capitalize' },
  txDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  txAmount: { fontSize: 17, fontWeight: '800' },
  credit: { color: '#16A34A' },
  debit: { color: '#DC2626' },
});
