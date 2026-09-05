const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/plans.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add the query to fetch the dynamic config
const oldQuery = `  const { data: subCounts } = useQuery({`;
const newQuery = `  // Fetch dynamic commission rates from the backend
  const { data: config } = useQuery({
    queryKey: ['platform-config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('platform_config').select('*').single();
      if (error) throw error;
      return data;
    }
  });

  const { data: subCounts } = useQuery({`;
code = code.replace(oldQuery, newQuery);

// 2. Update the mutation to use the dynamic rates
const oldMut = `          price_per_day: price,
          vendor_fee: price * 0.7, // 70% to Vendor
          delivery_fee: price * 0.2, // 20% to Driver
          capacity,`;
const newMut = `          price_per_day: price,
          vendor_fee: price * (config?.vendor_split_pct || 0.7),
          delivery_fee: price * (config?.driver_split_pct || 0.2),
          capacity,`;
code = code.replace(oldMut, newMut);

fs.writeFileSync(path, code);
