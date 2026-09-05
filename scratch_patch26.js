const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/ledger.tsx';
let code = fs.readFileSync(path, 'utf8');

const txOld = `              <View style={styles.txInfo}>
                <Text style={styles.txDesc}>Meal Delivery Payout</Text>
                <Text style={styles.txDate}>{date} · {tx.status.toUpperCase()}</Text>
              </View>
              <Text style={[styles.txAmount, val < 0 && styles.txNegative]}>
                {val > 0 ? '+' : ''}₹{Math.abs(val).toFixed(0)}
              </Text>
            </View>`;

const txNew = `              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={styles.txDesc}>Delivery Payout</Text>
                  <Text style={[styles.txAmount, val < 0 && styles.txNegative]}>
                    {val > 0 ? '+' : ''}₹{Math.abs(val).toFixed(0)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.txDate}>{date} · {tx.status.toUpperCase()}</Text>
                  <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600' }}>Gross: ₹{tx.gross_amount} · Fee: -₹{tx.platform_fee}</Text>
                </View>
              </View>
            </View>`;
code = code.replace(txOld, txNew);

fs.writeFileSync(path, code);
