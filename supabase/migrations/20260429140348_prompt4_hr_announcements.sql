/*
  # HR Announcement Banner System

  1. New Tables
    - `hr_announcements` — HR-authored banners shown on employee dashboard

  2. Modified Tables
    - `employees` — add birthday_month, birthday_day fields

  3. Security
    - RLS: HR can manage all announcements, employees can read active ones targeted to them
*/

-- hr_announcements table
CREATE TABLE IF NOT EXISTS hr_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'announcement',
  start_date date NOT NULL,
  end_date date NOT NULL,
  department_id text DEFAULT NULL,
  employee_id uuid DEFAULT NULL,
  active boolean DEFAULT true,
  created_by uuid DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hr_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can insert announcements"
  ON hr_announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr')
  );

CREATE POLICY "HR can update announcements"
  ON hr_announcements FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr'));

CREATE POLICY "HR can delete announcements"
  ON hr_announcements FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr'));

CREATE POLICY "Employees can read active announcements"
  ON hr_announcements FOR SELECT
  TO authenticated
  USING (
    active = true
    AND start_date <= CURRENT_DATE
    AND end_date >= CURRENT_DATE
  );

-- Add birthday fields to employees
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'birthday_month'
  ) THEN
    ALTER TABLE employees ADD COLUMN birthday_month int DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'birthday_day'
  ) THEN
    ALTER TABLE employees ADD COLUMN birthday_day int DEFAULT NULL;
  END IF;
END $$;
