-- ==============================================================================
-- 06 - ADMIN RLS MATRIX & GOD MODE
-- ==============================================================================

-- 1. Create a function to bootstrap the first Super Admin
CREATE OR REPLACE FUNCTION claim_super_admin(secret_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Change this secret key in production!
  IF secret_key = 'VINDU_GOD_MODE_2026' THEN
    UPDATE profiles SET role = 'admin' WHERE id = auth.uid();
    RETURN TRUE;
  END IF;
  
  RAISE EXCEPTION 'Invalid secret key';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Create RPC for Admin to approve or suspend a kitchen
CREATE OR REPLACE FUNCTION admin_set_kitchen_status(p_kitchen_id UUID, p_status kitchen_status)
RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Admins only';
  END IF;

  UPDATE kitchens SET status = p_status WHERE id = p_kitchen_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Apply Admin Bypass Policies to ALL tables
-- Note: PostgreSQL evaluates RLS policies using OR. If ANY policy allows access, it is granted.
-- We are adding an Admin policy to every table that has RLS enabled.

-- PROFILES
CREATE POLICY "Admins have full access to profiles" 
ON profiles FOR ALL USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

-- DELIVERY ZONES
CREATE POLICY "Admins have full access to delivery_zones" 
ON delivery_zones FOR ALL USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

-- KITCHENS
CREATE POLICY "Admins have full access to kitchens" 
ON kitchens FOR ALL USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

-- SUBSCRIPTIONS
CREATE POLICY "Admins have full access to subscriptions" 
ON subscriptions FOR ALL USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

-- CUSTOMER SUBSCRIPTIONS
CREATE POLICY "Admins have full access to customer_subscriptions" 
ON customer_subscriptions FOR ALL USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

-- MENUS
CREATE POLICY "Admins have full access to menus" 
ON menus FOR ALL USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

-- SKIPS
CREATE POLICY "Admins have full access to skips" 
ON skips FOR ALL USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

-- DELIVERIES
CREATE POLICY "Admins have full access to deliveries" 
ON deliveries FOR ALL USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

-- WALLETS
CREATE POLICY "Admins have full access to wallets" 
ON wallets FOR ALL USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

-- WALLET TRANSACTIONS
CREATE POLICY "Admins have full access to wallet_transactions" 
ON wallet_transactions FOR ALL USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

-- VENDOR LEDGER
CREATE POLICY "Admins have full access to vendor_ledger" 
ON vendor_ledger FOR ALL USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

-- DRIVER LEDGER
CREATE POLICY "Admins have full access to driver_ledger" 
ON driver_ledger FOR ALL USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

-- RATINGS
CREATE POLICY "Admins have full access to ratings" 
ON ratings FOR ALL USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

