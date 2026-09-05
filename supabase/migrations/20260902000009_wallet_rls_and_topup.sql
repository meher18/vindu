-- FIX: The wallets and wallet_transactions tables were trapped in Default-Deny RLS, 
-- locking customers out of viewing their own balances. 
-- Furthermore, there was no mechanism to deposit initial capital into the wallet, 
-- rendering the platform completely gridlocked since subscriptions require prepaid funds.

-- 1. Unlock Customer Wallet Read Access
CREATE POLICY "Customers view own wallet" ON wallets FOR SELECT USING (
  customer_id = auth.uid()
);

CREATE POLICY "Customers view own wallet transactions" ON wallet_transactions FOR SELECT USING (
  wallet_id IN (SELECT id FROM wallets WHERE customer_id = auth.uid())
);

-- 2. Create an autonomous Top-Up Gateway (Simulated Payment Gateway hook)
CREATE OR REPLACE FUNCTION top_up_wallet(deposit_amount NUMERIC)
RETURNS BOOLEAN AS $$
DECLARE
  w_id UUID;
  caller_role TEXT;
BEGIN
  -- Verify caller is a customer
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role != 'customer' THEN
    RAISE EXCEPTION 'SECURITY BREACH: Only customers can deposit funds into consumer wallets.';
  END IF;

  -- Ensure minimum deposit to prevent micro-transaction spam
  IF deposit_amount < 100 THEN
    RAISE EXCEPTION 'Minimum deposit is ₹100.';
  END IF;

  -- Fetch or mathematically instantiate the customer's wallet if it doesn't exist yet
  SELECT id INTO w_id FROM wallets WHERE customer_id = auth.uid();
  
  IF w_id IS NULL THEN
    INSERT INTO wallets (customer_id, balance) VALUES (auth.uid(), deposit_amount) RETURNING id INTO w_id;
    INSERT INTO wallet_transactions (wallet_id, amount, type, description)
    VALUES (w_id, deposit_amount, 'deposit', 'Initial Wallet Top-Up (Simulated Gateway)');
  ELSE
    UPDATE wallets SET balance = balance + deposit_amount, updated_at = NOW() WHERE id = w_id;
    INSERT INTO wallet_transactions (wallet_id, amount, type, description)
    VALUES (w_id, deposit_amount, 'deposit', 'Wallet Top-Up (Simulated Gateway)');
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
