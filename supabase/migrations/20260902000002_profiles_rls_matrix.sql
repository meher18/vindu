-- FIX: The profiles table RLS was strictly locked to "own profile only".
-- This caused a catastrophic data blackout across the marketplace:
-- 1. Vendors could not see the names of customers leaving feedback.
-- 2. Drivers could not see the delivery address or phone number of customers.
-- 3. Customers could not see the phone number of their assigned driver.

-- Allow Vendors to see profiles of customers who have subscribed to their kitchen or left a rating
CREATE POLICY "Vendors view transacting customers" ON profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM customer_subscriptions cs
    JOIN subscriptions s ON cs.subscription_id = s.id
    JOIN kitchens k ON s.kitchen_id = k.id
    WHERE cs.customer_id = profiles.id AND k.vendor_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM ratings r
    JOIN kitchens k ON r.kitchen_id = k.id
    WHERE r.customer_id = profiles.id AND k.vendor_id = auth.uid()
  )
);

-- Allow Drivers to see profiles of customers (so they can navigate and call) and vendors
CREATE POLICY "Drivers view customers and vendors" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles me WHERE me.id = auth.uid() AND me.role = 'driver')
);

-- Allow Customers to see profiles of their assigned drivers
CREATE POLICY "Customers view assigned drivers" ON profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM deliveries d
    JOIN customer_subscriptions cs ON d.customer_subscription_id = cs.id
    WHERE d.driver_id = profiles.id AND cs.customer_id = auth.uid()
  )
);
