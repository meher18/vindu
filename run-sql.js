const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:GoodWorksByVinduOz8@db.omztihguzcpkdfcxfhwk.supabase.co:5432/postgres' });
async function run() {
  await client.connect();
  const sql = `
    DROP POLICY IF EXISTS "Anyone can view active menus" ON menus;
    DROP POLICY IF EXISTS "Vendors can view own menus" ON menus;
    DROP POLICY IF EXISTS "Vendors can insert own menus" ON menus;
    DROP POLICY IF EXISTS "Vendors can update own menus" ON menus;

    CREATE POLICY "Anyone can view active menus" ON menus FOR SELECT USING (status = 'active');
    CREATE POLICY "Vendors can view own menus" ON menus FOR SELECT USING (kitchen_id IN (SELECT id FROM kitchens WHERE vendor_id = auth.uid()));
    CREATE POLICY "Vendors can insert own menus" ON menus FOR INSERT WITH CHECK (kitchen_id IN (SELECT id FROM kitchens WHERE vendor_id = auth.uid()));
    CREATE POLICY "Vendors can update own menus" ON menus FOR UPDATE USING (kitchen_id IN (SELECT id FROM kitchens WHERE vendor_id = auth.uid()));
  `;
  try {
    await client.query(sql);
    console.log("SUCCESS!");
  } catch (e) {
    console.error("ERROR:", e.message);
  }
  await client.end();
}
run();
