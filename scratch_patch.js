const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/index.tsx';
let code = fs.readFileSync(path, 'utf8');

// Replace Query
const oldQuery = `  const { data: todaysOrders } = useQuery({
    queryKey: ['vendor-todays-orders', kitchen?.id],
    queryFn: async () => {
      if (!plans || plans.length === 0) return 0;
      
      const todayShort = getLocalDayShort();
      const operatingPlanIds = plans
        .filter(p => !p.operating_days || p.operating_days.includes(todayShort))
        .map(p => p.id);
        
      if (operatingPlanIds.length === 0) return 0;

      const { data } = await supabase
        .from('customer_subscriptions')
        .select('quantity, subscription_id')
        .in('subscription_id', operatingPlanIds)
        .eq('status', 'active')
        .gte('end_date', getLocalToday());
        
      if (!data) return { total: 0, breakdown: {} };
      
      let total = 0;
      const breakdown: Record<string, number> = {};
      
      data.forEach(sub => {
        const qty = sub.quantity || 1;
        total += qty;
        
        const plan = plans.find(p => p.id === sub.subscription_id);
        if (plan) {
          const key = \`\${plan.diet_type.toUpperCase()} \${plan.slot_name.toUpperCase()}\`;
          breakdown[key] = (breakdown[key] || 0) + qty;
        }
      });
      
      return { total, breakdown };
    },
    enabled: !!plans && plans.length > 0,
  });`;

const newQuery = `  const { data: prepForecast } = useQuery({
    queryKey: ['vendor-prep-forecast', kitchen?.id],
    queryFn: async () => {
      if (!plans || plans.length === 0) return { today: { total: 0, breakdown: {} }, tomorrow: { total: 0, breakdown: {} } };
      
      const todayStr = getLocalToday();
      const d = new Date(todayStr);
      d.setDate(d.getDate() + 1);
      const tomorrowStr = d.toISOString().split('T')[0];
      
      const todayDay = new Date(todayStr).toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
      const tomorrowDay = new Date(tomorrowStr).toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();

      // 1. Fetch all active subscriptions encompassing these dates
      const { data: cSubs } = await supabase
        .from('customer_subscriptions')
        .select('id, quantity, subscription_id, start_date, end_date')
        .in('subscription_id', plans.map(p => p.id))
        .eq('status', 'active')
        .lte('start_date', tomorrowStr)
        .gte('end_date', todayStr);
        
      if (!cSubs || cSubs.length === 0) return { today: { total: 0, breakdown: {} }, tomorrow: { total: 0, breakdown: {} } };

      // 2. Fetch skips for these dates
      const { data: skips } = await supabase
        .from('skips')
        .select('customer_subscription_id, skip_date')
        .in('customer_subscription_id', cSubs.map(cs => cs.id))
        .in('skip_date', [todayStr, tomorrowStr]);

      const skipSet = new Set(skips?.map(s => \`\${s.customer_subscription_id}_\${s.skip_date}\`));

      const calc = (dateStr: string, dayShort: string) => {
        let total = 0;
        const breakdown: Record<string, number> = {};
        
        cSubs.forEach(sub => {
          if (sub.start_date > dateStr || sub.end_date < dateStr) return; // Not active on this specific day
          if (skipSet.has(\`\${sub.id}_\${dateStr}\`)) return; // Customer skipped this day!
          
          const plan = plans.find(p => p.id === sub.subscription_id);
          if (!plan) return;
          if (plan.operating_days && !plan.operating_days.includes(dayShort)) return; // Kitchen closed for this plan today
          
          const qty = sub.quantity || 1;
          total += qty;
          const key = \`\${plan.diet_type.toUpperCase()} \${plan.slot_name.toUpperCase()}\`;
          breakdown[key] = (breakdown[key] || 0) + qty;
        });
        return { total, breakdown };
      };

      return {
        today: calc(todayStr, todayDay),
        tomorrow: calc(tomorrowStr, tomorrowDay)
      };
    },
    enabled: !!plans && plans.length > 0,
  });`;

// Replace UI
const oldUI = `          <View style={[styles.statCard, { paddingBottom: 12 }]}>
            <Text style={styles.statLabel}>Today's Orders</Text>
            <Text style={styles.statValue}>{todaysOrders?.total || 0}</Text>
            <Text style={styles.statSub}>Total meals to prepare</Text>
            {todaysOrders?.breakdown && Object.keys(todaysOrders.breakdown).length > 0 && (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 6 }}>
                {Object.entries(todaysOrders.breakdown).map(([key, qty]) => (
                  <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600' }}>{key}</Text>
                    <Text style={{ fontSize: 13, color: '#FF6B6B', fontWeight: '800' }}>{qty}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Active Plans</Text>
            <Text style={styles.statValue}>{plans?.length || 0}</Text>
            <Text style={styles.statSub}>Currently offering</Text>
          </View>`;

const newUI = `          <View style={[styles.statCard, { paddingBottom: 12 }]}>
            <Text style={styles.statLabel}>Today's Prep</Text>
            <Text style={styles.statValue}>{prepForecast?.today.total || 0}</Text>
            <Text style={styles.statSub}>Meals to cook today</Text>
            {prepForecast?.today.breakdown && Object.keys(prepForecast.today.breakdown).length > 0 && (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 6 }}>
                {Object.entries(prepForecast.today.breakdown).map(([key, qty]) => (
                  <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600' }}>{key}</Text>
                    <Text style={{ fontSize: 13, color: '#FF6B6B', fontWeight: '800' }}>{qty}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <View style={[styles.statCard, { paddingBottom: 12 }]}>
            <Text style={styles.statLabel}>Tomorrow's Groceries</Text>
            <Text style={styles.statValue}>{prepForecast?.tomorrow.total || 0}</Text>
            <Text style={styles.statSub}>Forecasted inventory</Text>
            {prepForecast?.tomorrow.breakdown && Object.keys(prepForecast.tomorrow.breakdown).length > 0 && (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 6 }}>
                {Object.entries(prepForecast.tomorrow.breakdown).map(([key, qty]) => (
                  <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600' }}>{key}</Text>
                    <Text style={{ fontSize: 13, color: '#FF6B6B', fontWeight: '800' }}>{qty}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>`;

code = code.replace(oldQuery, newQuery);
code = code.replace(oldUI, newUI);
fs.writeFileSync(path, code);
