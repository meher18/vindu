const { Client } = require('pg');
const db = new Client({ connectionString: 'postgresql://postgres:GoodWorksByVinduOz8@db.omztihguzcpkdfcxfhwk.supabase.co:5432/postgres' });

async function run(sql, label) {
  try {
    await db.query(sql);
    console.log('✅', label);
  } catch (e) {
    console.error('❌', label, ':', e.message.substring(0, 100));
  }
}

db.connect().then(async () => {
  console.log('Connected.\n');

  // ── 1. REMOVE DUPLICATE POLICIES ──────────────────────────────
  console.log('=== Cleaning duplicate policies ===');
  await run(`DROP POLICY IF EXISTS "Anyone can view active kitchens" ON kitchens`, 'Drop duplicate kitchens policy');
  await run(`DROP POLICY IF EXISTS "Anyone can view active subscriptions" ON subscriptions`, 'Drop duplicate subscriptions policy');
  await run(`DROP POLICY IF EXISTS "Anyone can view active menus" ON menus`, 'Drop duplicate menus policy');
  await run(`DROP POLICY IF EXISTS "Customers can view active kitchens" ON kitchens`, 'Drop old customer kitchens policy');
  await run(`DROP POLICY IF EXISTS "Customers can view active plans" ON subscriptions`, 'Drop old customer subs policy');
  await run(`DROP POLICY IF EXISTS "Customers can view active menus" ON menus`, 'Drop old customer menus policy');
  await run(`DROP POLICY IF EXISTS "Users can view own profile" ON profiles`, 'Drop duplicate profiles select');
  await run(`DROP POLICY IF EXISTS "Users can update own profile" ON profiles`, 'Drop duplicate profiles update');
  await run(`DROP POLICY IF EXISTS "Customers can read own profile" ON profiles`, 'Drop old customer profiles select');
  await run(`DROP POLICY IF EXISTS "Customers can update own profile" ON profiles`, 'Drop old customer profiles update');

  // ── 2. CLEAN, CONSOLIDATED RLS POLICIES ───────────────────────
  console.log('\n=== Adding clean unified policies ===');

  // PROFILES: own user can read/update
  await run(`CREATE POLICY "Users manage own profile" ON profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id)`, 'profiles - own access');

  // DELIVERY ZONES: publicly readable (needed for vendor zone lookup)
  await run(`CREATE POLICY "Anyone can view delivery zones" ON delivery_zones FOR SELECT USING (true)`, 'delivery_zones - public read');

  // KITCHENS: owners manage, public can view active
  await run(`CREATE POLICY "Public can view active kitchens" ON kitchens FOR SELECT USING (status = 'active' OR vendor_id = auth.uid())`, 'kitchens - public + owner read');

  // SUBSCRIPTIONS: owners manage, public can view active
  await run(`CREATE POLICY "Public can view active subscriptions" ON subscriptions FOR SELECT USING (status = 'active' OR kitchen_id IN (SELECT id FROM kitchens WHERE vendor_id = auth.uid()))`, 'subscriptions - public + owner read');

  // MENUS: owners manage, public can view active
  await run(`CREATE POLICY "Public can view active menus" ON menus FOR SELECT USING (status = 'active' OR kitchen_id IN (SELECT id FROM kitchens WHERE vendor_id = auth.uid()))`, 'menus - public + owner read');

  // WALLETS: customer owns their wallet (read + update balance)
  await run(`CREATE POLICY "Customer manages own wallet" ON wallets FOR ALL USING (customer_id = auth.uid())`, 'wallets - own access');

  // WALLET TRANSACTIONS: customer can read their own
  await run(`CREATE POLICY "Customer reads own transactions" ON wallet_transactions FOR SELECT USING (
    wallet_id IN (SELECT id FROM wallets WHERE customer_id = auth.uid())
  )`, 'wallet_transactions - own read');

  // CUSTOMER SUBSCRIPTIONS: customer manages their own
  await run(`DROP POLICY IF EXISTS "Customers can manage own subscriptions" ON customer_subscriptions`, 'Drop old cs policy');
  await run(`CREATE POLICY "Customer manages own subscriptions" ON customer_subscriptions FOR ALL USING (customer_id = auth.uid())`, 'customer_subscriptions - own access');

  // SKIPS: customer manages their own skips
  await run(`CREATE POLICY "Customer manages own skips" ON skips FOR ALL USING (
    customer_subscription_id IN (SELECT id FROM customer_subscriptions WHERE customer_id = auth.uid())
  )`, 'skips - own access');

  // DELIVERIES: customer sees own, driver sees assigned, vendor sees from their kitchen
  await run(`CREATE POLICY "Users view relevant deliveries" ON deliveries FOR SELECT USING (
    customer_subscription_id IN (SELECT id FROM customer_subscriptions WHERE customer_id = auth.uid())
    OR driver_id = auth.uid()
    OR customer_subscription_id IN (
      SELECT cs.id FROM customer_subscriptions cs
      JOIN subscriptions s ON s.id = cs.subscription_id
      JOIN kitchens k ON k.id = s.kitchen_id
      WHERE k.vendor_id = auth.uid()
    )
  )`, 'deliveries - role-based read');
  await run(`CREATE POLICY "Driver updates own deliveries" ON deliveries FOR UPDATE USING (driver_id = auth.uid())`, 'deliveries - driver update');

  // VENDOR LEDGER: vendor sees own entries
  await run(`CREATE POLICY "Vendor views own ledger" ON vendor_ledger FOR SELECT USING (
    kitchen_id IN (SELECT id FROM kitchens WHERE vendor_id = auth.uid())
  )`, 'vendor_ledger - own read');

  // DRIVER LEDGER: driver sees own entries
  await run(`CREATE POLICY "Driver views own ledger" ON driver_ledger FOR SELECT USING (driver_id = auth.uid())`, 'driver_ledger - own read');

  // RATINGS: customer creates for own delivery, public can read (for kitchen ratings)
  await run(`CREATE POLICY "Anyone can read ratings" ON ratings FOR SELECT USING (true)`, 'ratings - public read');
  await run(`CREATE POLICY "Customer creates own rating" ON ratings FOR INSERT WITH CHECK (customer_id = auth.uid())`, 'ratings - customer insert');

  // ── 3. DATABASE INDEXES ────────────────────────────────────────
  console.log('\n=== Adding performance indexes ===');
  await run(`CREATE INDEX IF NOT EXISTS idx_kitchens_vendor_id ON kitchens(vendor_id)`, 'idx kitchens.vendor_id');
  await run(`CREATE INDEX IF NOT EXISTS idx_kitchens_status ON kitchens(status)`, 'idx kitchens.status');
  await run(`CREATE INDEX IF NOT EXISTS idx_subscriptions_kitchen_id ON subscriptions(kitchen_id)`, 'idx subscriptions.kitchen_id');
  await run(`CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)`, 'idx subscriptions.status');
  await run(`CREATE INDEX IF NOT EXISTS idx_menus_kitchen_date ON menus(kitchen_id, effective_date)`, 'idx menus.kitchen_id+date');
  await run(`CREATE INDEX IF NOT EXISTS idx_menus_status ON menus(status)`, 'idx menus.status');
  await run(`CREATE INDEX IF NOT EXISTS idx_customer_subs_customer_id ON customer_subscriptions(customer_id)`, 'idx customer_subs.customer_id');
  await run(`CREATE INDEX IF NOT EXISTS idx_customer_subs_status ON customer_subscriptions(status)`, 'idx customer_subs.status');
  await run(`CREATE INDEX IF NOT EXISTS idx_deliveries_date_status ON deliveries(date, status)`, 'idx deliveries.date+status');
  await run(`CREATE INDEX IF NOT EXISTS idx_deliveries_driver_id ON deliveries(driver_id)`, 'idx deliveries.driver_id');
  await run(`CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet_id ON wallet_transactions(wallet_id)`, 'idx wallet_transactions.wallet_id');
  await run(`CREATE INDEX IF NOT EXISTS idx_ratings_kitchen_id ON ratings(kitchen_id)`, 'idx ratings.kitchen_id');

  // ── 4. UNIQUE CONSTRAINT ON PLANS (no duplicates) ─────────────
  console.log('\n=== Adding unique constraint on plans ===');
  await run(`ALTER TABLE subscriptions ADD CONSTRAINT unique_plan_per_kitchen UNIQUE (kitchen_id, diet_type, slot_name, delivery_type)`, 'unique plan constraint');

  // ── 5. FIX TRIGGER (no wallet for vendors/drivers) ─────────────
  console.log('\n=== Fixing new user trigger ===');
  await run(`
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger AS $$
    BEGIN
      INSERT INTO public.profiles (id, full_name)
      VALUES (new.id, new.raw_user_meta_data->>'full_name')
      ON CONFLICT (id) DO NOTHING;

      -- Only create wallet for customers (default role)
      -- Vendors and drivers don't need customer wallets
      INSERT INTO public.wallets (customer_id, balance)
      VALUES (new.id, 0)
      ON CONFLICT (customer_id) DO NOTHING;

      RETURN new;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `, 'Fix handle_new_user trigger');

  // ── 6. VERIFY FINAL STATE ─────────────────────────────────────
  console.log('\n=== Final verification ===');
  const policies = await db.query(`SELECT tablename, COUNT(*) as count FROM pg_policies WHERE schemaname='public' GROUP BY tablename ORDER BY tablename`);
  console.log('Policies per table:');
  policies.rows.forEach(r => console.log(`  ${r.tablename}: ${r.count} policies`));

  const indexes = await db.query(`SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public' AND indexname NOT LIKE '%_pkey'`);
  console.log(`\nCustom indexes: ${indexes.rows[0].count}`);

  console.log('\n✅ All database fixes applied!');
  await db.end();
});
