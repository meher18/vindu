const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/plans.tsx';
let code = fs.readFileSync(path, 'utf8');

const oldUI = `          <View style={{ backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, marginTop: 12, marginBottom: 24, borderWidth: 1, borderColor: '#F3F4F6' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 14, color: '#6B7280' }}>Your Net Share ({((config?.vendor_split_pct || 0.7) * 100).toFixed(0)}%)</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#10B981' }}>₹{(price * (config?.vendor_split_pct || 0.7)).toFixed(0)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 14, color: '#6B7280' }}>Driver Payout ({((config?.driver_split_pct || 0.2) * 100).toFixed(0)}%)</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>₹{(price * (config?.driver_split_pct || 0.2)).toFixed(0)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, color: '#6B7280' }}>Platform Fee</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>₹{(price * (1 - (config?.vendor_split_pct || 0.7) - (config?.driver_split_pct || 0.2))).toFixed(0)}</Text>
            </View>
          </View>`;

const newUI = `          <View style={{ backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, marginTop: 12, marginBottom: 24, borderWidth: 1, borderColor: '#F3F4F6' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 14, color: '#6B7280' }}>Your Net Share ({((config?.vendor_split_pct || 0.7) * 100).toFixed(0)}%)</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#10B981' }}>₹{(price * (config?.vendor_split_pct || 0.7)).toFixed(0)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, color: '#6B7280' }}>Platform Deduction ({((1 - (config?.vendor_split_pct || 0.7)) * 100).toFixed(0)}%)</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>₹{(price * (1 - (config?.vendor_split_pct || 0.7))).toFixed(0)}</Text>
            </View>
          </View>`;

code = code.replace(oldUI, newUI);
fs.writeFileSync(path, code);
