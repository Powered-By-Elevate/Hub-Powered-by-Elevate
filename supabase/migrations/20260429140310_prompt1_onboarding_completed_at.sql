/*
  # Add onboarding_completed_at to employees

  Adds a timestamp column to record when an employee completed onboarding.
  Used to determine whether to show the "fully onboarded" banner (hidden after 7 days).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'onboarding_completed_at'
  ) THEN
    ALTER TABLE employees ADD COLUMN onboarding_completed_at timestamptz DEFAULT NULL;
  END IF;
END $$;
