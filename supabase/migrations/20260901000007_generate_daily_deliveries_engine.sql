-- Function to execute the midnight logistics generation matrix
CREATE OR REPLACE FUNCTION generate_daily_deliveries(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
  day_str TEXT;
BEGIN
  day_str := lower(to_char(target_date, 'dy'));

  -- Insert a delivery row for every active customer subscription that operates today,
  -- provided the customer has NOT skipped the date, and it hasn't already been generated.
  INSERT INTO deliveries (customer_subscription_id, date, status, otp_code)
  SELECT cs.id, target_date, 'scheduled', lpad(floor(random() * 10000)::text, 4, '0')
  FROM customer_subscriptions cs
  JOIN subscriptions s ON cs.subscription_id = s.id
  WHERE cs.status = 'active'
    AND cs.start_date <= target_date
    AND cs.end_date >= target_date
    AND (s.operating_days IS NULL OR day_str = ANY(s.operating_days))
    AND NOT EXISTS (
      SELECT 1 FROM skips sk WHERE sk.customer_subscription_id = cs.id AND sk.date = target_date
    )
    AND NOT EXISTS (
      SELECT 1 FROM deliveries d WHERE d.customer_subscription_id = cs.id AND d.date = target_date
    );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- If using pg_cron extension (Supabase supports this), we can schedule it automatically.
-- For now, the function is exposed so Edge Functions or external schedulers can hit it via RPC.
