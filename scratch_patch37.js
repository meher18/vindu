const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/plans.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Update the UI to remove the deduction breakdown
const uiOld = `          <View style={{ backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, marginTop: 12, marginBottom: 24, borderWidth: 1, borderColor: '#F3F4F6' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 14, color: '#6B7280' }}>Your Net Share ({((config?.vendor_split_pct || 0.79) * 100).toFixed(0)}%)</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#10B981' }}>₹{(price * (config?.vendor_split_pct || 0.79)).toFixed(0)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, color: '#6B7280' }}>Platform Deduction ({((1 - (config?.vendor_split_pct || 0.79)) * 100).toFixed(0)}%)</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>₹{(price * (1 - (config?.vendor_split_pct || 0.79))).toFixed(0)}</Text>
            </View>
          </View>`;
const uiNew = `          <View style={{ backgroundColor: '#ECFDF5', padding: 16, borderRadius: 12, marginTop: 12, marginBottom: 24, borderWidth: 1, borderColor: '#D1FAE5' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#065F46', fontWeight: '600' }}>Your Guaranteed Payout</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#059669' }}>₹{price}/meal</Text>
            </View>
            <Text style={{ fontSize: 12, color: '#047857', marginTop: 8 }}>
              The customer app will automatically mark up the final price to cover delivery and platform service fees.
            </Text>
          </View>`;
code = code.replace(uiOld, uiNew);

// 2. Fix the label from "Price per Day (₹)" to "Your Desired Payout (₹)"
code = code.replace('<Text style={styles.label}>Price per Day (₹)</Text>', '<Text style={styles.label}>Your Desired Payout per Meal (₹)</Text>');

// 3. Update the insert mutation payload to pass 'vendor_fee' instead of 'price_per_day'
const insertOld = `        delivery_type: 'home_delivery',
        price_per_day: price,
        vendor_fee: Math.round(price * (config?.vendor_split_pct || 0.79) * 100) / 100,
        delivery_fee: Math.round(price * (config?.driver_split_pct || 0.20) * 100) / 100,
        capacity,`;
const insertNew = `        delivery_type: 'home_delivery',
        price_per_day: price, // Placeholder, Postgres will overwrite this
        vendor_fee: price,    // This is the true source metric now
        delivery_fee: 0,      // Placeholder, Postgres will overwrite this
        capacity,`;
code = code.replace(insertOld, insertNew);

fs.writeFileSync(path, code);
