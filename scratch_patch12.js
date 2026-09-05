const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/plans.tsx';
let code = fs.readFileSync(path, 'utf8');

const kitchenBlock = `  const { data: kitchen } = useQuery({
    queryKey: ['vendor-kitchen', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('kitchens').select('id').eq('vendor_id', user?.id).single();
      return data;
    },
    enabled: !!user?.id,
  });`;

// Remove kitchenBlock from its current position
code = code.replace(kitchenBlock, '');

// Insert it BEFORE onRefresh
const target = `  const onRefresh = React.useCallback(async () => {`;
code = code.replace(target, kitchenBlock + '\n\n' + target);

fs.writeFileSync(path, code);
