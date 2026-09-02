-- FIX: Discovered a catastrophic Privilege Escalation Exploit.
-- The profiles table allowed users to update their own rows without column restrictions.
-- A malicious customer could send a raw API payload to mathematically elevate their 
-- cryptographic role to 'vendor' or 'driver', bypassing all administrative vetting, 
-- setting up fake kitchens, and scamming the consumer base.

CREATE OR REPLACE FUNCTION prevent_privilege_escalation()
RETURNS trigger AS $$
BEGIN
  -- 1. Block Role Escalation
  IF NEW.role != OLD.role THEN
    -- Only the core database kernel (superuser) can elevate a user's role
    IF current_user != 'postgres' AND current_user != 'supabase_admin' THEN
      RAISE EXCEPTION 'SECURITY BREACH: Privilege escalation detected. You cannot mathematically mutate your own cryptographic role.';
    END IF;
  END IF;

  -- 2. Block Identity Spoofing
  IF NEW.id != OLD.id THEN
    RAISE EXCEPTION 'SECURITY BREACH: Cryptographic identity spoofing detected. You cannot mutate your root UUID.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Inject the security matrix into the profile update lifecycle
CREATE TRIGGER block_privilege_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE prevent_privilege_escalation();
