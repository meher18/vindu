-- ==============================================================================
-- FORT KNOX SECURITY MIGRATION
-- Seals 4 Catastrophic Platform Exploits
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. THE NEGATIVE QUANTITY EXPLOIT (Infinite Wallet Glitch)
-- ------------------------------------------------------------------------------
ALTER TABLE public.customer_subscriptions 
  ADD CONSTRAINT check_quantity_positive CHECK (quantity >= 1);


-- ------------------------------------------------------------------------------
-- 2. THE DISAPPEARING ACT (Vendor Exit Scam via ON DELETE CASCADE)
-- ------------------------------------------------------------------------------
-- Prevent vendors from deleting plans that have active subscribers
ALTER TABLE public.customer_subscriptions 
  DROP CONSTRAINT IF EXISTS customer_subscriptions_subscription_id_fkey;
  
ALTER TABLE public.customer_subscriptions 
  ADD CONSTRAINT customer_subscriptions_subscription_id_fkey 
  FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) 
  ON DELETE RESTRICT;


-- ------------------------------------------------------------------------------
-- 3. PRICING RUG-PULL EXPLOIT (Financial Immutability)
-- ------------------------------------------------------------------------------
-- 1. Add immutable price/fee columns to the customer_subscriptions ledger
ALTER TABLE public.customer_subscriptions 
  ADD COLUMN locked_price_per_day NUMERIC,
  ADD COLUMN locked_vendor_fee NUMERIC,
  ADD COLUMN locked_delivery_fee NUMERIC;

-- 2. Backfill existing subscriptions
UPDATE public.customer_subscriptions cs
SET 
  locked_price_per_day = s.price_per_day,
  locked_vendor_fee = s.vendor_fee,
  locked_delivery_fee = s.delivery_fee
FROM public.subscriptions s
WHERE cs.subscription_id = s.id;

-- 3. Enforce NOT NULL going forward
ALTER TABLE public.customer_subscriptions 
  ALTER COLUMN locked_price_per_day SET NOT NULL,
  ALTER COLUMN locked_vendor_fee SET NOT NULL,
  ALTER COLUMN locked_delivery_fee SET NOT NULL;

-- 4. Update the Purchase Trigger to snapshot the prices permanently
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
  -- Fetch the underlying subscription details and LOCK the row
  SELECT price_per_day, vendor_fee, delivery_fee, operating_days, capacity 
  INTO sub_rec
  FROM subscriptions WHERE id = NEW.subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription plan does not exist';
  END IF;

  -- SNAPSHOT THE PRICING (Financial Immutability)
  NEW.locked_price_per_day := sub_rec.price_per_day;
  NEW.locked_vendor_fee := sub_rec.vendor_fee;
  NEW.locked_delivery_fee := sub_rec.delivery_fee;

  qty := COALESCE(NEW.quantity, 1);

  -- Physical Capacity Enforcement
  SELECT COALESCE(SUM(quantity), 0) INTO current_active_qty
  FROM customer_subscriptions
  WHERE subscription_id = NEW.subscription_id
    AND status = 'active'
    AND end_date > NEW.start_date
    AND start_date <= NEW.end_date;

  IF (current_active_qty + qty) > sub_rec.capacity THEN
    RAISE EXCEPTION 'PHYSICAL LIMIT REACHED: This meal plan is completely sold out for the selected dates. Maximum capacity is %, but this order would push it to %.', sub_rec.capacity, (current_active_qty + qty);
  END IF;

  -- Calculate temporal economics using SNAPSHOTTED price
  total_days := count_remaining_operating_days(NEW.start_date, NEW.end_date, sub_rec.operating_days);
  total_cost := total_days * NEW.locked_price_per_day * qty;

  -- Fetch customer's wallet and LOCK it
  SELECT id, balance INTO w_id, curr_balance 
  FROM wallets WHERE customer_id = NEW.customer_id
  FOR UPDATE;

  IF w_id IS NULL THEN
    RAISE EXCEPTION 'Customer wallet not found. Please initialize a wallet first.';
  END IF;

  IF curr_balance < total_cost THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Required: ₹%, Available: ₹%', total_cost, curr_balance;
  END IF;

  -- Forceful Deduction
  UPDATE wallets 
  SET balance = balance - total_cost,
      updated_at = NOW()
  WHERE id = w_id;

  INSERT INTO wallet_transactions (wallet_id, amount, type, description)
  VALUES (w_id, -total_cost, 'purchase', 'Purchased subscription ' || NEW.id || ' (' || total_days || ' days @ ₹' || NEW.locked_price_per_day || ' x ' || qty || ')');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update the Cancellation Trigger to use the SNAPSHOTTED price (Fixes Rug-Pull)
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

    -- Retrieve operating days ONLY. The price comes from the snapshot!
    SELECT operating_days INTO op_days
    FROM subscriptions WHERE id = NEW.subscription_id;

    -- USE THE SNAPSHOTTED PRICE!
    daily_cost := NEW.locked_price_per_day;
    qty := COALESCE(NEW.quantity, 1);
    
    -- Calculate gross remaining days
    remaining_days := count_remaining_operating_days(v_current_ist_date + INTERVAL '1 day', NEW.end_date, op_days);
    
    -- Deduct already-refunded future skips
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

-- 6. Update the Financial Settlement Engine to use the SNAPSHOTTED fees
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

  -- Select the SNAPSHOTTED values directly from customer_subscriptions
  SELECT 
    s.kitchen_id, 
    cs.locked_price_per_day, 
    cs.locked_vendor_fee, 
    cs.locked_delivery_fee, 
    cs.quantity, 
    cs.customer_id
  INTO sub_rec
  FROM customer_subscriptions cs
  JOIN subscriptions s ON cs.subscription_id = s.id
  WHERE cs.id = NEW.customer_subscription_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  qty := COALESCE(sub_rec.quantity, 1);
  gross := sub_rec.locked_price_per_day * qty;
  v_fee := sub_rec.locked_vendor_fee * qty;
  d_fee := sub_rec.locked_delivery_fee * qty;
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

-- 7. Update Skip Refund Trigger to use SNAPSHOTTED price
CREATE OR REPLACE FUNCTION process_wallet_refund_on_skip()
RETURNS trigger AS $$
DECLARE
  w_id UUID;
  daily_cost NUMERIC;
  qty INT;
BEGIN
  -- USE THE SNAPSHOTTED PRICE!
  SELECT locked_price_per_day, COALESCE(quantity, 1) INTO daily_cost, qty
  FROM customer_subscriptions
  WHERE id = NEW.customer_subscription_id;

  IF FOUND THEN
    NEW.credited_amount := daily_cost * qty;
    SELECT id INTO w_id FROM wallets WHERE customer_id = (SELECT customer_id FROM customer_subscriptions WHERE id = NEW.customer_subscription_id);

    IF w_id IS NOT NULL THEN
      UPDATE wallets 
      SET balance = balance + (daily_cost * qty),
          updated_at = NOW()
      WHERE id = w_id;

      INSERT INTO wallet_transactions (wallet_id, amount, type, description)
      VALUES (w_id, (daily_cost * qty), 'skip_credit', 'Refund for skipping meal on ' || NEW.date);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------
-- 4. GHOST DRIVER (QR SPOOFING) PREVENTION
-- ------------------------------------------------------------------------------
-- 1. Add a secret code to deliveries for physical pickup verification
ALTER TABLE public.deliveries 
  ADD COLUMN pickup_secret UUID;

-- 2. Create RPC for vendor to mark batch ready and generate the shared secret
CREATE OR REPLACE FUNCTION secure_vendor_mark_batch_ready(p_delivery_ids UUID[])
RETURNS UUID AS $$
DECLARE
  v_secret UUID;
  v_kitchen_id UUID;
  v_vendor_id UUID;
BEGIN
  -- Verify the vendor owns these deliveries
  SELECT k.vendor_id INTO v_vendor_id
  FROM deliveries d
  JOIN customer_subscriptions cs ON d.customer_subscription_id = cs.id
  JOIN subscriptions s ON cs.subscription_id = s.id
  JOIN kitchens k ON s.kitchen_id = k.id
  WHERE d.id = p_delivery_ids[1]
  LIMIT 1;

  IF v_vendor_id != auth.uid() THEN
    RAISE EXCEPTION 'SECURITY BREACH: Unauthorized to mark these deliveries ready.';
  END IF;

  -- Generate a single cryptographic secret for this batch
  v_secret := gen_random_uuid();

  -- Update all requested deliveries
  UPDATE deliveries
  SET status = 'vendor_ready',
      vendor_ready_at = NOW(),
      pickup_secret = v_secret
  WHERE id = ANY(p_delivery_ids)
    AND status = 'scheduled';

  RETURN v_secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create RPC for driver to claim the batch using the secret
CREATE OR REPLACE FUNCTION secure_driver_claim_batch(p_secret UUID)
RETURNS INT AS $$
DECLARE
  v_updated_count INT;
BEGIN
  -- Attempt to claim all deliveries that share this cryptographic secret
  -- and are still waiting for pickup
  WITH updated AS (
    UPDATE deliveries
    SET status = 'picked_up',
        qr_scanned_at = NOW(),
        driver_id = auth.uid()
    WHERE pickup_secret = p_secret
      AND status = 'vendor_ready'
    RETURNING id
  )
  SELECT count(*) INTO v_updated_count FROM updated;

  IF v_updated_count = 0 THEN
    RAISE EXCEPTION 'CRYPTOGRAPHIC REJECTION: Invalid QR code or batch already claimed.';
  END IF;

  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

