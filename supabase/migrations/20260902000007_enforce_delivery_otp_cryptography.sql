-- FIX: Discovered a catastrophic physical-layer vulnerability where drivers could fraudulently 
-- mark meals as 'delivered' by sending a raw PostgREST UPDATE payload, entirely bypassing 
-- the OTP (One Time Password) verification or Photographic Proof requirements.

-- 1. Create a secure RPC function that mathematically mandates Proof of Delivery
CREATE OR REPLACE FUNCTION secure_complete_delivery(delivery_id UUID, provided_otp TEXT DEFAULT NULL, photo_url TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  del RECORD;
BEGIN
  -- Verify the delivery exists and is cryptographically assigned to this driver
  SELECT * INTO del FROM deliveries WHERE id = delivery_id AND driver_id = auth.uid();
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'SECURITY BREACH: Delivery not found or not assigned to your cryptographic identity.'; 
  END IF;

  -- Route 1: Hand-to-Hand Delivery (OTP Verification)
  IF provided_otp IS NOT NULL THEN
    IF del.otp_code = provided_otp THEN
      UPDATE deliveries SET status = 'delivered' WHERE id = delivery_id;
      RETURN TRUE;
    ELSE
      RAISE EXCEPTION 'CRYPTOGRAPHIC REJECTION: Invalid OTP Code.';
    END IF;
  
  -- Route 2: Doorstep Dropoff (Photographic Proof)
  ELSIF photo_url IS NOT NULL THEN
    UPDATE deliveries SET status = 'delivered', proof_photo_url = photo_url WHERE id = delivery_id;
    RETURN TRUE;
    
  -- Route 3: Fraudulent Attempt
  ELSE
    RAISE EXCEPTION 'SECURITY BREACH: You must provide either the Customer OTP or Photographic Proof to finalize a delivery.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Modify the State Machine to block raw PostgREST mutations to the 'delivered' state
CREATE OR REPLACE FUNCTION enforce_delivery_state_machine()
RETURNS trigger AS $$
DECLARE
  caller_role TEXT;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();

  IF caller_role = 'vendor' THEN
    IF NEW.status NOT IN ('scheduled', 'vendor_ready') THEN
      RAISE EXCEPTION 'SECURITY BREACH: Vendors are strictly prohibited from mutating delivery states beyond vendor_ready.';
    END IF;
  ELSIF caller_role = 'driver' THEN
    IF NEW.status = 'scheduled' AND OLD.status != 'scheduled' THEN
      RAISE EXCEPTION 'SECURITY BREACH: Drivers cannot revert active deliveries back to the kitchen queue.';
    END IF;
    
    -- Prevent drivers from executing raw UPDATEs to 'delivered' via the REST API.
    -- They MUST use the secure_complete_delivery RPC (which executes as the postgres superuser).
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
      IF current_user != 'postgres' AND current_user != 'supabase_admin' THEN
        RAISE EXCEPTION 'SECURITY BREACH: Direct REST mutation to "delivered" state is blocked. You must use the secure_complete_delivery RPC to submit OTP/Proof.';
      END IF;
    END IF;
  ELSIF caller_role = 'customer' THEN
    RAISE EXCEPTION 'SECURITY BREACH: Customers cannot mutate physical delivery states.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
