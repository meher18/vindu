const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/plans.tsx';
let code = fs.readFileSync(path, 'utf8');

const oldRender = `              <View style={styles.cardFooter}>
                <View style={styles.footerItem}>
                  <Text style={styles.footerLabel}>Target Time</Text>
                  <Text style={styles.footerValue}>{formatTime(plan.slot_target_time)}</Text>
                </View>
                <View style={styles.footerItem}>
                  <Text style={styles.footerLabel}>Your Share</Text>
                  <Text style={styles.footerValue}>₹{plan.vendor_fee}/day</Text>
                </View>
              </View>`;

const newRender = `              <View style={styles.cardFooter}>
                <View style={styles.footerItem}>
                  <Text style={styles.footerLabel}>Target Time</Text>
                  <Text style={styles.footerValue}>{formatTime(plan.slot_target_time)}</Text>
                </View>
                <View style={styles.footerItem}>
                  <Text style={styles.footerLabel}>Plan MRR</Text>
                  <Text style={[styles.footerValue, { color: '#027A48' }]}>₹{((subscribers * plan.vendor_fee * 30) || 0).toLocaleString('en-IN')}</Text>
                </View>
              </View>
              
              {subscribers > 0 && (subscribers / plan.capacity >= 0.8) && !isFull && (
                <View style={{ position: 'absolute', top: -10, right: -10, backgroundColor: '#FFEDD5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#FDBA74', shadowColor: '#EA580C', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 }}>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: '#C2410C', letterSpacing: 1 }}>🔥 SELLING FAST</Text>
                </View>
              )}
              {isFull && (
                <View style={{ position: 'absolute', top: -10, right: -10, backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#FECACA', shadowColor: '#DC2626', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 }}>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: '#991B1B', letterSpacing: 1 }}>🚫 SOLD OUT</Text>
                </View>
              )}`;
              
code = code.replace(oldRender, newRender);

fs.writeFileSync(path, code);
