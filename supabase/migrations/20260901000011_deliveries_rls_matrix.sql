-- Unlock the Deliveries matrix for Vendors, Customers, and Drivers
-- Vendors need to see deliveries tied to their kitchen and update status to 'vendor_ready'
-- Drivers need to see all 'vendor_ready' deliveries to claim them, and update status to 'delivered'
-- Customers need to see their own deliveries

-- 1. Vendors can view deliveries assigned to their kitchen
CREATE POLICY "Vendors view own deliveries" ON deliveries FOR SELECT USING (
  customer_subscription_id IN (
    SELECT id FROM customer_subscriptions WHERE subscription_id IN (
      SELECT id FROM subscriptions WHERE kitchen_id IN (
        SELECT id FROM kitchens WHERE vendor_id = auth.uid()
      )
    )
  )
);

-- 2. Vendors can update deliveries (to 'vendor_ready') if tied to their kitchen
CREATE POLICY "Vendors update own deliveries" ON deliveries FOR UPDATE USING (
  customer_subscription_id IN (
    SELECT id FROM customer_subscriptions WHERE subscription_id IN (
      SELECT id FROM subscriptions WHERE kitchen_id IN (
        SELECT id FROM kitchens WHERE vendor_id = auth.uid()
      )
    )
  )
);

-- 3. Customers can view their own deliveries
CREATE POLICY "Customers view own deliveries" ON deliveries FOR SELECT USING (
  customer_subscription_id IN (
    SELECT id FROM customer_subscriptions WHERE customer_id = auth.uid()
  )
);

-- 4. Drivers can view any delivery that is 'vendor_ready' (to build routes) or assigned to them
CREATE POLICY "Drivers view deliveries" ON deliveries FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'driver')
);

-- 5. Drivers can update deliveries (claim them, mark delivered)
CREATE POLICY "Drivers update deliveries" ON deliveries FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'driver')
);
