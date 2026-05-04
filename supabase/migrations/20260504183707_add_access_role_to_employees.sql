/*
  # Add access_role column to employees

  1. Modified Tables
    - `employees`
      - `access_role` (text, default 'employee') - stores the intended system access level
        Values: 'hr', 'manager', 'employee'
        Used to set the role in the users table when the account is activated

  2. Notes
    - This allows HR to pre-assign access roles before employees activate accounts
    - The activate-account flow should read this column to set the correct role
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'access_role'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN access_role text DEFAULT 'employee';
  END IF;
END $$;
