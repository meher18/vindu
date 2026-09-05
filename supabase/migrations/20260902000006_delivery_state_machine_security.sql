-- FIX: The RLS policies allowed vendors to update ANY column on their deliveries.
-- A malicious vendor could bypass the physical driver network entirely by sending a direct API request
-- setting the delivery status to 'delivered'. This would instantly trigger the financial settlement payload,
-- paying the vendor for ghost deliveries while defrauding the platform and customer.

CREATE OR REPLACE FUNCTION enforce_delivery_state_machine()
RETURNS trigger AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Fetch the cryptographic role of the authenticated user
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();

  IF caller_role = 'vendor' THEN
    -- Vendors are strictly limited to staging the food for pickup
    IF NEW.status NOT IN ('scheduled', 'vendor_ready') THEN
      RAISE EXCEPTION 'SECURITY BREACH: Vendors are strictly prohibited from mutating delivery states beyond vendor_ready.';
    END IF;
  ELSIF caller_role = 'driver' THEN
    -- Drivers cannot revert deliveries backwards to steal them or reset timers
    IF NEW.status = 'scheduled' AND OLD.status != 'scheduled' THEN
      RAISE EXCEPTION 'SECURITY BREACH: Drivers cannot revert active deliveries back to the kitchen queue.';
    END IF;
  ELSIF caller_role = 'customer' THEN
    -- Customers cannot manipulate the physical logistics network
    RAISE EXCEPTION 'SECURITY BREACH: Customers cannot mutate physical delivery states.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Inject the cryptographic state machine lock directly into the UPDATE matrix
CREATE TRIGGER check_delivery_state_transitions
  BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE PROCEDURE enforce_delivery_state_machine();
