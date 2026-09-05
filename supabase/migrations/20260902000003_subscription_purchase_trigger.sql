-- FIX: The database allowed customers to create subscriptions out of thin air without deducting from their wallet.
-- This trigger mathematically enforces the platform economy by intercepting the INSERT, 
-- calculating the exact temporal cost, and forcefully deducting the prepaid wallet balance.
-- If the balance is insufficient, it aborts the entire Postgres transaction.

CREATE OR REPLACE FUNCTION process_subscription_purchase()
RETURNS trigger AS $$
DECLARE
  sub_rec RECORD;
  total_days INT;
  qty INT;
  total_cost NUMERIC;
  w_id UUID;
  curr_balance NUMERIC;
BEGIN
  -- 1. Fetch the underlying subscription details
  SELECT price_per_day, operating_days 
  INTO sub_rec
  FROM subscriptions WHERE id = NEW.subscription_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription plan does not exist';
  END IF;

  -- 2. Calculate temporal economics
  qty := COALESCE(NEW.quantity, 1);
  total_days := count_remaining_operating_days(NEW.start_date, NEW.end_date, sub_rec.operating_days);
  total_cost := total_days * sub_rec.price_per_day * qty;

  -- 3. Fetch customer's wallet
  SELECT id, balance INTO w_id, curr_balance 
  FROM wallets WHERE customer_id = NEW.customer_id;

  IF w_id IS NULL THEN
    RAISE EXCEPTION 'Customer wallet not found. Please initialize a wallet first.';
  END IF;

  -- 4. Cryptographic Validation
  IF curr_balance < total_cost THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Required: ₹%, Available: ₹%', total_cost, curr_balance;
  END IF;

  -- 5. Forceful Deduction
  UPDATE wallets 
  SET balance = balance - total_cost,
      updated_at = NOW()
  WHERE id = w_id;

  -- 6. Immutable Ledger Entry
  INSERT INTO wallet_transactions (wallet_id, amount, type, description)
  VALUES (w_id, -total_cost, 'purchase', 'Purchased subscription ' || NEW.id || ' (' || total_days || ' days @ ₹' || sub_rec.price_per_day || ' x ' || qty || ')');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER enforce_subscription_purchase
  BEFORE INSERT ON customer_subscriptions
  FOR EACH ROW EXECUTE PROCEDURE process_subscription_purchase();
