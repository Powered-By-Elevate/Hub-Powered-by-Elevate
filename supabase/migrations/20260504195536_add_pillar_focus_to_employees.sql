/*
  # Add pillar_focus column to employees table

  1. Modified Tables
    - `employees`
      - `pillar_focus` (text, nullable) - Stores the assigned pillar for the employee
        Valid values: Phileo Love, Trust, Teamwork, Big Goal, Legacy, Identity

  2. Notes
    - This allows HR to directly assign an employee to a pillar section
      without requiring a check-in to be created first
    - The value can be updated at any time through the Edit Employee modal
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'pillar_focus'
  ) THEN
    ALTER TABLE employees ADD COLUMN pillar_focus text DEFAULT NULL;
  END IF;
END $$;
