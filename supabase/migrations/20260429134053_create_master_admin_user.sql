/*
  # Create master HR admin account

  Creates a Supabase auth user for master@true-north-companies.com
  and inserts the corresponding HR role profile in the users table.
*/

DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  -- Insert into auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'master@true-north-companies.com',
    crypt('@MasterloginTN!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- Insert identity record
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', 'master@true-north-companies.com'),
    'email',
    new_user_id::text,
    now(),
    now(),
    now()
  );

  -- Insert HR profile
  INSERT INTO public.users (id, email, role, employee_id)
  VALUES (new_user_id, 'master@true-north-companies.com', 'hr', NULL);
END $$;
