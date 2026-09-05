const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/index.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add ratings query
const oldHolidaysQuery = `  const { data: holidays } = useQuery({`;
const newRatingsQuery = `  const { data: ratingsData } = useQuery({
    queryKey: ['vendor-ratings', kitchen?.id],
    queryFn: async () => {
      const { data } = await supabase.from('ratings')
        .select('food_stars, review_text, created_at, profiles(full_name)')
        .eq('kitchen_id', kitchen?.id)
        .order('created_at', { ascending: false });
        
      if (!data) return { avg: 0, reviews: [] };
      
      const foodRatings = data.filter(r => r.food_stars != null);
      const avg = foodRatings.length > 0 
        ? (foodRatings.reduce((sum, r) => sum + r.food_stars, 0) / foodRatings.length).toFixed(1) 
        : 0;
        
      return { avg, reviews: data.filter(r => r.review_text).slice(0, 3) };
    },
    enabled: !!kitchen?.id,
  });
  
  const { data: holidays } = useQuery({`;
code = code.replace(oldHolidaysQuery, newRatingsQuery);

// 2. Add UI for ratings
const oldDetails = `        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Kitchen Details</Text>`;

const newDetails = `        <View style={styles.infoCard}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
            <Text style={[styles.infoTitle, {marginBottom: 0}]}>Customer Feedback</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF9C3', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12}}>
              <Text style={{fontSize: 16}}>⭐</Text>
              <Text style={{fontWeight: '800', color: '#854D0E', marginLeft: 4}}>{ratingsData?.avg || 'New'}</Text>
            </View>
          </View>
          
          {ratingsData?.reviews && ratingsData.reviews.length > 0 ? (
            <View style={{gap: 12, marginBottom: 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 16}}>
              {ratingsData.reviews.map((r: any, idx: number) => (
                <View key={idx} style={{backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12}}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4}}>
                    <Text style={{fontSize: 12, fontWeight: '700', color: '#374151'}}>{r.profiles?.full_name || 'Customer'}</Text>
                    <Text style={{fontSize: 12, color: '#9CA3AF'}}>{new Date(r.created_at).toLocaleDateString()}</Text>
                  </View>
                  <Text style={{fontSize: 13, color: '#4B5563', fontStyle: 'italic'}}>"{r.review_text}"</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{fontSize: 13, color: '#9CA3AF', fontStyle: 'italic', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6'}}>No written reviews yet.</Text>
          )}

          <Text style={styles.infoTitle}>Kitchen Details</Text>`;
code = code.replace(oldDetails, newDetails);

fs.writeFileSync(path, code);
