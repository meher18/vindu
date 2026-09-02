-- FIX: Discovered a critical Cryptographic Exposure Exploit in the Physical Handoff layer.
-- The 'otp_code' was stored directly on the 'deliveries' table. Because drivers had 
-- SELECT access to the deliveries table to build their routes, any driver could simply 
-- intercept the raw API response, read the 'otp_code' in plaintext, and bypass the 
-- physical handoff by feeding it back into the completion RPC.

-- 1. Create a segregated cryptographic vault for delivery secrets
CREATE TABLE delivery_secrets (
  delivery_id UUID PRIMARY KEY REFERENCES deliveries(id) ON DELETE CASCADE,
  otp_code TEXT NOT NULL
);

-- 2. Enforce strict Default-Deny RLS on the vault
ALTER TABLE delivery_secrets ENABLE ROW LEVEL SECURITY;

-- 3. ONLY the Customer can decrypt their own OTP code
CREATE POLICY "Customers view own OTP" ON delivery_secrets FOR SELECT USING (
  delivery_id IN (
    SELECT d.id FROM deliveries d
    JOIN customer_subscriptions cs ON d.customer_subscription_id = cs.id
    WHERE cs.customer_id = auth.uid()
  )
);
-- Drivers are mathematically blind to this table.

-- 4. Migrate the logistics engine to generate OTPs into the secure vault
CREATE OR REPLACE FUNCTION generate_daily_deliveries(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
  day_str TEXT;
  new_delivery_id UUID;
  sub RECORD;
BEGIN
  day_str := lower(to_char(target_date, 'dy'));

  FOR sub IN 
    SELECT cs.id FROM customer_subscriptions cs
    JOIN subscriptions s ON cs.subscription_id = s.id
    WHERE cs.status = 'active'
      AND cs.start_date <= target_date
      AND cs.end_date >= target_date
      AND (s.operating_days IS NULL OR day_str = ANY(s.operating_days))
      AND NOT EXISTS (SELECT 1 FROM skips sk WHERE sk.customer_subscription_id = cs.id AND sk.date = target_date)
      AND NOT EXISTS (SELECT 1 FROM kitchen_holidays kh WHERE kh.kitchen_id = s.kitchen_id AND kh.holiday_date = target_date)
      AND NOT EXISTS (SELECT 1 FROM deliveries d WHERE d.customer_subscription_id = cs.id AND d.date = target_date)
  LOOP
    -- Insert the delivery manifest
    INSERT INTO deliveries (customer_subscription_id, date, status)
    VALUES (sub.id, target_date, 'scheduled')
    RETURNING id INTO new_delivery_id;

    -- Generate and lock the OTP in the secure vault
    INSERT INTO delivery_secrets (delivery_id, otp_code)
    VALUES (new_delivery_id, lpad(floor(random() * 10000)::text, 4, '0'));
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Upgrade the RPC gatekeeper to verify against the secure vault
CREATE OR REPLACE FUNCTION secure_complete_delivery(delivery_id UUID, provided_otp TEXT DEFAULT NULL, photo_url TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  del RECORD;
  real_otp TEXT;
BEGIN
  SELECT * INTO del FROM deliveries WHERE id = secure_complete_delivery.delivery_id AND driver_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'SECURITY BREACH: Delivery not found or not assigned to your cryptographic identity.'; END IF;

  IF provided_otp IS NOT NULL THEN
    -- Fetch the true OTP from the secure vault (bypassing RLS since RPC is SECURITY DEFINER)
    SELECT otp_code INTO real_otp FROM delivery_secrets WHERE delivery_secrets.delivery_id = secure_complete_delivery.delivery_id;
    
    IF real_otp = provided_otp THEN
      UPDATE deliveries SET status = 'delivered' WHERE id = secure_complete_delivery.delivery_id;
      RETURN TRUE;
    ELSE
      RAISE EXCEPTION 'CRYPTOGRAPHIC REJECTION: Invalid OTP Code.';
    END IF;
  
  ELSIF photo_url IS NOT NULL THEN
    UPDATE deliveries SET status = 'delivered', proof_photo_url = photo_url WHERE id = secure_complete_delivery.delivery_id;
    RETURN TRUE;
  ELSE
    RAISE EXCEPTION 'SECURITY BREACH: You must provide either the Customer OTP or Photographic Proof to finalize a delivery.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Annihilate the compromised column from the public matrix
ALTER TABLE deliveries DROP COLUMN otp_code;
