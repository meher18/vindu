-- ==============================================================================
-- MIGRATION 007: 100x DEEP AUDIT COMPREHENSIVE FIX
-- ==============================================================================
-- Fixes discovered by the 4-auditor deep sweep on 2026-09-12.

-- ------------------------------------------------------------------------------
-- 1. FIX: MUTABLE CURRENT_DATE IN CHECK CONSTRAINTS
-- ------------------------------------------------------------------------------
-- Postgres CHECK constraints cannot use mutable functions like CURRENT_DATE.
-- We must drop these and enforce them via triggers instead.

ALTER TABLE skips DROP CONSTRAINT IF EXISTS check_skip_date_future;
-- The skip date enforcement is already handled by the enforce_premium_skip() trigger.
-- No CHECK constraint needed.


-- ------------------------------------------------------------------------------
-- 2. FIX: REMAINING CURRENT_DATE → IST IN FUNCTIONS
-- ------------------------------------------------------------------------------

-- 2a. enforce_premium_skip (skip cutoff logic)
CREATE OR REPLACE FUNCTION enforce_premium_skip()
RETURNS trigger AS $$
DECLARE
  v_premium_unlocked BOOLEAN;
  v_allow_skips BOOLEAN;
  v_target_date DATE;
  v_current_ist_date DATE;
  v_current_ist_time TIME;
BEGIN
  SELECT cs.premium_unlocked, s.allow_skips 
  INTO v_premium_unlocked, v_allow_skips
  FROM public.customer_subscriptions cs
  JOIN public.subscriptions s ON cs.subscription_id = s.id
  WHERE cs.id = NEW.customer_subscription_id;

  IF NOT v_allow_skips THEN
    RAISE EXCEPTION 'This meal plan does not allow skips.';
  END IF;

  IF NOT v_premium_unlocked THEN
    RAISE EXCEPTION 'Premium subscription is required to skip meals.';
  END IF;

  v_target_date := NEW.date;
  v_current_ist_date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date;
  v_current_ist_time := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::time;

  -- Cannot skip today or past
  IF v_target_date <= v_current_ist_date THEN
    RAISE EXCEPTION 'You cannot skip a meal for today or the past.';
  END IF;

  -- 8 PM IST cutoff for tomorrow
  IF v_target_date = (v_current_ist_date + 1) THEN
    IF v_current_ist_time >= '20:00:00'::time THEN
      RAISE EXCEPTION 'Skip deadline missed. You must skip tomorrow''s meal before 8:00 PM today.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2b. prevent_duplicate_slot_subscriptions (no CURRENT_DATE usage, but just in case)
-- Already clean. No fix needed.


-- ------------------------------------------------------------------------------
-- 3. FIX: DANGEROUS ON DELETE CASCADE ON CRITICAL TABLES
-- ------------------------------------------------------------------------------
-- Deleting a kitchen or user should NOT cascade-wipe financial history.

-- 3a. subscriptions.kitchen_id: RESTRICT instead of CASCADE
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_kitchen_id_fkey;
ALTER TABLE public.subscriptions 
  ADD CONSTRAINT subscriptions_kitchen_id_fkey 
  FOREIGN KEY (kitchen_id) REFERENCES public.kitchens(id) ON DELETE RESTRICT;

-- 3b. deliveries.customer_subscription_id: RESTRICT instead of CASCADE
ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_customer_subscription_id_fkey;
ALTER TABLE public.deliveries 
  ADD CONSTRAINT deliveries_customer_subscription_id_fkey 
  FOREIGN KEY (customer_subscription_id) REFERENCES public.customer_subscriptions(id) ON DELETE RESTRICT;

-- 3c. skips.customer_subscription_id: RESTRICT instead of CASCADE
ALTER TABLE public.skips DROP CONSTRAINT IF EXISTS skips_customer_subscription_id_fkey;
ALTER TABLE public.skips 
  ADD CONSTRAINT skips_customer_subscription_id_fkey 
  FOREIGN KEY (customer_subscription_id) REFERENCES public.customer_subscriptions(id) ON DELETE RESTRICT;

-- 3d. wallets.customer_id: RESTRICT. Never delete a wallet with money in it.
ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS wallets_customer_id_fkey;
ALTER TABLE public.wallets 
  ADD CONSTRAINT wallets_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- 3e. wallet_transactions: RESTRICT
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_wallet_id_fkey;
ALTER TABLE public.wallet_transactions 
  ADD CONSTRAINT wallet_transactions_wallet_id_fkey 
  FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE RESTRICT;

-- 3f. vendor_ledger: RESTRICT
ALTER TABLE public.vendor_ledger DROP CONSTRAINT IF EXISTS vendor_ledger_kitchen_id_fkey;
ALTER TABLE public.vendor_ledger 
  ADD CONSTRAINT vendor_ledger_kitchen_id_fkey 
  FOREIGN KEY (kitchen_id) REFERENCES public.kitchens(id) ON DELETE RESTRICT;

-- 3g. driver_ledger: RESTRICT
ALTER TABLE public.driver_ledger DROP CONSTRAINT IF EXISTS driver_ledger_driver_id_fkey;
ALTER TABLE public.driver_ledger 
  ADD CONSTRAINT driver_ledger_driver_id_fkey 
  FOREIGN KEY (driver_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;


-- ------------------------------------------------------------------------------
-- 4. FIX: OVERLY PERMISSIVE DRIVER RLS ON DELIVERIES
-- ------------------------------------------------------------------------------
-- Current: Any driver can SELECT/UPDATE ANY delivery in the system.
-- Fixed: Drivers can only see deliveries that are unclaimed+vendor_ready OR assigned to them.

DROP POLICY IF EXISTS "Drivers view deliveries" ON deliveries;
CREATE POLICY "Drivers view deliveries" ON deliveries FOR SELECT USING (
  (
    -- Drivers see unclaimed vendor_ready deliveries (to build routes)
    (status = 'vendor_ready' AND driver_id IS NULL)
    OR
    -- Drivers see their own assigned deliveries
    (driver_id = auth.uid())
  )
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'driver')
);

DROP POLICY IF EXISTS "Drivers update deliveries" ON deliveries;
CREATE POLICY "Drivers update deliveries" ON deliveries FOR UPDATE USING (
  (
    -- Can claim unclaimed vendor_ready deliveries
    (status = 'vendor_ready' AND driver_id IS NULL)
    OR
    -- Can update their own deliveries (mark delivered etc)
    (driver_id = auth.uid())
  )
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'driver')
);


-- ------------------------------------------------------------------------------
-- 5. FIX: FEATURE FLAGS MISSING ADMIN RLS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage feature_flags" ON feature_flags;
CREATE POLICY "Admins manage feature_flags" ON feature_flags FOR ALL USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);


-- ------------------------------------------------------------------------------
-- 6. FIX: CONFLICTING SUBSCRIPTION TRIGGERS
-- ------------------------------------------------------------------------------
-- The block_financial_mutation trigger universally blocks ALL updates to subscriptions,
-- making the conditional immutability trigger useless and also blocking legitimate 
-- status changes from the admin panel.
-- Replace with a smarter version that only blocks price/fee changes, not status changes.

CREATE OR REPLACE FUNCTION block_financial_mutation()
RETURNS trigger AS $$
BEGIN
  -- Only block changes to financial fields, NOT status or capacity changes
  IF NEW.price_per_day IS DISTINCT FROM OLD.price_per_day
     OR NEW.vendor_fee IS DISTINCT FROM OLD.vendor_fee
     OR NEW.delivery_fee IS DISTINCT FROM OLD.delivery_fee THEN
    -- Allow if no active subscribers exist
    IF EXISTS (
      SELECT 1 FROM customer_subscriptions 
      WHERE subscription_id = NEW.id 
        AND status = 'active'
        AND end_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
    ) THEN
      RAISE EXCEPTION 'Cannot change pricing while active subscribers exist. Create a new plan instead.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------
-- 7. FIX: FINANCIAL SETTLEMENT MUST USE SNAPSHOTTED PRICES
-- ------------------------------------------------------------------------------
-- The version in 20260905000002 still reads live prices from subscriptions.
-- Override it to use the locked_price columns from customer_subscriptions.

CREATE OR REPLACE FUNCTION process_financial_settlement_on_delivery()
RETURNS trigger AS $$
DECLARE
  sub_rec RECORD;
  qty INT;
  gross NUMERIC;
  v_fee NUMERIC;
  d_fee NUMERIC;
  p_fee NUMERIC;
BEGIN
  IF NEW.payout_processed = true THEN
    RETURN NEW;
  END IF;

  -- Use SNAPSHOTTED prices from customer_subscriptions (Fort Knox)
  SELECT 
    s.kitchen_id, 
    COALESCE(cs.locked_price_per_day, s.price_per_day) as price_per_day, 
    COALESCE(cs.locked_vendor_fee, s.vendor_fee) as vendor_fee, 
    COALESCE(cs.locked_delivery_fee, s.delivery_fee) as delivery_fee, 
    cs.quantity, 
    cs.customer_id
  INTO sub_rec
  FROM customer_subscriptions cs
  JOIN subscriptions s ON cs.subscription_id = s.id
  WHERE cs.id = NEW.customer_subscription_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  qty := COALESCE(sub_rec.quantity, 1);
  gross := sub_rec.price_per_day * qty;
  v_fee := sub_rec.vendor_fee * qty;
  d_fee := sub_rec.delivery_fee * qty;
  p_fee := gross - v_fee - d_fee;

  -- SUCCESSFUL DELIVERY
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    INSERT INTO vendor_ledger (kitchen_id, transaction_date, gross_amount, platform_fee, net_amount, status)
    VALUES (sub_rec.kitchen_id, NEW.date, gross, p_fee, v_fee, 'pending');

    IF NEW.driver_id IS NOT NULL THEN
      INSERT INTO driver_ledger (driver_id, transaction_date, amount, status)
      VALUES (NEW.driver_id, NEW.date, d_fee, 'pending');
    END IF;
    NEW.payout_processed := true;

  -- DRIVER DID NOT PICKUP (QR EXPIRED)
  ELSIF NEW.status = 'failed_vendor_qr_expired' AND OLD.status != 'failed_vendor_qr_expired' THEN
    UPDATE wallets SET balance = balance + gross WHERE customer_id = sub_rec.customer_id;
    INSERT INTO wallet_transactions (wallet_id, amount, type, description, delivery_id)
    SELECT id, gross, 'refund', 'Driver unavailable. Order cancelled and fully refunded.', NEW.id
    FROM wallets WHERE customer_id = sub_rec.customer_id;

    INSERT INTO vendor_ledger (kitchen_id, transaction_date, gross_amount, platform_fee, net_amount, status)
    VALUES (sub_rec.kitchen_id, NEW.date, gross, 0, v_fee, 'pending');

    NEW.payout_processed := true;

  -- DRIVER LOST/STOLE IT (OTP EXPIRED)
  ELSIF NEW.status = 'failed_driver_otp_expired' AND OLD.status != 'failed_driver_otp_expired' THEN
    UPDATE wallets SET balance = balance + gross WHERE customer_id = sub_rec.customer_id;
    INSERT INTO wallet_transactions (wallet_id, amount, type, description, delivery_id)
    SELECT id, gross, 'refund', 'Delivery failed to arrive. Order fully refunded.', NEW.id
    FROM wallets WHERE customer_id = sub_rec.customer_id;

    INSERT INTO vendor_ledger (kitchen_id, transaction_date, gross_amount, platform_fee, net_amount, status)
    VALUES (sub_rec.kitchen_id, NEW.date, gross, 0, v_fee, 'pending');

    IF NEW.driver_id IS NOT NULL THEN
      INSERT INTO driver_ledger (driver_id, transaction_date, amount, status)
      VALUES (NEW.driver_id, NEW.date, -(d_fee * 2), 'pending');
    END IF;
    
    NEW.payout_processed := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

