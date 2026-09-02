-- FIX: Discovered a catastrophic collusion vector between Vendors and Customers (Price Mutability Exploit).
-- Vendors were allowed to update the 'price_per_day' of active subscription plans.
-- A Customer could buy a plan at ₹100/day. The Vendor could then maliciously mutate the plan's 
-- price to ₹1,000,000/day. The Customer could then cancel the plan, forcing the cancellation 
-- trigger to calculate the refund using the NEW price, instantly injecting millions of 
-- fraudulent rupees into the Customer's wallet from the platform's reserves.

CREATE OR REPLACE FUNCTION prevent_financial_mutation()
RETURNS trigger AS $$
BEGIN
  -- Cryptographically lock all core financial and temporal metrics
  IF NEW.price_per_day != OLD.price_per_day 
     OR NEW.vendor_fee != OLD.vendor_fee
     OR NEW.delivery_fee != OLD.delivery_fee 
     OR NEW.operating_days != OLD.operating_days THEN
    
    RAISE EXCEPTION 'SECURITY BREACH: Core financial and temporal metrics of a meal plan are mathematically immutable once instantiated. To alter prices or operating days, you must deactivate this plan and instantiate a new one.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Inject the immutability matrix into the subscription update lifecycle
CREATE TRIGGER block_financial_mutation
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE PROCEDURE prevent_financial_mutation();
