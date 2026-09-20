-- ==============================================================================
-- MIGRATION 008: TIER 1 FEATURES + LOOPHOLE CLOSURES
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SLOT TIME BOUNDS ENFORCEMENT
-- ------------------------------------------------------------------------------
-- BRD: Breakfast 7-10AM, Lunch 12PM-3:30PM, Dinner 6-9PM
CREATE OR REPLACE FUNCTION enforce_slot_time_bounds()
RETURNS trigger AS $$
BEGIN
  IF NEW.slot_name = 'breakfast' THEN
    IF NEW.slot_target_time < '07:00'::time OR NEW.slot_target_time > '10:00'::time THEN
      RAISE EXCEPTION 'Breakfast slot target time must be between 7:00 AM and 10:00 AM.';
    END IF;
  ELSIF NEW.slot_name = 'lunch' THEN
    IF NEW.slot_target_time < '12:00'::time OR NEW.slot_target_time > '15:30'::time THEN
      RAISE EXCEPTION 'Lunch slot target time must be between 12:00 PM and 3:30 PM.';
    END IF;
  ELSIF NEW.slot_name = 'dinner' THEN
    IF NEW.slot_target_time < '18:00'::time OR NEW.slot_target_time > '21:00'::time THEN
      RAISE EXCEPTION 'Dinner slot target time must be between 6:00 PM and 9:00 PM.';
    END IF;
  END IF;
  -- Custom slots have no time restriction
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_enforce_slot_time_bounds ON subscriptions;
CREATE TRIGGER trigger_enforce_slot_time_bounds
  BEFORE INSERT OR UPDATE ON subscriptions
  FOR EACH ROW EXECUTE PROCEDURE enforce_slot_time_bounds();


-- ------------------------------------------------------------------------------
-- 2. PREMIUM PURCHASES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS premium_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  payment_id TEXT, -- Razorpay payment ID (deferred)
  amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE premium_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view own premium purchases" ON premium_purchases
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Customers can purchase premium" ON premium_purchases
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Admins manage premium" ON premium_purchases
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- RPC: Purchase premium (deducts from wallet, unlocks all active subscriptions)
CREATE OR REPLACE FUNCTION purchase_premium(p_amount NUMERIC DEFAULT 99)
RETURNS BOOLEAN AS $$
DECLARE
  v_wallet_id UUID;
  v_balance NUMERIC;
BEGIN
  -- Get wallet
  SELECT id, balance INTO v_wallet_id, v_balance
  FROM wallets WHERE customer_id = auth.uid();

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance. You need ₹% but have ₹%.', p_amount, v_balance;
  END IF;

  -- Deduct from wallet
  UPDATE wallets SET balance = balance - p_amount WHERE id = v_wallet_id;

  -- Record transaction
  INSERT INTO wallet_transactions (wallet_id, amount, type, description)
  VALUES (v_wallet_id, p_amount, 'premium_purchase', 'Premium Flexi Skip unlocked');

  -- Record purchase
  INSERT INTO premium_purchases (customer_id, amount)
  VALUES (auth.uid(), p_amount);

  -- Unlock all active subscriptions
  UPDATE customer_subscriptions
  SET premium_unlocked = true
  WHERE customer_id = auth.uid()
    AND status = 'active';

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------
-- 3. FLEXI SKIP LIMITS ENFORCEMENT
-- ------------------------------------------------------------------------------
-- BRD: Daily(30d) = 5 skips, Weekly = 1 week, Monthly = full pause
CREATE OR REPLACE FUNCTION enforce_flexi_skip_limits()
RETURNS trigger AS $$
DECLARE
  v_duration_type TEXT;
  v_skip_count INT;
  v_max_skips INT;
BEGIN
  -- Get the subscription's duration type
  SELECT s.duration_type INTO v_duration_type
  FROM customer_subscriptions cs
  JOIN subscriptions s ON cs.subscription_id = s.id
  WHERE cs.id = NEW.customer_subscription_id;

  -- Count existing skips for this subscription
  SELECT COUNT(*) INTO v_skip_count
  FROM skips
  WHERE customer_subscription_id = NEW.customer_subscription_id;

  -- Determine max skips based on duration type
  CASE v_duration_type
    WHEN 'daily' THEN v_max_skips := 5;    -- 30-day plan: 5 skips
    WHEN 'weekly' THEN v_max_skips := 7;   -- Weekly: 1 week (7 days)
    WHEN 'monthly' THEN v_max_skips := 30; -- Monthly: full pause
    ELSE v_max_skips := 0;                  -- Custom: no skips
  END CASE;

  IF v_max_skips = 0 THEN
    RAISE EXCEPTION 'Custom plans do not allow skips.';
  END IF;

  IF v_skip_count >= v_max_skips THEN
    RAISE EXCEPTION 'Skip limit reached. Your % plan allows a maximum of % skips.', v_duration_type, v_max_skips;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_enforce_flexi_skip_limits ON skips;
CREATE TRIGGER trigger_enforce_flexi_skip_limits
  BEFORE INSERT ON skips
  FOR EACH ROW EXECUTE PROCEDURE enforce_flexi_skip_limits();


-- ------------------------------------------------------------------------------
-- 4. FAILED DELIVERY RPC (Driver reports customer unavailable)
-- ------------------------------------------------------------------------------
ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'failed_customer_unavailable';

CREATE OR REPLACE FUNCTION driver_report_failed_delivery(
  p_delivery_id UUID,
  p_reason TEXT DEFAULT 'Customer unavailable',
  p_photo_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_delivery RECORD;
BEGIN
  -- Verify driver owns this delivery
  SELECT id, status, customer_subscription_id
  INTO v_delivery
  FROM deliveries
  WHERE id = p_delivery_id
    AND driver_id = auth.uid()
    AND status = 'picked_up';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found or not in picked_up status.';
  END IF;

  -- Mark as failed
  UPDATE deliveries
  SET status = 'failed_customer_unavailable',
      delivered_at = NOW(),
      proof_photo_url = p_photo_url
  WHERE id = p_delivery_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add the financial settlement for this new failure status
-- (Customer gets full refund, vendor still gets paid, driver gets no penalty for customer's fault)
CREATE OR REPLACE FUNCTION settle_customer_unavailable()
RETURNS trigger AS $$
DECLARE
  sub_rec RECORD;
  qty INT;
  gross NUMERIC;
  v_fee NUMERIC;
BEGIN
  IF NEW.status = 'failed_customer_unavailable' AND OLD.status != 'failed_customer_unavailable' AND NEW.payout_processed = false THEN
    SELECT
      s.kitchen_id,
      COALESCE(cs.locked_price_per_day, s.price_per_day) as price_per_day,
      COALESCE(cs.locked_vendor_fee, s.vendor_fee) as vendor_fee,
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

    -- Customer gets NO refund (their fault for not being home)
    -- Vendor still gets paid (food was cooked and sent)
    INSERT INTO vendor_ledger (kitchen_id, transaction_date, gross_amount, platform_fee, net_amount, status)
    VALUES (sub_rec.kitchen_id, NEW.date, gross, gross - v_fee, v_fee, 'pending');

    -- Driver gets paid (they showed up)
    IF NEW.driver_id IS NOT NULL THEN
      INSERT INTO driver_ledger (driver_id, transaction_date, amount, status)
      VALUES (NEW.driver_id, NEW.date, COALESCE(sub_rec.price_per_day, 0) * 0.2 * qty, 'pending');
    END IF;

    NEW.payout_processed := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_customer_unavailable ON deliveries;
CREATE TRIGGER on_customer_unavailable
  BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE PROCEDURE settle_customer_unavailable();


-- ------------------------------------------------------------------------------
-- 5. VENDOR EMERGENCY PAUSE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION vendor_emergency_pause(p_kitchen_id UUID)
RETURNS INT AS $$
DECLARE
  v_tomorrow DATE;
  v_cancelled_count INT;
BEGIN
  -- Verify vendor owns this kitchen
  IF NOT EXISTS (SELECT 1 FROM kitchens WHERE id = p_kitchen_id AND vendor_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this kitchen.';
  END IF;

  v_tomorrow := ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 day')::date;

  -- Cancel all scheduled deliveries for tomorrow
  WITH cancelled AS (
    UPDATE deliveries d
    SET status = 'failed_vendor_qr_expired' -- Reuse existing failure type
    FROM customer_subscriptions cs
    JOIN subscriptions s ON cs.subscription_id = s.id
    WHERE d.customer_subscription_id = cs.id
      AND s.kitchen_id = p_kitchen_id
      AND d.date = v_tomorrow
      AND d.status = 'scheduled'
    RETURNING d.id
  )
  SELECT COUNT(*) INTO v_cancelled_count FROM cancelled;

  RETURN v_cancelled_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------
-- 6. ADMIN: FORCE MAJEURE OVERRIDE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_force_majeure(
  p_date DATE,
  p_kitchen_id UUID DEFAULT NULL, -- NULL = entire city
  p_reason TEXT DEFAULT 'Weather/Force Majeure'
)
RETURNS INT AS $$
DECLARE
  v_role TEXT;
  v_affected_count INT;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Admins only';
  END IF;

  -- Mark all matching deliveries as force majeure
  WITH affected AS (
    UPDATE deliveries d
    SET status = 'failed_vendor_qr_expired'
    FROM customer_subscriptions cs
    JOIN subscriptions s ON cs.subscription_id = s.id
    WHERE d.customer_subscription_id = cs.id
      AND d.date = p_date
      AND d.status IN ('scheduled', 'vendor_ready')
      AND (p_kitchen_id IS NULL OR s.kitchen_id = p_kitchen_id)
    RETURNING d.id
  )
  SELECT COUNT(*) INTO v_affected_count FROM affected;

  RETURN v_affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

