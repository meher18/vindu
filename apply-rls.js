const { Client } = require('pg');
const db = new Client({ connectionString: 'postgresql://postgres:GoodWorksByVinduOz8@db.omztihguzcpkdfcxfhwk.supabase.co:5432/postgres' });

db.connect().then(async () => {
  const policies = [
    `DROP POLICY IF EXISTS "Customers can read own profile" ON profiles`,
    `CREATE POLICY "Customers can read own profile" ON profiles FOR SELECT USING (auth.uid() = id)`,
    `DROP POLICY IF EXISTS "Customers can update own profile" ON profiles`,
    `CREATE POLICY "Customers can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id)`,
    `DROP POLICY IF EXISTS "Customers can view active kitchens" ON kitchens`,
    `CREATE POLICY "Customers can view active kitchens" ON kitchens FOR SELECT USING (status = 'active')`,
    `DROP POLICY IF EXISTS "Customers can view active plans" ON subscriptions`,
    `CREATE POLICY "Customers can view active plans" ON subscriptions FOR SELECT USING (status = 'active')`,
    `DROP POLICY IF EXISTS "Customers can view active menus" ON menus`,
    `CREATE POLICY "Customers can view active menus" ON menus FOR SELECT USING (status = 'active')`,
    `DROP POLICY IF EXISTS "Customers can view own wallet" ON wallets`,
    `CREATE POLICY "Customers can view own wallet" ON wallets FOR SELECT USING (customer_id = auth.uid())`,
    `DROP POLICY IF EXISTS "Customers can manage own subscriptions" ON customer_subscriptions`,
    `CREATE POLICY "Customers can manage own subscriptions" ON customer_subscriptions FOR ALL USING (customer_id = auth.uid())`,
  ];

  for (const sql of policies) {
    try {
      await db.query(sql);
      console.log('OK:', sql.substring(0, 60));
    } catch(e) {
      console.error('ERR:', e.message.substring(0, 80));
    }
  }
  await db.end();
  console.log('Done!');
});

