-- FIX: Discovered a catastrophic Default-Deny RLS lock on the 'customer_subscriptions' matrix.
-- Since RLS was enabled but no policies were defined, Customers were mathematically blocked 
-- from viewing or purchasing plans, and Vendors were blind to their active subscriber counts.

-- 1. Customers can view their own subscriptions
CREATE POLICY "Customers can view own subscriptions" 
ON customer_subscriptions FOR SELECT 
TO authenticated 
USING (auth.uid() = customer_id);

-- 2. Customers can insert their own subscriptions (Purchasing Phase)
CREATE POLICY "Customers can purchase subscriptions" 
ON customer_subscriptions FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = customer_id);

-- Note: UPDATE operations are intentionally excluded here because they are handled 
-- securely via the 'secure_cancel_subscription' RPC gatekeeper to prevent malicious mutations.

-- 3. Vendors can view subscriptions tied to their kitchen's meal plans (For Operational Capacity)
CREATE POLICY "Vendors can view subscriptions for their plans" 
ON customer_subscriptions FOR SELECT 
TO authenticated 
USING (
  subscription_id IN (
    SELECT id FROM subscriptions 
    WHERE kitchen_id IN (
      SELECT id FROM kitchens WHERE vendor_id = auth.uid()
    )
  )
);
