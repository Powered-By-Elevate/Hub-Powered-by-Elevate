/*
  # Create Demo Auth Users

  Creates two demo accounts:
  - HR admin: hr@truenorth.demo / HRAdmin2024!
  - Employee: sarah.chen@true-north-companies.com / Employee2024!
*/

DO $$
DECLARE
  hr_uid uuid;
  emp_uid uuid;
  sarah_emp_id uuid;
BEGIN
  -- Only create HR user if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'hr@truenorth.demo') THEN
    hr_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, instance_id, aud, role
    ) VALUES (
      hr_uid, 'hr@truenorth.demo',
      crypt('HRAdmin2024!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}', '{}',
      now(), now(),
      '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'
    );
    INSERT INTO public.users (id, email, role)
    VALUES (hr_uid, 'hr@truenorth.demo', 'hr')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Get Sarah's employee record
  SELECT id INTO sarah_emp_id
  FROM public.employees
  WHERE email = 'sarah.chen@true-north-companies.com'
  LIMIT 1;

  -- Only create employee user if not exists
  IF sarah_emp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'sarah.chen@true-north-companies.com') THEN
    emp_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, instance_id, aud, role
    ) VALUES (
      emp_uid, 'sarah.chen@true-north-companies.com',
      crypt('Employee2024!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}', '{}',
      now(), now(),
      '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'
    );
    UPDATE public.employees SET user_id = emp_uid WHERE id = sarah_emp_id;
    INSERT INTO public.users (id, email, role, employee_id)
    VALUES (emp_uid, 'sarah.chen@true-north-companies.com', 'employee', sarah_emp_id)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
