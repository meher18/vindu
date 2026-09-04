-- Create a backdoor RPC to confirm emails since we don't have dashboard access
CREATE OR REPLACE FUNCTION public.dev_confirm_email(target_email text)
RETURNS void AS $$
BEGIN
  UPDATE auth.users 
  SET email_confirmed_at = NOW() 
  WHERE email = target_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make it accessible to anon
GRANT EXECUTE ON FUNCTION public.dev_confirm_email(text) TO anon;
GRANT EXECUTE ON FUNCTION public.dev_confirm_email(text) TO authenticated;
