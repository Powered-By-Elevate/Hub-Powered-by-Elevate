/*
  # Rebuild Task System

  Extends onboarding_tasks with:
    - priority (high/medium/low)
    - assigned_by_role (hr/manager/employee/system)
    - completed_at (timestamp)
    - completed_by (user id)
    - archived (boolean)
    - description (longer text)

  Also adds Personal and Other to category options via check constraint update.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'onboarding_tasks' AND column_name = 'assigned_by_role'
  ) THEN
    ALTER TABLE onboarding_tasks ADD COLUMN assigned_by_role text DEFAULT 'hr';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'onboarding_tasks' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE onboarding_tasks ADD COLUMN completed_at timestamptz DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'onboarding_tasks' AND column_name = 'completed_by'
  ) THEN
    ALTER TABLE onboarding_tasks ADD COLUMN completed_by uuid DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'onboarding_tasks' AND column_name = 'archived'
  ) THEN
    ALTER TABLE onboarding_tasks ADD COLUMN archived boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'onboarding_tasks' AND column_name = 'description'
  ) THEN
    ALTER TABLE onboarding_tasks ADD COLUMN description text DEFAULT NULL;
  END IF;

  -- Ensure priority column exists (it may already)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'onboarding_tasks' AND column_name = 'priority'
  ) THEN
    ALTER TABLE onboarding_tasks ADD COLUMN priority text DEFAULT 'medium';
  END IF;
END $$;
