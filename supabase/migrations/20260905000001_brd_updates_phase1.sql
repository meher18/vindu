-- 1. Add allow_skips to subscriptions
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS allow_skips BOOLEAN DEFAULT true;

-- 2. Prevent changing core subscription fields if it has active subscribers
CREATE OR REPLACE FUNCTION enforce_immutable_subscription()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.customer_subscriptions 
    WHERE subscription_id = OLD.id AND status = 'active'
  ) THEN
    -- If active subscribers exist, block changes to core economics and scope
    IF (OLD.price_per_day != NEW.price_per_day) OR
       (OLD.diet_type != NEW.diet_type) OR
       (OLD.slot_name != NEW.slot_name) OR
       (OLD.delivery_type != NEW.delivery_type) OR
       (OLD.operating_days != NEW.operating_days) THEN
      RAISE EXCEPTION 'Cannot modify core meal plan details while there are active subscribers.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_enforce_immutable_subscription ON public.subscriptions;
CREATE TRIGGER trigger_enforce_immutable_subscription
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_immutable_subscription();

-- 3. Update the skip trigger to check allow_skips
CREATE OR REPLACE FUNCTION enforce_premium_before_skip()
RETURNS trigger AS $$
DECLARE
  v_premium_unlocked BOOLEAN;
  v_allow_skips BOOLEAN;
BEGIN
  SELECT cs.premium_unlocked, s.allow_skips 
  INTO v_premium_unlocked, v_allow_skips
  FROM public.customer_subscriptions cs
  JOIN public.subscriptions s ON cs.subscription_id = s.id
  WHERE cs.id = NEW.customer_subscription_id;

  IF NOT v_allow_skips THEN
    RAISE EXCEPTION 'This meal plan does not allow skips.';
  END IF;

  IF NOT v_premium_unlocked THEN
    RAISE EXCEPTION 'Premium subscription is required to skip meals.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
