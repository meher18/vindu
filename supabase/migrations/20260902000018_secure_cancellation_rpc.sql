-- FIX: Subscription Lock-In Gridlock
-- Customers mathematically could not cancel their subscriptions because RLS Default-Deny 
-- explicitly blocked all UPDATE operations on 'customer_subscriptions'.
-- Rather than opening up arbitrary UPDATE privileges, this creates a secure, 
-- cryptographic RPC gatekeeper solely dedicated to executing the cancellation state machine.

CREATE OR REPLACE FUNCTION secure_cancel_subscription(target_sub_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  sub RECORD;
BEGIN
  -- Cryptographically verify ownership and current status
  SELECT * INTO sub FROM customer_subscriptions 
  WHERE id = target_sub_id AND customer_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SECURITY BREACH: Subscription not found or does not belong to your cryptographic identity.';
  END IF;

  IF sub.status = 'cancelled' THEN
    RAISE EXCEPTION 'This subscription is already cancelled.';
  END IF;

  -- Execute the cancellation state mutation
  -- (This will immediately trigger the 'process_subscription_cancellation_refund' matrix)
  UPDATE customer_subscriptions 
  SET status = 'cancelled', updated_at = NOW() 
  WHERE id = target_sub_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
