-- Enforce a mathematical impossibility of double-dispatching the same meal on the same day.
-- Prevents catastrophic financial drain if the cron-job orchestration layer triggers a race condition retry.
ALTER TABLE deliveries ADD CONSTRAINT deliveries_subscription_date_unique UNIQUE (customer_subscription_id, date);
