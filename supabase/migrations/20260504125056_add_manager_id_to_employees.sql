/*
  # Add manager_id column to employees

  1. Modified Tables
    - `employees`
      - `manager_id` (uuid, nullable, FK to employees.id) - links to the manager's employee record

  2. Notes
    - Keeps existing `manager` text column for backwards compatibility
    - manager_id provides a real relational link between employee and their manager
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'manager_id'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN manager_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON public.employees(manager_id);
