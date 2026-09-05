const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/ledger.tsx';
let code = fs.readFileSync(path, 'utf8');

const oldQueries = `  const { data: ledger, isLoading } = useQuery({`;
const newQueries = `  const { data: mrr } = useQuery({
    queryKey: ['vendor-mrr', kitchen?.id],
    queryFn: async () => {
      const { data: subs } = await supabase.from('subscriptions').select('id, vendor_fee').eq('kitchen_id', kitchen?.id);
      if (!subs || subs.length === 0) return 0;
      
      const { data: cSubs } = await supabase
        .from('customer_subscriptions')
        .select('subscription_id, quantity')
        .eq('status', 'active')
        .in('subscription_id', subs.map(s => s.id));
        
      if (!cSubs) return 0;
      
      let totalDaily = 0;
      cSubs.forEach((cs) => {
        const sub = subs.find(s => s.id === cs.subscription_id);
        totalDaily += (cs.quantity || 1) * (sub?.vendor_fee || 0);
      });
      
      return totalDaily * 30;
    },
    enabled: !!kitchen?.id,
  });

  const { data: ledger, isLoading } = useQuery({`;

code = code.replace(oldQueries, newQueries);

const oldUI = `      <ScrollView 
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B6B" />}
      >
        <View style={styles.balanceGrid}>`;
const newUI = `      <ScrollView 
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B6B" />}
      >
        <View style={[styles.balanceCard, { backgroundColor: '#101828', marginBottom: 16, borderWidth: 0, paddingVertical: 24, alignItems: 'center' }]}>
          <Text style={{ color: '#98A2B3', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Projected MRR</Text>
          <Text style={{ color: '#FFF', fontSize: 42, fontWeight: '900', marginTop: 8 }}>₹{(mrr || 0).toLocaleString('en-IN')}</Text>
          <Text style={{ color: '#667085', fontSize: 12, marginTop: 4 }}>Monthly Recurring Revenue based on active subscriptions</Text>
        </View>

        <View style={styles.balanceGrid}>`;
        
code = code.replace(oldUI, newUI);

fs.writeFileSync(path, code);
