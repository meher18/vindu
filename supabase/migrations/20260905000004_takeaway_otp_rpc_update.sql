-- ------------------------------------------------------------------------------
-- UPDATE VENDOR TAKEAWAY OTP RPC
-- ------------------------------------------------------------------------------
-- The vendor does not know the delivery_id, they only have the 4-digit OTP from the customer.
-- We must find the active takeaway delivery for their kitchen today that matches this OTP.

CREATE OR REPLACE FUNCTION secure_vendor_complete_takeaway_by_otp(p_kitchen_id UUID, p_otp TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_delivery_id UUID;
BEGIN
  -- Find the delivery ID that matches the OTP for this kitchen today
  SELECT d.id INTO v_delivery_id
  FROM deliveries d
  JOIN delivery_secrets ds ON d.id = ds.delivery_id
  JOIN customer_subscriptions cs ON d.customer_subscription_id = cs.id
  JOIN subscriptions s ON cs.subscription_id = s.id
  JOIN kitchens k ON s.kitchen_id = k.id
  WHERE k.id = p_kitchen_id
    AND k.vendor_id = auth.uid()
    AND s.delivery_type = 'takeaway'
    AND d.date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
    AND d.status = 'vendor_ready'
    AND ds.otp_code = p_otp;

  IF NOT FOUND THEN 
    RAISE EXCEPTION 'CRYPTOGRAPHIC REJECTION: Invalid OTP or no pending takeaway delivery found for this kitchen today.'; 
  END IF;

  -- Update status to delivered
  UPDATE deliveries SET status = 'delivered', delivered_at = NOW() WHERE id = v_delivery_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

