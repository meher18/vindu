-- FIX: The entire kitchen holidays architecture was hallucinated. The UI queried it,
-- triggers referenced it, but the table was never physically defined in the schema.
-- Furthermore, the logistics generation engine did not check for holidays, 
-- which would cause drivers to be dispatched to closed kitchens.

-- 1. Create the missing table
CREATE TABLE kitchen_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id UUID REFERENCES kitchens(id) ON DELETE CASCADE NOT NULL,
  holiday_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kitchen_id, holiday_date)
);

-- 2. Enforce Cryptographic RLS
ALTER TABLE kitchen_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view kitchen holidays" ON kitchen_holidays FOR SELECT USING (true);
CREATE POLICY "Vendors manage own holidays" ON kitchen_holidays FOR ALL USING (
  kitchen_id IN (SELECT id FROM kitchens WHERE vendor_id = auth.uid())
);

-- 3. Fix the Midnight Logistics Engine to NEVER dispatch drivers to a closed kitchen
CREATE OR REPLACE FUNCTION generate_daily_deliveries(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
  day_str TEXT;
BEGIN
  day_str := lower(to_char(target_date, 'dy'));

  INSERT INTO deliveries (customer_subscription_id, date, status, otp_code)
  SELECT cs.id, target_date, 'scheduled', lpad(floor(random() * 10000)::text, 4, '0')
  FROM customer_subscriptions cs
  JOIN subscriptions s ON cs.subscription_id = s.id
  WHERE cs.status = 'active'
    AND cs.start_date <= target_date
    AND cs.end_date >= target_date
    AND (s.operating_days IS NULL OR day_str = ANY(s.operating_days))
    -- DO NOT generate delivery if customer skipped
    AND NOT EXISTS (
      SELECT 1 FROM skips sk WHERE sk.customer_subscription_id = cs.id AND sk.date = target_date
    )
    -- DO NOT generate delivery if kitchen declared a holiday
    AND NOT EXISTS (
      SELECT 1 FROM kitchen_holidays kh WHERE kh.kitchen_id = s.kitchen_id AND kh.holiday_date = target_date
    )
    -- DO NOT generate duplicate delivery
    AND NOT EXISTS (
      SELECT 1 FROM deliveries d WHERE d.customer_subscription_id = cs.id AND d.date = target_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
