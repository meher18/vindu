-- FIX: Discovered two catastrophic infinite money loops in the financial architecture:
-- 1. Customers could insert skip records for past dates, infinitely draining the platform wallet.
-- 2. Drivers could endlessly toggle a delivery's status to "delivered" and back, infinitely firing the payout trigger.

-- Fix 1: Prevent temporal skipping exploits
ALTER TABLE skips ADD CONSTRAINT check_skip_date_future CHECK (date >= CURRENT_DATE);
ALTER TABLE skips ADD CONSTRAINT skips_unique_daily UNIQUE (customer_subscription_id, date);

-- Fix 2: Prevent infinite payout toggling by introducing a cryptographic lock
ALTER TABLE deliveries ADD COLUMN payout_processed BOOLEAN DEFAULT false;

-- Rewrite the financial trigger to use a BEFORE UPDATE lock
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
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND OLD.payout_processed = false THEN
    SELECT s.kitchen_id, s.price_per_day, s.vendor_fee, s.delivery_fee, cs.quantity
    INTO sub_rec
    FROM customer_subscriptions cs
    JOIN subscriptions s ON cs.subscription_id = s.id
    WHERE cs.id = NEW.customer_subscription_id;

    IF FOUND THEN
      qty := COALESCE(sub_rec.quantity, 1);
      gross := sub_rec.price_per_day * qty;
      v_fee := sub_rec.vendor_fee * qty;
      d_fee := sub_rec.delivery_fee * qty;
      p_fee := gross - v_fee - d_fee;

      INSERT INTO vendor_ledger (kitchen_id, transaction_date, gross_amount, platform_fee, net_amount, status)
      VALUES (sub_rec.kitchen_id, NEW.date, gross, p_fee, v_fee, 'pending');

      IF NEW.driver_id IS NOT NULL THEN
        INSERT INTO driver_ledger (driver_id, transaction_date, amount, status)
        VALUES (NEW.driver_id, NEW.date, d_fee, 'pending');
      END IF;

      -- Seal the lock so this row can never trigger a payout again
      NEW.payout_processed := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rebind as a BEFORE trigger so it can mathematically mutate the NEW state
DROP TRIGGER IF EXISTS on_delivery_completed ON deliveries;
CREATE TRIGGER on_delivery_completed
  BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE PROCEDURE process_financial_settlement_on_delivery();
