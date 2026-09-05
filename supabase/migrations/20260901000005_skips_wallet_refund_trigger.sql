-- Function to automatically refund the customer's wallet when they skip a meal
CREATE OR REPLACE FUNCTION process_wallet_refund_on_skip()
RETURNS trigger AS $$
DECLARE
  cust_id UUID;
  daily_cost NUMERIC;
  w_id UUID;
BEGIN
  -- 1. Get the customer_id and the daily cost of the subscription
  SELECT cs.customer_id, s.price_per_day
  INTO cust_id, daily_cost
  FROM customer_subscriptions cs
  JOIN subscriptions s ON cs.subscription_id = s.id
  WHERE cs.id = NEW.customer_subscription_id;

  IF FOUND THEN
    -- 2. Find the customer's wallet
    SELECT id INTO w_id FROM wallets WHERE customer_id = cust_id;

    IF w_id IS NOT NULL THEN
      -- 3. Add the refund amount to the wallet balance
      UPDATE wallets 
      SET balance = balance + daily_cost,
          updated_at = NOW()
      WHERE id = w_id;

      -- 4. Record the transaction in wallet_transactions
      INSERT INTO wallet_transactions (wallet_id, amount, type, description)
      VALUES (w_id, daily_cost, 'skip_credit', 'Refund for skipped meal on ' || NEW.date::TEXT);
      
      -- Update the skips table to record the exact amount credited (just for audit trails)
      -- Wait, the skips table has credited_amount! We must set it.
      NEW.credited_amount := daily_cost;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_customer_skip_created
  BEFORE INSERT ON skips
  FOR EACH ROW EXECUTE PROCEDURE process_wallet_refund_on_skip();
