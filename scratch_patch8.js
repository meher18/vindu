const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/index.tsx';
let code = fs.readFileSync(path, 'utf8');

// We need to carefully replace the destructuring to extract loading states.
// 1. plans
code = code.replace(
  `const { data: plans } = useQuery({`,
  `const { data: plans, isLoading: isPlansLoading } = useQuery({`
);

// 2. menus
code = code.replace(
  `const { data: menus } = useQuery({`,
  `const { data: menus, isLoading: isMenusLoading } = useQuery({`
);

// 3. holidays
code = code.replace(
  `const { data: holidays } = useQuery({`,
  `const { data: holidays, isLoading: isHolidaysLoading } = useQuery({`
);

// Wait, prepForecast is NOT a useQuery, it's a useQuery for skips and cSubs.
// Let's check how prepForecast is built.
// Ah, it's a useQuery!
code = code.replace(
  `const { data: prepForecast } = useQuery({`,
  `const { data: prepForecast, isLoading: isForecastLoading } = useQuery({`
);

// 4. ratingsData
code = code.replace(
  `const { data: ratingsData } = useQuery({`,
  `const { data: ratingsData, isLoading: isRatingsLoading } = useQuery({`
);

// 5. Update the block condition
const oldBlock = `  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF6B6B" /></View>;`;
const newBlock = `  const isEngineSyncing = isLoading || isPlansLoading || isMenusLoading || isForecastLoading || isHolidaysLoading || isRatingsLoading;
  if (isEngineSyncing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B6B" style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#667085' }}>Syncing Operations Matrix...</Text>
      </View>
    );
  }`;
code = code.replace(oldBlock, newBlock);

fs.writeFileSync(path, code);
