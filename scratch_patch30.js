const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/index.tsx';
let code = fs.readFileSync(path, 'utf8');

const engineSyncOld = `  const isEngineSyncing = isLoading || isPlansLoading || isMenusLoading || isForecastLoading || isHolidaysLoading || isRatingsLoading;
  if (isEngineSyncing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B6B" style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#667085' }}>Syncing Operations Matrix...</Text>
      </View>
    );
  }`;

const engineSyncNew = `  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B6B" style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#667085' }}>Connecting to Kitchen...</Text>
      </View>
    );
  }`;
code = code.replace(engineSyncOld, engineSyncNew);

const dashSyncOld = `  // --- DASHBOARD VIEW ---
  return (
    <SafeAreaView style={styles.safeArea}>`;
const dashSyncNew = `  // --- DASHBOARD VIEW ---
  if (isPlansLoading || isMenusLoading || isForecastLoading || isHolidaysLoading || isRatingsLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B6B" style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#667085' }}>Syncing Operations Matrix...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>`;
code = code.replace(dashSyncOld, dashSyncNew);

fs.writeFileSync(path, code);
