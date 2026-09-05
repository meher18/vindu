const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/index.tsx';
let code = fs.readFileSync(path, 'utf8');

const oldPlanQuery = `  const { data: plans } = useQuery({
    queryKey: ['vendor-plans-dashboard', kitchen?.id],
    queryFn: async () => {
      const { data } = await supabase.from('subscriptions').select('id, diet_type, slot_name, operating_days, slot_target_time').eq('kitchen_id', kitchen?.id).neq('status', 'cancelled');
      return data || [];
    },
    enabled: !!kitchen?.id,
  });`;

const newPlanQuery = `  const { data: plans } = useQuery({
    queryKey: ['vendor-plans-dashboard', kitchen?.id],
    queryFn: async () => {
      // CRITICAL: We MUST fetch cancelled plans here too, because the vendor MUST STILL COOK 
      // for existing customers until their subscriptions naturally expire.
      const { data } = await supabase.from('subscriptions').select('id, diet_type, slot_name, operating_days, slot_target_time, status').eq('kitchen_id', kitchen?.id);
      return data || [];
    },
    enabled: !!kitchen?.id,
  });`;

// Wait, the original query in index.tsx might just be select('id, diet_type, slot_name')
// Let me regex it to be safe.
code = code.replace(/const { data: plans } = useQuery\(\{\s+queryKey: \['vendor-plans-dashboard', kitchen\?\.id\],\s+queryFn: async \(\) => \{\s+const { data } = await supabase\.from\('subscriptions'\)\.select\('[^']+'\)\.eq\('kitchen_id', kitchen\?\.id\)\.neq\('status', 'cancelled'\);\s+return data \|\| \[\];\s+\},\s+enabled: !!kitchen\?\.id,\s+\}\);/, newPlanQuery);

fs.writeFileSync(path, code);
