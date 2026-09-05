const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/index.tsx';
let code = fs.readFileSync(path, 'utf8');

const calcOld = `      const calc = (dateStr: string, dayShort: string) => {
        let total = 0;
        const breakdown: Record<string, number> = {};
        
        if (holidaySet.has(dateStr)) return { total, breakdown };
        
        cSubs?.forEach(sub => {
          if (sub.status !== 'active') return;
          if (sub.start_date > dateStr || sub.end_date < dateStr) return;
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

const calcNew = `      const calc = (dateStr: string, dayShort: string) => {
        let total = 0;
        let revenue = 0;
        const breakdown: Record<string, number> = {};
        
        if (holidaySet.has(dateStr)) return { total, breakdown, revenue };
        
        cSubs?.forEach(sub => {
          if (sub.status !== 'active') return;
          if (sub.start_date > dateStr || sub.end_date < dateStr) return;
          if (skipSet.has(\`\${sub.id}_\${dateStr}\`)) return; // Customer skipped this day!
          
          const plan = plans.find(p => p.id === sub.subscription_id);
          if (!plan) return;
          if (plan.operating_days && !plan.operating_days.includes(dayShort)) return; // Kitchen closed for this plan today
          
          const qty = sub.quantity || 1;
          total += qty;
          revenue += (plan.vendor_fee || 0) * qty;
          const key = \`\${plan.diet_type.toUpperCase()} \${plan.slot_name.toUpperCase()}\`;
          breakdown[key] = (breakdown[key] || 0) + qty;
        });
        return { total, breakdown, revenue };
      };`;
code = code.replace(calcOld, calcNew);

const uiOld = `          <View style={styles.forecastCard}>
            <View style={styles.forecastTop}>
              <Text style={styles.forecastTitle}>Today's Prep</Text>
              <Text style={styles.forecastTotal}>{prepForecast?.today?.total || 0} boxes</Text>
            </View>`;

const uiNew = `          <View style={styles.forecastCard}>
            <View style={styles.forecastTop}>
              <View>
                <Text style={styles.forecastTitle}>Today's Prep</Text>
                <Text style={{ fontSize: 13, color: '#10B981', fontWeight: '800', marginTop: 4 }}>+ ₹{prepForecast?.today?.revenue?.toLocaleString() || 0} EARNINGS</Text>
              </View>
              <Text style={styles.forecastTotal}>{prepForecast?.today?.total || 0} boxes</Text>
            </View>`;
code = code.replace(uiOld, uiNew);

const uiTomorrowOld = `          <View style={[styles.forecastCard, { backgroundColor: '#F9FAFB' }]}>
            <View style={styles.forecastTop}>
              <Text style={[styles.forecastTitle, { color: '#6B7280' }]}>Tomorrow's Forecast</Text>
              <Text style={[styles.forecastTotal, { color: '#6B7280' }]}>{prepForecast?.tomorrow?.total || 0} boxes</Text>
            </View>`;

const uiTomorrowNew = `          <View style={[styles.forecastCard, { backgroundColor: '#F9FAFB' }]}>
            <View style={styles.forecastTop}>
              <View>
                <Text style={[styles.forecastTitle, { color: '#6B7280' }]}>Tomorrow's Forecast</Text>
                <Text style={{ fontSize: 13, color: '#10B981', fontWeight: '800', marginTop: 4, opacity: 0.7 }}>+ ₹{prepForecast?.tomorrow?.revenue?.toLocaleString() || 0} EARNINGS</Text>
              </View>
              <Text style={[styles.forecastTotal, { color: '#6B7280' }]}>{prepForecast?.tomorrow?.total || 0} boxes</Text>
            </View>`;
code = code.replace(uiTomorrowOld, uiTomorrowNew);

fs.writeFileSync(path, code);
