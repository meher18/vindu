-- FIX: The handle_new_user() trigger ignores the `requested_role` field
-- passed in the signup metadata. ALL new users default to 'customer',
-- making it impossible for vendors and drivers to sign up through
-- the vindu-partners app.

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  req_role TEXT;
  final_role user_role;
BEGIN
  -- Parse the requested role from signup metadata
  req_role := new.raw_user_meta_data->>'requested_role';
  
  -- Validate: only allow known roles, default to 'customer'
  IF req_role IN ('vendor', 'driver') THEN
    final_role := req_role::user_role;
  ELSE
    final_role := 'customer';
  END IF;

  -- Insert the profile with the correct role
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (new.id, final_role, new.raw_user_meta_data->>'full_name');
  
  -- Create wallet (useful for customers; vendors/drivers can ignore it)
  INSERT INTO public.wallets (customer_id, balance)
  VALUES (new.id, 0);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
