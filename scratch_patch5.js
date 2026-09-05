const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/dispatch.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add pickedUpCount to the type signature and initial state
const oldGroup = `      const batches: Record<string, { slot: string, totalQty: number, readyCount: number, deliveryIds: string[], dietBreakdown: Record<string, number> }> = {};`;
const newGroup = `      const batches: Record<string, { slot: string, totalQty: number, readyCount: number, pickedUpCount: number, deliveryIds: string[], dietBreakdown: Record<string, number> }> = {};`;
code = code.replace(oldGroup, newGroup);

const oldInit = `        if (!batches[slot]) batches[slot] = { slot, totalQty: 0, readyCount: 0, deliveryIds: [], dietBreakdown: {} };`;
const newInit = `        if (!batches[slot]) batches[slot] = { slot, totalQty: 0, readyCount: 0, pickedUpCount: 0, deliveryIds: [], dietBreakdown: {} };`;
code = code.replace(oldInit, newInit);

// 2. Tally pickedUpCount
const oldTally = `        if (del.vendor_ready_at) batches[slot].readyCount += qty;`;
const newTally = `        if (del.vendor_ready_at) batches[slot].readyCount += qty;
        if (del.status === 'picked_up' || del.status === 'delivered') batches[slot].pickedUpCount += qty;`;
code = code.replace(oldTally, newTally);

// 3. Update the UI Badges
const oldUI = `        {dispatchBatches?.map(batch => {
          const isFullyReady = batch.readyCount >= batch.totalQty;
          return (
            <View key={batch.slot} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.slotName}>{batch.slot} BATCH</Text>
                  <Text style={styles.qtyText}>{batch.totalQty} Total Meals</Text>
                </View>
                {isFullyReady ? (
                  <View style={styles.readyBadge}><Text style={styles.readyBadgeText}>HANDED OVER</Text></View>
                ) : (
                  <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>COOKING</Text></View>
                )}
              </View>`;

const newUI = `        {dispatchBatches?.map(batch => {
          const isFullyReady = batch.readyCount >= batch.totalQty;
          const isFullyPickedUp = batch.pickedUpCount >= batch.totalQty;
          
          return (
            <View key={batch.slot} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.slotName}>{batch.slot} BATCH</Text>
                  <Text style={styles.qtyText}>{batch.totalQty} Total Meals</Text>
                </View>
                {isFullyPickedUp ? (
                  <View style={[styles.readyBadge, { backgroundColor: '#EFF6FF' }]}><Text style={[styles.readyBadgeText, { color: '#1D4ED8' }]}>✅ DISPATCHED</Text></View>
                ) : isFullyReady ? (
                  <View style={styles.readyBadge}><Text style={styles.readyBadgeText}>📦 STAGED FOR PICKUP</Text></View>
                ) : (
                  <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>🔥 COOKING</Text></View>
                )}
              </View>`;
code = code.replace(oldUI, newUI);

fs.writeFileSync(path, code);
