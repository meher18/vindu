-- FIX: Discovered a highly sophisticated "Double Refund" Exploit.
-- Customers could schedule skips for future dates (instantly receiving a wallet credit), 
-- and then subsequently CANCEL their entire subscription. 
-- The cancellation trigger mathematically calculated the remaining days and refunded them again, 
-- completely ignoring the fact that some of those future days had already been refunded via skips.

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
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status = 'active' THEN
    IF NEW.end_date < CURRENT_DATE THEN
      RETURN NEW;
    END IF;

    SELECT price_per_day, operating_days INTO daily_cost, op_days
    FROM subscriptions WHERE id = NEW.subscription_id;

    qty := COALESCE(NEW.quantity, 1);
    
    -- Calculate gross remaining days
    remaining_days := count_remaining_operating_days(CURRENT_DATE + INTERVAL '1 day', NEW.end_date, op_days);
    
    -- Find all future skips that have ALREADY been refunded to the customer's wallet
    SELECT COUNT(*) INTO future_skips
    FROM skips
    WHERE customer_subscription_id = NEW.id
      AND date > CURRENT_DATE
      AND date <= NEW.end_date;

    -- Mathematically deduct the already-refunded days from the final cancellation payout
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
