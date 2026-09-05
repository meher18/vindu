const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/.env' });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
async function check() {
  const { data, error } = await supabase.from('menus').select('*').limit(1);
  console.log(error || data);
}
check();
