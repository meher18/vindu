-- FIX: The financial settlement trigger (process_financial_settlement_on_delivery) 
-- inserts into vendor_ledger with columns (transaction_date, platform_fee) and 
-- driver_ledger with (transaction_date, amount) that DO NOT EXIST in the original schema.
-- This causes every delivery completion to crash with a Postgres column-not-found error.

-- 1. Fix vendor_ledger: add the missing columns
ALTER TABLE vendor_ledger ADD COLUMN IF NOT EXISTS transaction_date DATE;
ALTER TABLE vendor_ledger ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0;

-- 2. Fix driver_ledger: add the missing columns  
ALTER TABLE driver_ledger ADD COLUMN IF NOT EXISTS transaction_date DATE;
ALTER TABLE driver_ledger ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;

-- 3. Add operating_days to subscriptions if not present
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS operating_days TEXT[];

-- 4. RLS: Vendors can view their own ledger entries
CREATE POLICY "Vendors view own ledger" ON vendor_ledger FOR SELECT 
TO authenticated USING (
  kitchen_id IN (SELECT id FROM kitchens WHERE vendor_id = auth.uid())
);

-- 5. RLS: delivery_zones should be publicly readable for location matching
CREATE POLICY "Anyone can read delivery zones" ON delivery_zones FOR SELECT USING (true);
