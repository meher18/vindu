const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu/src/app/(customer)/subscriptions.tsx';
let code = fs.readFileSync(path, 'utf8');

const importSearch = `import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';`;
const importReplace = `import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity, RefreshControl, Alert } from 'react-native';`;
code = code.replace(importSearch, importReplace);

const queryImportSearch = `import { useQuery } from '@tanstack/react-query';`;
const queryImportReplace = `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';`;
code = code.replace(queryImportSearch, queryImportReplace);

const storeSearch = `  const { user } = useAuthStore();`;
const storeReplace = `  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const cancelSub = useMutation({
    mutationFn: async (subId: string) => {
      const { data, error } = await supabase.rpc('secure_cancel_subscription', { target_sub_id: subId });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      Alert.alert('Subscription Cancelled', 'Your subscription has been cancelled and any remaining prorated amount has been refunded to your wallet.');
      queryClient.invalidateQueries({ queryKey: ['my-subs'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
    onError: (err: any) => {
      Alert.alert('Cancellation Failed', err.message);
    }
  });`;
code = code.replace(storeSearch, storeReplace);

const uiSearch = `                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Price</Text>
                  <Text style={[styles.detailValue, { color: '#FF6B35' }]}>₹{plan?.price_per_day}/day</Text>
                </View>
              </View>
            </View>`;
const uiReplace = `                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Price</Text>
                  <Text style={[styles.detailValue, { color: '#FF6B35' }]}>₹{plan?.price_per_day}/day</Text>
                </View>
              </View>

              {isActive && (
                <TouchableOpacity 
                  style={styles.cancelBtn} 
                  onPress={() => {
                    Alert.alert(
                      'Cancel Subscription?',
                      'Are you sure you want to cancel? The remaining prorated amount minus any pre-refunded skips will be instantly returned to your wallet.',
                      [
                        { text: 'Keep Plan', style: 'cancel' },
                        { text: 'Cancel Plan', style: 'destructive', onPress: () => cancelSub.mutate(sub.id) }
                      ]
                    );
                  }}
                  disabled={cancelSub.isPending}
                >
                  <Text style={styles.cancelBtnText}>{cancelSub.isPending ? 'Cancelling...' : 'Cancel Subscription'}</Text>
                </TouchableOpacity>
              )}
            </View>`;
code = code.replace(uiSearch, uiReplace);

const styleSearch = `  detailValue: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
});`;
const styleReplace = `  detailValue: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  cancelBtn: { marginTop: 16, backgroundColor: '#FEF2F2', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FEE2E2' },
  cancelBtnText: { color: '#DC2626', fontSize: 14, fontWeight: '700' }
});`;
code = code.replace(styleSearch, styleReplace);

fs.writeFileSync(path, code);
