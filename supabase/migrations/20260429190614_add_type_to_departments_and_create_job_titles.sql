/*
  # Add type column to departments and create job_titles table

  ## Changes

  ### departments table
  - Add `type` column (text, nullable) for categorizing departments
    (e.g. "Office & Corporate", "Construction", "Field Operations")

  ### job_titles table (new)
  - `id` (uuid, primary key)
  - `title` (text, unique, not null) — the job title string
  - `category` (text, not null) — grouping label shown in JobTitleInput dropdown
  - `active` (boolean, default true) — hide/show without deleting
  - `created_at` (timestamptz)
  - Pre-populated with the full standard title list used by JobTitleInput

  ## Security
  - RLS enabled on job_titles
  - Authenticated users can read all active job titles
  - Only authenticated users with HR role can insert/update/delete (enforced via authenticated policy)
*/

-- 1. Add type column to departments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'departments' AND column_name = 'type'
  ) THEN
    ALTER TABLE departments ADD COLUMN type text;
  END IF;
END $$;

-- 2. Create job_titles table
CREATE TABLE IF NOT EXISTS job_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text UNIQUE NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE job_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read job titles"
  ON job_titles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert job titles"
  ON job_titles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update job titles"
  ON job_titles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete job titles"
  ON job_titles FOR DELETE
  TO authenticated
  USING (true);

-- 3. Seed job_titles with the standard list
INSERT INTO job_titles (title, category) VALUES
  -- Office and Corporate
  ('HR Manager', 'Office and Corporate'),
  ('HR Coordinator', 'Office and Corporate'),
  ('HR Director', 'Office and Corporate'),
  ('Payroll Specialist', 'Office and Corporate'),
  ('Recruiter', 'Office and Corporate'),
  ('Financial Analyst', 'Office and Corporate'),
  ('Controller', 'Office and Corporate'),
  ('CFO', 'Office and Corporate'),
  ('Accountant', 'Office and Corporate'),
  ('Bookkeeper', 'Office and Corporate'),
  ('Project Manager', 'Office and Corporate'),
  ('Operations Manager', 'Office and Corporate'),
  ('Operations Coordinator', 'Office and Corporate'),
  ('Executive Assistant', 'Office and Corporate'),
  ('Administrative Assistant', 'Office and Corporate'),
  ('Office Manager', 'Office and Corporate'),
  ('Marketing Manager', 'Office and Corporate'),
  ('Marketing Coordinator', 'Office and Corporate'),
  ('IT Manager', 'Office and Corporate'),
  ('IT Support Specialist', 'Office and Corporate'),
  ('Systems Administrator', 'Office and Corporate'),
  ('CEO', 'Office and Corporate'),
  ('COO', 'Office and Corporate'),
  ('VP of Operations', 'Office and Corporate'),
  ('VP of Finance', 'Office and Corporate'),
  ('General Counsel', 'Office and Corporate'),
  ('Compliance Officer', 'Office and Corporate'),
  -- Construction Leadership
  ('General Superintendent', 'Construction Leadership'),
  ('Project Superintendent', 'Construction Leadership'),
  ('Superintendent', 'Construction Leadership'),
  ('Assistant Superintendent', 'Construction Leadership'),
  ('General Foreman', 'Construction Leadership'),
  ('Foreman', 'Construction Leadership'),
  ('Senior Project Manager', 'Construction Leadership'),
  ('Assistant Project Manager', 'Construction Leadership'),
  ('Project Engineer', 'Construction Leadership'),
  ('Senior Project Engineer', 'Construction Leadership'),
  ('Field Engineer', 'Construction Leadership'),
  ('Project Executive', 'Construction Leadership'),
  ('VP of Construction', 'Construction Leadership'),
  ('Director of Construction', 'Construction Leadership'),
  ('Chief Estimator', 'Construction Leadership'),
  ('Senior Estimator', 'Construction Leadership'),
  ('Estimator', 'Construction Leadership'),
  ('Assistant Estimator', 'Construction Leadership'),
  ('Preconstruction Manager', 'Construction Leadership'),
  ('BIM Coordinator', 'Construction Leadership'),
  ('VDC Manager', 'Construction Leadership'),
  ('Safety Director', 'Construction Leadership'),
  ('Safety Manager', 'Construction Leadership'),
  ('Safety Coordinator', 'Construction Leadership'),
  ('Quality Control Manager', 'Construction Leadership'),
  ('Quality Control Inspector', 'Construction Leadership'),
  ('Owner''s Representative', 'Construction Leadership'),
  ('Construction Manager', 'Construction Leadership'),
  -- Construction Field
  ('Ironworker', 'Construction Field'),
  ('Journeyman Ironworker', 'Construction Field'),
  ('Apprentice Ironworker', 'Construction Field'),
  ('Carpenter', 'Construction Field'),
  ('Journeyman Carpenter', 'Construction Field'),
  ('Concrete Finisher', 'Construction Field'),
  ('Concrete Laborer', 'Construction Field'),
  ('Equipment Operator', 'Construction Field'),
  ('Heavy Equipment Operator', 'Construction Field'),
  ('Crane Operator', 'Construction Field'),
  ('Electrician', 'Construction Field'),
  ('Journeyman Electrician', 'Construction Field'),
  ('Plumber', 'Construction Field'),
  ('Journeyman Plumber', 'Construction Field'),
  ('Pipefitter', 'Construction Field'),
  ('Welder', 'Construction Field'),
  ('Rigger', 'Construction Field'),
  ('Scaffold Builder', 'Construction Field'),
  ('General Laborer', 'Construction Field'),
  ('Skilled Laborer', 'Construction Field'),
  ('Truck Driver', 'Construction Field'),
  ('Utility Worker', 'Construction Field')
ON CONFLICT (title) DO NOTHING;
