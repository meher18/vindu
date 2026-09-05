const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/index.tsx';
let code = fs.readFileSync(path, 'utf8');

const queryBodyOld = `      const calc = (dateStr: string, dayShort: string) => {
        let total = 0;
        const breakdown: Record<string, number> = {};
        
        // If the entire kitchen is closed for a holiday on this date, output absolute zero
        if (holidaySet.has(dateStr)) return { total: 0, breakdown: {} };
        
        cSubs?.forEach(sub => {
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
      };`;

const queryBodyNew = `      const calc = (dateStr: string, dayShort: string) => {
        let total = 0;
        let revenue = 0;
        let capacity = 0;
        const breakdown: Record<string, number> = {};
        
        if (holidaySet.has(dateStr)) return { total: 0, breakdown: {}, revenue: 0, capacity: 0 };
        
        plans.forEach(p => {
          if (p.status === 'active' && (!p.operating_days || p.operating_days.includes(dayShort))) {
            capacity += (p.capacity || 0);
          }
        });

        cSubs?.forEach(sub => {
          if (sub.start_date > dateStr || sub.end_date < dateStr) return; 
          if (skipSet.has(\`\${sub.id}_\${dateStr}\`)) return; 
          
          const plan = plans.find(p => p.id === sub.subscription_id);
          if (!plan) return;
          if (plan.operating_days && !plan.operating_days.includes(dayShort)) return; 
          
          const qty = sub.quantity || 1;
          total += qty;
          revenue += (plan.vendor_fee || 0) * qty;
          const key = \`\${plan.diet_type.toUpperCase()} \${plan.slot_name.toUpperCase()}\`;
          breakdown[key] = (breakdown[key] || 0) + qty;
        });
        return { total, breakdown, revenue, capacity };
      };`;
code = code.replace(queryBodyOld, queryBodyNew);


const renderOld = `          <View style={styles.forecastCard}>
            <View style={styles.forecastTop}>
              <Text style={styles.forecastTitle}>Today's Prep</Text>
              <Text style={styles.forecastTotal}>{prepForecast?.today?.total || 0} boxes</Text>
            </View>
            <View style={styles.forecastBreakdown}>
              {Object.entries(prepForecast?.today?.breakdown || {}).map(([key, qty]) => (
                <View key={key} style={styles.forecastRow}>
                  <Text style={styles.forecastKey}>{key}</Text>
                  <Text style={styles.forecastVal}>{qty as number} boxes</Text>
                </View>
              ))}
            </View>
          </View>`;

const renderNew = `          <View style={styles.forecastCard}>
            <View style={styles.forecastTop}>
              <View>
                <Text style={styles.forecastTitle}>Today's Prep</Text>
                <Text style={{ fontSize: 13, color: '#10B981', fontWeight: '800', marginTop: 4 }}>+ ₹{prepForecast?.today?.revenue?.toLocaleString() || 0} EARNINGS</Text>
              </View>
              <Text style={styles.forecastTotal}>{prepForecast?.today?.total || 0} boxes</Text>
            </View>
            
            {prepForecast?.today?.capacity > 0 && (
              <View style={{ marginTop: 16, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280' }}>Capacity Utilization</Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: ((prepForecast.today.total / prepForecast.today.capacity) > 0.9) ? '#EF4444' : '#10B981' }}>
                    {((prepForecast.today.total / prepForecast.today.capacity) * 100).toFixed(0)}%
                  </Text>
                </View>
                <View style={{ height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ 
                    height: '100%', 
                    backgroundColor: ((prepForecast.today.total / prepForecast.today.capacity) > 0.9) ? '#EF4444' : '#10B981', 
                    width: \`\${Math.min((prepForecast.today.total / prepForecast.today.capacity) * 100, 100)}%\` 
                  }} />
                </View>
              </View>
            )}

            <View style={styles.forecastBreakdown}>
              {Object.entries(prepForecast?.today?.breakdown || {}).map(([key, qty]) => (
                <View key={key} style={styles.forecastRow}>
                  <Text style={styles.forecastKey}>{key}</Text>
                  <Text style={styles.forecastVal}>{qty as number} boxes</Text>
                </View>
              ))}
            </View>
          </View>`;
code = code.replace(renderOld, renderNew);

fs.writeFileSync(path, code);
