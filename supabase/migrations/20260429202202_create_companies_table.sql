/*
  # Create companies table and link to employees

  1. New Tables
    - `companies`
      - `id` (uuid, primary key)
      - `name` (text, unique, not null)
      - `code` (text) — short identifier, e.g. TNC
      - `type` (text) — e.g. General Contractor, Subcontractor, Corporate
      - `active` (boolean, default true)
      - `created_at` (timestamptz)

  2. Modified Tables
    - `employees` — adds `company_id` (uuid, nullable, FK → companies.id)

  3. Seed Data
    - Pre-populates "True North Companies" with code TNC

  4. Security
    - Enable RLS on `companies`
    - Authenticated users can view companies
    - HR/manager (role check via `users` table) can write
*/

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  code text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view companies"
  ON companies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "HR can insert companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('hr', 'manager')
    )
  );

CREATE POLICY "HR can update companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('hr', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('hr', 'manager')
    )
  );

CREATE POLICY "HR can delete companies"
  ON companies FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('hr', 'manager')
    )
  );

-- Add company_id to employees
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Seed default company
INSERT INTO companies (name, code, type, active)
VALUES ('True North Companies', 'TNC', 'General Contractor', true)
ON CONFLICT (name) DO NOTHING;
