-- Unlock the Skips matrix for Customers and Vendors
-- Customers must be able to insert and view skips for their own subscriptions
-- Vendors must be able to view skips for subscriptions tied to their kitchen

-- 1. Customers can view their own skips
CREATE POLICY "Customers view own skips" ON skips FOR SELECT USING (
  customer_subscription_id IN (
    SELECT id FROM customer_subscriptions WHERE customer_id = auth.uid()
  )
);

-- 2. Customers can insert skips for their own subscriptions
CREATE POLICY "Customers insert own skips" ON skips FOR INSERT WITH CHECK (
  customer_subscription_id IN (
    SELECT id FROM customer_subscriptions WHERE customer_id = auth.uid()
  )
);

-- 3. Vendors can view skips tied to their kitchen
CREATE POLICY "Vendors view skips for their kitchen" ON skips FOR SELECT USING (
  customer_subscription_id IN (
    SELECT id FROM customer_subscriptions WHERE subscription_id IN (
      SELECT id FROM subscriptions WHERE kitchen_id IN (
        SELECT id FROM kitchens WHERE vendor_id = auth.uid()
      )
    )
  )
);

-- ==========================================
-- Unlock Peripheral Ecosystem Tables
-- ==========================================

-- WALLET TRANSACTIONS: Customers view their own receipts
CREATE POLICY "Customers view own wallet transactions" ON wallet_transactions FOR SELECT USING (
  wallet_id IN (SELECT id FROM wallets WHERE customer_id = auth.uid())
);

-- DRIVER LEDGER: Drivers view their own earnings
CREATE POLICY "Drivers view own ledger" ON driver_ledger FOR SELECT USING (
  driver_id = auth.uid()
);

-- RATINGS: Customers insert their own. Vendors view ratings tied to their kitchen.
CREATE POLICY "Customers insert own ratings" ON ratings FOR INSERT WITH CHECK (
  customer_id = auth.uid()
);
CREATE POLICY "Vendors view ratings for their kitchen" ON ratings FOR SELECT USING (
  kitchen_id IN (SELECT id FROM kitchens WHERE vendor_id = auth.uid())
);
CREATE POLICY "Customers view own ratings" ON ratings FOR SELECT USING (
  customer_id = auth.uid()
);
