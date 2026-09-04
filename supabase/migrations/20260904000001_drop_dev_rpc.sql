-- SECURITY: Remove the dev backdoor RPC that allowed anyone to confirm arbitrary emails.
-- This was added for development testing only and must NOT exist in production.
DROP FUNCTION IF EXISTS public.dev_confirm_email(text);
