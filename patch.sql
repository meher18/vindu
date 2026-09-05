CREATE OR REPLACE FUNCTION secure_driver_claim_batch(p_secret UUID)
RETURNS INT AS $$
DECLARE
  v_updated_count INT;
BEGIN
  WITH updated AS (
    UPDATE deliveries
    SET status = 'picked_up',
        qr_scanned_at = NOW()
    WHERE pickup_secret = p_secret
      AND status = 'vendor_ready'
      AND driver_id = auth.uid()
    RETURNING id
  )
  SELECT count(*) INTO v_updated_count FROM updated;

  IF v_updated_count = 0 THEN
    RAISE EXCEPTION 'CRYPTOGRAPHIC REJECTION: Invalid QR code, or you have not claimed any deliveries from this batch.';
  END IF;

  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
