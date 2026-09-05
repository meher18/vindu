const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/dispatch.tsx';
let code = fs.readFileSync(path, 'utf8');

const importSearch = `import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView, RefreshControl } from 'react-native';`;
const importReplace = `import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView, RefreshControl, Modal } from 'react-native';`;
code = code.replace(importSearch, importReplace);

const stateInject = `  const { data: dispatchBatches, isLoading, isRefetching, refetch } = useQuery({`;
const stateInit = `  const [activeBatch, setActiveBatch] = useState<any>(null);
  const { data: dispatchBatches, isLoading, isRefetching, refetch } = useQuery({`;
code = code.replace(stateInject, stateInit);

// Add the original delivery objects to the batch so we can render them
const batchLogicOld = `        if (!batches[slot]) batches[slot] = { slot, totalQty: 0, readyCount: 0, pickedUpCount: 0, deliveryIds: [], dietBreakdown: {} };
        
        const qty = cSub.quantity || 1;
        batches[slot].totalQty += qty;
        batches[slot].deliveryIds.push(del.id);`;
const batchLogicNew = `        if (!batches[slot]) batches[slot] = { slot, totalQty: 0, readyCount: 0, pickedUpCount: 0, deliveryIds: [], dietBreakdown: {}, rawDeliveries: [] };
        
        const qty = cSub.quantity || 1;
        batches[slot].totalQty += qty;
        batches[slot].deliveryIds.push(del.id);
        batches[slot].rawDeliveries.push({
          id: del.id,
          diet: plan.diet_type.toUpperCase(),
          qty,
          status: del.status,
          customer_id: cSub.customer_id
        });`;
code = code.replace(batchLogicOld, batchLogicNew);

const uiOld = `              {!isFullyReady && (
                <TouchableOpacity 
                  style={[styles.dispatchBtn, markBatchReady.isPending && { opacity: 0.7 }]} 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Alert.alert('Ready for Pickup?', \`Are you sure all \${batch.totalQty} boxes for \${batch.slot} are packed and staged for driver pickup?\`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Confirm Ready', onPress: () => markBatchReady.mutate(batch.deliveryIds) }
                    ]);
                  }}
                  disabled={markBatchReady.isPending}
                >
                  {markBatchReady.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.dispatchBtnText}>Mark Ready for Dispatch →</Text>}
                </TouchableOpacity>
              )}`;

const uiNew = `              {!isFullyReady && (
                <View style={{ gap: 12 }}>
                  <TouchableOpacity 
                    style={[styles.dispatchBtn, markBatchReady.isPending && { opacity: 0.7 }]} 
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      Alert.alert('Ready for Pickup?', \`Are you sure all \${batch.totalQty} boxes for \${batch.slot} are packed and staged for driver pickup?\`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Confirm Ready', onPress: () => markBatchReady.mutate(batch.deliveryIds) }
                      ]);
                    }}
                    disabled={markBatchReady.isPending}
                  >
                    {markBatchReady.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.dispatchBtnText}>Mark Ready for Dispatch →</Text>}
                  </TouchableOpacity>
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.packingListBtn}
                onPress={() => setActiveBatch(batch)}
              >
                <Text style={styles.packingListBtnText}>📋 View Packing Manifest</Text>
              </TouchableOpacity>`;
code = code.replace(uiOld, uiNew);

const modalInject = `    </SafeAreaView>
  );
}`;
const modalInit = `
      {/* PACKING MANIFEST MODAL */}
      <Modal visible={!!activeBatch} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActiveBatch(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{activeBatch?.slot} Manifest</Text>
              <Text style={styles.modalSub}>{activeBatch?.totalQty} Total Boxes to Pack</Text>
            </View>
            <TouchableOpacity onPress={() => setActiveBatch(null)}>
              <Text style={styles.closeBtn}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 24 }}>
            {activeBatch?.rawDeliveries.map((del: any, idx: number) => (
              <View key={del.id} style={styles.manifestRow}>
                <View style={styles.manifestLeft}>
                  <View style={[styles.dietBadge, del.diet === 'VEG' ? { backgroundColor: '#ECFDF5' } : { backgroundColor: '#FEF2F2' }]}>
                    <Text style={[styles.dietBadgeText, del.diet === 'VEG' ? { color: '#059669' } : { color: '#DC2626' }]}>{del.diet}</Text>
                  </View>
                  <Text style={styles.manifestQty}>{del.qty}x Boxes</Text>
                </View>
                <View style={styles.manifestStatusWrap}>
                  <Text style={styles.manifestStatusLabel}>{del.status.replace('_', ' ').toUpperCase()}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}`;
code = code.replace(modalInject, modalInit);

const styleInject = `});`;
const styleInit = `
  packingListBtn: { marginTop: 12, paddingVertical: 14, backgroundColor: '#F3F4F6', borderRadius: 12, alignItems: 'center' },
  packingListBtnText: { color: '#374151', fontSize: 14, fontWeight: '700' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#FFF' },
  modalTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A2E' },
  modalSub: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  closeBtn: { fontSize: 16, fontWeight: '600', color: '#FF6B6B' },
  manifestRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  manifestLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dietBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  dietBadgeText: { fontSize: 12, fontWeight: '800' },
  manifestQty: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  manifestStatusWrap: { backgroundColor: '#F9FAFB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  manifestStatusLabel: { fontSize: 10, fontWeight: '700', color: '#6B7280' }
});`;
code = code.replace(styleInject, styleInit);

fs.writeFileSync(path, code);
