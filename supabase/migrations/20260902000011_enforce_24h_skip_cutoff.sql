-- FIX: Discovered a critical temporal loophole in the skip refund architecture.
-- The previous constraint 'date >= CURRENT_DATE' mathematically allowed a customer 
-- to skip a meal at 11:59 AM, exactly one minute before delivery, instantly securing 
-- a full wallet refund while the Vendor had already paid for ingredients, cooked the meal, 
-- and dispatched the Driver.

-- Drop the insecure constraint
ALTER TABLE skips DROP CONSTRAINT IF EXISTS check_skip_date_future;

-- Enforce a strict 24-hour cutoff: Customers can only skip meals starting TOMORROW.
-- Today's food is already locked into the physical supply chain.
ALTER TABLE skips ADD CONSTRAINT check_skip_date_future CHECK (date > CURRENT_DATE);
