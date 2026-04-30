/*
  # Platform Upgrade Round 3 — Full Schema

  1. New / altered tables:
     - `pathways` — 18 career pathways
     - employees: add current_level, next_level, pathway_id, readiness_level, current_status, employment_type columns
     - `reviews` — HR review records with PDF storage
     - `development_plans` — employee goal tracking
     - `certifications` — employee certifications with proof documents
     - `checkins` — rebuilt check-in records (replaces quarterly_checkins for detailed records)

  2. Security: RLS enabled on all new tables
*/

-- ─── Pathways ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pathways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text DEFAULT '',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pathways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view pathways"
  ON pathways FOR SELECT TO authenticated USING (true);

CREATE POLICY "HR can insert pathways"
  ON pathways FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr','manager'))
  );

CREATE POLICY "HR can update pathways"
  ON pathways FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr','manager'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr','manager'))
  );

-- Seed 18 pathways
INSERT INTO pathways (name, category) VALUES
  ('Field Leadership & Project Delivery', 'Field'),
  ('Estimating & Pre-Construction', 'Pre-Construction'),
  ('Project Management & Controls', 'Project Management'),
  ('Safety & Compliance', 'Safety'),
  ('Finance & Cost Management', 'Finance'),
  ('Operations & Logistics', 'Operations'),
  ('Business Development & Client Relations', 'Business Development'),
  ('Human Resources & People Operations', 'Corporate'),
  ('Marketing & Communications', 'Corporate'),
  ('Technology & Systems', 'Corporate'),
  ('Executive & Senior Leadership', 'Leadership'),
  ('Superintendency & Site Supervision', 'Field'),
  ('Architectural & Engineering Services', 'Technical'),
  ('Procurement & Supply Chain', 'Operations'),
  ('Quality Control & Assurance', 'Technical'),
  ('Environmental & Sustainability', 'Technical'),
  ('Legal & Contract Administration', 'Corporate'),
  ('Training & Workforce Development', 'Corporate')
ON CONFLICT DO NOTHING;

-- ─── Employee new columns ──────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='current_level') THEN
    ALTER TABLE employees ADD COLUMN current_level text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='next_level') THEN
    ALTER TABLE employees ADD COLUMN next_level text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='pathway_id') THEN
    ALTER TABLE employees ADD COLUMN pathway_id uuid REFERENCES pathways(id) ON DELETE SET NULL DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='readiness_level') THEN
    ALTER TABLE employees ADD COLUMN readiness_level text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='current_status') THEN
    ALTER TABLE employees ADD COLUMN current_status text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='employment_type') THEN
    ALTER TABLE employees ADD COLUMN employment_type text DEFAULT 'Full Time';
  END IF;
END $$;

-- ─── Reviews ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  review_date date NOT NULL,
  review_type text NOT NULL DEFAULT 'Annual',
  review_year int NOT NULL DEFAULT EXTRACT(YEAR FROM now())::int,
  sentiment text DEFAULT 'Neutral',
  notes text DEFAULT '',
  pdf_path text DEFAULT NULL,
  created_by text DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can view all reviews"
  ON reviews FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr','manager')));

CREATE POLICY "Employees can view own reviews"
  ON reviews FOR SELECT TO authenticated
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "HR can insert reviews"
  ON reviews FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr','manager')));

CREATE POLICY "HR can update reviews"
  ON reviews FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr','manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr','manager')));

CREATE POLICY "HR can delete reviews"
  ON reviews FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr','manager')));

-- ─── Development Plans ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS development_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  goal_title text NOT NULL,
  status text NOT NULL DEFAULT 'Not Started',
  progress_pct int NOT NULL DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  target_date date DEFAULT NULL,
  notes text DEFAULT '',
  created_by text DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE development_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can view all development plans"
  ON development_plans FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr','manager')));

CREATE POLICY "Employees can view own development plans"
  ON development_plans FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "HR can insert development plans"
  ON development_plans FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr','manager')));

CREATE POLICY "HR can update development plans"
  ON development_plans FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr','manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr','manager')));

CREATE POLICY "Employees can update own development plan progress"
  ON development_plans FOR UPDATE TO authenticated
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()))
  WITH CHECK (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "HR can delete development plans"
  ON development_plans FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr','manager')));

-- ─── Certifications ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  course_name text NOT NULL,
  status text NOT NULL DEFAULT 'Not Started',
  completion_date date DEFAULT NULL,
  proof_path text DEFAULT NULL,
  created_by text DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can view all certifications"
  ON certifications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr','manager')));

CREATE POLICY "Employees can view own certifications"
  ON certifications FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "HR can insert certifications"
  ON certifications FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr','manager')));

CREATE POLICY "HR can update certifications"
  ON certifications FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr','manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr','manager')));

CREATE POLICY "HR can delete certifications"
  ON certifications FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr','manager')));

-- ─── Checkins (new) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  checkin_date date NOT NULL DEFAULT CURRENT_DATE,
  motivation_level text NOT NULL DEFAULT 'Generally Motivated',
  notes text DEFAULT '',
  decision text DEFAULT 'Continue',
  pillar_focus text DEFAULT NULL,
  pillar_reflection text DEFAULT '',
  contribution_to_growth text DEFAULT NULL,
  business_dev_involvement text DEFAULT NULL,
  created_by text DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can view all checkins"
  ON checkins FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr','manager')));

CREATE POLICY "Employees can view own checkins"
  ON checkins FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "HR can insert checkins"
  ON checkins FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr','manager')));

CREATE POLICY "HR can update checkins"
  ON checkins FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr','manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr','manager')));

CREATE POLICY "HR can delete checkins"
  ON checkins FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr','manager')));
