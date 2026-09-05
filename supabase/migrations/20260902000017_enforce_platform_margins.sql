-- FIX: Discovered a catastrophic Platform Embezzlement Exploit.
-- The subscriptions table allowed vendors to set their own 'vendor_fee' and 'delivery_fee' 
-- without any algorithmic validation against the gross 'price_per_day'.
-- A malicious Vendor could create a plan with a price of ₹10, but set their payout fee to ₹1,000,000.
-- The settlement trigger would blindly execute the math, resulting in a negative platform fee 
-- and instantly draining millions from the Platform's bank reserves into the Vendor's ledger.

-- 1. Apply a hard mathematical floor to prevent basic negative margins
ALTER TABLE subscriptions ADD CONSTRAINT enforce_positive_margin CHECK (vendor_fee >= 0 AND delivery_fee >= 0);
ALTER TABLE subscriptions ADD CONSTRAINT prevent_embezzlement CHECK ((vendor_fee + delivery_fee) <= price_per_day);

-- 2. Inject a dynamic algorithmic gatekeeper tied to the platform's global config
CREATE OR REPLACE FUNCTION enforce_dynamic_platform_margins()
RETURNS trigger AS $$
DECLARE
  config RECORD;
  max_vendor_payout NUMERIC;
BEGIN
  -- Fetch the global corporate splits (e.g., 70% Vendor, 20% Driver)
  SELECT * INTO config FROM platform_config WHERE id = 1;
  
  IF FOUND THEN
    max_vendor_payout := NEW.price_per_day * config.vendor_split_pct;
    
    -- Block vendors from configuring payouts that exceed the corporate threshold
    IF NEW.vendor_fee > max_vendor_payout THEN
      RAISE EXCEPTION 'SECURITY BREACH: Requested vendor payout (₹%) exceeds the maximum corporate threshold of % (₹%)', NEW.vendor_fee, config.vendor_split_pct * 100, max_vendor_payout;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bind the gatekeeper to the subscription instantiation lifecycle
CREATE TRIGGER block_margin_embezzlement
  BEFORE INSERT OR UPDATE ON subscriptions
  FOR EACH ROW EXECUTE PROCEDURE enforce_dynamic_platform_margins();
