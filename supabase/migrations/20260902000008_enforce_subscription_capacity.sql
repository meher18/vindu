-- FIX: The subscription purchase matrix secured the financial layer, but entirely ignored 
-- the physical logistics layer. It did not check the Vendor's configured 'capacity' limit.
-- A kitchen with a maximum physical oven capacity of 20 boxes could mathematically 
-- receive 5,000 orders if customers kept clicking subscribe, resulting in operational collapse.

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
  SELECT price_per_day, operating_days, capacity 
  INTO sub_rec
  FROM subscriptions WHERE id = NEW.subscription_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription plan does not exist';
  END IF;

  qty := COALESCE(NEW.quantity, 1);

  -- 2. Physical Capacity Enforcement (Temporal Overlap Check)
  -- We sum the quantity of all active subscriptions that overlap with this new subscription's timeframe
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
  SELECT id, balance INTO w_id, curr_balance 
  FROM wallets WHERE customer_id = NEW.customer_id;

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
