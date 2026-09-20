const fs = require('fs');
let content = fs.readFileSync('src/app/(customer)/index.tsx', 'utf8');

// Imports
content = content.replace("import { getISTDateString } from '@/utils/dateUtils';", "import { getISTDateString } from '@/utils/dateUtils';\nimport AsyncStorage from '@react-native-async-storage/async-storage';");

// Types
content = content.replace("type DietFilter = 'all' | 'veg' | 'non-veg' | 'vegan';\ntype SlotFilter = 'all' | 'breakfast' | 'lunch' | 'dinner';", `type DietFilter = 'all' | 'veg' | 'non-veg' | 'vegan';
type SlotFilter = 'all' | 'breakfast' | 'lunch' | 'dinner';
type DurationFilter = 'all' | 'daily' | 'weekly' | 'monthly';
type DeliveryFilter = 'all' | 'home_delivery' | 'takeaway';
type SortOption = 'newest' | 'price_asc' | 'price_desc';`);

// States
content = content.replace("const [search, setSearch] = useState('');", `const [search, setSearch] = useState('');
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('all');
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [showFavourites, setShowFavourites] = useState(false);
  const [favourites, setFavourites] = useState<string[]>([]);
  
  useEffect(() => {
    AsyncStorage.getItem('vindu_favourites').then(val => {
      if (val) setFavourites(JSON.parse(val));
    });
  }, []);

  const toggleFavourite = async (planId: string) => {
    const newFavs = favourites.includes(planId)
      ? favourites.filter(id => id !== planId)
      : [...favourites, planId];
    setFavourites(newFavs);
    await AsyncStorage.setItem('vindu_favourites', JSON.stringify(newFavs));
  };`);

// Query dependencies
content = content.replace("queryKey: ['discover-plans', dietFilter, slotFilter],", "queryKey: ['discover-plans', dietFilter, slotFilter, durationFilter, deliveryFilter, sortOption],");

// Select
content = content.replace(".select('id, diet_type, slot_name, price_per_day, capacity, slot_target_time, kitchen_id')", ".select('id, diet_type, slot_name, price_per_day, capacity, slot_target_time, kitchen_id, duration_type, delivery_type, created_at')");

// Filters inside query
const filterLogic = `if (dietFilter !== 'all') query = query.eq('diet_type', dietFilter);
      if (slotFilter !== 'all') query = query.eq('slot_name', slotFilter);`;

const newFilterLogic = `if (dietFilter !== 'all') query = query.eq('diet_type', dietFilter);
      if (slotFilter !== 'all') query = query.eq('slot_name', slotFilter);
      if (durationFilter !== 'all') query = query.eq('duration_type', durationFilter);
      if (deliveryFilter !== 'all') query = query.eq('delivery_type', deliveryFilter);
      
      if (sortOption === 'price_asc') query = query.order('price_per_day', { ascending: true });
      else if (sortOption === 'price_desc') query = query.order('price_per_day', { ascending: false });
      else if (sortOption === 'newest') query = query.order('created_at', { ascending: false });`;

content = content.replace(filterLogic, newFilterLogic);

// Filter favorites
content = content.replace("const filtered = plans?.filter((p: any) =>\n    search === '' || p.kitchen?.name?.toLowerCase().includes(search.toLowerCase())\n  ) ?? [];", `let filtered = plans?.filter((p: any) =>
    search === '' || p.kitchen?.name?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];
  if (showFavourites) {
    filtered = filtered.filter((p: any) => favourites.includes(p.id));
  }`);

// Add tabs for duration, delivery and sort
const tabsObj = `const slotTabs: { label: string; value: SlotFilter; emoji: string }[] = [
    { label: 'All Slots', value: 'all', emoji: '⏰' },
    { label: 'Breakfast', value: 'breakfast', emoji: '☀️' },
    { label: 'Lunch', value: 'lunch', emoji: '🌤️' },
    { label: 'Dinner', value: 'dinner', emoji: '🌙' },
  ];`;

const newTabsObj = `const slotTabs: { label: string; value: SlotFilter; emoji: string }[] = [
    { label: 'All Slots', value: 'all', emoji: '⏰' },
    { label: 'Breakfast', value: 'breakfast', emoji: '☀️' },
    { label: 'Lunch', value: 'lunch', emoji: '🌤️' },
    { label: 'Dinner', value: 'dinner', emoji: '🌙' },
  ];
  
  const durationTabs: { label: string; value: DurationFilter; emoji: string }[] = [
    { label: 'All Durations', value: 'all', emoji: '📅' },
    { label: 'Daily', value: 'daily', emoji: '1️⃣' },
    { label: 'Weekly', value: 'weekly', emoji: '7️⃣' },
    { label: 'Monthly', value: 'monthly', emoji: '3️⃣' },
  ];

  const deliveryTabs: { label: string; value: DeliveryFilter; emoji: string }[] = [
    { label: 'All Delivery', value: 'all', emoji: '🚚' },
    { label: 'Home Delivery', value: 'home_delivery', emoji: '🛵' },
    { label: 'Takeaway', value: 'takeaway', emoji: '🚶' },
  ];
  
  const sortTabs: { label: string; value: SortOption; emoji: string }[] = [
    { label: 'Newest', value: 'newest', emoji: '✨' },
    { label: 'Price: Low to High', value: 'price_asc', emoji: '📉' },
    { label: 'Price: High to Low', value: 'price_desc', emoji: '📈' },
  ];`;
  
content = content.replace(tabsObj, newTabsObj);

// Add scrollviews for the new filters
const slotFilterScrollView = `{/* Slot Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          {slotTabs.map(tab => (
            <TouchableOpacity key={tab.value} style={[styles.pill, slotFilter === tab.value && styles.pillActive]} onPress={() => setSlotFilter(tab.value)}>
              <Text style={styles.pillEmoji}>{tab.emoji}</Text>
              <Text style={[styles.pillText, slotFilter === tab.value && styles.pillTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>`;

const newFilterScrollViews = `{/* Slot Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          {slotTabs.map(tab => (
            <TouchableOpacity key={tab.value} style={[styles.pill, slotFilter === tab.value && styles.pillActive]} onPress={() => setSlotFilter(tab.value)}>
              <Text style={styles.pillEmoji}>{tab.emoji}</Text>
              <Text style={[styles.pillText, slotFilter === tab.value && styles.pillTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* Duration Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          {durationTabs.map(tab => (
            <TouchableOpacity key={tab.value} style={[styles.pill, durationFilter === tab.value && styles.pillActive]} onPress={() => setDurationFilter(tab.value)}>
              <Text style={styles.pillEmoji}>{tab.emoji}</Text>
              <Text style={[styles.pillText, durationFilter === tab.value && styles.pillTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* Delivery Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          {deliveryTabs.map(tab => (
            <TouchableOpacity key={tab.value} style={[styles.pill, deliveryFilter === tab.value && styles.pillActive]} onPress={() => setDeliveryFilter(tab.value)}>
              <Text style={styles.pillEmoji}>{tab.emoji}</Text>
              <Text style={[styles.pillText, deliveryFilter === tab.value && styles.pillTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* Sort Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          {sortTabs.map(tab => (
            <TouchableOpacity key={tab.value} style={[styles.pill, sortOption === tab.value && styles.pillActive]} onPress={() => setSortOption(tab.value)}>
              <Text style={styles.pillEmoji}>{tab.emoji}</Text>
              <Text style={[styles.pillText, sortOption === tab.value && styles.pillTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* Favourites Filter */}
        <View style={{ marginBottom: 16 }}>
          <TouchableOpacity style={[styles.pill, showFavourites && styles.pillActive, { alignSelf: 'flex-start' }]} onPress={() => setShowFavourites(!showFavourites)}>
            <Text style={styles.pillEmoji}>❤️</Text>
            <Text style={[styles.pillText, showFavourites && styles.pillTextActive]}>My Favourites</Text>
          </TouchableOpacity>
        </View>`;

content = content.replace(slotFilterScrollView, newFilterScrollViews);

// Update PlanCard invocation
const planCardInv = `{/* Plan Cards */}
        {filtered.map((plan: any) => <PlanCard key={plan.id} plan={plan} profile={profile} onSubscribe={() => {
          router.navigate(\`/(customer)/plan/\${plan.id}\`);
        }} />)}`;

const newPlanCardInv = `{/* Plan Cards */}
        {filtered.map((plan: any) => <PlanCard key={plan.id} plan={plan} profile={profile} isFavourite={favourites.includes(plan.id)} onToggleFavourite={() => toggleFavourite(plan.id)} onSubscribe={() => {
          router.navigate(\`/(customer)/plan/\${plan.id}\`);
        }} />)}`;

content = content.replace(planCardInv, newPlanCardInv);

// Update PlanCard definition
const planCardDef = `function PlanCard({ plan, profile, onSubscribe }: { plan: any, profile: any, onSubscribe: () => void }) {`;
const newPlanCardDef = `function PlanCard({ plan, profile, isFavourite, onToggleFavourite, onSubscribe }: { plan: any, profile: any, isFavourite: boolean, onToggleFavourite: () => void, onSubscribe: () => void }) {`;
content = content.replace(planCardDef, newPlanCardDef);

// Add heart icon to PlanCard
const planCardHeader = `<View style={styles.planCardHeader}>
        <View style={styles.kitchenIconWrap}><Text style={styles.kitchenIcon}>🍳</Text></View>
        <View style={styles.planCardInfo}>
          <Text style={styles.kitchenName}>{plan.kitchen?.name}</Text>
          <Text style={styles.kitchenAddress} numberOfLines={1}>{plan.kitchen?.address}</Text>
        </View>
        <View style={[styles.dietBadge, { backgroundColor: dietBg }]}>
          <Text style={[styles.dietBadgeText, { color: dietColor }]}>{plan.diet_type.toUpperCase()}</Text>
        </View>
      </View>`;

const newPlanCardHeader = `<View style={styles.planCardHeader}>
        <View style={styles.kitchenIconWrap}><Text style={styles.kitchenIcon}>🍳</Text></View>
        <View style={styles.planCardInfo}>
          <Text style={styles.kitchenName}>{plan.kitchen?.name}</Text>
          <Text style={styles.kitchenAddress} numberOfLines={1}>{plan.kitchen?.address}</Text>
        </View>
        <TouchableOpacity onPress={onToggleFavourite} style={{ padding: 8 }}>
          <Text style={{ fontSize: 24 }}>{isFavourite ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
        <View style={[styles.dietBadge, { backgroundColor: dietBg }]}>
          <Text style={[styles.dietBadgeText, { color: dietColor }]}>{plan.diet_type.toUpperCase()}</Text>
        </View>
      </View>`;

content = content.replace(planCardHeader, newPlanCardHeader);

fs.writeFileSync('src/app/(customer)/index.tsx', content);

// Now wallet.tsx
let walletContent = fs.readFileSync('src/app/(customer)/wallet.tsx', 'utf8');

// Premium Query
const txReadyDef = `const txReady = !walletLoading && !!wallet?.id;`;
const premiumQuery = `
  const { data: hasPremium, refetch: refetchPremium } = useQuery({
    queryKey: ['premium-status', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_subscriptions')
        .select('id')
        .eq('customer_id', user!.id)
        .eq('premium_unlocked', true)
        .limit(1);
      if (error) throw error;
      return data && data.length > 0;
    },
    enabled: !!user?.id,
  });

  const purchasePremium = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('purchase_premium', { p_amount: 99 });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premium-status'] });
      queryClient.invalidateQueries({ queryKey: ['my-wallet'] });
      Alert.alert('Success', 'Premium purchased successfully!');
    },
    onError: (err: any) => Alert.alert('Purchase Failed', err.message)
  });

  const txReady = !walletLoading && !!wallet?.id;`;
walletContent = walletContent.replace(txReadyDef, premiumQuery);

// Add to onRefresh
const onRefreshDef = `await Promise.all([refetchWallet(), refetchTx()]);`;
const newOnRefreshDef = `await Promise.all([refetchWallet(), refetchTx(), refetchPremium()]);`;
walletContent = walletContent.replace(onRefreshDef, newOnRefreshDef);

// Add Premium Section UI
const infoGrid = `{/* Info Grid */}`;
const premiumSection = `
        {/* Premium Section */}
        {hasPremium ? (
          <View style={{ backgroundColor: '#F0FDF4', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#86EFAC', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 24 }}>✅</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#166534' }}>Premium Active</Text>
              <Text style={{ fontSize: 13, color: '#15803D', marginTop: 2 }}>Flexi Skip Unlocked</Text>
            </View>
          </View>
        ) : (
          <View style={{ backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Text style={{ fontSize: 28 }}>🔓</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A1A2E' }}>Unlock Flexi Skip — ₹99</Text>
              </View>
            </View>
            <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 16, lineHeight: 20 }}>
              Skip up to 5 meals per plan. Credits refunded instantly to your wallet.
            </Text>
            <TouchableOpacity 
              style={{ backgroundColor: '#1A1A2E', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
              onPress={() => purchasePremium.mutate()}
              disabled={purchasePremium.isPending}
            >
              {purchasePremium.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Buy Premium</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Info Grid */}`;

walletContent = walletContent.replace(infoGrid, premiumSection);

fs.writeFileSync('src/app/(customer)/wallet.tsx', walletContent);
