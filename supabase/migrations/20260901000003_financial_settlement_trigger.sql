-- Function to automatically calculate and disburse micro-payments to vendors and drivers upon successful delivery
CREATE OR REPLACE FUNCTION process_financial_settlement_on_delivery()
RETURNS trigger AS $$
DECLARE
  sub_rec RECORD;
  gross NUMERIC;
  v_fee NUMERIC;
  d_fee NUMERIC;
  p_fee NUMERIC;
BEGIN
  -- Only trigger when a delivery mathematically crosses the final physical threshold (delivered)
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    
    -- Fetch the exact financial terms locked into the root subscription plan
    SELECT s.kitchen_id, s.price_per_day, s.vendor_fee, s.delivery_fee 
    INTO sub_rec
    FROM customer_subscriptions cs
    JOIN subscriptions s ON cs.subscription_id = s.id
    WHERE cs.id = NEW.customer_subscription_id;

    IF FOUND THEN
      -- Calculate Vindu Platform Commission dynamically based on the spread
      gross := sub_rec.price_per_day;
      v_fee := sub_rec.vendor_fee;
      d_fee := sub_rec.delivery_fee;
      p_fee := gross - v_fee - d_fee;

      -- 1. Execute Vendor Settlement Ledger Entry
      INSERT INTO vendor_ledger (kitchen_id, transaction_date, gross_amount, platform_fee, net_amount, status)
      VALUES (sub_rec.kitchen_id, NEW.date, gross, p_fee, v_fee, 'pending');

      -- 2. Execute Driver Settlement Ledger Entry
      IF NEW.driver_id IS NOT NULL THEN
        INSERT INTO driver_ledger (driver_id, transaction_date, amount, status)
        VALUES (NEW.driver_id, NEW.date, d_fee, 'pending');
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_delivery_completed
  AFTER UPDATE ON deliveries
  FOR EACH ROW EXECUTE PROCEDURE process_financial_settlement_on_delivery();
