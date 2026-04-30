/*
  # Add assigned_by_name to onboarding_tasks

  The assigned_by column is a UUID referencing the auth user who created the task.
  This adds a companion text column to store the display name for rendering in the UI,
  so we never display raw UUIDs to users.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'onboarding_tasks' AND column_name = 'assigned_by_name'
  ) THEN
    ALTER TABLE onboarding_tasks ADD COLUMN assigned_by_name text;
  END IF;
END $$;
