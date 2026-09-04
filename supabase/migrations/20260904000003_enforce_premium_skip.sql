-- FIX: Enforce the Premium gate on skips.
-- The BRD states: "Skip toggle: tap any future date to skip (Premium users only)"
-- Currently ANY customer can skip for free. This fix adds server-side enforcement.

-- 1. Rebuild the skip insert policy to check premium_unlocked on the customer_subscription.
-- The existing check_skip_cutoff trigger already validates the 8 PM cutoff.
-- We need to add a premium check at the RLS or trigger level.

CREATE OR REPLACE FUNCTION enforce_premium_skip()
RETURNS trigger AS $$
DECLARE
  is_premium BOOLEAN;
BEGIN
  -- Check if the customer_subscription has premium unlocked
  SELECT COALESCE(premium_unlocked, false)
  INTO is_premium
  FROM customer_subscriptions
  WHERE id = NEW.customer_subscription_id;

  IF NOT is_premium THEN
    RAISE EXCEPTION 'Skip feature requires a Premium subscription. Please unlock Flexi Skip to use this feature.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_premium_before_skip
  BEFORE INSERT ON skips
  FOR EACH ROW EXECUTE PROCEDURE enforce_premium_skip();
