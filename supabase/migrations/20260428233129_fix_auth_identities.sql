/*
  # Fix Auth Identities for Demo Users

  The auth.identities table entries were missing, which prevents
  email/password login from working. This adds the required identity
  records for both demo accounts.
*/

DO $$
DECLARE
  hr_uid uuid;
  emp_uid uuid;
BEGIN
  SELECT id INTO hr_uid FROM auth.users WHERE email = 'hr@truenorth.demo';
  SELECT id INTO emp_uid FROM auth.users WHERE email = 'sarah.chen@true-north-companies.com';

  IF hr_uid IS NOT NULL THEN
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      hr_uid,
      hr_uid,
      'hr@truenorth.demo',
      jsonb_build_object('sub', hr_uid::text, 'email', 'hr@truenorth.demo', 'email_verified', true, 'phone_verified', false),
      'email',
      now(), now(), now()
    )
    ON CONFLICT (provider, provider_id) DO NOTHING;
  END IF;

  IF emp_uid IS NOT NULL THEN
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      emp_uid,
      emp_uid,
      'sarah.chen@true-north-companies.com',
      jsonb_build_object('sub', emp_uid::text, 'email', 'sarah.chen@true-north-companies.com', 'email_verified', true, 'phone_verified', false),
      'email',
      now(), now(), now()
    )
    ON CONFLICT (provider, provider_id) DO NOTHING;
  END IF;
END $$;
