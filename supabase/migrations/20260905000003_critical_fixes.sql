-- ==============================================================================
-- MASTER CRITICAL FIXES (God-Mode Post-Audit)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FIX ORPHANED CANCELLATION TRIGGER (Double-Refund Exploit)
-- ------------------------------------------------------------------------------
-- The trigger was still pointing to process_wallet_refund_on_cancellation
DROP TRIGGER IF EXISTS on_customer_subscription_cancelled ON public.customer_subscriptions;
CREATE TRIGGER on_customer_subscription_cancelled
  BEFORE UPDATE ON public.customer_subscriptions
  FOR EACH ROW EXECUTE PROCEDURE process_subscription_cancellation_refund();

-- ------------------------------------------------------------------------------
-- 2. WALLET NON-NEGATIVE CONSTRAINT
-- ------------------------------------------------------------------------------
ALTER TABLE public.wallets 
  ADD CONSTRAINT wallet_balance_non_negative CHECK (balance >= 0);

-- ------------------------------------------------------------------------------
-- 3. FIX ZERO ROW-LEVEL LOCKING IN SUBSCRIPTION PURCHASE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_subscription_purchase()
RETURNS trigger AS $$
DECLARE
  sub_rec RECORD;
  total_days INT;
  qty INT;
  total_cost NUMERIC;
  w_id UUID;
  curr_balance NUMERIC;
  current_active_qty INT;
BEGIN
  -- 1. Fetch the underlying subscription details (including capacity)
  -- ADDED: FOR UPDATE to serialize concurrent purchases for the same plan
  SELECT price_per_day, operating_days, capacity 
  INTO sub_rec
  FROM subscriptions WHERE id = NEW.subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription plan does not exist';
  END IF;

  qty := COALESCE(NEW.quantity, 1);

  -- 2. Physical Capacity Enforcement (Temporal Overlap Check)
  SELECT COALESCE(SUM(quantity), 0) INTO current_active_qty
  FROM customer_subscriptions
  WHERE subscription_id = NEW.subscription_id
    AND status = 'active'
    AND end_date >= NEW.start_date
    AND start_date <= NEW.end_date;

  IF (current_active_qty + qty) > sub_rec.capacity THEN
    RAISE EXCEPTION 'PHYSICAL LIMIT REACHED: This meal plan is completely sold out for the selected dates. Maximum capacity is %, but this order would push it to %.', sub_rec.capacity, (current_active_qty + qty);
  END IF;

  -- 3. Calculate temporal economics
  total_days := count_remaining_operating_days(NEW.start_date, NEW.end_date, sub_rec.operating_days);
  total_cost := total_days * sub_rec.price_per_day * qty;

  -- 4. Fetch customer's wallet
  -- ADDED: FOR UPDATE to serialize concurrent deductions from the same wallet
  SELECT id, balance INTO w_id, curr_balance 
  FROM wallets WHERE customer_id = NEW.customer_id
  FOR UPDATE;

  IF w_id IS NULL THEN
    RAISE EXCEPTION 'Customer wallet not found. Please initialize a wallet first.';
  END IF;

  -- 5. Cryptographic Validation
  IF curr_balance < total_cost THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Required: ₹%, Available: ₹%', total_cost, curr_balance;
  END IF;

  -- 6. Forceful Deduction
  UPDATE wallets 
  SET balance = balance - total_cost,
      updated_at = NOW()
  WHERE id = w_id;

  -- 7. Immutable Ledger Entry
  INSERT INTO wallet_transactions (wallet_id, amount, type, description)
  VALUES (w_id, -total_cost, 'purchase', 'Purchased subscription ' || NEW.id || ' (' || total_days || ' days @ ₹' || sub_rec.price_per_day || ' x ' || qty || ')');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------
-- 4. TIMEZONE BUGS (IST UTC+5:30 Alignment)
-- ------------------------------------------------------------------------------

-- Fix A: enforce_premium_skip
CREATE OR REPLACE FUNCTION enforce_premium_skip()
RETURNS trigger AS $$
DECLARE
  v_premium_unlocked BOOLEAN;
  v_allow_skips BOOLEAN;
  v_target_date DATE;
  v_current_time TIME;
  v_current_ist_date DATE;
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
  
  -- Use IST date instead of UTC CURRENT_DATE
  IF v_target_date <= v_current_ist_date THEN
    RAISE EXCEPTION 'You cannot skip a meal for today or the past.';
  END IF;

  IF v_target_date = (v_current_ist_date + 1) THEN
    v_current_time := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' + INTERVAL '5 hours 30 minutes')::time;
    IF v_current_time >= '20:00:00'::time THEN
      RAISE EXCEPTION 'Skip deadline missed. You must skip tomorrow''s meal before 8:00 PM today.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix B: Fix skip date constraint
ALTER TABLE public.skips DROP CONSTRAINT IF EXISTS check_skip_date_future;
ALTER TABLE public.skips ADD CONSTRAINT check_skip_date_future 
  CHECK (date > (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date);

-- Fix C: generate_daily_deliveries (remove default argument to force explicit passing, or hardcode IST)
CREATE OR REPLACE FUNCTION generate_daily_deliveries(target_date DATE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date)
RETURNS VOID AS $$
DECLARE
  day_str TEXT;
  new_delivery_id UUID;
  sub RECORD;
BEGIN
  -- Use explicit IST day
  day_str := lower(to_char(target_date, 'dy'));

  FOR sub IN 
    SELECT cs.id FROM customer_subscriptions cs
    JOIN subscriptions s ON cs.subscription_id = s.id
    WHERE cs.status = 'active'
      AND cs.start_date <= target_date
      AND cs.end_date >= target_date
      AND (s.operating_days IS NULL OR day_str = ANY(s.operating_days))
      AND NOT EXISTS (SELECT 1 FROM skips sk WHERE sk.customer_subscription_id = cs.id AND sk.date = target_date)
      AND NOT EXISTS (SELECT 1 FROM kitchen_holidays kh WHERE kh.kitchen_id = s.kitchen_id AND kh.holiday_date = target_date)
      AND NOT EXISTS (SELECT 1 FROM deliveries d WHERE d.customer_subscription_id = cs.id AND d.date = target_date)
  LOOP
    INSERT INTO deliveries (customer_subscription_id, date, status)
    VALUES (sub.id, target_date, 'scheduled')
    RETURNING id INTO new_delivery_id;

    INSERT INTO delivery_secrets (delivery_id, otp_code)
    VALUES (new_delivery_id, lpad(floor(random() * 10000)::text, 4, '0'));
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix D: process_subscription_cancellation_refund
CREATE OR REPLACE FUNCTION process_subscription_cancellation_refund()
RETURNS trigger AS $$
DECLARE
  w_id UUID;
  daily_cost NUMERIC;
  qty INT;
  remaining_days INTEGER;
  future_skips INTEGER;
  refund_amount NUMERIC;
  op_days TEXT[];
  v_current_ist_date DATE;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status = 'active' THEN
    v_current_ist_date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date;
    
    IF NEW.end_date < v_current_ist_date THEN
      RETURN NEW;
    END IF;

    SELECT price_per_day, operating_days INTO daily_cost, op_days
    FROM subscriptions WHERE id = NEW.subscription_id;

    qty := COALESCE(NEW.quantity, 1);
    
    -- Calculate gross remaining days
    remaining_days := count_remaining_operating_days(v_current_ist_date + INTERVAL '1 day', NEW.end_date, op_days);
    
    -- Find all future skips that have ALREADY been refunded to the customer's wallet
    SELECT COUNT(*) INTO future_skips
    FROM skips
    WHERE customer_subscription_id = NEW.id
      AND date > v_current_ist_date
      AND date <= NEW.end_date;

    remaining_days := remaining_days - future_skips;

    IF remaining_days > 0 THEN
      refund_amount := remaining_days * daily_cost * qty;
      SELECT id INTO w_id FROM wallets WHERE customer_id = NEW.customer_id;

      IF w_id IS NOT NULL THEN
        UPDATE wallets 
        SET balance = balance + refund_amount,
            updated_at = NOW()
        WHERE id = w_id;

        INSERT INTO wallet_transactions (wallet_id, amount, type, description)
        VALUES (w_id, refund_amount, 'refund', 'Prorated refund for cancelled subscription ' || NEW.id || ' (Deducted ' || future_skips || ' pre-refunded skips)');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------
-- 5. FIX BACK-TO-BACK RENEWAL OVERLAP
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_duplicate_slot_subscriptions()
RETURNS trigger AS $$
DECLARE
  v_kitchen_id UUID;
  v_slot_name TEXT;
  v_conflict_exists BOOLEAN;
BEGIN
  SELECT kitchen_id, slot_name INTO v_kitchen_id, v_slot_name
  FROM public.subscriptions
  WHERE id = NEW.subscription_id;

  SELECT EXISTS (
    SELECT 1 
    FROM public.customer_subscriptions cs
    JOIN public.subscriptions s ON cs.subscription_id = s.id
    WHERE cs.customer_id = NEW.customer_id
      AND cs.status = 'active'
      AND s.kitchen_id = v_kitchen_id
      AND s.slot_name = v_slot_name
      AND cs.end_date > NEW.start_date -- FIXED: Strict greater than allows back-to-back
      AND cs.start_date <= NEW.end_date
  ) INTO v_conflict_exists;

  IF v_conflict_exists THEN
    RAISE EXCEPTION 'You already have an active % subscription from this kitchen. To order more, please increase the quantity of your existing plan.', v_slot_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------
-- 6. VENDOR TAKEAWAY OTP RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION secure_vendor_complete_takeaway(p_delivery_id UUID, p_otp TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  del RECORD;
  real_otp TEXT;
BEGIN
  -- 1. Verify delivery exists and is takeaway for a kitchen owned by the caller
  SELECT d.id INTO del
  FROM deliveries d
  JOIN customer_subscriptions cs ON d.customer_subscription_id = cs.id
  JOIN subscriptions s ON cs.subscription_id = s.id
  JOIN kitchens k ON s.kitchen_id = k.id
  WHERE d.id = p_delivery_id
    AND s.delivery_type = 'takeaway'
    AND k.vendor_id = auth.uid();
    
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'SECURITY BREACH: Takeaway delivery not found or does not belong to your kitchen.'; 
  END IF;

  -- 2. Fetch the true OTP from the vault
  SELECT otp_code INTO real_otp FROM delivery_secrets WHERE delivery_id = p_delivery_id;
  
  IF real_otp = p_otp THEN
    UPDATE deliveries SET status = 'delivered', delivered_at = NOW() WHERE id = p_delivery_id;
    RETURN TRUE;
  ELSE
    RAISE EXCEPTION 'CRYPTOGRAPHIC REJECTION: Invalid OTP Code.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 7. FEATURE FLAGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feature_flags (
  name TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT
);

-- Enable RLS so anyone can read flags, but only postgres can modify
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access to feature flags" ON public.feature_flags FOR SELECT USING (true);

INSERT INTO public.feature_flags (name, enabled, description) 
VALUES 
  ('timezone_utc_conversion', TRUE, 'Use explicit UTC conversion for all date logic'),
  ('otp_rpc', TRUE, 'Enable server-side OTP verification'),
  ('manual_pickup_override', FALSE, 'Enable admin-approved manual pickup')
ON CONFLICT (name) DO NOTHING;

