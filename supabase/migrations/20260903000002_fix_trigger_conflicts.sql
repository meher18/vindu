-- FIX: Three BEFORE UPDATE triggers on the `subscriptions` table are in direct conflict:
--   1. block_financial_mutation — blocks ANY change to price/fee/operating_days columns
--   2. block_margin_embezzlement — validates vendor_fee against config thresholds
--   3. enforce_platform_margins (from migration 21) — MODIFIES price_per_day and delivery_fee
--
-- When a vendor "cancels" a plan (UPDATE status='cancelled'), trigger #1 checks if
-- operating_days changed. Since it only changes status, this passes. But if any INSERT
-- also fires #3 (which modifies price_per_day), then #1 blocks it on UPDATE.
-- 
-- Resolution:
--   - Rewrite the immutability trigger to ONLY check financial fields, and SKIP the check 
--     when the only change is to the `status` column.
--   - Drop the redundant block_margin_embezzlement trigger (superseded by enforce_platform_margins).
--   - Make enforce_platform_margins fire only on INSERT (not UPDATE).

-- 1. Drop conflicting triggers
DROP TRIGGER IF EXISTS block_margin_embezzlement ON subscriptions;
DROP TRIGGER IF EXISTS block_financial_mutation ON subscriptions;

-- 2. Rewrite the immutability trigger to allow status changes
CREATE OR REPLACE FUNCTION prevent_financial_mutation()
RETURNS trigger AS $$
BEGIN
  -- Allow status-only updates (e.g., cancellation, completion, pausing)
  IF NEW.status != OLD.status 
     AND NEW.price_per_day = OLD.price_per_day 
     AND NEW.vendor_fee = OLD.vendor_fee
     AND NEW.delivery_fee = OLD.delivery_fee THEN
    RETURN NEW;
  END IF;

  -- Block any mutation of core financial metrics
  IF NEW.price_per_day != OLD.price_per_day 
     OR NEW.vendor_fee != OLD.vendor_fee
     OR NEW.delivery_fee != OLD.delivery_fee THEN
    RAISE EXCEPTION 'Financial metrics of a meal plan are immutable. To change prices, deactivate this plan and create a new one.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER block_financial_mutation
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE PROCEDURE prevent_financial_mutation();

-- 3. Drop and recreate enforce_platform_margins to fire ONLY on INSERT
-- (The function definition from migration 21 is fine, just rebind the trigger)
DROP TRIGGER IF EXISTS block_margin_embezzlement ON subscriptions;

-- The function enforce_platform_margins() already exists from migration 21.
-- We just need a clean trigger that fires only on INSERT.
CREATE OR REPLACE TRIGGER calculate_platform_margins
  BEFORE INSERT ON subscriptions
  FOR EACH ROW EXECUTE PROCEDURE enforce_platform_margins();
