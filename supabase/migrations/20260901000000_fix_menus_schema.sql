-- Drop wrong columns
ALTER TABLE menus DROP COLUMN kitchen_id;
ALTER TABLE menus DROP COLUMN slot_name;

-- Add correct columns mapping to the React Native App
ALTER TABLE menus ADD COLUMN subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE NOT NULL;
ALTER TABLE menus ADD COLUMN notes TEXT;

-- Create unique constraint so UPSERT onConflict works correctly
ALTER TABLE menus ADD CONSTRAINT menus_subscription_date_unique UNIQUE (subscription_id, effective_date);


-- Drop old policy
DROP POLICY IF EXISTS "Vendors can manage own menus" ON menus;

-- Create new policy
CREATE POLICY "Vendors can manage own menus" ON menus FOR ALL USING (
  subscription_id IN (
    SELECT id FROM subscriptions WHERE kitchen_id IN (
      SELECT id FROM kitchens WHERE vendor_id = auth.uid()
    )
  )
);

