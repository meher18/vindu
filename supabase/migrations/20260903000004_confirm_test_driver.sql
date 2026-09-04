-- Auto-confirm the test driver account created for development
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'driver_test1@vindu.app';

