-- Function to calculate the number of operating days between two dates (inclusive of start, exclusive of end)
CREATE OR REPLACE FUNCTION count_remaining_operating_days(start_d DATE, end_d DATE, op_days TEXT[])
RETURNS INTEGER AS $$
DECLARE
  curr_d DATE := start_d;
  day_str TEXT;
  total_days INTEGER := 0;
BEGIN
  IF op_days IS NULL OR array_length(op_days, 1) = 0 THEN
    RETURN end_d - start_d;
  END IF;

  WHILE curr_d <= end_d LOOP
    day_str := lower(to_char(curr_d, 'dy'));
    IF day_str = ANY(op_days) THEN
      total_days := total_days + 1;
    END IF;
    curr_d := curr_d + INTERVAL '1 day';
  END LOOP;
  
  RETURN total_days;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to prorate and refund cancelled subscriptions
CREATE OR REPLACE FUNCTION process_wallet_refund_on_cancellation()
RETURNS trigger AS $$
DECLARE
  w_id UUID;
  daily_cost NUMERIC;
  remaining_days INTEGER;
  refund_amount NUMERIC;
  op_days TEXT[];
BEGIN
  -- Only trigger when a subscription is prematurely cancelled
  IF NEW.status = 'cancelled' AND OLD.status = 'active' THEN
    
    -- If the end date is in the past, no refund is owed
    IF NEW.end_date < CURRENT_DATE THEN
      RETURN NEW;
    END IF;

    -- Get daily cost and operating days from parent subscription
    SELECT price_per_day, operating_days INTO daily_cost, op_days
    FROM subscriptions WHERE id = NEW.subscription_id;

    -- Calculate how many operating days are left from TOMORROW to the end date
    -- (Assuming they cannot cancel today's food if it's already past cutoff, to be safe we refund from tomorrow)
    remaining_days := count_remaining_operating_days(CURRENT_DATE + INTERVAL '1 day', NEW.end_date, op_days);

    IF remaining_days > 0 THEN
      refund_amount := remaining_days * daily_cost;

      -- Find wallet
      SELECT id INTO w_id FROM wallets WHERE customer_id = NEW.customer_id;

      IF w_id IS NOT NULL THEN
        UPDATE wallets 
        SET balance = balance + refund_amount,
            updated_at = NOW()
        WHERE id = w_id;

        INSERT INTO wallet_transactions (wallet_id, amount, type, description)
        VALUES (w_id, refund_amount, 'refund', 'Prorated refund for cancelled subscription (' || remaining_days || ' meals left)');
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_customer_subscription_cancelled
  BEFORE UPDATE ON customer_subscriptions
  FOR EACH ROW EXECUTE PROCEDURE process_wallet_refund_on_cancellation();
