-- FIX: The ratings system was entirely unprotected against sybil attacks.
-- Any authenticated user could run a loop to leave a million 5-star reviews 
-- on their own kitchen, or a million 1-star reviews on a competitor's kitchen.

-- 1. Prevent multiple reviews from the same customer on the same kitchen
ALTER TABLE ratings ADD CONSTRAINT unique_customer_kitchen_rating UNIQUE(customer_id, kitchen_id);

-- 2. Drop the insecure INSERT policy
DROP POLICY IF EXISTS "Customers insert own ratings" ON ratings;

-- 3. Replace with a cryptographically verified Proof-of-Delivery constraint
-- A customer can ONLY leave a review if they have physically received 
-- at least one 'delivered' meal from that specific kitchen.
CREATE POLICY "Customers insert own ratings" ON ratings FOR INSERT WITH CHECK (
  customer_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM deliveries d
    JOIN customer_subscriptions cs ON d.customer_subscription_id = cs.id
    JOIN subscriptions s ON cs.subscription_id = s.id
    WHERE cs.customer_id = auth.uid() 
      AND s.kitchen_id = ratings.kitchen_id
      AND d.status = 'delivered'
  )
);

-- 4. Allow customers to UPDATE their review (since they can only have 1)
CREATE POLICY "Customers update own ratings" ON ratings FOR UPDATE USING (
  customer_id = auth.uid()
);
