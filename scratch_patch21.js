const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu/src/app/(customer)/wallet.tsx';
let code = fs.readFileSync(path, 'utf8');

const oldImports = `import { useQuery } from '@tanstack/react-query';`;
const newImports = `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';`;
code = code.replace(oldImports, newImports);

const queryClientInject = `  const { user } = useAuthStore();`;
const queryClientInit = `  const { user } = useAuthStore();
  const queryClient = useQueryClient();`;
code = code.replace(queryClientInject, queryClientInit);

const mutationInject = `  const onRefresh = useCallback(async () => {`;
const mutationInit = `  const topUpWallet = useMutation({
    mutationFn: async (amount: number) => {
      const { error } = await supabase.rpc('top_up_wallet', { deposit_amount: amount });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['customer-wallet-tx'] });
      Alert.alert('Success', '₹2000 has been deposited to your wallet.');
    },
    onError: (err: any) => Alert.alert('Deposit Failed', err.message)
  });

  const onRefresh = useCallback(async () => {`;
code = code.replace(mutationInject, mutationInit);

const oldUI = `        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          {walletLoading
            ? <ActivityIndicator color="#FFF" style={{ marginVertical: 16 }} />
            : <Text style={styles.balanceAmount}>₹{parseFloat(wallet?.balance || 0).toFixed(2)}</Text>
          }
          <Text style={styles.balanceSub}>Auto-applied on your next subscription payment</Text>
        </View>`;
const newUI = `        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          {walletLoading
            ? <ActivityIndicator color="#FFF" style={{ marginVertical: 16 }} />
            : <Text style={styles.balanceAmount}>₹{parseFloat(wallet?.balance || 0).toFixed(2)}</Text>
          }
          <Text style={styles.balanceSub}>Auto-applied on your next subscription payment</Text>
          <TouchableOpacity 
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 12, borderRadius: 12, marginTop: 20, alignItems: 'center' }}
            onPress={() => topUpWallet.mutate(2000)}
            disabled={topUpWallet.isPending}
          >
            {topUpWallet.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 15 }}>+ Add ₹2000 (Simulated Demo)</Text>}
          </TouchableOpacity>
        </View>`;
code = code.replace(oldUI, newUI);

fs.writeFileSync(path, code);
