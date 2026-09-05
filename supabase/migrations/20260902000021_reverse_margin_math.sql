-- FIX: Swapped the margin calculation architecture from "Top-Down" to "Bottom-Up".
-- Previously, the Vendor set the Gross Price, and the platform subtracted fees.
-- Now, the Vendor sets their desired Net Payout (vendor_fee), and the platform 
-- automatically marks up the final Customer Price (price_per_day) to cover 
-- delivery and platform fees.

CREATE OR REPLACE FUNCTION enforce_platform_margins()
RETURNS TRIGGER AS $$
DECLARE
  conf RECORD;
BEGIN
  SELECT * INTO conf FROM platform_config LIMIT 1;
  
  -- The Vendor's input is now treated as their absolute guaranteed net payout.
  -- We calculate the gross customer price required to yield this net payout.
  NEW.price_per_day = ROUND(NEW.vendor_fee / conf.vendor_split_pct, 2);
  
  -- Calculate the driver's cut based on the new gross price.
  NEW.delivery_fee = ROUND(NEW.price_per_day * conf.driver_split_pct, 2);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger is already attached from the previous migration, 
-- updating the function definition is sufficient.
