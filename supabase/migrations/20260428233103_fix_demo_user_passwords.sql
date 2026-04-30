/*
  # Fix Demo User Passwords

  Supabase Auth requires passwords stored with pgcrypto in a specific way.
  This resets both demo accounts using the correct format.
*/

UPDATE auth.users
SET 
  encrypted_password = crypt('HRAdmin2024!', gen_salt('bf', 10)),
  updated_at = now()
WHERE email = 'hr@truenorth.demo';

UPDATE auth.users
SET 
  encrypted_password = crypt('Employee2024!', gen_salt('bf', 10)),
  updated_at = now()
WHERE email = 'sarah.chen@true-north-companies.com';
