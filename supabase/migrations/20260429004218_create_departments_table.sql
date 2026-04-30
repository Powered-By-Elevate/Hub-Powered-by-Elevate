/*
  # Create departments table

  1. New Tables
    - `departments`
      - `id` (uuid, primary key)
      - `name` (text, unique) - department name
      - `created_at` (timestamptz)

  2. Seed Data
    - Seeds the existing hardcoded departments

  3. Security
    - Enable RLS
    - HR (authenticated) can read, insert, update
*/

CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read departments"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert departments"
  ON departments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update departments"
  ON departments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO departments (name) VALUES
  ('Engineering'),
  ('Product'),
  ('Marketing'),
  ('Sales'),
  ('HR'),
  ('Finance'),
  ('Operations')
ON CONFLICT (name) DO NOTHING;
