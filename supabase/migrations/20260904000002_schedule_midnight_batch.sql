-- Schedule the generate_daily_deliveries function using pg_cron.
-- This runs at midnight India time (18:30 UTC = 00:00 IST).
-- pg_cron is pre-enabled on Supabase Pro plans.
-- On Free plan, this must be triggered via a Supabase Edge Function + external cron (e.g. cron-job.org).

SELECT cron.schedule(
  'midnight-delivery-generation', -- job name (unique)
  '30 18 * * *',                  -- 18:30 UTC = 00:00 IST
  $$ SELECT generate_daily_deliveries(CURRENT_DATE + INTERVAL '1 day'); $$
);

