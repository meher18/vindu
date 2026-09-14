const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://omztihguzcpkdfcxfhwk.supabase.co', 'sb_publishable_Ol3wu-0u6Wyk7gUYo_HQ9Q_MTudP7xh');
async function test() {
  const email = `test_${Date.now()}@gmail.com`;
  const { data, error } = await supabase.auth.signUp({ email, password: 'password123' });
  console.log('Signup:', error ? error.message : 'Success', data?.user?.id);
}
test();
