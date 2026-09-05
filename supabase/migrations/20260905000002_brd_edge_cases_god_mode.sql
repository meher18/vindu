-- ==============================================================================
-- MASTER BRD EDGE CASE ENFORCEMENT MATRIX ("GOD-MODE" FIXES)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EDGE CASE #16: 8:00 PM SKIP CUTOFF (Timezone-Aware)
-- ------------------------------------------------------------------------------
-- The previous constraint allowed skips up until 11:59 PM.
-- We now enforce an 8:00 PM (20:00:00) IST strict cutoff for skipping tomorrow's meal.
CREATE OR REPLACE FUNCTION enforce_premium_skip()
RETURNS trigger AS $$
DECLARE
  v_premium_unlocked BOOLEAN;
  v_allow_skips BOOLEAN;
  v_target_date DATE;
  v_current_time TIME;
BEGIN
  -- 1. Fetch Subscription rules
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

  -- 2. Time-Based Logic
  v_target_date := NEW.date;
  
  -- You cannot skip today's meal, period.
  IF v_target_date <= CURRENT_DATE THEN
    RAISE EXCEPTION 'You cannot skip a meal for today or the past.';
  END IF;

  -- If you are skipping tomorrow's meal, check if it's past 8:00 PM IST
  IF v_target_date = (CURRENT_DATE + 1) THEN
    -- Convert current UTC time to IST (UTC+5:30)
    v_current_time := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' + INTERVAL '5 hours 30 minutes')::time;
    
    IF v_current_time >= '20:00:00'::time THEN
      RAISE EXCEPTION 'Skip deadline missed. You must skip tomorrow''s meal before 8:00 PM today.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------
-- 2. EDGE CASE #2: PREVENT DUPLICATE SLOT SUBSCRIPTIONS
-- ------------------------------------------------------------------------------
-- A customer cannot have two active subscriptions from the same Vendor for the same Slot.
CREATE OR REPLACE FUNCTION prevent_duplicate_slot_subscriptions()
RETURNS trigger AS $$
DECLARE
  v_kitchen_id UUID;
  v_slot_name TEXT;
  v_conflict_exists BOOLEAN;
BEGIN
  -- Get the target kitchen and slot
  SELECT kitchen_id, slot_name INTO v_kitchen_id, v_slot_name
  FROM public.subscriptions
  WHERE id = NEW.subscription_id;

  -- Check if an active subscription exists for this customer, kitchen, and slot
  -- that temporally overlaps with the new subscription.
  SELECT EXISTS (
    SELECT 1 
    FROM public.customer_subscriptions cs
    JOIN public.subscriptions s ON cs.subscription_id = s.id
    WHERE cs.customer_id = NEW.customer_id
      AND cs.status = 'active'
      AND s.kitchen_id = v_kitchen_id
      AND s.slot_name = v_slot_name
      AND cs.end_date >= NEW.start_date 
      AND cs.start_date <= NEW.end_date
  ) INTO v_conflict_exists;

  IF v_conflict_exists THEN
    RAISE EXCEPTION 'You already have an active % subscription from this kitchen. To order more, please increase the quantity of your existing plan.', v_slot_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_prevent_duplicate_slot ON public.customer_subscriptions;
CREATE TRIGGER trigger_prevent_duplicate_slot
  BEFORE INSERT ON public.customer_subscriptions
  FOR EACH ROW EXECUTE PROCEDURE prevent_duplicate_slot_subscriptions();


-- ------------------------------------------------------------------------------
-- 3. EDGE CASE #5 & #6: QR & OTP TIMEOUT SWEEPER
-- ------------------------------------------------------------------------------
-- First, ensure the delivery_status enum can handle failures
ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'failed_vendor_qr_expired';
ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'failed_driver_otp_expired';

CREATE OR REPLACE FUNCTION sweep_expired_deliveries()
RETURNS void AS $$
BEGIN
  -- 1. Vendor marked ready, but driver didn't scan QR within 2 hours
  UPDATE public.deliveries
  SET status = 'failed_vendor_qr_expired'
  WHERE status = 'vendor_ready'
    AND vendor_ready_at < NOW() - INTERVAL '2 hours';

  -- 2. Driver scanned QR, but didn't enter OTP within 90 mins 
  UPDATE public.deliveries
  SET status = 'failed_driver_otp_expired'
  WHERE status = 'picked_up'
    AND qr_scanned_at < NOW() - INTERVAL '90 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------
-- 4. UPGRADE FINANCIAL SETTLEMENT ENGINE TO HANDLE FAILURES
-- ------------------------------------------------------------------------------
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
  -- Cryptographic lock: Only process if it hasn't been paid out before
  IF NEW.payout_processed = true THEN
    RETURN NEW;
  END IF;

  SELECT s.kitchen_id, s.price_per_day, s.vendor_fee, s.delivery_fee, cs.quantity, cs.customer_id
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
    -- Customer gets 100% refund
    UPDATE wallets SET balance = balance + gross WHERE customer_id = sub_rec.customer_id;
    INSERT INTO wallet_transactions (wallet_id, amount, type, description, delivery_id)
    SELECT id, gross, 'refund', 'Driver unavailable. Order cancelled and fully refunded.', NEW.id
    FROM wallets WHERE customer_id = sub_rec.customer_id;

    -- Vendor still gets paid (they cooked it)
    INSERT INTO vendor_ledger (kitchen_id, transaction_date, gross_amount, platform_fee, net_amount, status)
    VALUES (sub_rec.kitchen_id, NEW.date, gross, 0, v_fee, 'pending');

    NEW.payout_processed := true;

  -- DRIVER LOST/STOLE IT (OTP EXPIRED)
  ELSIF NEW.status = 'failed_driver_otp_expired' AND OLD.status != 'failed_driver_otp_expired' THEN
    -- Customer gets 100% refund
    UPDATE wallets SET balance = balance + gross WHERE customer_id = sub_rec.customer_id;
    INSERT INTO wallet_transactions (wallet_id, amount, type, description, delivery_id)
    SELECT id, gross, 'refund', 'Delivery failed to arrive. Order fully refunded.', NEW.id
    FROM wallets WHERE customer_id = sub_rec.customer_id;

    -- Vendor still gets paid
    INSERT INTO vendor_ledger (kitchen_id, transaction_date, gross_amount, platform_fee, net_amount, status)
    VALUES (sub_rec.kitchen_id, NEW.date, gross, 0, v_fee, 'pending');

    -- Driver gets a penalty ledger entry (negative)
    IF NEW.driver_id IS NOT NULL THEN
      INSERT INTO driver_ledger (driver_id, transaction_date, amount, status)
      VALUES (NEW.driver_id, NEW.date, -(d_fee * 2), 'pending');
    END IF;
    
    NEW.payout_processed := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------
-- 5. EDGE CASE #21: ZONE BOUNDARY ENFORCEMENT
-- ------------------------------------------------------------------------------
-- Add pin_code to profiles for simple geographic matching
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pin_code TEXT;

-- Prevent purchase if customer pin_code is not in the kitchen's delivery_zone
CREATE OR REPLACE FUNCTION enforce_zone_boundaries()
RETURNS trigger AS $$
DECLARE
  v_customer_pin TEXT;
  v_kitchen_zone_id UUID;
  v_zone_pins TEXT[];
  v_delivery_type TEXT;
BEGIN
  -- Only enforce for home delivery, takeaway can be purchased by anyone
  SELECT delivery_type, zone_id INTO v_delivery_type, v_kitchen_zone_id
  FROM public.subscriptions s
  JOIN public.kitchens k ON s.kitchen_id = k.id
  WHERE s.id = NEW.subscription_id;

  IF v_delivery_type = 'takeaway' THEN
    RETURN NEW; -- Takeaway bypasses zone checks
  END IF;

  -- Get customer pin
  SELECT pin_code INTO v_customer_pin
  FROM public.profiles
  WHERE id = NEW.customer_id;

  IF v_customer_pin IS NULL THEN
    RAISE EXCEPTION 'Please update your profile with a valid Pin Code before subscribing to Home Delivery.';
  END IF;

  -- Get valid pins for the kitchen
  SELECT pin_codes INTO v_zone_pins
  FROM public.delivery_zones
  WHERE id = v_kitchen_zone_id;

  IF v_zone_pins IS NULL OR NOT (v_customer_pin = ANY(v_zone_pins)) THEN
    RAISE EXCEPTION 'OUT OF ZONE: This kitchen does not deliver to your Pin Code (%).', v_customer_pin;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_enforce_zone_boundaries ON public.customer_subscriptions;
CREATE TRIGGER trigger_enforce_zone_boundaries
  BEFORE INSERT ON public.customer_subscriptions
  FOR EACH ROW EXECUTE PROCEDURE enforce_zone_boundaries();

