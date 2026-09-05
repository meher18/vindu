const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/index.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. We need to pass the holidays array into the prepForecast query context or fetch it inside.
// Actually, `holidays` is already fetched in `vendor-holidays`. But `prepForecast` is a useQuery.
// Does `prepForecast` have access to `kitchen?.id`? Yes.
// Let's modify the prepForecast query to ALSO fetch holidays, since relying on a separate hook's data inside a queryFn is a bad React Query pattern (race conditions).

const oldQuery = `    queryFn: async () => {
      if (!plans || plans.length === 0) return { today: {total: 0, breakdown: {}}, tomorrow: {total: 0, breakdown: {}} };`;
      
const newQuery = `    queryFn: async () => {
      if (!plans || plans.length === 0) return { today: {total: 0, breakdown: {}}, tomorrow: {total: 0, breakdown: {}} };
      
      // Fetch holidays to zero-out forecast if kitchen is closed
      const { data: kitchenHolidays } = await supabase
        .from('kitchen_holidays')
        .select('holiday_date')
        .eq('kitchen_id', kitchen?.id)
        .in('holiday_date', [getLocalToday(), (() => { const d = new Date(); d.setDate(d.getDate() + 1); return \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}-\${String(d.getDate()).padStart(2, '0')}\`; })()]);
        
      const holidaySet = new Set(kitchenHolidays?.map(h => h.holiday_date));`;

code = code.replace(oldQuery, newQuery);

const oldCalc = `      const calc = (dateStr: string, dayShort: string) => {
        let total = 0;
        const breakdown: Record<string, number> = {};
        
        cSubs?.forEach(sub => {`;

const newCalc = `      const calc = (dateStr: string, dayShort: string) => {
        let total = 0;
        const breakdown: Record<string, number> = {};
        
        // If the kitchen has declared a holiday for this date, absolute zero output
        if (holidaySet.has(dateStr)) {
          return { total: 0, breakdown: {} };
        }
        
        cSubs?.forEach(sub => {`;

code = code.replace(oldCalc, newCalc);

fs.writeFileSync(path, code);
