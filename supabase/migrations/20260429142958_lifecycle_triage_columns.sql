/*
  # Lifecycle, Task Phase, and Triage Columns

  1. employees table
    - lifecycle_status: 'onboarding' | 'active' — one-way, never reverts
    - onboarding_completed_at: timestamp when lifecycle became active (already may exist)

  2. onboarding_tasks table
    - task_phase: 'onboarding' | 'active' — separates onboarding vs ongoing tasks
    - triage: 'normal' | 'critical' — replaces priority for display ordering
*/

-- lifecycle_status on employees
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'lifecycle_status'
  ) THEN
    ALTER TABLE employees ADD COLUMN lifecycle_status text NOT NULL DEFAULT 'onboarding';
  END IF;

  -- Sync lifecycle_status from existing phase column for existing records
  UPDATE employees SET lifecycle_status = 'active' WHERE phase = 'active' AND lifecycle_status = 'onboarding';
END $$;

-- task_phase on onboarding_tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'onboarding_tasks' AND column_name = 'task_phase'
  ) THEN
    ALTER TABLE onboarding_tasks ADD COLUMN task_phase text NOT NULL DEFAULT 'onboarding';
  END IF;
END $$;

-- triage on onboarding_tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'onboarding_tasks' AND column_name = 'triage'
  ) THEN
    ALTER TABLE onboarding_tasks ADD COLUMN triage text NOT NULL DEFAULT 'normal';
  END IF;
END $$;
